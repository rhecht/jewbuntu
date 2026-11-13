"""The Jewbuntu desktop skin: list, apply, undo and restore desktop settings.

Two layers:

* Vendor defaults (90_jewbuntu*.gschema.override) change *defaults* only, so
  they reach users who never touched a setting. Anything a user already set
  (for example the keyboard list written at first login) stays theirs.
* `apply_skin()` is the explicit, per-user step for existing accounts (an
  Ubuntu install that later added Jewbuntu). It records the user's current
  values first, then applies the Jewbuntu look. `undo_skin()` puts the
  recorded values back. The first-login prompt calls apply only after the
  user says yes.

Keyboard sources are merged, never replaced: Hebrew is appended to whatever
layouts the user already has.

Two settings backends, chosen by the distro's desktop-defaults.json ("backend"):
GNOME's gsettings (Ubuntu, Fedora Asahi Remix; the default) and Xfce's xfconf
(Arch Linux 32 on old 32-bit laptops). Rows always use "schema"/"key": for
xfconf they hold the channel and the property path.
"""

import ast
import json
import os
import shutil
import subprocess
import time

from . import paths

# Extensions the skin needs, enabled per user by apply_skin() (appended, never replacing others).
# This is the Ubuntu list (Ubuntu Dock comes with the session); a distro's desktop-defaults.json
# can replace it with an "extensions" list (Fedora Asahi Remix adds Dash to Dock).
SKIN_EXTENSIONS = ["user-theme@gnome-shell-extensions.gcampax.github.com", "blur-my-shell@aunetx", "jewbuntu-look@jewbuntu"]
SKIN_THEME_DIR = paths.Path("/usr/share/themes/Jewbuntu-Light/gtk-4.0")
LIBADWAITA_FILES = ["gtk.css", "gtk-dark.css", "assets", "windows-assets"]
INPUT_SOURCES = ("org.gnome.desktop.input-sources", "sources")
HEBREW = ("xkb", "il")


def _manifest():
    with open(paths.share_path("desktop-defaults.json"), encoding="utf-8") as handle:
        return json.load(handle)


def load_manifest():
    return _manifest()["keys"]


def skin_extensions():
    """Extensions the skin enables: the manifest's "extensions" list, else the Ubuntu list.

    An empty list (Xfce has no GNOME Shell extensions) means none.
    """
    try:
        listed = _manifest().get("extensions")
    except (OSError, ValueError):
        listed = None
    return list(listed) if listed is not None else list(SKIN_EXTENSIONS)


def backend():
    """'gsettings' (GNOME) or 'xfconf' (Xfce), from the distro's manifest."""
    try:
        return _manifest().get("backend", "gsettings")
    except (OSError, ValueError):
        return "gsettings"


def _xfconf(*args):
    """xfconf-query; returns its output, or None if the property is unset or xfconf is missing."""
    if not shutil.which("xfconf-query"):
        return None
    try:
        res = subprocess.run(["xfconf-query", *args], capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return None
    return res.stdout.rstrip("\n") if res.returncode == 0 else None


def _xfconf_available():
    return shutil.which("xfconf-query") is not None


# Per-backend get/set/reset. Values are text: GVariant form for gsettings, xfconf-query's
# output form for xfconf (strings unquoted, booleans true/false).
def _get(schema, key):
    if backend() == "xfconf":
        return _xfconf("-c", schema, "-p", key)
    return _gsettings("get", schema, key)


def _set(schema, key, value, kind="string"):
    if backend() == "xfconf":
        if value is None:
            return _xfconf("-c", schema, "-p", key, "-r")
        return _xfconf("-c", schema, "-p", key, "-n", "-t", kind, "-s", value)
    return _gsettings("set", schema, key, value)


def _reset(schema, key):
    if backend() == "xfconf":
        return _xfconf("-c", schema, "-p", key, "-r")
    return _gsettings("reset", schema, key)


def _installed(current):
    """Whether the setting exists. xfconf properties can be unset and still settable."""
    return current is not None or (backend() == "xfconf" and _xfconf_available())


# Keyboard: Hebrew is appended, never replacing the user's layouts.
XKB_LAYOUT = ("keyboard-layout", "/Default/XkbLayout")
XKB_VARIANT = ("keyboard-layout", "/Default/XkbVariant")


def _is_keyboard(schema, key):
    return (schema, key) in (INPUT_SOURCES, XKB_LAYOUT)


def _has_hebrew(current):
    if backend() == "xfconf":
        return current is not None and HEBREW[1] in [x.strip() for x in current.split(",")]
    return current is not None and HEBREW in _parse_sources(current)


def _add_hebrew(current, dry_run=False):
    """Append Hebrew to the current layouts; returns the new value."""
    if backend() == "xfconf":
        layouts = [x.strip() for x in (current or "").split(",") if x.strip()] or ["us"]
        new = ",".join(layouts + [HEBREW[1]])
        if not dry_run:
            # Xfce keeps one variant per layout (comma separated); keep them lined up.
            variants = (_get(*XKB_VARIANT) or "").split(",") if current else []
            variants = (variants + [""] * len(layouts))[:len(layouts)] + [""]
            _set(*XKB_VARIANT, ",".join(variants))
            _set(*XKB_LAYOUT, new)
        return new
    new = _format_sources(_parse_sources(current) + [HEBREW])
    if not dry_run:
        _gsettings("set", *INPUT_SOURCES, new)
    return new


def _gsettings(*args):
    if not shutil.which("gsettings"):
        return None
    # Desktop-specific defaults (the :ubuntu sections Ubuntu and Jewbuntu use) only
    # apply when XDG_CURRENT_DESKTOP names the session. It is unset over SSH or in
    # cron, which would show upstream GNOME defaults instead of the real ones.
    env = dict(os.environ)
    env.setdefault("XDG_CURRENT_DESKTOP", "ubuntu:GNOME")
    res = subprocess.run(["gsettings", *args], capture_output=True, text=True, timeout=5, env=env)
    return res.stdout.strip() if res.returncode == 0 else None


def _same(a, b):
    """Compare GVariant text forms, tolerating float formatting (0.35 vs 0.34999...)."""
    if a is None or b is None:
        return False
    try:
        return abs(float(a) - float(b)) < 1e-6
    except ValueError:
        return a.replace(" ", "") == b.replace(" ", "")


def _parse_sources(text):
    """'[('xkb', 'us'), ('xkb', 'il')]' or '@a(ss) []' -> list of tuples."""
    if not text:
        return []
    text = text.replace("@a(ss)", "").strip()
    try:
        return [tuple(x) for x in ast.literal_eval(text)]
    except (ValueError, SyntaxError):
        return []


def _format_sources(items):
    return "[" + ", ".join(f"('{a}', '{b}')" for a, b in items) + "]"


def status():
    rows = []
    for item in load_manifest():
        schema, key = item["schema"], item["key"]
        current = _get(schema, key)
        if _is_keyboard(schema, key):
            matches = _has_hebrew(current)
        else:
            matches = _same(current, item["value"])
        rows.append({**item, "current": current, "schema_installed": _installed(current), "matches_jewbuntu": matches})
    return rows


def restore(dry_run=False):
    """Reset only Jewbuntu-managed keys to Jewbuntu defaults (keyboard: add Hebrew, keep others)."""
    changed = []
    for row in status():
        if not row["schema_installed"] or row["matches_jewbuntu"]:
            continue
        if _is_keyboard(row["schema"], row["key"]):
            new = _add_hebrew(row["current"], dry_run)
            changed.append(f"{row['schema']} {row['key']}: {row['current']} -> {new}")
        else:
            if not dry_run:
                _reset(row["schema"], row["key"])
                # A distro's own defaults (e.g. /etc/dconf/db/distro.d), or an Xfce session
                # started without Jewbuntu's defaults, can win after a reset; then set ours.
                if not _same(_get(row["schema"], row["key"]), row["value"]):
                    _set(row["schema"], row["key"], row["value"], row.get("type", "string"))
            changed.append(f"{row['schema']} {row['key']}: {row['current']} -> {row['value']}")
    return changed


# --- extensions -----------------------------------------------------------------

def _extension_dirs(uuid):
    return [paths.Path("/usr/share/gnome-shell/extensions") / uuid,
            paths.Path.home() / ".local/share/gnome-shell/extensions" / uuid]


def extension_state(uuid=None):
    """'enabled', 'disabled' or 'missing' (all skin extensions when uuid is None: worst state wins).

    Uses installed files and the enabled-extensions key rather than asking the running
    shell, so it also works over SSH and before the shell has rescanned. 'enabled' when
    the desktop needs no extensions (Xfce).
    """
    uuids = [uuid] if uuid else skin_extensions()
    if not uuids:
        return "enabled"
    enabled = _parse_list(_gsettings("get", "org.gnome.shell", "enabled-extensions"))
    states = []
    for u in uuids:
        if not any(d.is_dir() for d in _extension_dirs(u)):
            states.append("missing")
        else:
            states.append("enabled" if u in enabled else "disabled")
    for worst in ("missing", "disabled"):
        if worst in states:
            return worst
    return "enabled"


def _parse_list(text):
    if not text:
        return []
    try:
        return list(ast.literal_eval(text.replace("@as", "").strip()))
    except (ValueError, SyntaxError):
        return []


def _set_extensions(uuids, enable):
    enabled = _parse_list(_gsettings("get", "org.gnome.shell", "enabled-extensions"))
    before = list(enabled)
    for u in uuids:
        if enable and u not in enabled:
            enabled.append(u)
        elif not enable and u in enabled:
            enabled.remove(u)
    if enabled != before:
        _gsettings("set", "org.gnome.shell", "enabled-extensions", "[" + ", ".join(f"'{e}'" for e in enabled) + "]")


# --- libadwaita (GTK4) apps ----------------------------------------------------------

def _gtk4_dir():
    return paths.Path(os.environ.get("XDG_CONFIG_HOME") or paths.Path.home() / ".config") / "gtk-4.0"


def libadwaita_applied():
    """True when ~/.config/gtk-4.0 links to the installed skin (so skin updates reach apps)."""
    css = _gtk4_dir() / "gtk.css"
    try:
        return SKIN_THEME_DIR.is_dir() and css.is_symlink() and css.resolve() == (SKIN_THEME_DIR / "gtk.css").resolve()
    except OSError:
        return False


def _libadwaita_apply(state):
    """Link ~/.config/gtk-4.0 to the skin's GTK4 files, backing up whatever was there.

    Symlinks, not copies: a copy would freeze the look at the version applied and never
    receive skin fixes. Versions up to 0.1.0~m1.24 copied; refresh_libadwaita() converts.
    """
    if not SKIN_THEME_DIR.is_dir() or libadwaita_applied():
        return None
    target = _gtk4_dir()
    backup = paths.state_dir() / "gtk-4.0-backup"
    if "gtk4_backup" not in state:
        backup.mkdir(parents=True, exist_ok=True, mode=0o700)
        saved = []
        for name in LIBADWAITA_FILES:
            src = target / name
            if src.exists() or src.is_symlink():
                shutil.move(str(src), str(backup / name))
                saved.append(name)
        state["gtk4_backup"] = {"dir": str(backup), "files": saved}
    target.mkdir(parents=True, exist_ok=True)
    for name in LIBADWAITA_FILES:
        src = SKIN_THEME_DIR / name
        dst = target / name
        # Anything here now is Jewbuntu's (the user's originals were moved to the backup above).
        if dst.is_dir() and not dst.is_symlink():
            shutil.rmtree(dst)
        elif dst.exists() or dst.is_symlink():
            dst.unlink()
        if src.exists():
            dst.symlink_to(src)
    return "libadwaita apps themed (~/.config/gtk-4.0 linked to the skin; previous files saved)"


def refresh_libadwaita():
    """At login: if the look was applied as copies (older versions), relink to the skin."""
    state = read_state()
    if "gtk4_backup" not in state or not SKIN_THEME_DIR.is_dir() or libadwaita_applied():
        return None
    note = _libadwaita_apply(state)
    _write_state(state)
    return note


def _libadwaita_undo(state):
    info = state.pop("gtk4_backup", None)
    if not info:
        return None
    target = _gtk4_dir()
    for name in LIBADWAITA_FILES:
        dst = target / name
        if dst.is_dir() and not dst.is_symlink():
            shutil.rmtree(dst)
        elif dst.exists() or dst.is_symlink():
            dst.unlink()
    for name in info["files"]:
        shutil.move(str(paths.Path(info["dir"]) / name), str(target / name))
    return "libadwaita apps: previous ~/.config/gtk-4.0 files restored"


# --- Xfce wallpaper ------------------------------------------------------------------

def _wallpaper():
    try:
        return _manifest().get("wallpaper")
    except (OSError, ValueError):
        return None


def _xfdesktop_image_props():
    """This account's xfdesktop wallpaper properties (one per monitor and workspace)."""
    out = _xfconf("-c", "xfce4-desktop", "-l") or ""
    return [p for p in out.splitlines() if p.startswith("/backdrop/") and p.endswith("/last-image")]


def _wallpaper_pending():
    wall = _wallpaper()
    if backend() != "xfconf" or not wall:
        return []
    return [p for p in _xfdesktop_image_props() if _xfconf("-c", "xfce4-desktop", "-p", p) != wall]


# --- skin apply / undo -------------------------------------------------------------

def _state_file():
    return paths.state_dir() / "skin.json"


def read_state():
    try:
        return json.loads(_state_file().read_text())
    except (OSError, ValueError):
        return {}


def _write_state(state):
    path = _state_file()
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(state, indent=2))
    os.replace(tmp, path)


def pending_changes():
    """What apply_skin() would change for this user (empty list = already Jewbuntu)."""
    changes = [f"{r['why']}" for r in status() if r["schema_installed"] and not r["matches_jewbuntu"]]
    if _wallpaper_pending():
        changes.append("Jewbuntu wallpaper on every monitor and workspace")
    if extension_state() == "disabled":
        changes.append("Glass dock and top bar (Blur my Shell) and the Jewbuntu shell theme (User Themes)")
    if SKIN_THEME_DIR.is_dir() and not libadwaita_applied():
        changes.append("Jewbuntu Skin for GTK4/libadwaita apps")
    return changes


def apply_skin():
    state = read_state()
    if "backup" not in state:  # keep the *original* pre-Jewbuntu values across re-applies
        state["backup"] = {
            "taken": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "keys": [{"schema": r["schema"], "key": r["key"], "value": r["current"], "type": r.get("type", "string")}
                     for r in status() if r["schema_installed"]],
            "xkb_variant": _get(*XKB_VARIANT) if backend() == "xfconf" else None,
            "extensions_enabled_before": [u for u in skin_extensions() if extension_state(u) == "enabled"],
            "wallpapers": {p: _xfconf("-c", "xfce4-desktop", "-p", p) for p in _wallpaper_pending()},
        }
    changed = restore()
    walls = _wallpaper_pending()
    for p in walls:
        _xfconf("-c", "xfce4-desktop", "-p", p, "-n", "-t", "string", "-s", _wallpaper())
    if walls:
        changed.append(f"wallpaper set on {len(walls)} monitor/workspace slot(s)")
    to_enable = [u for u in skin_extensions() if extension_state(u) == "disabled"]
    if to_enable:
        _set_extensions(to_enable, True)
        changed.append(f"enabled {', '.join(to_enable)} (log out and in if not visible yet)")
    note = _libadwaita_apply(state)
    if note:
        changed.append(note)
    state.update({"applied": True, "prompted": True, "applied_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")})
    _write_state(state)
    return changed


def undo_skin():
    state = read_state()
    backup = state.get("backup")
    if not backup:
        return ["nothing to undo: the skin was never applied for this user"]
    changed = []
    xfce = backend() == "xfconf"
    for item in backup["keys"]:
        if item["value"] is not None:
            _set(item["schema"], item["key"], item["value"], item.get("type", "string"))
            changed.append(f"{item['schema']} {item['key']} -> {item['value']}")
        elif xfce:  # was unset before apply: unset it again (back to the session's default)
            _reset(item["schema"], item["key"])
            changed.append(f"{item['schema']} {item['key']} -> (default)")
        if xfce and (item["schema"], item["key"]) == XKB_LAYOUT:
            _set(*XKB_VARIANT, backup.get("xkb_variant"))
    for prop, value in backup.get("wallpapers", {}).items():
        _xfconf("-c", "xfce4-desktop", "-p", prop, "-n", "-t", "string", "-s", value) if value else _xfconf("-c", "xfce4-desktop", "-p", prop, "-r")
        changed.append(f"xfce4-desktop {prop} -> {value}")
    was = set(backup.get("extensions_enabled_before", []))
    off = [u for u in skin_extensions() if u not in was]
    if off:
        _set_extensions(off, False)
        changed.append(f"disabled {', '.join(off)}")
    note = _libadwaita_undo(state)
    if note:
        changed.append(note)
    state.update({"applied": False, "undone_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")})
    state.pop("backup")
    state["previous_backup"] = backup
    _write_state(state)
    return changed


def mark_prompted(answer):
    state = read_state()
    state.update({"prompted": True, "prompt_answer": answer})
    _write_state(state)


def prompt():
    """First-login question (XDG autostart). Asks once per user; harmless without a display or zenity."""
    state = read_state()
    if state.get("prompted"):
        return "already asked"
    changes = pending_changes()
    if not changes:
        mark_prompted("not-needed")
        return "nothing to change"
    if not shutil.which("zenity") or not (os.environ.get("WAYLAND_DISPLAY") or os.environ.get("DISPLAY")):
        return "no dialog available; will ask at next login"
    text = (
        "Apply the Jewbuntu look to this account?\n\n"
        + "\n".join(f"  • {c}" for c in changes[:12])
        + ("\n  • …" if len(changes) > 12 else "")
        + "\n\nYour current settings are saved first. Undo any time with:\n  jewbuntu skin undo"
    )
    try:
        res = subprocess.run(
            ["zenity", "--question", "--title=Jewbuntu", "--width=460", f"--text={text}",
             "--ok-label=Apply Jewbuntu look", "--cancel-label=Not now"],
            timeout=1800,
        )
    except (OSError, subprocess.SubprocessError):
        return "dialog failed; will ask at next login"
    if res.returncode == 0:
        apply_skin()
        return "applied"
    mark_prompted("declined")
    return "declined"
