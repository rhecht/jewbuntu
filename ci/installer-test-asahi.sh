#!/bin/sh
# Run the one-file Asahi installer for real in a clean Fedora 45 container: install with --yes,
# check the packages, then --uninstall --yes and check everything is gone. As root (no account look).
# usage: ci/installer-test-asahi.sh dist/release/jewbuntu-asahi-installer-VERSION.run
set -eu
RUN="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
docker run --rm -v "$RUN:/jewbuntu.run:ro" "fedora:${FEDORA:-45}" bash -c '
set -u; fails=0
pass() { echo "PASS: $*"; }; fail() { echo "FAIL: $*"; fails=$((fails+1)); }
dnf -y -q install gnome-shell >/dev/null 2>&1 || { echo "could not install gnome-shell"; exit 1; }
sh /jewbuntu.run --list | grep -c "\.rpm$" | grep -qx 9 && pass "installer holds 9 packages" || fail "package count"
sh /jewbuntu.run --yes > /tmp/install.log 2>&1 && pass "install --yes finished" || { fail "install"; tail -20 /tmp/install.log; }
n=$(rpm -qa "jewbuntu-*" | wc -l); [ "$n" = 9 ] && pass "9 Jewbuntu packages installed" || fail "installed $n"
for p in jewbuntu-shulgo jewbuntu-webserver jewbuntu-hub jewbuntu-skin; do rpm -q $p >/dev/null && pass "$p installed" || fail "$p missing"; done
grep -q "is installed" /tmp/install.log && pass "installer reports success" || fail "no success message"
printf "corrupt" | dd of=/tmp/bad.run bs=1 conv=notrunc 2>/dev/null; cp /jewbuntu.run /tmp/bad.run; printf "X" | dd of=/tmp/bad.run bs=1 seek=$(( $(stat -c %s /tmp/bad.run) - 100 )) conv=notrunc 2>/dev/null
sh /tmp/bad.run --list >/dev/null 2>&1 && fail "damaged installer accepted" || pass "damaged installer refused"
sh /jewbuntu.run --uninstall --yes > /tmp/remove.log 2>&1 && pass "--uninstall --yes finished" || { fail "uninstall"; tail -20 /tmp/remove.log; }
n=$(rpm -qa "jewbuntu-*" | wc -l); [ "$n" = 0 ] && pass "no Jewbuntu packages left" || fail "$n left"
left=$(ls -d /usr/share/themes/Jewbuntu* /usr/share/icons/Jewbuntu* /usr/share/jewbuntu /usr/lib/jewbuntu 2>/dev/null || true)
[ -z "$left" ] && pass "nothing left under /usr" || fail "left: $left"
echo "failures: $fails"; exit $fails
'
