#!/bin/bash
# Test the one-file installer on a fresh Ubuntu 26.04 container, as a normal user with sudo.
# usage: ci/installer-test.sh dist/release/jewbuntu-installer-VERSION.run
set -eu
RUN="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
docker run --rm ${PLATFORM:+--platform $PLATFORM} -v "$RUN:/home/inst.run:ro" ubuntu:26.04 bash -c '
set -u; fails=0
pass() { echo "PASS: $*"; }; fail() { echo "FAIL: $*"; fails=$((fails+1)); }
export DEBIAN_FRONTEND=noninteractive
for i in 1 2 3; do apt-get update -q >/dev/null 2>&1 && break; sleep 5; done
apt-get install -y -q sudo >/dev/null 2>&1
useradd -m -s /bin/bash t; echo "t ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/t
cp /home/inst.run /tmp/i.run; chmod 644 /tmp/i.run
head -c 5000000 /tmp/i.run > /tmp/bad.run
out=$(sudo -u t sh /tmp/bad.run --yes 2>&1); [ $? -ne 0 ] && grep -q "damaged" <<<"$out" && pass "damaged download refused" || fail "damaged download not refused: $out"
n=$(sudo -u t sh /tmp/i.run --list | grep -c "\.deb$"); [ "$n" = 11 ] && pass "--list shows 11 packages" || fail "--list shows $n"
sudo -u t sh /tmp/i.run --list | grep -q shulgo && fail "ShulGo inside" || pass "no ShulGo inside"
sudo -u t sh /tmp/i.run --help | grep -q -- "--no-look" && pass "--help" || fail "--help"
echo "--- installing (as user t, --yes) ..."
sudo -u t -H sh /tmp/i.run --yes > /tmp/inst.log 2>&1; rc=$?
tail -12 /tmp/inst.log
grep -q "Jewbuntu 0.1.0-m1.28 is installed" /tmp/inst.log && pass "final message shows the Jewbuntu version" || fail "final message version wrong"
[ $rc = 0 ] && pass "installer exit 0" || { fail "installer exit $rc"; grep -E "^E:|Error" /tmp/inst.log | head; }
for p in core branding hebrew desktop gnome jewish-service hub upgrade-tools webserver skin icons; do
  dpkg-query -W -f "\${db:Status-Abbrev}" jewbuntu-$p 2>/dev/null | grep -q "^ii" || fail "jewbuntu-$p not installed"
done && pass "all 11 packages installed"
dpkg -l ubuntu-desktop-minimal 2>/dev/null | grep -q ^ii && pass "Ubuntu desktop pulled in from the archive" || fail "ubuntu-desktop-minimal missing"
apt-get check >/dev/null 2>&1 && pass "apt consistent" || fail "apt-get check"
sudo -u t jewbuntu version && pass "jewbuntu command works" || fail "jewbuntu version"
test -x /usr/bin/jewbuntu-webserver -a -x /usr/bin/jewbuntu-hub && pass "Hub and Web Server installed" || fail "apps missing"
dpkg -l apache2 2>/dev/null | grep -q ^ii && fail "a web server was installed without asking" || pass "no web server until asked"
echo "--- running it again (update path) ..."
sudo -u t -H sh /tmp/i.run --yes --no-look > /tmp/inst2.log 2>&1 && pass "second run (update path) exit 0" || { fail "second run"; tail -5 /tmp/inst2.log; }
echo "failures: $fails"; exit $fails'
