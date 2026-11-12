#!/bin/sh
# Headless GNOME Shell check (Fedora test container; run as a normal user inside
# dbus-run-session after `jewbuntu skin apply`). Starts the real gnome-shell on a virtual
# monitor, then asks it which extensions are ACTIVE, which shell theme it loaded and whether
# Jewbuntu Look styled the top bar, and saves a screenshot. Not a substitute for a real login.
# usage: fedora-shell-check.sh [SCREENSHOT.png]
#   EXTRA_EXTS="uuid ..." also checks those extensions; HUB_SHOT=file.png opens the Hub and saves a screenshot.
set -u
SHOT="${1:-}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/rt-$(id -u)}" XDG_CURRENT_DESKTOP=GNOME XDG_SESSION_TYPE=wayland
mkdir -p -m 700 "$XDG_RUNTIME_DIR"
# --unsafe-mode only lets this test call Shell.Eval/Screenshot; it is never used for real sessions.
gnome-shell --headless --unsafe-mode --virtual-monitor 1440x900 --wayland >"$XDG_RUNTIME_DIR/shell.log" 2>&1 &
SHELL_PID=$!
up=0
for i in $(seq 1 90); do
  gdbus introspect --session --dest org.gnome.Shell --object-path /org/gnome/Shell >/dev/null 2>&1 && { up=1; break; }
  sleep 1
done
[ "$up" = 1 ] || { echo "FAIL: gnome-shell did not start"; tail -30 "$XDG_RUNTIME_DIR/shell.log"; exit 1; }
rc=0
EXTS="user-theme@gnome-shell-extensions.gcampax.github.com dash-to-dock@micxgx.gmail.com blur-my-shell@aunetx jewbuntu-look@jewbuntu ${EXTRA_EXTS:-}"
state() { gnome-extensions info "$1" 2>&1 | sed -n 's/^ *State: *//p'; }
# GNOME loads extensions asynchronously after the shell is on the bus: wait (up to 60 s) until
# every one has a final state instead of assuming a fixed delay is enough.
for i in $(seq 1 60); do
  pending=0
  for e in $EXTS; do case "$(state "$e")" in ACTIVE|ERROR|OUT\ OF\ DATE) ;; *) pending=1;; esac; done
  [ "$pending" = 0 ] && break
  sleep 1
done
echo "INFO: extension states settled after ${i}s"
for e in $EXTS; do
  st=$(state "$e")
  if [ "$st" = ACTIVE ]; then echo "PASS: $e ACTIVE on $(gnome-shell --version)"
  else echo "FAIL: $e state=${st:-unknown}: $(gnome-extensions info "$e" 2>&1 | tr '\n' ' ' | cut -c1-200)"; rc=1; fi
done
sleep 3
ev() { gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell --method org.gnome.Shell.Eval "$1" 2>&1; }
R=$(ev 'Main.overview.hide(); [Main.getThemeStylesheet()?.get_path(), Main.panel.has_style_class_name("jewbuntu-panel")].join(" ")')
case "$R" in
  "(true, '"*"/usr/share/themes/Jewbuntu-Light/gnome-shell/gnome-shell.css true"*"')") echo "PASS: shell theme Jewbuntu-Light loaded and Jewbuntu Look styles the top bar";;
  "(false"*) echo "SKIP: Shell.Eval not available ($R)";;
  *) echo "FAIL: shell theme / top bar: $R"; rc=1;;
esac
if grep -E "JS ERROR|had error|Error loading" "$XDG_RUNTIME_DIR/shell.log" | grep -iE "jewbuntu|user-theme|dash-to-dock|blur-my-shell|shulgo"; then
  echo "FAIL: extension errors in the shell log"; rc=1
else
  echo "PASS: no extension errors in the shell log"
fi
if [ -n "$SHOT" ]; then
  sleep 3
  gdbus call --session --dest org.gnome.Shell.Screenshot --object-path /org/gnome/Shell/Screenshot \
    --method org.gnome.Shell.Screenshot.Screenshot false false "$SHOT" >/dev/null 2>&1 && [ -s "$SHOT" ] \
    && echo "INFO: screenshot $SHOT" || echo "INFO: no screenshot"
fi
if [ -n "${HUB_SHOT:-}" ]; then
  # The Hub as a real Wayland client of this shell (Toronto, so zmanim show), with the skin's GTK4 look.
  WAYLAND_DISPLAY=wayland-0 GDK_BACKEND=wayland JEWBUNTU_HUB_PAGE=today jewbuntu-hub >"$XDG_RUNTIME_DIR/hub.log" 2>&1 &
  HUB_PID=$!
  sleep 10
  if kill -0 "$HUB_PID" 2>/dev/null; then echo "PASS: Hub window runs on GNOME Shell"; else echo "FAIL: Hub exited"; tail -5 "$XDG_RUNTIME_DIR/hub.log"; rc=1; fi
  gdbus call --session --dest org.gnome.Shell.Screenshot --object-path /org/gnome/Shell/Screenshot \
    --method org.gnome.Shell.Screenshot.Screenshot false false "$HUB_SHOT" >/dev/null 2>&1 && [ -s "$HUB_SHOT" ] \
    && echo "INFO: screenshot $HUB_SHOT" || echo "INFO: no Hub screenshot"
  kill "$HUB_PID" 2>/dev/null
fi
kill "$SHELL_PID" 2>/dev/null; wait "$SHELL_PID" 2>/dev/null
exit $rc
