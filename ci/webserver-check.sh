#!/bin/bash
# Exercise the Jewbuntu Web Server helper for real inside an Ubuntu 26.04 container
# (no systemd: the helper falls back to `service`). Needs network for apt.
# usage: ci/webserver-check.sh dist/worktree
set -eu
DIST="${1:?usage: ci/webserver-check.sh DISTDIR}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker run --rm ${PLATFORM:+--platform $PLATFORM} -v "$ROOT/$DIST:/dist:ro" ubuntu:26.04 bash -c '
set -u
fails=0
pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }
check() { local d="$1"; shift; if "$@" >/dev/null 2>&1; then pass "$d"; else fail "$d"; fi; }
export DEBIAN_FRONTEND=noninteractive
for i in 1 2 3; do apt-get update -q >/dev/null 2>&1 && break; sleep 5; done
apt-get install -y -q curl /dist/jewbuntu-webserver_*.deb >/tmp/apt.log 2>&1 || { tail -20 /tmp/apt.log; exit 1; }
H=/usr/libexec/jewbuntu/jewbuntu-webserver-helper
check "helper installed and executable" test -x $H
check "polkit policy installed" test -f /usr/share/polkit-1/actions/org.jewbuntu.webserver.policy
check "package pulled in no server" bash -c "! dpkg -l apache2 2>/dev/null | grep -q ^ii"
useradd -m t
export JEWBUNTU_TEST_USER=t
out=$($H status); echo "  status: $out"
check "status before install: not installed" grep -q "\"installed\":false" <<<"$out"
out=$($H add-site "../evil" || true); check "rejects bad site name" grep -q "\"ok\":false" <<<"$out"
out=$(JEWBUNTU_TEST_USER=root $H status || true); check "refuses root as site owner" grep -q "refusing" <<<"$out"
for i in 1 2 3; do out=$($H install) && break; sleep 5; done; echo "  install: $out"
check "install: installed" grep -q "\"installed\":true" <<<"$out"
check "install: running" grep -q "\"running\":true" <<<"$out"
check "apache listens on loopback only (ports.conf)" bash -c "grep -q \"^Listen 127.0.0.1:80\$\" /etc/apache2/ports.conf && ! grep -q \"^Listen 80\$\" /etc/apache2/ports.conf"
check "original ports.conf kept" test -f /etc/apache2/ports.conf.jewbuntu-orig
check "mariadb bound to 127.0.0.1" grep -q "bind-address = 127.0.0.1" /etc/mysql/mariadb.conf.d/60-jewbuntu.cnf
check "default site disabled" bash -c "! test -e /etc/apache2/sites-enabled/000-default.conf"
out=$($H add-site demo); echo "  add-site: $out"
check "add-site ok" grep -q "\"ok\":true" <<<"$out"
check "site folder owned by user" bash -c "[ \$(stat -c %U /home/t/Sites/demo) = t ]"
check "home not opened to others (www-data gets x via ACL only)" bash -c "getfacl -p /home/t | grep -q \"^user:www-data:--x\""
page=$(curl -s --resolve demo.localhost:80:127.0.0.1 http://demo.localhost/)
check "site serves PHP over loopback" grep -q "demo.localhost is working" <<<"$page"
check "PHP executed (no raw <?php)" bash -c "! grep -q \"<?php\" <<<\"\$0\"" "$page"
code=$(curl -s -o /dev/null -w %{http_code} --resolve other.localhost:80:127.0.0.1 http://other.localhost/)
echo "  unknown vhost answered $code"
out=$($H create-db demo); echo "  create-db: ${out%%\"password*}..."
pw=$(sed -E "s/.*\"password\":\"([^\"]+)\".*/\1/" <<<"$out")
check "db user can log in with generated password" mariadb -ujb_demo -p"$pw" -e "use jb_demo"
check "generated password is 20 chars" test ${#pw} -eq 20
LAN=$(hostname -I | cut -d" " -f1)
check "not sharing: network address refused" bash -c "! curl -s --connect-timeout 3 -o /dev/null http://$LAN/"
out=$($H share on); check "share on" grep -q "\"sharing\":true" <<<"$out"
check "sharing: site answers on network address" grep -q "demo.localhost is working" <<<"$(curl -s -H "Host: demo.localhost" http://$LAN/)"
check "share on: Listen 80" grep -q "^Listen 80\$" /etc/apache2/ports.conf
check "share on: Require all granted" grep -q "Require all granted" /etc/apache2/jewbuntu-access.conf
out=$($H share off); check "share off" grep -q "\"sharing\":false" <<<"$out"
check "share off: loopback again" grep -q "^Listen 127.0.0.1:80\$" /etc/apache2/ports.conf
check "share off: Require local" grep -q "^Require local\$" /etc/apache2/jewbuntu-access.conf
check "share off: network address refused again" bash -c "! curl -s --connect-timeout 3 -o /dev/null http://$LAN/"
check "apache config valid after toggles" apache2ctl -t
mkdir -p /home/t/Sites/ci/public && echo "<?php echo \"ci-public-ok\";" > /home/t/Sites/ci/public/index.php && chown -R t:t /home/t/Sites/ci
out=$($H add-site ci public); check "add-site with public docroot" grep -q "\"ok\":true" <<<"$out"
check "public docroot served" grep -q ci-public-ok <<<"$(curl -s --resolve ci.localhost:80:127.0.0.1 http://ci.localhost/)"
out=$($H status); echo "  status: $out"
check "status lists both sites" grep -q "\"sites\":\[\"ci\",\"demo\"\]" <<<"$out"
out=$($H remove-site demo); check "remove-site ok" grep -q "\"ok\":true" <<<"$out"
check "remove-site kept files" test -f /home/t/Sites/demo/index.php
check "remove-site removed vhost" bash -c "! test -e /etc/apache2/sites-available/jewbuntu-t-demo.conf"
out=$($H stop); check "stop" grep -q "\"running\":false" <<<"$out"
out=$($H start); check "start" grep -q "\"running\":true" <<<"$out"
echo "failures: $fails"; exit $fails
'
