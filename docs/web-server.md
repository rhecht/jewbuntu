# Jewbuntu Web Server

A friendly way to run websites on your own computer, in the spirit of the old
"one-click LAMP" kits. Apache, MySQL (MariaDB), PHP, phpMyAdmin, an FTP server and
Composer come from Ubuntu's own archive and get Ubuntu's security updates like
everything else. On Fedora Asahi Remix they come from Fedora's repositories instead; see
[On Fedora Asahi Remix](#on-fedora-asahi-remix) for what differs there.

MariaDB is Ubuntu's drop-in replacement for MySQL: anything that asks for MySQL
(WordPress, PHP's mysqli and PDO, phpMyAdmin, MySQL Workbench) works with it.

## Using it

1. Open **Web Server** from the app grid.
2. Press **Set up the web server** and enter your password once. It takes a few minutes
   the first time. (Set up with an earlier version? Press **Add** under **Finish setup**
   to get phpMyAdmin, FTP and Composer.)
3. Press **+** to make a site:
   - **Empty PHP site**: makes `~/Sites/NAME` with a starter `index.php`.
   - **WordPress**: downloads the latest WordPress from wordpress.org, checks it against
     the checksum wordpress.org publishes, creates a database with its own random
     password, writes `wp-config.php`, then opens the WordPress setup page. The database
     details are shown once; WordPress already has them.
   - **CodeIgniter 4**: needs Composer (`sudo apt install composer`). The site is served
     from the project's `public/` folder.
4. Your site is at `http://NAME.localhost`. Edit the files in `~/Sites/NAME` with any
   editor and refresh the browser.

Removing a site stops serving it but keeps its files and database.

### Databases and phpMyAdmin

- **phpMyAdmin**: press **Open** under Databases, or go to `http://localhost/phpmyadmin`.
- **Your MySQL login**: press **Create** to get a login named after your Ubuntu user,
  with full access to this local server. Show, copy or renew the password in the app. It's
  kept in `~/.config/jewbuntu/webserver-db.json`, readable only by you. In a terminal,
  `mariadb` logs you in without a password.
- Server: `localhost`, port 3306.

### FTP

- Server `localhost`, port 21. Log in with your Ubuntu username and password; you see
  only `~/Sites`, and uploaded files belong to you.
- With **Share on my network** on, other devices can connect using this computer's
  network address (the app shows it). Logins must then use FTP over TLS (in FileZilla:
  "Require explicit FTP over TLS"); accept the certificate the first time.

## Privacy and safety defaults

- Apache listens only on this computer (`127.0.0.1`, and `::1` when IPv6 is available).
  Every Jewbuntu site also has `Require local`.
- MariaDB listens only on `127.0.0.1`.
- phpMyAdmin answers only this computer, even while sharing is on.
- FTP listens only on this computer unless sharing is on; then logins require TLS.
  Only users who set up the Web Server can log in by FTP, each locked into their `~/Sites`.
- **Share on my network** is an explicit switch with a warning. It makes Apache listen
  on all addresses and lets anyone on your network open your sites. Switching it off
  restores local-only.
- Installing the `jewbuntu-webserver` package installs no server. Nothing listens until
  you press Set up.
- The app runs as you. Only one small helper,
  `/usr/libexec/jewbuntu/jewbuntu-webserver-helper`, runs as root, through polkit
  (`org.jewbuntu.webserver.manage`, administrator password, remembered briefly). It
  accepts a fixed set of commands and validates every site name.
- Apache (`www-data`) gets access to your sites through ACLs: pass-through on your home
  folder and `~/Sites`, read/write on each site folder. Your home folder is not opened
  to other users.

## What it changes on the system

| File | Change | Undo |
| --- | --- | --- |
| `/etc/apache2/ports.conf` | `Listen 80` becomes loopback-only. The original is kept as `ports.conf.jewbuntu-orig`. | Copy the original back. |
| `/etc/apache2/jewbuntu-access.conf` | `Require local` (or `Require all granted` while sharing). | Delete it. |
| `/etc/apache2/conf-available/jewbuntu-servername.conf` | `ServerName localhost`. | `a2disconf jewbuntu-servername` |
| `/etc/apache2/sites-available/jewbuntu-USER-NAME.conf` | One per site. | Remove the site in the app. |
| `/etc/mysql/mariadb.conf.d/60-jewbuntu.cnf` | `bind-address = 127.0.0.1` | Delete it. |
| `/etc/apache2/conf-available/phpmyadmin-jewbuntu-local.conf` | phpMyAdmin: `Require local`. | `a2disconf phpmyadmin-jewbuntu-local` |
| `/etc/vsftpd.conf` | Jewbuntu FTP settings. The original is kept as `vsftpd.conf.jewbuntu-orig`. | Copy the original back. |
| `/etc/vsftpd.jewbuntu-users`, `/etc/vsftpd.jewbuntu-user.d/` | Who may use FTP, and each user's folder. | Delete them. |
| Apache modules | `rewrite` on. | `a2dismod rewrite` |

Logs: `/var/log/apache2/jewbuntu-NAME-error.log` and `-access.log`.

## On Fedora Asahi Remix

The same app and the same helper (`jewbuntu-webserver` RPM, built by `ci/fedora-build.sh`).
Everything that differs lives in one backend file the helper loads,
`/usr/libexec/jewbuntu/jewbuntu-webserver-backend/fedora.sh` (Ubuntu's is `debian.sh`). Using
it is the same; underneath:

- **Apache is `httpd`, and PHP runs through `php-fpm`** (as the `apache` user, which gets the
  ACLs that `www-data` gets on Ubuntu). Sites are `/etc/httpd/conf.d/jewbuntu-USER-NAME.conf`;
  there is no `a2ensite`. Logs: `/var/log/httpd/jewbuntu-NAME-error.log`.
- **Fedora's files stay untouched.** `httpd.conf` keeps its `Listen 80`, so local-only works
  in two layers: Jewbuntu's own `/etc/httpd/conf.d/00-jewbuntu.conf` puts `Require local` on
  everything (added on top of Fedora's own rules with `AuthMerging And`), and **firewalld**
  keeps port 80 closed to the network (Fedora Workstation's zone does not open it).
  **Share on my network** removes the `Require local` and opens `http`, port 21 and the
  passive FTP ports 40000-40100 in the active firewall zones; switching it off closes exactly
  what it opened, and nothing you opened yourself.
- **MariaDB** settings are in `/etc/my.cnf.d/60-jewbuntu.cnf` (Fedora's MariaDB would
  otherwise listen on every address). Fedora installs services stopped; Set up turns on
  `httpd`, `php-fpm`, `mariadb` and `vsftpd@jewbuntu` now and at boot.
- **phpMyAdmin** is Fedora's `phpMyAdmin` package (`http://localhost/phpmyadmin` or
  `/phpMyAdmin`); still local-only, even while sharing.
- **FTP** is its own vsftpd instance, `vsftpd@jewbuntu.service`, configured in
  `/etc/vsftpd/jewbuntu.conf` with a self-signed certificate of its own. Fedora's
  `vsftpd.conf` and `vsftpd.service` are not used. FTP over TLS allows TLS 1.3, which needs
  vsftpd's `require_ssl_reuse=NO`; data connections are still accepted only from the
  logged-in client's own address.
- **SELinux stays enforcing.** Set up installs a small policy module of Jewbuntu's own,
  `jewbuntu_webserver` (`/usr/share/jewbuntu/webserver/selinux/jewbuntu_webserver.cil`): it
  labels every `~/Sites` `httpd_user_rw_content_t`, so Apache and PHP can read and write it,
  and lets vsftpd manage files there and nowhere else (instead of Fedora's
  `ftpd_full_access`, which would open every file to the FTP server). It also switches on
  three booleans with `semanage`: `httpd_enable_homedirs`, `httpd_can_network_connect` (PHP
  may make outgoing connections, for WordPress plugin and theme installs and updates) and
  `ftpd_use_passive_mode`. Files you *move* into `~/Sites` from elsewhere keep their old
  label; adding a site relabels the folder, or run `restorecon -R ~/Sites` yourself.
- PHP settings (128 MB uploads; PCRE's JIT off, because SELinux does not give Apache
  executable memory) are in `/etc/php.d/99-jewbuntu.ini`.

What it changes on Fedora:

| File or setting | Change | Undo |
| --- | --- | --- |
| `/etc/httpd/conf.d/00-jewbuntu.conf` | `ServerName localhost`, a default site for `http://localhost`, `Require local` on everything (removed while sharing), phpMyAdmin local-only. | Delete it. |
| `/etc/httpd/conf.d/jewbuntu-USER-NAME.conf` | One per site. | Remove the site in the app. |
| `/etc/my.cnf.d/60-jewbuntu.cnf` | `bind-address = 127.0.0.1` | Delete it. |
| `/etc/php.d/99-jewbuntu.ini` | Upload and memory limits, `pcre.jit = 0`. | Delete it. |
| `/etc/vsftpd/jewbuntu.conf`, `jewbuntu-users`, `jewbuntu-user.d/`, `jewbuntu-ftp.{crt,key}` | The `vsftpd@jewbuntu` FTP server. | `systemctl disable --now vsftpd@jewbuntu`, delete them. |
| SELinux module `jewbuntu_webserver` | Labels `~/Sites`; vsftpd may use it. | `sudo semodule -r jewbuntu_webserver` |
| SELinux booleans | `httpd_enable_homedirs`, `httpd_can_network_connect`, `ftpd_use_passive_mode` on. | `sudo setsebool -P NAME off` |
| firewalld | Only while sharing: `http`, `21/tcp`, `40000-40100/tcp` (list in `/var/lib/jewbuntu-webserver/firewalld-opened`). | Switch sharing off. |
| Services | `httpd`, `php-fpm`, `mariadb`, `vsftpd@jewbuntu` enabled. | `systemctl disable --now ...` |

Removing the `jewbuntu-webserver` package keeps the servers, sites and databases, as on
Ubuntu. `rpm -V httpd vsftpd mariadb-server php-fpm phpMyAdmin` stays clean: no file of a
Fedora package is edited. If you also run Fedora's own `vsftpd.service`, it competes for
port 21 with `vsftpd@jewbuntu`; use one or the other.

## Testing

`ci/webserver-check.sh dist/DIR` installs the package in an Ubuntu 26.04 container and
drives the real helper: install, sites, PHP, databases, phpMyAdmin login, FTP upload and
chroot, sharing on and off (network refused when off, phpMyAdmin refused from the network
even when on, FTP requiring TLS when on), stop, start, and WordPress/CodeIgniter sites.
`ci/webserver-screenshot.sh dist/DIR OUT` screenshots the app under Xvfb.

`ci/fedora-webserver-check.sh dist/fedora` does the same on Fedora 45 (arm64), in a
container booted with systemd so the real `httpd`, `php-fpm`, `mariadb`, `vsftpd@jewbuntu` and
firewalld units run. Another device on the network is a network namespace behind a veth pair,
so its traffic passes through firewalld (zone FedoraWorkstation) like a real one. It also
checks that `rpm -V` finds no edited Fedora file, that the firewall opens only while sharing
and closes exactly what it opened, and that Apache alone still refuses the network when the
firewall is stopped. The SELinux module and booleans are installed into the policy store and
the built policy is queried (`matchpathcon`, `sesearch`), but a container cannot run SELinux
in enforcing mode; neither can it show the polkit password dialog. Those, and Asahi hardware,
need a real Fedora Asahi Remix install.
