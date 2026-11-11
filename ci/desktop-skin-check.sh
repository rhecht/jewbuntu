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
EXT=$(gsettings get org.gnome.shell enabled-extensions)
case "$EXT" in *blur-my-shell@aunetx*user-theme*|*user-theme*blur-my-shell@aunetx*) echo "PASS: skin enabled Blur my Shell and User Themes";; *) echo "FAIL: extensions $EXT"; exit 1;; esac
[ "$(gsettings get org.gnome.desktop.interface gtk-theme)" = "'Jewbuntu-Light'" ] && echo "PASS: Jewbuntu GTK theme active" || { echo "FAIL: gtk-theme"; exit 1; }
[ -f "$HOME/.config/gtk-4.0/gtk.css" ] && cmp -s "$HOME/.config/gtk-4.0/gtk.css" /usr/share/themes/Jewbuntu-Light/gtk-4.0/gtk.css && echo "PASS: libadwaita apps themed" || { echo "FAIL: libadwaita"; exit 1; }
jewbuntu skin status | head -3
jewbuntu skin undo >/dev/null
U_SRC=$(gsettings get org.gnome.desktop.input-sources sources)
U_DOCK=$(gsettings get org.gnome.shell.extensions.dash-to-dock dock-position)
echo "after undo: $U_SRC dock=$U_DOCK"
[ "$U_SRC" = "[('xkb', 'us')]" ] && [ "$U_DOCK" = "'LEFT'" ] && echo "PASS: skin undo restored the previous values" || { echo "FAIL: skin undo"; exit 1; }
[ ! -e "$HOME/.config/gtk-4.0/gtk.css" ] && echo "PASS: undo removed libadwaita theming" || { echo "FAIL: libadwaita undo"; exit 1; }
for d in /usr/share/themes/Jewbuntu-Light /usr/share/gnome-shell/extensions/blur-my-shell@aunetx /usr/share/backgrounds/Jewbuntu/Jewbuntu-night.jpeg; do [ -e "$d" ] && echo "PASS: present $d" || { echo "FAIL: missing $d"; exit 1; }; done
gsettings list-keys org.gnome.shell.extensions.blur-my-shell >/dev/null && echo "PASS: Blur my Shell schema compiled" || { echo "FAIL: blur schema"; exit 1; }
