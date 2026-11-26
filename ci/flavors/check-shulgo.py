"""Run inside a remastered system: ShulGo's modules import on this Python and find a tray library."""
import sys
sys.path.insert(0, "/usr/lib/shulgo-xfce")
import gi  # noqa: E402
gi.require_version("Gtk", "3.0")
import shulgo_xfce.tray as tray  # noqa: E402
import shulgo_xfce.settings_window  # noqa: E402,F401
import shulgo_xfce.link_window  # noqa: E402,F401
print("shulgo imports on Python", sys.version.split()[0], "- tray library:", tray._load_indicator()[1])
