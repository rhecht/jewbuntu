"""One-time per-user renames of things Jewbuntu turns on, run as the user at login
(`jewbuntu config migrate`, from the autostart entry). Never run by root scripts.

ShulGo's GNOME extension moved off a domain ShulGo does not own (rhecht/shulgo f0a898c):
shulgo@jewbuntu.org -> jewbuntu@shulgo.com. GNOME keeps the old UUID in the user's
enabled-extensions list and the extension cannot enable itself, so without this the widget
would silently disappear after the update. The new UUID takes the old one's place.
"""

import ast
import os
import shutil
import subprocess
from pathlib import Path

EXTENSION_RENAMES = {"shulgo@jewbuntu.org": "jewbuntu@shulgo.com"}
LISTS = ("enabled-extensions", "disabled-extensions")


def _gsettings(*args):
    if not shutil.which("gsettings"):
        return None
    env = dict(os.environ)
    env.setdefault("XDG_CURRENT_DESKTOP", "GNOME")
    res = subprocess.run(["gsettings", *args], capture_output=True, text=True, timeout=5, env=env)
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


def migrate_extensions(gsettings=None, installed=None):
    """Swap renamed extension UUIDs in place; only when the new one is installed. Returns notes."""
    gsettings = gsettings or _gsettings
    installed = installed or _installed
    notes = []
    for key in LISTS:
        current = _parse(gsettings("get", "org.gnome.shell", key))
        updated = []
        for uuid in current:
            new = EXTENSION_RENAMES.get(uuid)
            if new and installed(new):
                if new not in current and new not in updated:
                    updated.append(new)
                notes.append(f"{key}: {uuid} -> {new}")
            elif uuid not in updated:
                updated.append(uuid)
        if updated != current:
            gsettings("set", "org.gnome.shell", key, "[" + ", ".join(f"'{u}'" for u in updated) + "]")
    return notes
