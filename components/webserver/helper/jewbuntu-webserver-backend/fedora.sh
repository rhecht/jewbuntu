# Fedora (Fedora Asahi Remix) backend for jewbuntu-webserver-helper (sourced, not run):
# dnf, httpd with conf.d, PHP through php-fpm, MariaDB in /etc/my.cnf.d, vsftpd as its own
# vsftpd@jewbuntu instance, firewalld, SELinux. Uses the helper's die, svc, USER_NAME,
# USER_HOME and SITES.
#
# Overlay rule: this backend never edits a file a Fedora package owns. It only writes files
# of its own (00-jewbuntu.conf, jewbuntu-USER-NAME.conf, 99-jewbuntu.ini, 60-jewbuntu.cnf,
# /etc/vsftpd/jewbuntu*), and changes the firewall and SELinux only through firewall-cmd,
# semodule and semanage. So Fedora's httpd.conf keeps its "Listen 80"; local-only comes from
# "Require local" on everything (in 00-jewbuntu.conf) plus firewalld, which keeps port 80
# closed to the network until sharing is switched on.
# shellcheck shell=bash

PACKAGES=(httpd mariadb-server php php-fpm php-mysqlnd php-xml php-mbstring php-gd php-intl php-pecl-zip php-sodium acl unzip composer phpMyAdmin vsftpd openssl policycoreutils-python-utils)
WEB_USER=apache
MAIN_CONF=/etc/httpd/conf.d/00-jewbuntu.conf
MARIADB_CNF=/etc/my.cnf.d/60-jewbuntu.cnf
PHP_INI=/etc/php.d/99-jewbuntu.ini
FTP_UNIT=vsftpd@jewbuntu
FTP_CONF=/etc/vsftpd/jewbuntu.conf
FTP_USERS=/etc/vsftpd/jewbuntu-users
FTP_USER_DIR=/etc/vsftpd/jewbuntu-user.d
FTP_KEY=/etc/vsftpd/jewbuntu-ftp.key
FTP_CERT=/etc/vsftpd/jewbuntu-ftp.crt
STATE=/var/lib/jewbuntu-webserver
FW_OPENED="$STATE/firewalld-opened"
SELINUX_CIL=/usr/share/jewbuntu/webserver/selinux/jewbuntu_webserver.cil
# Booleans the sites need: Apache serving ~/Sites, WordPress/Composer-style outbound requests
# from PHP (plugin and theme installs, updates), and vsftpd's passive-mode data ports.
SELINUX_BOOLEANS=(httpd_enable_homedirs httpd_can_network_connect ftpd_use_passive_mode)

pkg_ok() { rpm -q "$1" >/dev/null 2>&1; }
installed() { pkg_ok httpd && pkg_ok mariadb-server && pkg_ok php; }
services_running() { svc is-active httpd && svc is-active mariadb && svc is-active php-fpm; }

start_services() {
    svc start mariadb; svc start php-fpm; svc start httpd
    pkg_ok vsftpd && [ -f "$FTP_CONF" ] && { svc start "$FTP_UNIT" || true; }
    return 0
}
stop_services() {
    svc stop httpd; svc stop php-fpm; svc stop mariadb
    pkg_ok vsftpd && { svc stop "$FTP_UNIT" || true; }
    return 0
}

sharing() { grep -q '^# Sharing: on$' "$MAIN_CONF" 2>/dev/null; }

write_main_conf() { # on|off
    local access
    if [ "$1" = on ]; then
        access='# Sharing is on: Fedora'\''s own rules decide (Jewbuntu sites allow everyone).'
    else
        access='<Location "/">
    AuthMerging And
    Require local
</Location>'
    fi
    cat > "$MAIN_CONF" <<CONF
# Managed by Jewbuntu Web Server. Rewritten when sharing is switched on or off.
# Sharing: $1
ServerName localhost

# http://localhost and any name without a site get Fedora's own page, never someone's site:
# the first <VirtualHost> is Apache's default, and this file loads before jewbuntu-*.conf.
<VirtualHost *:80>
    ServerName localhost
</VirtualHost>

# Who may open anything on this server. Fedora's httpd.conf keeps "Listen 80"; with sharing
# off, everything answers only this computer. "AuthMerging And" adds this on top of Fedora's
# own rules (they still deny .ht* files and everything outside the served folders).
$access

# phpMyAdmin answers only this computer, always, even while sharing is on.
<LocationMatch "(?i)^/phpmyadmin">
    AuthMerging And
    Require local
</LocationMatch>
CONF
}

configure_php() {
    # PHP (php-fpm reads /etc/php.d too), for local development:
    # - pcre.jit=0: PCRE's JIT needs executable memory, which SELinux denies Apache and
    #   php-fpm (httpd_execmem is off). Keep the protection; skip the JIT.
    # - Upload/memory limits that let WordPress take ordinary photos, themes and plugins.
    cat > "$PHP_INI" <<'INI'
; Managed by Jewbuntu Web Server (local development defaults)
pcre.jit = 0
upload_max_filesize = 128M
post_max_size = 128M
memory_limit = 256M
max_execution_time = 120
INI
}

configure_mariadb() {
    # MariaDB: localhost only (Fedora's server listens on every address by default).
    printf '# Managed by Jewbuntu Web Server\n[mysqld]\nbind-address = 127.0.0.1\n' > "$MARIADB_CNF"
}

configure_ftp() { # local|shared
    pkg_ok vsftpd || return 0
    local listen="listen_address=127.0.0.1" tls=NO
    [ "$1" = shared ] && { listen="# listening on all addresses (sharing is on)"; tls=YES; }
    install -d -m 755 "$FTP_USER_DIR"
    if [ ! -s "$FTP_CERT" ] || [ ! -s "$FTP_KEY" ]; then
        # A certificate of our own for FTP over TLS (Fedora has no ready-made snakeoil one).
        ( umask 077; openssl req -x509 -newkey rsa:3072 -nodes -days 3650 -subj "/CN=$(hostname)" \
            -keyout "$FTP_KEY" -out "$FTP_CERT" >> "$LOG" 2>&1 ) || die "could not create the FTP certificate"
    fi
    # Our own instance (vsftpd@jewbuntu.service runs vsftpd $FTP_CONF); Fedora's vsftpd.conf is untouched.
    cat > "$FTP_CONF" <<CONF
# Managed by Jewbuntu Web Server; runs as $FTP_UNIT.service.
# Logins listed in $FTP_USERS, each locked into their own ~/Sites.
listen=YES
listen_ipv6=NO
$listen
background=YES
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
chroot_local_user=YES
allow_writeable_chroot=YES
user_config_dir=$FTP_USER_DIR
userlist_enable=YES
userlist_deny=NO
userlist_file=$FTP_USERS
pam_service_name=vsftpd
secure_chroot_dir=/usr/share/empty
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=40100
ssl_enable=YES
rsa_cert_file=$FTP_CERT
rsa_private_key_file=$FTP_KEY
allow_anon_ssl=NO
# vsftpd's session-reuse check fails with TLS 1.3 clients such as Fedora's curl ("522 session
# reuse required"). Data connections are still accepted only from the logged-in client's own
# address (pasv_promiscuous=NO, the default).
require_ssl_reuse=NO
pasv_promiscuous=NO
force_local_logins_ssl=$tls
force_local_data_ssl=$tls
xferlog_enable=YES
CONF
    if [ -n "${USER_NAME:-}" ]; then
        printf 'local_root=%s\n' "$SITES" > "$FTP_USER_DIR/$USER_NAME"
        install -d -o "$USER_NAME" -g "$USER_NAME" -m 755 "$SITES"
        touch "$FTP_USERS"
        grep -qx "$USER_NAME" "$FTP_USERS" || echo "$USER_NAME" >> "$FTP_USERS"
    fi
    touch "$FTP_USERS"
    svc enable "$FTP_UNIT" || true
    svc restart "$FTP_UNIT" || true
}

# ---------- SELinux (enforcing on Fedora) ----------
# Our own policy module labels every ~/Sites as httpd_user_rw_content_t (Apache and php-fpm may
# read and write it) and lets vsftpd manage files there and nowhere else, instead of the much
# broader ftpd_full_access boolean. Booleans are set with semanage. Nothing edits policy files.
selinux_tools() { command -v semodule >/dev/null 2>&1 && command -v semanage >/dev/null 2>&1 && [ -d /etc/selinux ]; }

configure_selinux() {
    selinux_tools || return 0
    install -d -m 755 "$STATE"
    local sum; sum="$(sha256sum "$SELINUX_CIL" | cut -d' ' -f1)"
    if [ "$(cat "$STATE/selinux-module.sha256" 2>/dev/null)" != "$sum" ] || ! semodule -l | grep -qx jewbuntu_webserver; then
        semodule -i "$SELINUX_CIL" >> "$LOG" 2>&1 || die "could not install the Web Server's SELinux policy"
        echo "$sum" > "$STATE/selinux-module.sha256"
    fi
    local b missing=()
    for b in "${SELINUX_BOOLEANS[@]}"; do
        semanage boolean -l -C 2>/dev/null | grep -qE "^$b +\\(on" || missing+=("boolean -m --on $b")
    done
    if [ ${#missing[@]} -gt 0 ]; then
        printf '%s\n' "${missing[@]}" | semanage import >> "$LOG" 2>&1 || die "could not set the SELinux options for the web server"
    fi
}

relabel() { # PATH: apply the module's labels (no-op while SELinux is off)
    command -v selinuxenabled >/dev/null 2>&1 && selinuxenabled || return 0
    restorecon -R "$1" >> "$LOG" 2>&1 || true
}

prepare_site_dir() { relabel "$SITES"; }

# ---------- firewalld ----------
# Sharing opens http, FTP (port 21) and the passive FTP ports in the active zones, and
# remembers what it opened; switching sharing off closes exactly that (and nothing the owner
# opened). Plain ports rather than firewalld's "ftp" service: that service adds the FTP
# conntrack helper, which cannot read the TLS-encrypted logins required while sharing.
FW_ITEMS=("service http" "port 21/tcp" "port 40000-40100/tcp")
fw_running() { command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; }
fw_zones() {
    { firewall-cmd --get-default-zone; firewall-cmd --get-active-zones | grep -v '^[[:space:]]'; } 2>/dev/null \
        | sed 's/[[:space:]].*//' | grep -E '^[A-Za-z0-9_-]+$' | sort -u || true
}
fw_open() {
    fw_running || return 0
    install -d -m 755 "$STATE"
    local z item kind value
    while IFS= read -r z; do
        for item in "${FW_ITEMS[@]}"; do
            read -r kind value <<<"$item"
            firewall-cmd -q --zone="$z" "--query-$kind=$value" 2>/dev/null && continue
            firewall-cmd -q --zone="$z" "--add-$kind=$value" >> "$LOG" 2>&1 || continue
            firewall-cmd -q --permanent --zone="$z" "--add-$kind=$value" >> "$LOG" 2>&1 || true
            echo "$z $kind $value" >> "$FW_OPENED"
        done
    done < <(fw_zones)
}
fw_close() {
    [ -f "$FW_OPENED" ] || return 0
    local z kind value cmd=firewall-cmd
    fw_running || cmd=firewall-offline-cmd
    command -v "$cmd" >/dev/null 2>&1 || return 0
    while read -r z kind value; do
        [ -n "$value" ] || continue
        [ "$cmd" = firewall-cmd ] && { firewall-cmd -q --zone="$z" "--remove-$kind=$value" >> "$LOG" 2>&1 || true; }
        $cmd -q --permanent --zone="$z" "--remove-$kind=$value" >> "$LOG" 2>&1 || true
    done < "$FW_OPENED"
    rm -f "$FW_OPENED"
}

# ---------- commands ----------

configure_local() {
    write_main_conf off
    configure_mariadb
    configure_php
    configure_ftp local
    fw_close
}

list_sites() {
    local f n
    for f in /etc/httpd/conf.d/jewbuntu-"$USER_NAME"-*.conf; do
        [ -e "$f" ] || continue
        n="${f##*/jewbuntu-$USER_NAME-}"; echo "${n%.conf}"
    done
}

cmd_install() {
    echo "== $(date -R) install" >> "$LOG"
    dnf -y -q makecache >> "$LOG" 2>&1 || die "Could not reach Fedora's package servers. Check the internet connection and try again."
    dnf -y install "${PACKAGES[@]}" >> "$LOG" 2>&1 \
        || die "Installing the packages failed: $(grep -iE 'error|problem' "$LOG" | tail -1)"
    configure_selinux
    install -d -o "$USER_NAME" -g "$USER_NAME" -m 755 "$SITES"
    relabel "$SITES"
    configure_local
    # Fedora installs services stopped and disabled: turn them on now and at boot.
    svc enable mariadb || die "MariaDB did not start; see journalctl -u mariadb"
    svc enable php-fpm || die "PHP (php-fpm) did not start; see journalctl -u php-fpm"
    httpd -t >> "$LOG" 2>&1 || die "Apache rejected the configuration (see $LOG)"
    svc enable httpd || die "Apache did not start; see journalctl -u httpd"
    svc restart httpd || true
    svc restart php-fpm || true
    cmd_status
}

cmd_share() {
    case "${1:-}" in
        on)  write_main_conf on
             configure_ftp shared
             fw_open ;;
        off) configure_local ;;
        *) die "share on|off" ;;
    esac
    httpd -t >> "$LOG" 2>&1 || die "Apache rejected the configuration (see $LOG)"
    svc reload httpd || svc restart httpd || true
    cmd_status
}

write_site() { # NAME DOCROOT
    local name="$1" root="$2"
    cat > "/etc/httpd/conf.d/jewbuntu-$USER_NAME-$name.conf" <<CONF
# Managed by Jewbuntu Web Server for $USER_NAME. Edit freely; removing the site keeps the files.
# Who may open it (this computer only, or everyone while sharing) is set in 00-jewbuntu.conf.
<VirtualHost *:80>
    ServerName $name.localhost
    DocumentRoot "$root"
    <Directory "$root">
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog logs/jewbuntu-$name-error.log
    CustomLog logs/jewbuntu-$name-access.log combined
</VirtualHost>
CONF
    httpd -t >/dev/null 2>&1 || { rm -f "/etc/httpd/conf.d/jewbuntu-$USER_NAME-$name.conf"; die "Apache rejected the configuration"; }
    svc reload httpd || svc start httpd || true
}

remove_site() { # NAME
    rm -f "/etc/httpd/conf.d/jewbuntu-$USER_NAME-$1.conf"
    svc reload httpd || true
}

system_refresh() {
    # Package upgrades: bring Jewbuntu's own files up to date; keep the sharing state.
    if installed && [ -f "$MAIN_CONF" ]; then
        if sharing; then write_main_conf on; else write_main_conf off; fi
        configure_php
        configure_selinux
        svc is-active httpd && { svc reload httpd || true; }
        svc is-active php-fpm && { svc reload php-fpm || true; }
    fi
    return 0
}
