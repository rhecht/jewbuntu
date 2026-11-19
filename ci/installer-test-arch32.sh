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
grep -q "NOT FOR MODERN WEB BROWSING" /tmp/install.log && pass "installer states it is not for modern web browsing" || fail "browsing note missing"
sh /jewbuntu.run --uninstall --yes > /tmp/remove.log 2>&1 && pass "--uninstall --yes finished" || { fail "uninstall"; tail -20 /tmp/remove.log; }
n=$(pacman -Qq | grep -cE "^(jewbuntu-|shulgo-xfce)"); [ "$n" = 0 ] && pass "no Jewbuntu or ShulGo packages left" || fail "$n left"
pacman -Q xfce4-session xfwm4 >/dev/null && pass "Xfce itself still installed" || fail "Xfce was removed"
left=$(ls -d /usr/share/themes/Jewbuntu* /usr/share/icons/Jewbuntu* /usr/share/jewbuntu /usr/lib/jewbuntu /etc/xdg/jewbuntu 2>/dev/null || true)
[ -z "$left" ] && pass "nothing left behind" || fail "left: $left"
echo "failures: $fails"; exit $fails
'
