"""Make the Jewbuntu Terminal palette available to each user, run as the user at login
(`jewbuntu config migrate`). Never run by root scripts.

Ptyxis (Ubuntu's Terminal) only loads palettes built into it or found in the user's data
dir (~/.local/share/org.gnome.Ptyxis/palettes), not from system dirs. jewbuntu-desktop
installs the palette in /usr/share/jewbuntu/terminal/ and sets it as the profile default
(90_jewbuntu-desktop.gschema.override). This links it into each user's palette folder.
It's a symlink so palette updates arrive with the package. A user's own file of the same
name is never replaced.
"""

import os
from pathlib import Path

PALETTE_NAME = "Jewbuntu.palette"
SYSTEM_PALETTE = Path("/usr/share/jewbuntu/terminal") / PALETTE_NAME


def _user_palette_dir():
    data = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local/share")
    return Path(data) / "org.gnome.Ptyxis" / "palettes"


def ensure_palette(system_palette=SYSTEM_PALETTE):
    """Link the Jewbuntu palette into the user's Ptyxis palettes. Returns a note or None."""
    src = Path(system_palette)
    if not src.is_file():
        return None
    dst = _user_palette_dir() / PALETTE_NAME
    if dst.is_symlink():
        if dst.resolve() == src.resolve():
            return None
        if not dst.exists():  # dangling link from an older location: ours to fix
            dst.unlink()
        else:
            return None  # someone pointed it elsewhere on purpose
    elif dst.exists():
        return None  # the user's own palette file: leave it alone
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.symlink_to(src)
    return f"Terminal: Jewbuntu palette available ({dst})"
