# Jewbuntu for Fedora Asahi Remix (GNOME edition): jewbuntu-core (the `jewbuntu` CLI, skin
# apply/undo, settings) and jewbuntu-asahi-desktop (defaults, login logo, Jewbuntu Look,
# Hebrew). Built by ci/fedora-build.sh from this repository; Ubuntu packaging is debian/.
#
# Survives Fedora/Asahi updates: every file here is Jewbuntu's own (no edits to files of
# other packages, no Conflicts/Obsoletes), defaults are a gschema override, and schema,
# icon and font caches come from Fedora's own file triggers (no scriptlets).
%global shell_major %{?jb_shell_major}%{!?jb_shell_major:51}
%global pydir /usr/lib/jewbuntu/python/jewbuntu
# The launcher never writes bytecode; ship plain sources like the Ubuntu package.
%global __brp_python_bytecompile %{nil}

Name:           jewbuntu
Version:        %{jb_version}
Release:        1%{?dist}
Summary:        Jewbuntu for Asahi Linux
License:        GPL-3.0-or-later AND CC-BY-SA-4.0
URL:            https://github.com/rhecht/jewbuntu
Source0:        jewbuntu.tar.gz
BuildArch:      noarch
BuildRequires:  python3

%description
Jewbuntu's Mac-inspired look and Hebrew defaults for Fedora Asahi Remix on
Apple Silicon Macs.

%package core
Summary:        Jewbuntu command-line tool, settings and skin apply/undo
Requires:       python3

%description core
The `jewbuntu` command: per-user settings with backups and migrations, and
`jewbuntu skin apply/undo/status`, which switches an account to the Jewbuntu
look after saving its current settings. Root package scripts never touch
home directories.

%package asahi-desktop
Summary:        Jewbuntu look and Hebrew defaults for Fedora Asahi Remix (GNOME)
License:        GPL-3.0-or-later AND CC-BY-SA-4.0
Requires:       jewbuntu-core = %{version}-%{release}
Requires:       jewbuntu-skin
Requires:       jewbuntu-icons
Requires:       gnome-shell >= %{shell_major}
Requires:       gnome-shell-extension-user-theme
Requires:       gnome-shell-extension-dash-to-dock
Requires:       gnome-shell-extension-blur-my-shell
Requires:       rsms-inter-fonts
Requires:       google-noto-sans-hebrew-fonts
Requires:       google-noto-serif-hebrew-fonts
Requires:       sil-ezra-fonts
Requires:       hunspell-he
Requires:       zenity
Recommends:     culmus-fonts-all
Recommends:     langpacks-he

%description asahi-desktop
Makes the Jewbuntu Skin, Jewbuntu Icons, Star of David wallpapers, Inter font,
left-side window buttons and an English+Hebrew keyboard the defaults, shows
"Jewbuntu for Asahi Linux" on the login screen, and adds the Jewbuntu Look
extension (clear top bar whose text follows the wallpaper). Existing accounts
are asked once at login whether to apply the look (undo: jewbuntu skin undo).
Removing this package brings Fedora's defaults back.

%prep
%autosetup -n jewbuntu

%build
# Jewbuntu Look is declared only for GNOME Shell majors it was tested on.
python3 - %{shell_major} <<'PY'
import json, sys
p = "components/gnome-extension/jewbuntu-look@jewbuntu/metadata.json"
m = json.load(open(p))
if sys.argv[1] not in m["shell-version"]:
    m["shell-version"].append(sys.argv[1])
json.dump(m, open(p, "w"), indent=2)
PY

%check
python3 -B -m unittest discover -s tests/unit -t .

%install
install -d %{buildroot}%{pydir}
install -m 644 components/core/jewbuntu/{__init__,cli,config,desktop_defaults,paths,userdata,version}.py %{buildroot}%{pydir}/
install -D -m 755 bin/jewbuntu %{buildroot}%{_bindir}/jewbuntu
install -D -m 644 packaging/core/jewbuntu-migrate.desktop %{buildroot}%{_sysconfdir}/xdg/autostart/jewbuntu-migrate.desktop
install -D -m 644 README.md %{buildroot}%{_docdir}/jewbuntu-core/README.md

install -D -m 644 packaging/fedora/zz_jewbuntu-asahi.gschema.override %{buildroot}%{_datadir}/glib-2.0/schemas/zz_jewbuntu-asahi.gschema.override
install -D -m 644 packaging/fedora/desktop-defaults.json %{buildroot}%{_datadir}/jewbuntu/desktop-defaults.json
install -D -m 644 packaging/desktop/jewbuntu-skin-prompt.desktop %{buildroot}%{_sysconfdir}/xdg/autostart/jewbuntu-skin-prompt.desktop
install -D -m 644 assets/logos/jewbuntu-asahi-logo-text-dark.svg %{buildroot}%{_datadir}/jewbuntu/branding/jewbuntu-asahi-logo-text-dark.svg
ext=%{buildroot}%{_datadir}/gnome-shell/extensions/jewbuntu-look@jewbuntu
install -d $ext
install -m 644 components/gnome-extension/jewbuntu-look@jewbuntu/{metadata.json,extension.js,stylesheet.css} $ext/
install -D -m 644 packaging/hebrew/65-jewbuntu-hebrew.conf %{buildroot}%{_datadir}/fontconfig/conf.avail/65-jewbuntu-hebrew.conf
install -d %{buildroot}%{_sysconfdir}/fonts/conf.d
ln -s ../../..%{_datadir}/fontconfig/conf.avail/65-jewbuntu-hebrew.conf %{buildroot}%{_sysconfdir}/fonts/conf.d/65-jewbuntu-hebrew.conf

%files core
%license debian/copyright
%{_bindir}/jewbuntu
/usr/lib/jewbuntu
%config(noreplace) %{_sysconfdir}/xdg/autostart/jewbuntu-migrate.desktop
%{_docdir}/jewbuntu-core

%files asahi-desktop
%{_datadir}/glib-2.0/schemas/zz_jewbuntu-asahi.gschema.override
%dir %{_datadir}/jewbuntu
%{_datadir}/jewbuntu/desktop-defaults.json
%{_datadir}/jewbuntu/branding
%{_datadir}/gnome-shell/extensions/jewbuntu-look@jewbuntu
%config(noreplace) %{_sysconfdir}/xdg/autostart/jewbuntu-skin-prompt.desktop
%{_datadir}/fontconfig/conf.avail/65-jewbuntu-hebrew.conf
%{_sysconfdir}/fonts/conf.d/65-jewbuntu-hebrew.conf

%changelog
* Thu Nov 12 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- First Fedora Asahi Remix build: skin defaults, login logo, Jewbuntu Look, Hebrew.
