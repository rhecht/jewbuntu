# Jewbuntu Web Server for Fedora Asahi Remix: the GTK4 app and its one polkit helper (shared
# with Ubuntu) plus the Fedora backend (httpd + php-fpm, MariaDB, vsftpd@jewbuntu, firewalld,
# SELinux module). Built by ci/fedora-build.sh from this repository; Ubuntu packaging is debian/.
#
# Survives Fedora/Asahi updates: every file here is Jewbuntu's own, no Conflicts/Obsoletes.
# Installing it installs no server: httpd, MariaDB, PHP, phpMyAdmin and vsftpd come from
# Fedora's repositories only when the owner presses Set up, and the helper then writes only
# files of its own (it never edits httpd.conf, vsftpd.conf or any other Fedora file).

Name:           jewbuntu-webserver
Version:        %{jb_version}
Release:        1%{?dist}
Summary:        Jewbuntu Web Server - run websites on this computer
License:        GPL-3.0-or-later
URL:            https://github.com/rhecht/jewbuntu
Source0:        jewbuntu.tar.gz
BuildArch:      noarch
Requires:       bash
Requires:       gjs
Requires:       gtk4
Requires:       libadwaita
Requires:       libsoup3
Requires:       glib-networking
Requires:       polkit
Requires:       acl
Requires:       hostname

%description
A friendly app for Apache (httpd), MariaDB and PHP from Fedora's own
repositories. One click sets it up; every folder in ~/Sites becomes
http://NAME.localhost, and new sites can start empty, as WordPress (downloaded
from wordpress.org and checked against its published checksum, with its own
database) or as CodeIgniter 4. The server answers only this computer by
default; sharing on the network is an explicit switch with a warning, and it
opens the firewall (firewalld) only while it is on. SELinux stays enforcing:
a small policy module of its own labels ~/Sites for Apache and FTP.

Installing this package installs no server. httpd, MariaDB, PHP, phpMyAdmin
and vsftpd are installed only when the user asks, through a single
polkit-guarded helper.

%prep
%autosetup -n jewbuntu

%build

%install
install -D -m 644 components/webserver/src/main.js %{buildroot}%{_datadir}/jewbuntu/webserver/src/main.js
install -D -m 644 components/webserver/src/sites.js %{buildroot}%{_datadir}/jewbuntu/webserver/src/sites.js
install -D -m 644 packaging/fedora/webserver/jewbuntu_webserver.cil %{buildroot}%{_datadir}/jewbuntu/webserver/selinux/jewbuntu_webserver.cil
install -D -m 755 components/webserver/helper/jewbuntu-webserver-helper %{buildroot}%{_libexecdir}/jewbuntu/jewbuntu-webserver-helper
install -D -m 644 components/webserver/helper/jewbuntu-webserver-backend/fedora.sh %{buildroot}%{_libexecdir}/jewbuntu/jewbuntu-webserver-backend/fedora.sh
install -D -m 755 components/webserver/data/jewbuntu-webserver %{buildroot}%{_bindir}/jewbuntu-webserver
install -D -m 644 components/webserver/data/org.jewbuntu.WebServer.desktop %{buildroot}%{_datadir}/applications/org.jewbuntu.WebServer.desktop
install -D -m 644 components/webserver/data/org.jewbuntu.WebServer.svg %{buildroot}%{_datadir}/icons/hicolor/scalable/apps/org.jewbuntu.WebServer.svg
install -D -m 644 components/webserver/data/org.jewbuntu.webserver.policy %{buildroot}%{_datadir}/polkit-1/actions/org.jewbuntu.webserver.policy
install -D -m 644 docs/web-server.md %{buildroot}%{_docdir}/jewbuntu-webserver/web-server.md

%post
# Upgrades only, and only if the owner already set the server up: bring Jewbuntu's own
# config files (PHP limits, local-only rules, SELinux module) up to date. Touches /etc only.
if [ "$1" -gt 1 ] && [ -f /etc/httpd/conf.d/00-jewbuntu.conf ]; then
    %{_libexecdir}/jewbuntu/jewbuntu-webserver-helper system-refresh >/dev/null 2>&1 || :
fi

%files
%license debian/copyright
%{_bindir}/jewbuntu-webserver
%dir %{_datadir}/jewbuntu
%{_datadir}/jewbuntu/webserver
%dir %{_libexecdir}/jewbuntu
%{_libexecdir}/jewbuntu/jewbuntu-webserver-helper
%{_libexecdir}/jewbuntu/jewbuntu-webserver-backend
%{_datadir}/applications/org.jewbuntu.WebServer.desktop
%{_datadir}/icons/hicolor/scalable/apps/org.jewbuntu.WebServer.svg
%{_datadir}/polkit-1/actions/org.jewbuntu.webserver.policy
%{_docdir}/jewbuntu-webserver

%changelog
* Thu Nov 12 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- First Fedora Asahi Remix build: httpd + php-fpm, MariaDB, vsftpd@jewbuntu,
  firewalld, SELinux module.
