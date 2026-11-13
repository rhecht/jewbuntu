# Jewbuntu Skin for Fedora Asahi Remix (GNOME edition). Built by ci/fedora-build.sh from
# a git archive of github.com/rhecht/jewbuntu-skin; the Debian packaging lives in that repo.
# Owns only its own files under /usr/share: Fedora/Asahi updates never touch them.
# Unlike the Ubuntu package there is no login-screen theme bundle: Fedora has no
# gdm-theme alternative, and replacing gnome-shell's own file would be undone by updates.
%global shell_major %{?jb_shell_major}%{!?jb_shell_major:51}

Name:           jewbuntu-skin
Version:        %{jb_version}
Release:        1%{?dist}
Summary:        Jewbuntu Skin - Mac-inspired GTK and GNOME Shell theme
License:        MIT AND CC-BY-SA-4.0 AND LicenseRef-Jewbuntu-Wallpapers-TBC
URL:            https://github.com/rhecht/jewbuntu-skin
Source0:        jewbuntu-skin.tar.gz
BuildArch:      noarch
BuildRequires:  bash sassc glib2-devel libxml2 ImageMagick findutils
Recommends:     gnome-shell-extension-user-theme

%description
Glass-style GTK 2/3/4 and GNOME Shell theme for Jewbuntu (light and dark,
normal and solid, HiDPI variants), based on the MacTahoe theme (MIT), plus
the Jewbuntu wallpapers in Settings > Appearance. Built for GNOME Shell
%{shell_major}. Installing it changes nothing by itself; jewbuntu-asahi-desktop
sets it as the default and 'jewbuntu skin apply' switches an existing account.

%prep
%autosetup -n jewbuntu-skin

%build
# The upstream installer refuses to write inside its source tree: build into a temp dir.
stage=$(mktemp -d) home=$(mktemp -d)
# SKIN_LIBADWAITA_SYSTEM=1: GTK4 theme in libadwaita mode, as in debian/rules (readable menus
# and title bars in apps that colour their own windows, such as Terminal/Ptyxis).
HOME=$home TERM=xterm SKIN_SHELL_VERSION=%{shell_major} SKIN_LIBADWAITA_SYSTEM=1 bash ./install.sh -d "$stage" --shell -i jewbuntu
test -d "$stage/Jewbuntu-Light/gnome-shell" && test -f "$stage/Jewbuntu-Light/gtk-4.0/gtk.css"
grep -q "var(--" "$stage/Jewbuntu-Light/gtk-4.0/gtk.css"   # libadwaita mode is on (old mode has no CSS variables)
mkdir -p stage-themes && cp -a "$stage/." stage-themes/
# Login screen (GDM) for Fedora, which has no gdm-theme alternative like Ubuntu's: the dark
# Jewbuntu shell style and the blurred Star of David background as loose files, overlaid on
# gnome-shell's built-in theme only for gdm*.css (plus our own jewbuntu-gdm/ assets) through
# G_RESOURCE_OVERLAYS, which jewbuntu-asahi-desktop switches on per GNOME version. No Fedora
# file changes; the user session's gnome-shell.css is not overlaid.
ov=stage-gdm/%{shell_major}; mkdir -p "$ov/jewbuntu-gdm"
cp -a stage-themes/Jewbuntu-Dark/gnome-shell/assets "$ov/jewbuntu-gdm/assets"
magick wallpaper/Jewbuntu-star-blue.png -scale 1920x -blur 0x18 -fill black -colorize 25% -quality 88 "$ov/jewbuntu-gdm/assets/login-background.jpg"
sed 's#url("assets/background.png")#url("assets/login-background.jpg")#g; s#url("assets/#url("resource:///org/gnome/shell/theme/jewbuntu-gdm/assets/#g; s#url(assets/#url(resource:///org/gnome/shell/theme/jewbuntu-gdm/assets/#g' \
  stage-themes/Jewbuntu-Dark/gnome-shell/gnome-shell.css > "$ov/gdm.css"
cp "$ov/gdm.css" "$ov/gdm-dark.css"; cp "$ov/gdm.css" "$ov/gdm-light.css"
grep -q "jewbuntu-gdm/assets/login-background.jpg" "$ov/gdm.css"
test "$(stat -c %s "$ov/jewbuntu-gdm/assets/login-background.jpg")" -gt 20000

%install
install -d %{buildroot}%{_datadir}/themes %{buildroot}%{_datadir}/backgrounds/Jewbuntu %{buildroot}%{_datadir}/gnome-background-properties
cp -a stage-themes/. %{buildroot}%{_datadir}/themes/
install -m 644 wallpaper/Jewbuntu-day.jpeg wallpaper/Jewbuntu-night.jpeg wallpaper/Jewbuntu-star-blue.png wallpaper/Jewbuntu-star-purple.png %{buildroot}%{_datadir}/backgrounds/Jewbuntu/
sed 's#@BACKGROUNDDIR@#%{_datadir}/backgrounds#g' wallpaper/Jewbuntu.xml > %{buildroot}%{_datadir}/gnome-background-properties/Jewbuntu.xml
install -d %{buildroot}%{_datadir}/jewbuntu-skin/gdm-overlay
cp -a stage-gdm/. %{buildroot}%{_datadir}/jewbuntu-skin/gdm-overlay/

%files
%license COPYING
%doc README.md
%{_datadir}/themes/Jewbuntu*
%{_datadir}/backgrounds/Jewbuntu
%{_datadir}/gnome-background-properties/Jewbuntu.xml
%{_datadir}/jewbuntu-skin

%changelog
* Thu Nov 12 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- GTK4 theme built in libadwaita mode (SKIN_LIBADWAITA_SYSTEM=1), as on Ubuntu.

* Thu Nov 12 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- First Fedora Asahi Remix build (GNOME Shell %{shell_major}), same sources as the Ubuntu package.
