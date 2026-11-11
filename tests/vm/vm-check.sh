#!/bin/bash
# Jewbuntu VM check: run INSIDE the VM, as your normal user, in a graphical session,
# after installing the packages and logging out and back in once.
#   bash vm-check.sh           -> writes ~/jewbuntu-vm-check-<date>.txt
# Collects facts only; it changes nothing except playing the jingle once if you agree.
OUT="$HOME/jewbuntu-vm-check-$(date +%Y%m%d-%H%M%S).txt"
exec > >(tee "$OUT") 2>&1

section() { echo; echo "=== $*"; }
run() { echo "\$ $*"; "$@" 2>&1; echo; }

section "environment"
date -Is
grep -E '^(PRETTY_NAME|VERSION_CODENAME)=' /etc/os-release
run uname -srm
run systemd-detect-virt
run gnome-shell --version
echo "XDG_SESSION_TYPE=$XDG_SESSION_TYPE XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP"
run free -h
run df -h /

section "packages"
dpkg-query -W -f '${Package} ${Version} ${db:Status-Abbrev}\n' 'jewbuntu-*'

section "doctor"
run jewbuntu doctor

section "desktop defaults for THIS user (= Jewbuntu default, * changed by user, ? schema missing)"
run jewbuntu defaults status

section "Hebrew"
run gsettings get org.gnome.desktop.input-sources sources
run fc-match 'sans-serif:lang=he'
run fc-match 'serif:lang=he'
fc-list : family | grep -E 'Frank Ruehl CLM|Ezra SIL|Noto Sans Hebrew' | sort -u

section "settings and migration unit"
run jewbuntu config validate
run systemctl --user is-enabled jewbuntu-migrate.service
run systemctl --user status --no-pager jewbuntu-migrate.service
ls -la "${XDG_STATE_HOME:-$HOME/.local/state}/jewbuntu/backups" 2>/dev/null

section "startup sound"
BOOT=$(cat /proc/sys/kernel/random/boot_id)
MARK=$(cat "${XDG_STATE_HOME:-$HOME/.local/state}/jewbuntu/startup-sound.boot_id" 2>/dev/null)
echo "boot_id now : $BOOT"
echo "marker      : ${MARK:-<none>}"
[ "$BOOT" = "$MARK" ] && echo "RESULT: autostart ran this boot (played, or skipped because muted)" || echo "RESULT: autostart has not run this boot (sound off, quiet window, or not yet logged in)"
run jewbuntu config get sound.startup
run wpctl get-volume @DEFAULT_AUDIO_SINK@
ls /etc/xdg/autostart/jewbuntu-startup-sound.desktop

section "upgrade readiness"
run jewbuntu upgrade-check

printf '\nPlay the jingle now as a preview? [y/N] ' >/dev/tty
read -r ans </dev/tty
if [ "$ans" = y ]; then run jewbuntu startup-sound preview; fi

section "manual checks (fill in Pass / Fail / Not tested)"
cat <<'EOF'
[ ] Jingle heard once at login after boot
[ ] Jingle NOT heard after lock + unlock (Super+L)
[ ] Jingle NOT heard after log out + log in again in the same boot
[ ] Dock at bottom, centred, hides when a window overlaps it
[ ] Window buttons (close/min/max) on the left
[ ] Jewbuntu wallpaper in light mode and in dark mode (Settings > Appearance)
[ ] Super+Space switches English <-> Hebrew; Hebrew shows in the top bar
[ ] Type Hebrew with nikud in Text Editor (e.g. Shift + key combinations); renders clearly
[ ] Mixed Hebrew/English line copy-pasted between Text Editor and Firefox keeps order
[ ] Change the dock position yourself, then `jewbuntu defaults restore` puts back only Jewbuntu keys
EOF
echo; echo "Report saved to $OUT"
