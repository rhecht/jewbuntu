#!/bin/sh
# Test the one-file Cutefish installer in the Cutefish test image: refuses without Cutefish,
# --list, install with --yes, what it installed, --uninstall.
# usage: ci/installer-test-cutefish.sh INSTALLER.run [ARCH]     (ARCH: arm64 default, or amd64)
set -eu
RUN="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; ARCH="${2:-arm64}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker run --rm --platform "linux/$ARCH" -v "$RUN:/i.run:ro" "jewbuntu-cutefish-test:$ARCH" sh -c '
PASS=0; FAIL=0
ok() { PASS=$((PASS+1)); echo "PASS  $*"; }; bad() { FAIL=$((FAIL+1)); echo "FAIL  $*"; }
sh /i.run --list | grep -q jewbuntu-cutefish_ && ok "--list shows the packages" || bad "--list"
sh /i.run --help | grep -q Cutefish && ok "--help" || bad "--help"
# Without Cutefish it must refuse and change nothing: hide the package from dpkg briefly.
cp /var/lib/dpkg/status /tmp/status.bak
awk -v RS= -v ORS="\n\n" "!/^Package: cutefish-compositor\n/" /tmp/status.bak > /var/lib/dpkg/status
if sh /i.run --yes > /tmp/no.log 2>&1; then bad "installs without Cutefish"; else grep -q "Cutefish isn.t installed" /tmp/no.log && ok "refuses without Cutefish" || bad "wrong refusal: $(tail -1 /tmp/no.log)"; fi
cp /tmp/status.bak /var/lib/dpkg/status
dpkg-query -W jewbuntu-cutefish >/dev/null 2>&1 && bad "refusal installed something" || ok "refusal changed nothing"
sh /i.run --yes > /tmp/in.log 2>&1 && ok "install with --yes" || { bad "install"; tail -15 /tmp/in.log; }
for p in jewbuntu-cutefish shulgo-xfce jewbuntu-branding jewbuntu-core; do
  dpkg-query -W -f="\${Status}" $p 2>/dev/null | grep -q "ok installed" && ok "$p installed" || bad "$p missing"
done
grep -q "Star of David" /usr/share/cutefish-compositor/shell/launchpad.svg && ok "Star of David Launchpad button" || bad "launchpad"
sh /i.run --yes --uninstall > /tmp/un.log 2>&1 && ok "--uninstall" || bad "--uninstall"
for p in jewbuntu-cutefish shulgo-xfce jewbuntu-branding jewbuntu-core; do
  dpkg-query -W -f="\${Status}" $p 2>/dev/null | grep -q "ok installed" && bad "$p still installed" || ok "$p removed"
done
grep -q "Star of David" /usr/share/cutefish-compositor/shell/launchpad.svg && bad "launchpad not restored" || ok "Cutefish Launchpad button back"
dpkg-query -W -f="\${Status}" cutefish-compositor | grep -q "ok installed" && ok "Cutefish itself still installed" || bad "Cutefish removed"
echo "== installer ($(dpkg --print-architecture)): $PASS passed, $FAIL failed"; [ "$FAIL" = 0 ]'
