#!/bin/bash
# Exercise the Jewbuntu Web Server helper for real inside an Ubuntu 26.04 container
# (no systemd: the helper falls back to `service`). Needs network for apt.
# usage: ci/webserver-check.sh dist/worktree
set -eu
DIST="${1:?usage: ci/webserver-check.sh DISTDIR}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker run --rm ${PLATFORM:+--platform $PLATFORM} -v "$ROOT/$DIST:/dist:ro" -v "$ROOT/components/webserver/tests:/tests:ro" ubuntu:26.04 bash -c '
set -u
fails=0
pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }
check() { local d="$1"; shift; if "$@" >/dev/null 2>&1; then pass "$d"; else fail "$d"; fi; }
export DEBIAN_FRONTEND=noninteractive
for i in 1 2 3; do apt-get update -q >/dev/null 2>&1 && break; sleep 5; done
apt-get install -y -q curl sudo /dist/jewbuntu-webserver_*.deb >/tmp/apt.log 2>&1 || { tail -20 /tmp/apt.log; exit 1; }
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
check "Ubuntu default site still enabled" bash -c "test -e /etc/apache2/sites-enabled/000-default.conf"
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
# --- WordPress, CodeIgniter and empty sites through the same code as the app (sites.js), as user t
echo "t ALL=(root) NOPASSWD: /usr/libexec/jewbuntu/jewbuntu-webserver-helper" > /etc/sudoers.d/t
sudo -u t -H env JEWBUNTU_WEBSERVER_ELEVATE=sudo gjs -m /tests/sites-test.js 2>&1 | tee /tmp/sites.log
check "sites test: no errors" bash -c "! grep -q ^ERROR /tmp/sites.log"
check "duplicate site name refused" grep -q "^REFUSED duplicate" /tmp/sites.log
check "composer installed by setup" grep -q "composer=true" /tmp/sites.log
check "wp-config has FS_METHOD direct" grep -q "FS_METHOD.*direct" /home/t/Sites/wp/wp-config.php
check "wp-config not world-readable" bash -c "[ \$(stat -c %a /home/t/Sites/wp/wp-config.php | cut -c3) = 0 ]"
inst=$(curl -s --resolve wp.localhost:80:127.0.0.1 http://wp.localhost/wp-admin/install.php)
check "WordPress installer reaches its database" bash -c "grep -q \"step=1\" <<<\"\$0\" && ! grep -q \"Error establishing\" <<<\"\$0\"" "$inst"
pw=$(head -c 12 /dev/urandom | base64 | tr -d /+=)
curl -s --resolve wp.localhost:80:127.0.0.1 -o /tmp/wp2.html "http://wp.localhost/wp-admin/install.php?step=2" \
  --data-urlencode "weblog_title=Jewbuntu CI Shul" --data-urlencode user_name=admin \
  --data-urlencode admin_password=$pw --data-urlencode admin_password2=$pw \
  --data-urlencode admin_email=ci@example.invalid --data-urlencode blog_public=0 --data-urlencode pw_weak=1
check "WordPress installs" grep -qi "success" /tmp/wp2.html
check "WordPress home page shows the site" grep -q "Jewbuntu CI Shul" <<<"$(curl -s -L --resolve wp.localhost:80:127.0.0.1 http://wp.localhost/)"
check "Apache can write WordPress uploads" sudo -u www-data mkdir -p /home/t/Sites/wp/wp-content/uploads/ci
check "CodeIgniter welcome page" grep -q "Welcome to CodeIgniter" <<<"$(curl -s --resolve ci4.localhost:80:127.0.0.1 http://ci4.localhost/)"
check "CodeIgniter can write its cache" sudo -u www-data touch /home/t/Sites/ci4/writable/cache/ci-test
check "empty site works" grep -q "plain.localhost is working" <<<"$(curl -s --resolve plain.localhost:80:127.0.0.1 http://plain.localhost/)"
check "http://localhost is Ubuntu default page, not a user site" grep -q "Apache2 Default Page" <<<"$(curl -s http://127.0.0.1/)"
echo "failures: $fails"; exit $fails
'
