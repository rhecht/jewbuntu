#!/bin/sh
# Existing-user skin check, run inside the desktop test container after jewbuntu-desktop is installed.
# Uses the keyfile GSettings backend so per-user values persist between commands with real schemas.
set -eu
export GSETTINGS_BACKEND=keyfile XDG_CURRENT_DESKTOP=ubuntu:GNOME HOME=/tmp/existing-user
mkdir -p "$HOME"
ls /usr/share/gnome-shell/extensions/ | grep jewbuntu || echo "(no jewbuntu extension installed)"
gsettings set org.gnome.desktop.input-sources sources "[('xkb', 'us')]"
gsettings set org.gnome.shell.extensions.dash-to-dock dock-position LEFT
echo "before: $(gsettings get org.gnome.desktop.input-sources sources) dock=$(gsettings get org.gnome.shell.extensions.dash-to-dock dock-position)"
jewbuntu skin status
jewbuntu skin apply
A_SRC=$(gsettings get org.gnome.desktop.input-sources sources)
A_DOCK=$(gsettings get org.gnome.shell.extensions.dash-to-dock dock-position)
echo "after apply: $A_SRC dock=$A_DOCK ext=$(gsettings get org.gnome.shell enabled-extensions)"
[ "$A_SRC" = "[('xkb', 'us'), ('xkb', 'il')]" ] && [ "$A_DOCK" = "'BOTTOM'" ] && echo "PASS: skin apply added Hebrew and the Jewbuntu dock" || { echo "FAIL: skin apply"; exit 1; }
jewbuntu skin status | head -3
jewbuntu skin undo >/dev/null
U_SRC=$(gsettings get org.gnome.desktop.input-sources sources)
U_DOCK=$(gsettings get org.gnome.shell.extensions.dash-to-dock dock-position)
echo "after undo: $U_SRC dock=$U_DOCK"
[ "$U_SRC" = "[('xkb', 'us')]" ] && [ "$U_DOCK" = "'LEFT'" ] && echo "PASS: skin undo restored the previous values" || { echo "FAIL: skin undo"; exit 1; }
