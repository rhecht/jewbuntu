#!/bin/bash
# Runs inside the systemd-booted jewbuntu-fedora-webserver container (see ci/fedora-webserver-check.sh).
# Fedora counterpart of ci/webserver-check.sh: drives the real helper as root and the app's own
# site code (sites.js) as user t.
set -u
fails=0
pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }
check() { local d="$1"; shift; if "$@" >/dev/null 2>&1; then pass "$d"; else fail "$d"; fi; }
head -2 /etc/os-release
for i in $(seq 1 60); do s=$(systemctl is-system-running 2>/dev/null); case "$s" in running|degraded) break;; esac; sleep 1; done
echo "systemd: $s"
check "firewalld running (zone $(firewall-cmd --get-default-zone 2>/dev/null))" firewall-cmd --state

echo "== install the RPM"
for i in 1 2 3; do dnf -y -q install /rpms/jewbuntu-webserver-*.rpm >/tmp/install.log 2>&1 && break; sleep 5; done || { tail -20 /tmp/install.log; echo "failures: 1"; exit 1; }
H=/usr/libexec/jewbuntu/jewbuntu-webserver-helper
check "helper installed and executable" test -x $H
check "Fedora backend installed (and no Ubuntu one)" bash -c "test -f /usr/libexec/jewbuntu/jewbuntu-webserver-backend/fedora.sh && ! test -e /usr/libexec/jewbuntu/jewbuntu-webserver-backend/debian.sh"
check "polkit policy installed" test -f /usr/share/polkit-1/actions/org.jewbuntu.webserver.policy
check "package pulled in no server" bash -c "! rpm -q httpd mariadb-server php-fpm vsftpd phpMyAdmin"
check "no Conflicts/Obsoletes" bash -c "[ -z \"\$(rpm -q --conflicts --obsoletes jewbuntu-webserver | grep -v '^\$')\" ]"
rpm -qa --qf '%{NAME}\n' | grep -v '^jewbuntu-' | xargs rpm -ql 2>/dev/null | sort -u > /tmp/theirs
rpm -ql jewbuntu-webserver | while read -r f; do [ -d "$f" ] && [ ! -L "$f" ] || echo "$f"; done | sort -u > /tmp/ours
check "every file is owned only by jewbuntu-webserver" bash -c "[ -z \"\$(comm -12 /tmp/ours /tmp/theirs)\" ]"

export JEWBUNTU_TEST_USER=t
out=$($H status); echo "  status: $out"
check "status before install: not installed" grep -q '"installed":false' <<<"$out"
out=$($H add-site "../evil" || true); check "rejects bad site name" grep -q '"ok":false' <<<"$out"
out=$(JEWBUNTU_TEST_USER=root $H status || true); check "refuses root as site owner" grep -q "refusing" <<<"$out"

# Container-only: Docker Desktop's kernel has no ACLs on tmpfs, and Fedora's php-fpm pool sets an
# ACL on its socket in /run/php-fpm (fine on a real Fedora). Give that one folder a disk backing.
mkdir -p /var/lib/ci-php-fpm-run /run/php-fpm && mount --bind /var/lib/ci-php-fpm-run /run/php-fpm

echo "== Set up (dnf install of httpd, MariaDB, PHP, phpMyAdmin, vsftpd, Composer)"
for i in 1 2 3; do out=$($H install) && break; sleep 5; done; echo "  install: $out"
check "install: installed" grep -q '"installed":true' <<<"$out"
check "install: running" grep -q '"running":true' <<<"$out"
check "status: setup complete (phpMyAdmin, FTP, Composer)" grep -q '"complete":true' <<<"$out"
check "services enabled at boot (httpd, php-fpm, mariadb, vsftpd@jewbuntu)" systemctl is-enabled -q httpd php-fpm mariadb vsftpd@jewbuntu
rpmv() { # Fedora config files changed since install, minus the one Fedora's phpMyAdmin %post edits itself
  rpm -V httpd mariadb-server php-fpm php-common vsftpd phpMyAdmin 2>/dev/null | grep ' /etc/' | grep -v ' /etc/phpMyAdmin/config.inc.php$' > /tmp/rpmv; cat /tmp/rpmv; }
check "phpMyAdmin's config.inc.php is edited by Fedora's own %post (blowfish secret), not by Jewbuntu" bash -c "rpm -q --scripts phpMyAdmin | grep -q 'config.inc.php' && ! grep -q config.inc.php /usr/libexec/jewbuntu/jewbuntu-webserver-backend/fedora.sh"
rpmv
check "no Fedora config file edited (rpm -V)" bash -c "[ ! -s /tmp/rpmv ]"
check "httpd.conf still Fedora's own (Listen 80)" grep -q '^Listen 80$' /etc/httpd/conf/httpd.conf
check "00-jewbuntu.conf: sharing off, Require local" bash -c "grep -q '^# Sharing: off$' /etc/httpd/conf.d/00-jewbuntu.conf && grep -q 'Require local' /etc/httpd/conf.d/00-jewbuntu.conf"
check "mariadb listens on 127.0.0.1 only" bash -c "ss -ltn | grep -q '127.0.0.1:3306 ' && ! ss -ltn | grep -qE '(0.0.0.0|\\[::\\]|\\*):3306 '"
check "FTP (vsftpd@jewbuntu) listens on 127.0.0.1 only" bash -c "ss -ltn | grep -q '127.0.0.1:21 ' && ! ss -ltn | grep -qE '(0.0.0.0|\\[::\\]|\\*):21 '"
check "firewall: http not open while not sharing" bash -c "! firewall-cmd -q --query-service=http"

echo "== SELinux (policy store; not enforced in a container)"
check "Jewbuntu SELinux module installed" bash -c "semodule -l | grep -qx jewbuntu_webserver"
semanage boolean -l -C 2>/dev/null | grep -E '^(httpd|ftpd)_' | sed 's/^/  /'
for b in httpd_enable_homedirs httpd_can_network_connect ftpd_use_passive_mode; do
  check "boolean $b on (persistent)" bash -c "semanage boolean -l -C | grep -qE '^$b +\\(on'"
done
check "ftpd_full_access stays off" bash -c "! semanage boolean -l -C | grep -qE '^ftpd_full_access +\\(on'"
check "~/Sites labelled httpd_user_rw_content_t (file_contexts)" bash -c "matchpathcon /home/t/Sites/wp/index.php | grep -q httpd_user_rw_content_t"
check "other home files keep user_home_t" bash -c "matchpathcon /home/t/Documents/x | grep -q user_home_t"
P=$(ls /etc/selinux/targeted/policy/policy.* | tail -1)
check "policy: vsftpd may write in ~/Sites" bash -c "sesearch -A -s ftpd_t -t httpd_user_rw_content_t -c file -p write $P | grep -q 'allow ftpd_t httpd_user_rw_content_t'"
CIL=/usr/share/jewbuntu/webserver/selinux/jewbuntu_webserver.cil
check "module grants vsftpd writes only in ~/Sites (search-only on /home and home folders)" bash -c "[ -z \"\$(grep '^(allow' $CIL | grep -vE '^\(allow ftpd_t (httpd_user_rw_content_t|(home_root_t|user_home_dir_t) \(dir \(getattr search open\)\)\)$)')\" ]"
check "policy: Apache/php-fpm may write in ~/Sites (httpd_builtin_scripting)" bash -c "sesearch -A -s httpd_t -t httpd_user_rw_content_t -c file -p write $P | grep -q httpd_builtin_scripting"
check "policy: php-fpm binary runs as httpd_t" bash -c "matchpathcon /usr/sbin/php-fpm | grep -q httpd_exec_t"

echo "== PHP, phpMyAdmin"
check "phpMyAdmin login page at http://localhost/phpmyadmin/" grep -qi "phpMyAdmin" <<<"$(curl -s http://127.0.0.1/phpmyadmin/)"
mkdir -p /home/t/Sites/phpcheck && echo '<?php echo ini_get("pcre.jit"), "|", ini_get("upload_max_filesize"), "|", php_sapi_name();' > /home/t/Sites/phpcheck/index.php && chown -R t:t /home/t/Sites/phpcheck && $H add-site phpcheck >/dev/null
check "PHP through php-fpm: JIT off, 128M uploads" grep -qx "0|128M|fpm-fcgi" <<<"$(curl -s --resolve phpcheck.localhost:80:127.0.0.1 http://phpcheck.localhost/)"
$H remove-site phpcheck >/dev/null
rm -f /etc/php.d/99-jewbuntu.ini
dnf -y -q reinstall /rpms/jewbuntu-webserver-*.rpm >/dev/null 2>&1
check "package upgrade re-applies PHP settings (%post system-refresh)" test -f /etc/php.d/99-jewbuntu.ini
out=$($H system-refresh); check "system-refresh needs no user" grep -q '"ok":true' <<<"$out"

echo "== databases, FTP"
out=$($H db-login); dbpw=$(sed -E 's/.*"password":"([^"]+)".*/\1/' <<<"$out")
check "db-login: user can log in with the password" mariadb -ut -p"$dbpw" -h 127.0.0.1 -e "select 1"
check "db-login: works without password from the user terminal (unix_socket)" sudo -u t mariadb -e "select 1"
out=$($H db-login); dbpw2=$(sed -E 's/.*"password":"([^"]+)".*/\1/' <<<"$out")
check "db-login again: new password works, old one does not" bash -c "mariadb -ut -p\"$dbpw2\" -h 127.0.0.1 -e 'select 1' && ! mariadb -ut -p\"$dbpw\" -h 127.0.0.1 -e 'select 1' 2>/dev/null"
check "phpMyAdmin accepts the login" bash /tests/pma-login.sh t "$dbpw2"
echo "t:ci-ftp-$RANDOM-pass" > /tmp/ftpcred; chpasswd < /tmp/ftpcred; FTPPW=$(cut -d: -f2 /tmp/ftpcred)
echo "ftp-ok" > /tmp/up.txt
check "FTP: user logs in and uploads into ~/Sites" bash -c "curl -s -T /tmp/up.txt ftp://t:$FTPPW@127.0.0.1/up.txt && test -f /home/t/Sites/up.txt"
check "FTP: uploaded file belongs to the user" bash -c "[ \$(stat -c %U /home/t/Sites/up.txt) = t ]"
check "FTP: locked into ~/Sites (no /etc)" bash -c "! curl -s ftp://t:$FTPPW@127.0.0.1/etc/passwd -o /dev/null"

echo "== sites"
out=$($H add-site demo); echo "  add-site: $out"
check "add-site ok" grep -q '"ok":true' <<<"$out"
check "site folder owned by user" bash -c "[ \$(stat -c %U /home/t/Sites/demo) = t ]"
check "home not opened to others (apache gets x via ACL only)" bash -c "getfacl -p /home/t | grep -q '^user:apache:--x' && [ \$(stat -c %a /home/t | cut -c3) = 0 ]"
page=$(curl -s --resolve demo.localhost:80:127.0.0.1 http://demo.localhost/)
check "site serves PHP over loopback" grep -q "demo.localhost is working" <<<"$page"
check "PHP executed (no raw <?php)" bash -c '! grep -q "<?php" <<<"$0"' "$page"
check "unknown name does not land on a user site" bash -c "! curl -s --resolve other.localhost:80:127.0.0.1 http://other.localhost/ | grep -q 'localhost is working'"
check ".htaccess still denied by Fedora's rules" bash -c "touch /home/t/Sites/demo/.htaccess; [ \$(curl -s -o /dev/null -w %{http_code} --resolve demo.localhost:80:127.0.0.1 http://demo.localhost/.htaccess) = 403 ]"
out=$($H create-db demo); pw=$(sed -E 's/.*"password":"([^"]+)".*/\1/' <<<"$out")
check "db user can log in with generated password" mariadb -ujb_demo -p"$pw" -e "use jb_demo"
check "generated password is 20 chars" test ${#pw} -eq 20

echo "== sharing (another device = network namespace 'lan' behind a veth pair)"
ip netns add lan && ip link add jb-host type veth peer name jb-lan && ip link set jb-lan netns lan
ip addr add 10.88.0.1/24 dev jb-host && ip link set jb-host up
ip netns exec lan ip addr add 10.88.0.2/24 dev jb-lan; ip netns exec lan ip link set jb-lan up; ip netns exec lan ip link set lo up
LAN=10.88.0.1; DEV="ip netns exec lan"
check "the other device reaches this computer (ping)" $DEV ping -c1 -W2 $LAN
check "not sharing: network refused (firewalld)" bash -c "! $DEV curl -s --connect-timeout 3 -o /dev/null http://$LAN/"
systemctl stop firewalld
code=$($DEV curl -s --connect-timeout 3 -o /tmp/lanpage -w %{http_code} -H "Host: demo.localhost" http://$LAN/)
check "not sharing, firewall off: Apache itself refuses the network (403, no site)" bash -c "[ '$code' = 403 ] && ! grep -q 'is working' /tmp/lanpage"
check "not sharing, firewall off: FTP refuses the network" bash -c "! $DEV curl -s --connect-timeout 3 ftp://t:$FTPPW@$LAN/ -o /dev/null"
systemctl start firewalld; sleep 1
out=$($H share on); check "share on" grep -q '"sharing":true' <<<"$out"
check "sharing: site answers another device" grep -q "demo.localhost is working" <<<"$($DEV curl -s -H "Host: demo.localhost" http://$LAN/)"
check "share on: firewall opened http, FTP and passive ports (runtime and permanent)" bash -c "firewall-cmd -q --query-service=http && firewall-cmd -q --query-port=21/tcp && firewall-cmd -q --query-port=40000-40100/tcp && firewall-cmd -q --permanent --query-service=http && firewall-cmd -q --permanent --query-port=21/tcp"
check "share on: 00-jewbuntu.conf says sharing on" grep -q '^# Sharing: on$' /etc/httpd/conf.d/00-jewbuntu.conf
check "share on: phpMyAdmin refused to another device (403)" bash -c "[ \$($DEV curl -s -o /dev/null -w %{http_code} http://$LAN/phpmyadmin/) = 403 ] && [ \$($DEV curl -s -o /dev/null -w %{http_code} http://$LAN/phpMyAdmin/) = 403 ]"
check "share on: phpMyAdmin still works on this computer" grep -qi phpMyAdmin <<<"$(curl -s http://127.0.0.1/phpmyadmin/)"
check "share on: FTP reachable on the network" bash -c "ss -ltn | grep -qE '0.0.0.0:21 '"
check "share on: FTP refuses plain-text logins" bash -c "! $DEV curl -s --connect-timeout 5 ftp://t:$FTPPW@$LAN/ -o /dev/null"
check "share on: FTP over TLS works from another device" $DEV curl -s --connect-timeout 5 --ssl-reqd -k ftp://t:$FTPPW@$LAN/ -o /dev/null
sudo -u t gjs -m /tests/status-test.js > /tmp/st.json 2>&1; echo "  app status: $(cat /tmp/st.json)"
check "app (sites.js) sees sharing on" grep -q '"sharing":true' /tmp/st.json
out=$($H share off); check "share off" grep -q '"sharing":false' <<<"$out"
check "share off: Require local again" bash -c "grep -q '^# Sharing: off$' /etc/httpd/conf.d/00-jewbuntu.conf && grep -q 'Require local' /etc/httpd/conf.d/00-jewbuntu.conf"
check "share off: firewall closed again (runtime and permanent)" bash -c "! firewall-cmd -q --query-service=http && ! firewall-cmd -q --permanent --query-service=http && ! firewall-cmd -q --query-port=21/tcp && ! firewall-cmd -q --permanent --query-port=21/tcp"
check "share off: network refused again" bash -c "! $DEV curl -s --connect-timeout 3 -o /dev/null http://$LAN/"
check "share off: FTP back to 127.0.0.1 only" bash -c "ss -ltn | grep -q '127.0.0.1:21 ' && ! ss -ltn | grep -qE '0.0.0.0:21 '"
sudo -u t gjs -m /tests/status-test.js > /tmp/st.json 2>&1
check "app (sites.js) sees sharing off" grep -q '"sharing":false' /tmp/st.json
firewall-cmd -q --add-service=http
$H share on >/dev/null; $H share off >/dev/null
check "share off keeps a firewall opening the owner made" firewall-cmd -q --query-service=http
firewall-cmd -q --remove-service=http
check "Apache config valid after toggles" httpd -t

echo "== more sites"
mkdir -p /home/t/Sites/ci/public && echo '<?php echo "ci-public-ok";' > /home/t/Sites/ci/public/index.php && chown -R t:t /home/t/Sites/ci
out=$($H add-site ci public); check "add-site with public docroot" grep -q '"ok":true' <<<"$out"
check "public docroot served" grep -q ci-public-ok <<<"$(curl -s --resolve ci.localhost:80:127.0.0.1 http://ci.localhost/)"
out=$($H status); echo "  status: $out"
check "status lists both sites" grep -q '"sites":\["ci","demo"\]' <<<"$out"
out=$($H remove-site demo); check "remove-site ok" grep -q '"ok":true' <<<"$out"
check "remove-site kept files" test -f /home/t/Sites/demo/index.php
check "remove-site removed vhost" bash -c "! test -e /etc/httpd/conf.d/jewbuntu-t-demo.conf"
out=$($H stop); check "stop" grep -q '"running":false' <<<"$out"
out=$($H start); check "start" grep -q '"running":true' <<<"$out"
out=$($H install); check "install again (Finish setup path) is safe" grep -q '"complete":true' <<<"$out"
check "install again keeps sites" grep -q '"ci"' <<<"$out"

echo "== WordPress, CodeIgniter and empty sites through the app's own code (sites.js), as user t"
echo "t ALL=(root) NOPASSWD: /usr/libexec/jewbuntu/jewbuntu-webserver-helper" > /etc/sudoers.d/t
sudo -u t -H env JEWBUNTU_WEBSERVER_ELEVATE=sudo gjs -m /tests/sites-test.js 2>&1 | tee /tmp/sites.log
check "sites test: no errors" bash -c "! grep -q ^ERROR /tmp/sites.log"
check "duplicate site name refused" grep -q "^REFUSED duplicate" /tmp/sites.log
check "composer installed by setup" grep -q "composer=true" /tmp/sites.log
check "wp-config has FS_METHOD direct" grep -q "FS_METHOD.*direct" /home/t/Sites/wp/wp-config.php
check "wp-config not world-readable" bash -c "[ \$(stat -c %a /home/t/Sites/wp/wp-config.php | cut -c3) = 0 ]"
inst=$(curl -s --resolve wp.localhost:80:127.0.0.1 http://wp.localhost/wp-admin/install.php)
check "WordPress installer reaches its database" bash -c 'grep -q "step=1" <<<"$0" && ! grep -q "Error establishing" <<<"$0"' "$inst"
pw=$(head -c 12 /dev/urandom | base64 | tr -d /+=)
curl -s --resolve wp.localhost:80:127.0.0.1 -o /tmp/wp2.html "http://wp.localhost/wp-admin/install.php?step=2" \
  --data-urlencode "weblog_title=Jewbuntu CI Shul" --data-urlencode user_name=admin \
  --data-urlencode admin_password=$pw --data-urlencode admin_password2=$pw \
  --data-urlencode admin_email=ci@example.invalid --data-urlencode blog_public=0 --data-urlencode pw_weak=1
check "WordPress installs" grep -qi "success" /tmp/wp2.html
check "WordPress home page shows the site" grep -q "Jewbuntu CI Shul" <<<"$(curl -s -L --resolve wp.localhost:80:127.0.0.1 http://wp.localhost/)"
check "Apache (apache user) can write WordPress uploads" sudo -u apache mkdir -p /home/t/Sites/wp/wp-content/uploads/ci
check "CodeIgniter welcome page" grep -q "Welcome to CodeIgniter" <<<"$(curl -s --resolve ci4.localhost:80:127.0.0.1 http://ci4.localhost/)"
check "CodeIgniter can write its cache" sudo -u apache touch /home/t/Sites/ci4/writable/cache/ci-test
check "empty site works" grep -q "plain.localhost is working" <<<"$(curl -s --resolve plain.localhost:80:127.0.0.1 http://plain.localhost/)"
check "http://localhost is Fedora's own test page, not a user site" bash -c "curl -s http://127.0.0.1/ | grep -qi 'test page' && ! curl -s http://127.0.0.1/ | grep -q 'localhost is working'"
rpmv
check "still no Fedora config file edited after everything (rpm -V)" bash -c "[ ! -s /tmp/rpmv ]"

echo "== remove the package"
dnf -y -q remove jewbuntu-webserver >/dev/null 2>&1
check "removing the app keeps sites, databases and servers" bash -c "test -f /home/t/Sites/wp/wp-config.php && systemctl is-active -q httpd mariadb && mariadb -e 'use jb_wp'"
echo "failures: $fails"; exit $fails
