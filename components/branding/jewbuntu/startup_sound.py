"""Play the Jewbuntu startup jingle once per boot at graphical login.

Started by an XDG autostart entry, so it runs only when a graphical session
starts: never on screen unlock or resume, and never in the headless node
profile (no graphical session there). It runs asynchronously, so it cannot
delay login.

Rules, in order:
  1. Setting sound.startup must be true (unless --preview).
  2. Not inside the quiet schedule (unless --preview).
  3. Only once per boot per user (marker holds the kernel boot_id).
  4. If the default output is muted, or no audio server/sink exists, do nothing.
  5. Play at a restrained stream volume. System volume is never changed.
Every failure is harmless: exit 0 with a short reason.
"""

import datetime
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from . import config, paths

SOUND_FILE = paths.SHARE_DIR / "sounds" / "jewbuntu-startup.wav"
STREAM_VOLUME = 0.6  # default; stream volume relative to the system volume, which is never raised
SINK_WAIT_S = 6  # PipeWire may start alongside us; give up quietly after this


def boot_id():
    try:
        return Path("/proc/sys/kernel/random/boot_id").read_text().strip()
    except OSError:
        return None


def marker_path():
    return paths.state_dir() / "startup-sound.boot_id"


def already_played():
    bid = boot_id()
    if bid is None:
        return False
    try:
        return marker_path().read_text().strip() == bid
    except OSError:
        return False


def mark_played():
    bid = boot_id()
    if bid is None:
        return
    marker_path().parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    marker_path().write_text(bid + "\n")


def in_quiet_window(settings, now=None):
    """Milestone 1 fallback: Friday 12:00 to Saturday 23:59 local time when the quiet schedule is on.

    This is deliberately broad and is replaced by calendar-based Shabbos/Yom Tov
    times once the Jewish service exists (milestone 2). It only silences
    Jewbuntu's own sound; it is not a halachic determination.
    """
    if not settings.get("quiet_schedule", {}).get("enabled"):
        return False
    now = now or datetime.datetime.now()
    weekday = now.weekday()  # Monday=0 ... Friday=4, Saturday=5
    return (weekday == 4 and now.hour >= 12) or weekday == 5


def output_state():
    """Return 'muted', 'ok' or 'none' for the default audio sink."""
    if shutil.which("wpctl"):
        try:
            res = subprocess.run(["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"], capture_output=True, text=True, timeout=3)
        except (OSError, subprocess.SubprocessError):
            return "none"
        if res.returncode != 0:
            return "none"
        out = res.stdout
        if "MUTED" in out:
            return "muted"
        try:
            if float(out.split()[1]) == 0.0:
                return "muted"
        except (IndexError, ValueError):
            pass
        return "ok"
    if shutil.which("pactl"):
        try:
            res = subprocess.run(["pactl", "get-sink-mute", "@DEFAULT_SINK@"], capture_output=True, text=True, timeout=3)
        except (OSError, subprocess.SubprocessError):
            return "none"
        if res.returncode != 0:
            return "none"
        return "muted" if "yes" in res.stdout.lower() else "ok"
    return "none"


def play(path, volume=STREAM_VOLUME):
    if shutil.which("pw-play"):
        cmd = ["pw-play", f"--volume={volume:.2f}", str(path)]
    elif shutil.which("paplay"):
        cmd = ["paplay", f"--volume={int(volume * 65536)}", str(path)]
    else:
        return False, "no player (pw-play/paplay) installed"
    try:
        res = subprocess.run(cmd, capture_output=True, timeout=15)
        return res.returncode == 0, f"{cmd[0]} exit {res.returncode}"
    except (OSError, subprocess.SubprocessError) as exc:
        return False, str(exc)


def run(preview=False, sound_file=SOUND_FILE):
    if os.environ.get("JEWBUNTU_PROFILE") == "node":
        return "skipped: node profile is silent"
    try:
        settings = config.load()
    except config.ConfigError as exc:
        return f"skipped: settings unreadable ({exc})"
    if not preview:
        if not settings.get("sound", {}).get("startup", {}).get("enabled", False):
            return "skipped: startup sound is off"
        if in_quiet_window(settings):
            return "skipped: quiet schedule"
        if already_played():
            return "skipped: already played this boot"
    if not Path(sound_file).exists():
        return f"skipped: {sound_file} missing"
    deadline = time.monotonic() + (0 if preview else SINK_WAIT_S)
    state = output_state()
    while state == "none" and time.monotonic() < deadline:
        time.sleep(0.5)
        state = output_state()
    if state == "muted":
        if not preview:
            mark_played()  # respect mute for the whole boot; do not ambush the user later
        return "skipped: output muted"
    if state == "none":
        return "skipped: no audio output available"
    if not preview:
        mark_played()  # mark before playing so a crash can never cause a replay loop
    volume = settings.get("sound", {}).get("startup", {}).get("volume", STREAM_VOLUME)
    ok, detail = play(sound_file, volume=min(1.0, max(0.05, float(volume))))
    return ("played" if ok else "failed") + f" ({detail})"


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    preview = "--preview" in argv
    result = run(preview=preview)
    if "--verbose" in argv or preview:
        print(result)
    return 0
