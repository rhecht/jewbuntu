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
"""

import ast
import json
import os
import shutil
import subprocess
import time

from . import paths

LOOK_EXTENSION = "jewbuntu-look@jewbuntu"
INPUT_SOURCES = ("org.gnome.desktop.input-sources", "sources")
HEBREW = ("xkb", "il")


def load_manifest():
    with open(paths.share_path("desktop-defaults.json"), encoding="utf-8") as handle:
        return json.load(handle)["keys"]


def _gsettings(*args):
    if not shutil.which("gsettings"):
        return None
    res = subprocess.run(["gsettings", *args], capture_output=True, text=True, timeout=5)
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
        current = _gsettings("get", schema, key)
        if (schema, key) == INPUT_SOURCES:
            matches = current is not None and HEBREW in _parse_sources(current)
        else:
            matches = _same(current, item["value"])
        rows.append({**item, "current": current, "schema_installed": current is not None, "matches_jewbuntu": matches})
    return rows


def restore(dry_run=False):
    """Reset only Jewbuntu-managed keys to Jewbuntu defaults (keyboard: add Hebrew, keep others)."""
    changed = []
    for row in status():
        if not row["schema_installed"] or row["matches_jewbuntu"]:
            continue
        if (row["schema"], row["key"]) == INPUT_SOURCES:
            new = _format_sources(_parse_sources(row["current"]) + [HEBREW])
            if not dry_run:
                _gsettings("set", row["schema"], row["key"], new)
            changed.append(f"{row['schema']} {row['key']}: {row['current']} -> {new}")
        else:
            if not dry_run:
                _gsettings("reset", row["schema"], row["key"])
            changed.append(f"{row['schema']} {row['key']}: {row['current']} -> {row['value']}")
    return changed


# --- extension -----------------------------------------------------------------

def extension_state():
    """'enabled', 'disabled' or 'missing' for the Jewbuntu look extension.

    Uses the installed files and the enabled-extensions key rather than asking the
    running shell, so it also works over SSH and before the shell has rescanned.
    """
    dirs = [paths.Path("/usr/share/gnome-shell/extensions") / LOOK_EXTENSION,
            paths.Path.home() / ".local/share/gnome-shell/extensions" / LOOK_EXTENSION]
    if not any(d.is_dir() for d in dirs):
        return "missing"
    enabled = _parse_list(_gsettings("get", "org.gnome.shell", "enabled-extensions"))
    return "enabled" if LOOK_EXTENSION in enabled else "disabled"


def _parse_list(text):
    if not text:
        return []
    try:
        return list(ast.literal_eval(text.replace("@as", "").strip()))
    except (ValueError, SyntaxError):
        return []


def _set_extension(enable):
    """Enable/disable via the enabled-extensions key (works before the shell has rescanned)."""
    enabled = _parse_list(_gsettings("get", "org.gnome.shell", "enabled-extensions"))
    if enable and LOOK_EXTENSION not in enabled:
        enabled.append(LOOK_EXTENSION)
    elif not enable and LOOK_EXTENSION in enabled:
        enabled.remove(LOOK_EXTENSION)
    else:
        return
    _gsettings("set", "org.gnome.shell", "enabled-extensions", "[" + ", ".join(f"'{e}'" for e in enabled) + "]")


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
    if extension_state() == "disabled":
        changes.append("Mac-style top bar (clock on the right, translucent)")
    return changes


def apply_skin():
    state = read_state()
    if "backup" not in state:  # keep the *original* pre-Jewbuntu values across re-applies
        state["backup"] = {
            "taken": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "keys": [{"schema": r["schema"], "key": r["key"], "value": r["current"]} for r in status() if r["schema_installed"]],
            "extension_was": extension_state(),
        }
    changed = restore()
    if extension_state() == "disabled":
        _set_extension(True)
        changed.append(f"enabled {LOOK_EXTENSION} (takes effect at next login)")
    state.update({"applied": True, "prompted": True, "applied_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")})
    _write_state(state)
    return changed


def undo_skin():
    state = read_state()
    backup = state.get("backup")
    if not backup:
        return ["nothing to undo: the skin was never applied for this user"]
    changed = []
    for item in backup["keys"]:
        if item["value"] is not None:
            _gsettings("set", item["schema"], item["key"], item["value"])
            changed.append(f"{item['schema']} {item['key']} -> {item['value']}")
    if backup.get("extension_was") in ("disabled", "missing"):
        _set_extension(False)
        changed.append(f"disabled {LOOK_EXTENSION}")
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
