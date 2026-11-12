# Ubuntu backend for jewbuntu-webserver-helper (sourced, not run): apt, apache2 with
# a2ensite/a2enconf, mod_php, MariaDB in /etc/mysql, vsftpd.conf. Uses the helper's
# die, svc, USER_NAME, USER_HOME and SITES.
# shellcheck shell=bash

PACKAGES=(apache2 mariadb-server php libapache2-mod-php php-mysql php-xml php-mbstring php-curl php-zip php-gd php-intl acl unzip composer phpmyadmin vsftpd ssl-cert)
WEB_USER=www-data
PORTS=/etc/apache2/ports.conf
ACCESS=/etc/apache2/jewbuntu-access.conf
MARIADB_CNF=/etc/mysql/mariadb.conf.d/60-jewbuntu.cnf
PMA_LOCAL=/etc/apache2/conf-available/phpmyadmin-jewbuntu-local.conf
FTP_CONF=/etc/vsftpd.conf
FTP_USERS=/etc/vsftpd.jewbuntu-users

pkg_ok() { [ "$(dpkg-query -W -f '${db:Status-Abbrev}' "$1" 2>/dev/null || true)" = "ii " ]; }
installed() { pkg_ok apache2 && pkg_ok mariadb-server && pkg_ok php; }
services_running() { svc is-active apache2 && svc is-active mariadb; }

start_services() { svc start mariadb; svc start apache2; pkg_ok vsftpd && { svc start vsftpd || true; }; }
stop_services() { svc stop apache2; svc stop mariadb; pkg_ok vsftpd && { svc stop vsftpd || true; }; }

has_ipv6_loopback() { grep -qi '^0\{31\}1 ' /proc/net/if_inet6 2>/dev/null; }

sharing() { grep -q '^Listen 80$' "$PORTS" 2>/dev/null; }

configure_local() {
    # Apache: localhost only. ports.conf is Ubuntu's conffile; the original is kept as .jewbuntu-orig.
    [ -f "$PORTS.jewbuntu-orig" ] || cp -p "$PORTS" "$PORTS.jewbuntu-orig"
    # [::1] only when this machine has IPv6 loopback; Apache refuses to start otherwise.
    local v6=''; has_ipv6_loopback && v6='\nListen [::1]:80'
    sed -i -E "s/^Listen (80|0\\.0\\.0\\.0:80)\$/Listen 127.0.0.1:80$v6/" "$PORTS"
    printf '# Managed by Jewbuntu Web Server\nServerName localhost\n' > /etc/apache2/conf-available/jewbuntu-servername.conf
    a2enconf -q jewbuntu-servername >/dev/null
    printf '# Managed by Jewbuntu Web Server: who may open Jewbuntu sites.\nRequire local\n' > "$ACCESS"
    # MariaDB: localhost only (Ubuntu's default already, made explicit).
    printf '# Managed by Jewbuntu Web Server\n[mysqld]\nbind-address = 127.0.0.1\n' > "$MARIADB_CNF"
    a2enmod -q rewrite >/dev/null
    configure_php
    configure_phpmyadmin
    configure_ftp local
    # Ubuntu's default site stays enabled: http://localhost shows its page, and unknown
    # names never land on someone's site (000-default sorts first).
}

configure_php() {
    # PHP under Apache, for local development:
    # - pcre.jit=0: Ubuntu runs apache2 with MemoryDenyWriteExecute=yes, which makes PCRE's JIT
    #   fail and log a warning on every request. Keep the hardening; skip the JIT.
    # - Upload/memory limits that let WordPress take ordinary photos, themes and plugins
    #   (PHP's stock 2 MB upload limit rejects most of them).
    local d
    for d in /etc/php/*/apache2/conf.d; do
        [ -d "$d" ] || continue
        cat > "$d/99-jewbuntu.ini" <<'INI'
; Managed by Jewbuntu Web Server (local development defaults)
pcre.jit = 0
upload_max_filesize = 128M
post_max_size = 128M
memory_limit = 256M
max_execution_time = 120
INI
    done
}

configure_phpmyadmin() {
    pkg_ok phpmyadmin || return 0
    # Ubuntu's phpmyadmin.conf allows everyone. <Location> is applied after all <Directory>
    # rules regardless of file order, so this keeps phpMyAdmin local-only even while sites
    # are shared on the network. (A <Directory> rule here lost to phpmyadmin.conf, which
    # loads later alphabetically; the test suite checks this from the network side.)
    cat > "$PMA_LOCAL" <<'CONF'
# Managed by Jewbuntu Web Server: phpMyAdmin answers only this computer, always.
<Location /phpmyadmin>
    Require local
</Location>
CONF
    a2enconf -q phpmyadmin >/dev/null 2>&1 || true
    a2enconf -q phpmyadmin-jewbuntu-local >/dev/null
}

configure_ftp() { # local|shared
    pkg_ok vsftpd || return 0
    [ -f "$FTP_CONF.jewbuntu-orig" ] || cp -p "$FTP_CONF" "$FTP_CONF.jewbuntu-orig"
    local listen="listen_address=127.0.0.1" tls=NO
    [ "$1" = shared ] && { listen="# listening on all addresses (sharing is on)"; tls=YES; }
    cat > "$FTP_CONF" <<CONF
# Managed by Jewbuntu Web Server (original: $FTP_CONF.jewbuntu-orig).
# Ubuntu logins listed in $FTP_USERS, each locked into their own ~/Sites.
listen=YES
listen_ipv6=NO
$listen
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
chroot_local_user=YES
allow_writeable_chroot=YES
user_config_dir=/etc/vsftpd.jewbuntu-user.d
userlist_enable=YES
userlist_deny=NO
userlist_file=$FTP_USERS
pam_service_name=vsftpd
secure_chroot_dir=/var/run/vsftpd/empty
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=40100
ssl_enable=YES
rsa_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
rsa_private_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
allow_anon_ssl=NO
force_local_logins_ssl=$tls
force_local_data_ssl=$tls
xferlog_enable=YES
CONF
    install -d -m 755 /etc/vsftpd.jewbuntu-user.d
    printf 'local_root=%s\n' "$SITES" > "/etc/vsftpd.jewbuntu-user.d/$USER_NAME"
    install -d -o "$USER_NAME" -g "$USER_NAME" -m 755 "$SITES"
    touch "$FTP_USERS"
    grep -qx "$USER_NAME" "$FTP_USERS" || echo "$USER_NAME" >> "$FTP_USERS"
    svc restart vsftpd || true
}

site_conf() { echo "/etc/apache2/sites-available/jewbuntu-$USER_NAME-$1.conf"; }

list_sites() {
    local f n
    for f in /etc/apache2/sites-enabled/jewbuntu-"$USER_NAME"-*.conf; do
        [ -e "$f" ] || continue
        n="${f##*/jewbuntu-$USER_NAME-}"; echo "${n%.conf}"
    done
}

cmd_install() {
    # Wait for automatic updates to release the package lock instead of failing.
    local apt=(apt-get -q -o DPkg::Lock::Timeout=600)
    echo "== $(date -R) install" >> "$LOG"
    "${apt[@]}" update >> "$LOG" 2>&1 || die "Could not reach Ubuntu's package servers. Check the internet connection and try again."
    # phpMyAdmin: no questions; its own small database via dbconfig-common, set up for Apache.
    debconf-set-selections <<'SEL'
phpmyadmin phpmyadmin/dbconfig-install boolean true
phpmyadmin phpmyadmin/reconfigure-webserver multiselect apache2
SEL
    # Two passes: phpMyAdmin creates its database while installing, so MariaDB must be up first.
    local first=() p
    for p in "${PACKAGES[@]}"; do [ "$p" = phpmyadmin ] || first+=("$p"); done
    "${apt[@]}" install -y "${first[@]}" >> "$LOG" 2>&1 \
        || die "Installing the packages failed: $(grep -E '^E:' "$LOG" | tail -1)"
    svc start mariadb || true
    "${apt[@]}" install -y phpmyadmin >> "$LOG" 2>&1 \
        || die "Installing phpMyAdmin failed: $(grep -E '^E:' "$LOG" | tail -1)"
    configure_local
    # Listen addresses changed: restart (a reload with new Listen lines can kill Apache).
    svc restart apache2 || true
    cmd_status
}

cmd_share() {
    case "${1:-}" in
        on)  sed -i -E '/^Listen \[::1\]:80$/d; s/^Listen 127\.0\.0\.1:80$/Listen 80/' "$PORTS"
             printf '# Managed by Jewbuntu Web Server: sharing ON (anyone on your network)\nRequire all granted\n' > "$ACCESS"
             configure_ftp shared ;;
        off) configure_local ;;
        *) die "share on|off" ;;
    esac
    # Listen addresses changed: restart rather than reload so the sockets are rebound.
    svc restart apache2 || true
    cmd_status
}

prepare_site_dir() { :; }  # no SELinux on Ubuntu; AppArmor does not confine apache2

write_site() { # NAME DOCROOT
    local name="$1" root="$2"
    cat > "$(site_conf "$name")" <<CONF
# Managed by Jewbuntu Web Server for $USER_NAME. Edit freely; removing the site keeps the files.
<VirtualHost *:80>
    ServerName $name.localhost
    DocumentRoot "$root"
    <Directory "$root">
        Options FollowSymLinks
        AllowOverride All
        Include $ACCESS
    </Directory>
    ErrorLog \${APACHE_LOG_DIR}/jewbuntu-$name-error.log
    CustomLog \${APACHE_LOG_DIR}/jewbuntu-$name-access.log combined
</VirtualHost>
CONF
    a2ensite -q "jewbuntu-$USER_NAME-$name" >/dev/null
    apache2ctl -t >/dev/null 2>&1 || die "Apache rejected the configuration"
    svc reload apache2 || svc start apache2 || true
}

remove_site() { # NAME
    a2dissite -q "jewbuntu-$USER_NAME-$1" >/dev/null 2>&1 || true
    rm -f "$(site_conf "$1")"
    svc reload apache2 || true
}

system_refresh() {
    if installed && [ -f "$ACCESS" ]; then
        configure_php
        configure_phpmyadmin
        svc is-active apache2 && { svc reload apache2 || true; }
    fi
    return 0
}
