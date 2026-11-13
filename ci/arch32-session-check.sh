#!/bin/sh
# Real Xfce session check (arch32 test container; run as a normal user). Starts Xvfb at a
# 2001 laptop's 1024x768 (24-bit; 16-bit is left to the VM test), runs startjewbuntu in a fresh session bus, then asks X and xfconf
# what is running: window manager and theme, panels, Docklike, keyboard layouts. Saves a
# screenshot. Under emulation everything is slow, so it waits generously.
# usage: arch32-session-check.sh [SCREENSHOT.png]
set -u
SHOT="${1:-}"
export DISPLAY=:5 XDG_RUNTIME_DIR="/tmp/rt-$(id -u)"
mkdir -p -m 700 "$XDG_RUNTIME_DIR"
Xvfb :5 -screen 0 1024x768x24 -nolisten tcp >/tmp/xvfb-$(id -u).log 2>&1 &
XPID=$!
for i in $(seq 1 60); do xdpyinfo >/dev/null 2>&1 && break; sleep 1; done
dbus-run-session -- sh -c '
  startjewbuntu >/tmp/xfce-$(id -u).log 2>&1 &
  SESSION=$!
  rc=0
  up=0; for i in $(seq 1 240); do
    pgrep -x xfwm4 >/dev/null && pgrep -x xfce4-panel >/dev/null && pgrep -x xfdesktop >/dev/null && { up=1; break; }
    sleep 1
  done
  [ "$up" = 1 ] && echo "PASS: xfwm4, xfce4-panel and xfdesktop running ($(xfce4-session --version | head -1))" || { echo "FAIL: Xfce did not come up: $(pgrep -l -u $(id -u) | tr "\n" " ")"; tail -20 /tmp/xfce-$(id -u).log; exit 1; }
  sleep 150  # emulated i686 is slow: the wallpaper takes ~2 minutes to appear
  echo "INFO: session XDG_CONFIG_DIRS=$(tr "\0" "\n" </proc/$(pgrep -x xfconfd)/environ | sed -n "s/^XDG_CONFIG_DIRS=//p")"
  wm=$(xprop -root _NET_SUPPORTING_WM_CHECK | awk "{print \$NF}")
  name=$(xprop -id "$wm" _NET_WM_NAME 2>/dev/null | cut -d\" -f2)
  [ "$name" = Xfwm4 ] && echo "PASS: window manager is Xfwm4" || { echo "FAIL: window manager $name"; rc=1; }
  for kv in "xfwm4 /general/theme Jewbuntu-Light-solid" "xsettings /Net/ThemeName Jewbuntu-Light-solid" "xsettings /Net/IconThemeName Jewbuntu-light" "xfwm4 /general/button_layout CHM|" "xfwm4 /general/use_compositing false" "xfce4-terminal /color-background #ffffff" "xfce4-terminal /color-cursor #0088ff"; do
    set -- $kv; v=$(xfconf-query -c $1 -p $2 2>/dev/null)
    [ "$v" = "$3" ] && echo "PASS: running session: $1 $2 = $v" || { echo "FAIL: running session: $1 $2 = $v (want $3)"; rc=1; }
  done
  [ "$(xfconf-query -c xfce4-panel -p /plugins/plugin-6 2>/dev/null)" = docklike ] && [ -n "$(xfconf-query -c xfce4-panel -p /panels/panel-2/position 2>/dev/null)" ] \
    && echo "PASS: Jewbuntu panels (top bar and Docklike dock) configured without the first-run panel question" || { echo "FAIL: panel layout"; rc=1; }
  pgrep -f "xfce4/panel/wrapper|libdocklike" >/dev/null && echo "INFO: Docklike runs in its own wrapper process" || true
  grep -iE "docklike.*(fail|error)|Failed to load plugin" /tmp/xfce-$(id -u).log && { echo "FAIL: panel plugin errors"; rc=1; } || echo "PASS: no panel plugin load errors"
  kb=$(setxkbmap -query | sed -n "s/^layout: *//p")
  [ "$kb" = us,il ] && echo "PASS: keyboard layouts us,il applied by xfsettingsd" || { echo "FAIL: keyboard layouts $kb"; rc=1; }
  echo "INFO: wallpaper slots xfdesktop uses: $(xfconf-query -c xfce4-desktop -l | grep last-image | while read p; do printf "%s=%s " "$p" "$(xfconf-query -c xfce4-desktop -p "$p")"; done)"
  pinned=$(sed -n "s/^pinned=//p" ~/.config/xfce4/panel/docklike-6.rc 2>/dev/null | head -1)
  case "$pinned" in thunar\;xfce4-terminal\;xfce-settings-manager*) echo "PASS: dock copied the Jewbuntu pinned apps: $pinned";; *) echo "FAIL: dock pinned apps: ${pinned:-none}"; rc=1;; esac
  grep -iE "Failed to load image|pixbuf|docklike" /tmp/xfce-$(id -u).log | sort -u | head -5 | sed "s/^/INFO: log: /"
  if [ -n "'"$SHOT"'" ]; then
    xwd -root -silent > /tmp/shot-$(id -u).xwd && python3 /ci/xwd2png.py /tmp/shot-$(id -u).xwd "'"$SHOT"'" && echo "INFO: screenshot '"$SHOT"'"
  fi
  # Not xfce4-session-logout: it waits on power-management calls a container cannot answer.
  kill $SESSION 2>/dev/null; pkill -u $(id -u) -x xfce4-session 2>/dev/null; sleep 3
  pkill -u $(id -u) -f "xfwm4|xfce4-panel|xfdesktop|xfsettingsd|Thunar|wrapper-2.0|at-spi|gpg-agent" 2>/dev/null
  exit $rc
'
rc=$?
kill $XPID 2>/dev/null; wait $XPID 2>/dev/null
exit $rc
