# Jewbuntu Web Server

A friendly way to run websites on your own computer, in the spirit of the old
"one-click LAMP" kits. Apache, MariaDB and PHP come from Ubuntu's own archive and get
Ubuntu's security updates like everything else.

## Using it

1. Open **Web Server** from the app grid.
2. Press **Set up the web server** and enter your password once. This installs Apache,
   MariaDB and PHP. It takes a few minutes the first time.
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

## Privacy and safety defaults

- Apache listens only on this computer (`127.0.0.1`, and `::1` when IPv6 is available).
  Every Jewbuntu site also has `Require local`.
- MariaDB listens only on `127.0.0.1`.
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
| Apache modules | `rewrite` on. | `a2dismod rewrite` |

Logs: `/var/log/apache2/jewbuntu-NAME-error.log` and `-access.log`.

## Testing

`ci/webserver-check.sh dist/DIR` installs the package in an Ubuntu 26.04 container and
drives the real helper: install, sites, PHP, database login, sharing on and off (including
that the network address is refused when sharing is off), stop and start.
`ci/webserver-screenshot.sh dist/DIR OUT` screenshots the app under Xvfb.
