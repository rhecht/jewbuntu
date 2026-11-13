"""Turn on Jewbuntu's companion GNOME extensions once per user, run as the user at login
(`jewbuntu config migrate`) and by `jewbuntu skin apply`. Never run by root scripts.

Installing an extension package does not enable it: GNOME keeps a per-user list, and a root
package script must not edit a user's settings. Without this, a fresh account never shows the
ShulGo widget. Each extension is enabled at most once per user, and only when installed and
not already in the user's enabled or disabled list. If the user turns it off later, it stays off.
"""

import ast
import json
import os
import shutil
import subprocess
from pathlib import Path

from . import paths

ONCE = ["jewbuntu@shulgo.com"]
LISTS = ("enabled-extensions", "disabled-extensions")


def _gsettings(op, schema, key, value=None):
    if not shutil.which("gsettings"):
        return None
    env = dict(os.environ)
    env.setdefault("XDG_CURRENT_DESKTOP", "GNOME")
    args = ["gsettings", op, schema, key] + ([value] if value is not None else [])
    res = subprocess.run(args, capture_output=True, text=True, timeout=5, env=env)
    return res.stdout.strip() if res.returncode == 0 else None


def _parse(text):
    if not text:
        return []
    try:
        return list(ast.literal_eval(text.replace("@as", "").strip()))
    except (ValueError, SyntaxError):
        return []


def _installed(uuid):
    return any(d.joinpath(uuid, "metadata.json").is_file() for d in
               (Path("/usr/share/gnome-shell/extensions"), Path.home() / ".local/share/gnome-shell/extensions"))


def _state_file():
    return paths.state_dir() / "extensions-once.json"


def enable_once(gsettings=_gsettings, installed=_installed):
    """Enable each ONCE extension the first time it is found installed. Returns notes."""
    state_path = _state_file()
    try:
        done = set(json.loads(state_path.read_text()).get("enabled_once", []))
    except (OSError, ValueError):
        done = set()
    enabled = _parse(gsettings("get", "org.gnome.shell", "enabled-extensions"))
    disabled = _parse(gsettings("get", "org.gnome.shell", "disabled-extensions"))
    notes, changed = [], False
    for uuid in ONCE:
        if uuid in done or not installed(uuid):
            continue
        if uuid not in enabled and uuid not in disabled:
            enabled.append(uuid)
            changed = True
            notes.append(f"enabled {uuid} (once; turn it off any time in Extensions)")
        done.add(uuid)  # also when the user already had it listed: never touch it again
    if changed:
        gsettings("set", "org.gnome.shell", "enabled-extensions", "[" + ", ".join(f"'{u}'" for u in enabled) + "]")
    if done:
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps({"enabled_once": sorted(done)}, indent=2))
    return notes
