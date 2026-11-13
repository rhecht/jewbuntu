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
Requires:       jewbuntu-skin >= 0.1.0~git20261113.2
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
Recommends:     jewbuntu-hub = %{version}-%{release}
Recommends:     jewbuntu-branding = %{version}-%{release}
Recommends:     jewbuntu-webserver

%description asahi-desktop
Makes the Jewbuntu Skin, Jewbuntu Icons, Star of David wallpapers, Inter font,
left-side window buttons and an English+Hebrew keyboard the defaults, shows
"Jewbuntu for Asahi Linux" on the login screen, and adds the Jewbuntu Look
extension (clear top bar whose text follows the wallpaper). Existing accounts
are asked once at login whether to apply the look (undo: jewbuntu skin undo).
Removing this package brings Fedora's defaults back.

%package jewish-service
Summary:        Jewbuntu Jewish calendar service
License:        GPL-3.0-or-later AND GPL-2.0-or-later
Requires:       gjs
Requires:       tzdata

%description jewish-service
Per-user D-Bus service (org.jewbuntu.Jewish1): Hebrew date with sunset rollover,
labelled zmanim presets, candle lighting and havdalah, parsha, holidays, Rosh
Chodesh and Omer for the user's location, fully offline (bundled Hebcal,
GPL-2.0-or-later). Started on demand; never uses the network.

%package hub
Summary:        Jewbuntu Hub - Hebrew date, zmanim and settings
Requires:       gjs
Requires:       gtk4
Requires:       libadwaita
Requires:       jewbuntu-jewish-service = %{version}-%{release}
Requires:       jewbuntu-core = %{version}-%{release}
Recommends:     jewbuntu-shulgo

%description hub
GTK4/libadwaita app: today's Hebrew date, the next zman with countdown, candle
lighting and havdalah, a calendar view, and settings for location, methods,
startup sound and the desktop look. Nearby minyanim come from ShulGo when installed.

%package branding
Summary:        Jewbuntu startup jingle and extra wallpapers
License:        GPL-3.0-or-later AND CC-BY-SA-4.0
Requires:       jewbuntu-core = %{version}-%{release}
Requires:       python3
Recommends:     pipewire-utils

%description branding
An 8-bit Hava Nagila jingle played once per boot at login (respects mute and
the quiet schedule; 'jewbuntu startup-sound off' disables it), plus the
Jewbuntu dawn and dusk wallpapers.

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
mkdir -p build
python3 -B assets/sounds/synth.py assets/sounds/hava-nagila-8bit.json build/jewbuntu-startup.wav

%check
python3 -B -m unittest discover -s tests/unit -t .

%install
install -d %{buildroot}%{pydir}
install -m 644 components/core/jewbuntu/{__init__,cli,config,desktop_defaults,extensions_once,paths,renames,terminal_palette,userdata,version}.py %{buildroot}%{pydir}/
install -D -m 755 bin/jewbuntu %{buildroot}%{_bindir}/jewbuntu
install -D -m 644 packaging/core/jewbuntu-migrate.desktop %{buildroot}%{_sysconfdir}/xdg/autostart/jewbuntu-migrate.desktop
install -D -m 644 README.md %{buildroot}%{_docdir}/jewbuntu-core/README.md

install -D -m 644 packaging/fedora/zz_jewbuntu-asahi.gschema.override %{buildroot}%{_datadir}/glib-2.0/schemas/zz_jewbuntu-asahi.gschema.override
%{_datadir}/glib-2.0/schemas/zz_jewbuntu-asahi-dock.gschema.override
install -D -m 644 packaging/fedora/zz_jewbuntu-asahi-dock.gschema.override %{buildroot}%{_datadir}/glib-2.0/schemas/zz_jewbuntu-asahi-dock.gschema.override
install -D -m 644 packaging/fedora/desktop-defaults.json %{buildroot}%{_datadir}/jewbuntu/desktop-defaults.json
install -D -m 644 packaging/desktop/jewbuntu-skin-prompt.desktop %{buildroot}%{_sysconfdir}/xdg/autostart/jewbuntu-skin-prompt.desktop
# Terminal (Ptyxis) palette; `jewbuntu config migrate` links it per user (Ptyxis reads only ~/.local/share).
install -D -m 644 packaging/desktop/terminal/Jewbuntu.palette %{buildroot}%{_datadir}/jewbuntu/terminal/Jewbuntu.palette
install -D -m 644 assets/logos/jewbuntu-asahi-logo-text-dark.svg %{buildroot}%{_datadir}/jewbuntu/branding/jewbuntu-asahi-logo-text-dark.svg
ext=%{buildroot}%{_datadir}/gnome-shell/extensions/jewbuntu-look@jewbuntu
install -d $ext
install -m 644 components/gnome-extension/jewbuntu-look@jewbuntu/{metadata.json,extension.js,stylesheet.css} $ext/
install -D -m 644 packaging/hebrew/65-jewbuntu-hebrew.conf %{buildroot}%{_datadir}/fontconfig/conf.avail/65-jewbuntu-hebrew.conf
install -d %{buildroot}%{_sysconfdir}/fonts/conf.d
ln -s ../../..%{_datadir}/fontconfig/conf.avail/65-jewbuntu-hebrew.conf %{buildroot}%{_sysconfdir}/fonts/conf.d/65-jewbuntu-hebrew.conf

# jewish-service
install -d %{buildroot}%{_datadir}/jewbuntu/jewish-service/src %{buildroot}%{_datadir}/jewbuntu/jewish-service/vendor
install -m 644 components/jewish-service/src/{day,settings,service}.js %{buildroot}%{_datadir}/jewbuntu/jewish-service/src/
install -m 644 components/jewish-service/vendor/hebcal.bundle.js %{buildroot}%{_datadir}/jewbuntu/jewish-service/vendor/
install -D -m 644 components/jewish-service/vendor/README.md %{buildroot}%{_docdir}/jewbuntu-jewish-service/README.md
install -D -m 644 packaging/jewish-service/org.jewbuntu.Jewish1.service %{buildroot}%{_datadir}/dbus-1/services/org.jewbuntu.Jewish1.service
install -D -m 644 packaging/jewish-service/jewbuntu-jewish.service %{buildroot}%{_userunitdir}/jewbuntu-jewish.service
install -D -m 755 packaging/jewish-service/jewbuntu-jewish-service %{buildroot}%{_libexecdir}/jewbuntu/jewbuntu-jewish-service

# hub
install -D -m 644 components/hub/src/main.js %{buildroot}%{_datadir}/jewbuntu/hub/src/main.js
install -D -m 755 components/hub/data/jewbuntu-hub %{buildroot}%{_bindir}/jewbuntu-hub
install -D -m 644 components/hub/data/org.jewbuntu.Hub.desktop %{buildroot}%{_datadir}/applications/org.jewbuntu.Hub.desktop
install -D -m 644 components/hub/data/org.jewbuntu.Hub.svg %{buildroot}%{_datadir}/icons/hicolor/scalable/apps/org.jewbuntu.Hub.svg

# branding
install -m 644 components/branding/jewbuntu/startup_sound.py %{buildroot}%{pydir}/
install -D -m 755 bin/jewbuntu-startup-sound %{buildroot}%{_bindir}/jewbuntu-startup-sound
install -D -m 644 build/jewbuntu-startup.wav %{buildroot}%{_datadir}/jewbuntu/sounds/jewbuntu-startup.wav
install -m 644 assets/sounds/hava-nagila-8bit.json assets/sounds/PROVENANCE.md %{buildroot}%{_datadir}/jewbuntu/sounds/
install -D -m 644 packaging/branding/jewbuntu-startup-sound.desktop %{buildroot}%{_sysconfdir}/xdg/autostart/jewbuntu-startup-sound.desktop
install -d %{buildroot}%{_datadir}/backgrounds/jewbuntu
install -m 644 assets/wallpapers/jewbuntu-dawn.svg assets/wallpapers/jewbuntu-dusk.svg %{buildroot}%{_datadir}/backgrounds/jewbuntu/
install -D -m 644 packaging/branding/jewbuntu-wallpapers.xml %{buildroot}%{_datadir}/gnome-background-properties/jewbuntu-wallpapers.xml


%files core
%license debian/copyright
%{_bindir}/jewbuntu
%dir /usr/lib/jewbuntu
%dir /usr/lib/jewbuntu/python
%dir %{pydir}
%{pydir}/{__init__,cli,config,desktop_defaults,extensions_once,paths,renames,terminal_palette,userdata,version}.py
%dir %{_datadir}/jewbuntu
%config(noreplace) %{_sysconfdir}/xdg/autostart/jewbuntu-migrate.desktop
%{_docdir}/jewbuntu-core

%files asahi-desktop
%{_datadir}/glib-2.0/schemas/zz_jewbuntu-asahi.gschema.override
%{_datadir}/glib-2.0/schemas/zz_jewbuntu-asahi-dock.gschema.override
%dir %{_datadir}/jewbuntu
%{_datadir}/jewbuntu/desktop-defaults.json
%{_datadir}/jewbuntu/branding
%{_datadir}/jewbuntu/terminal
%{_datadir}/gnome-shell/extensions/jewbuntu-look@jewbuntu
%config(noreplace) %{_sysconfdir}/xdg/autostart/jewbuntu-skin-prompt.desktop
%{_datadir}/fontconfig/conf.avail/65-jewbuntu-hebrew.conf
%{_sysconfdir}/fonts/conf.d/65-jewbuntu-hebrew.conf

%files jewish-service
%dir %{_datadir}/jewbuntu
%{_datadir}/jewbuntu/jewish-service
%{_docdir}/jewbuntu-jewish-service
%{_datadir}/dbus-1/services/org.jewbuntu.Jewish1.service
%{_userunitdir}/jewbuntu-jewish.service
%dir %{_libexecdir}/jewbuntu
%{_libexecdir}/jewbuntu/jewbuntu-jewish-service

%files hub
%{_bindir}/jewbuntu-hub
%{_datadir}/jewbuntu/hub
%{_datadir}/applications/org.jewbuntu.Hub.desktop
%{_datadir}/icons/hicolor/scalable/apps/org.jewbuntu.Hub.svg

%files branding
%{_bindir}/jewbuntu-startup-sound
%{pydir}/startup_sound.py
%{_datadir}/jewbuntu/sounds
%config(noreplace) %{_sysconfdir}/xdg/autostart/jewbuntu-startup-sound.desktop
%{_datadir}/backgrounds/jewbuntu
%{_datadir}/gnome-background-properties/jewbuntu-wallpapers.xml


%changelog
* Fri Nov 13 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- Requires jewbuntu-skin 0.1.0~git20261113.2 (quick settings draw their own 75% dark glass).

* Fri Nov 13 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- Blur my Shell overview style-components=0: readable app labels in folders.
- Jewbuntu Look: lighter backdrop behind open app folders (half GNOME's shade).
- Requires jewbuntu-skin 0.1.0~git20261113.1 (folders use the menus' glass and text colours).

* Thu Nov 12 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- Terminal (Ptyxis) palette matching the skin, linked per user at login.
- No Blur my Shell blur behind popups and app folders (dark corners).
- Requires jewbuntu-skin 0.1.0~git20261112.3 (GTK4 libadwaita mode).

* Thu Nov 12 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- First Fedora Asahi Remix build: skin defaults, login logo, Jewbuntu Look, Hebrew.
