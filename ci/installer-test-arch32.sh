#!/bin/sh
# Run the one-file Arch Linux 32 installer for real in the i686 test container (ci/arch32-test.sh's
# image, which already has Xfce and the pango hold): --list, a damaged copy, install --yes as root,
# then --uninstall --yes, and check that Xfce itself is still installed afterwards.
# usage: ci/installer-test-arch32.sh dist/release/jewbuntu-arch32-installer-VERSION.run
set -eu
RUN="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
docker run --rm -v "$RUN:/jewbuntu.run:ro" jewbuntu-arch32-test:latest bash -c '
set -u; fails=0
pass() { echo "PASS: $*"; }; fail() { echo "FAIL: $*"; fails=$((fails+1)); }
n=$(sh /jewbuntu.run --list | grep -c "\.pkg\.tar\.zst$"); [ "$n" -ge 4 ] && pass "installer holds $n packages" || fail "package count $n"
cp /jewbuntu.run /tmp/bad.run; printf "X" | dd of=/tmp/bad.run bs=1 seek=$(( $(stat -c %s /tmp/bad.run) - 100 )) conv=notrunc 2>/dev/null
sh /tmp/bad.run --list >/dev/null 2>&1 && fail "damaged installer accepted" || pass "damaged installer refused"
sh /jewbuntu.run --yes --no-lightdm > /tmp/install.log 2>&1 && pass "install --yes finished" || { fail "install"; tail -20 /tmp/install.log; }
grep -q "Hold pango" /tmp/install.log && fail "offered the pango hold although pango is already held" || pass "no pango hold needed here (already held)"
for p in jewbuntu-skin jewbuntu-icons jewbuntu-core jewbuntu-xfce-desktop shulgo-xfce dillo lynx xfce4-genmon-plugin; do pacman -Q $p >/dev/null 2>&1 && pass "$p installed" || fail "$p missing"; done
grep -q "is installed" /tmp/install.log && pass "installer reports success" || fail "no success message"
apple=$(grep -l "M10.062 3.2488c0.4829" $(find /usr/share/icons/Jewbuntu* -name "start-here*.svg" 2>/dev/null) 2>/dev/null | wc -l)
star=$(grep -l "Star of David" /usr/share/icons/Jewbuntu*/places/*/start-here.svg 2>/dev/null | wc -l)
[ "$apple" = 0 ] && [ "$star" -gt 0 ] && pass "start-here icons are the Star of David, none is the Apple logo ($star checked)" || fail "start-here icons: $apple Apple, $star Star of David"
D=/usr/share/applications/jewbuntu-lynx.desktop
[ -f $D ] && grep -q "^Terminal=true" $D && pass "Lynx menu entry installed ($D, opens in a terminal)" || fail "Lynx menu entry missing"
if command -v desktop-file-validate >/dev/null; then v=$(desktop-file-validate $D 2>&1); [ -z "$v" ] && pass "Lynx menu entry is a valid .desktop file" || fail "desktop-file-validate: $v"; fi
c=$(lynx -cfg=/usr/share/jewbuntu/lynx/lynx.cfg -show_cfg 2>&1)
echo "$c" | grep -q "lite.duckduckgo.com" && echo "$c" | grep -q "jewbuntu.lss" && pass "Lynx reads the Jewbuntu settings (start page, colours) on top of /etc/lynx.cfg" || fail "Lynx settings not read: $(echo "$c" | head -3)"
printf "<h1>Shalom</h1><p>Lynx test page</p>" > /tmp/t.html
o=$(lynx -cfg=/usr/share/jewbuntu/lynx/lynx.cfg -dump file:///tmp/t.html 2>&1); echo "$o" | grep -q "Lynx test page" && pass "Lynx renders a page with the Jewbuntu settings" || fail "Lynx -dump: $o"
LX=$(sed -n "s/^Exec=//p" $D | sed "s/ %u//"); (sleep 8; printf q; sleep 1; printf y) | TERM=xterm-256color script -q -c "$LX file:///tmp/t.html" /tmp/lynx-tty.txt >/dev/null 2>&1
grep -a -q "\[34m" /tmp/lynx-tty.txt && ! grep -a -q "\[40m" /tmp/lynx-tty.txt && pass "Lynx from the menu entry draws Jewbuntu blue on the terminal background (no black page)" || fail "Lynx colours: $(grep -a -o "\[[0-9;]*m" /tmp/lynx-tty.txt | sort | uniq -c | sort -rn | head -5 | tr "\n" " ")"
useradd -m lt 2>/dev/null; su lt -c "export DISPLAY=:9; Xvfb :9 -screen 0 1024x768x24 -nolisten tcp >/dev/null 2>&1 & sleep 5; dbus-run-session -- sh -c \"gio launch $D >/tmp/gio.log 2>&1 & for i in \\\$(seq 1 100); do ps -o args= -u lt | grep -v -e \\\" -x \\\" -e grep | grep -q lynx.-cfg= && break; sleep 3; done; ps -o args= -u lt > /tmp/lt-ps.txt\"; pkill -u lt Xvfb" 2>/dev/null
grep -v -e " -x " /tmp/lt-ps.txt | grep -q "lynx -cfg=/usr/share/jewbuntu/lynx/lynx.cfg" && grep -q "xfce4-terminal -x lynx -cfg=" /tmp/lt-ps.txt && pass "the menu entry opens Lynx with the Jewbuntu settings in xfce4-terminal" || fail "menu entry did not start Lynx: $(tr "\n" " " < /tmp/lt-ps.txt) $(cat /tmp/gio.log)"
grep -q "NOT FOR MODERN WEB BROWSING" /tmp/install.log && pass "installer states it is not for modern web browsing" || fail "browsing note missing"
sh /jewbuntu.run --uninstall --yes > /tmp/remove.log 2>&1 && pass "--uninstall --yes finished" || { fail "uninstall"; tail -20 /tmp/remove.log; }
n=$(pacman -Qq | grep -cE "^(jewbuntu-|shulgo-xfce)"); [ "$n" = 0 ] && pass "no Jewbuntu or ShulGo packages left" || fail "$n left"
pacman -Q xfce4-session xfwm4 >/dev/null && pass "Xfce itself still installed" || fail "Xfce was removed"
left=$(ls -d /usr/share/themes/Jewbuntu* /usr/share/icons/Jewbuntu* /usr/share/jewbuntu /usr/lib/jewbuntu /etc/xdg/jewbuntu 2>/dev/null || true)
[ -z "$left" ] && pass "nothing left behind" || fail "left: $left"
echo "failures: $fails"; exit $fails
'
