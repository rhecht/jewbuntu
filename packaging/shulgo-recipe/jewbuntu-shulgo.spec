# jewbuntu-shulgo for Fedora Asahi Remix: packaging recipe only. ShulGo's code is private
# (github.com/rhecht/shulgo) and is never stored in this repository; ci/build-shulgo-rpm.sh
# exports integrations/shulgo-core and integrations/jewbuntu at a given commit into the build.
# Same file layout as the Debian recipe (debian/jewbuntu-shulgo.install). No API key is shipped.
%global shell_major %{?jb_shell_major}%{!?jb_shell_major:51}
%global ext %{_datadir}/gnome-shell/extensions/shulgo@jewbuntu.org

Name:           jewbuntu-shulgo
Version:        %{jb_version}
Release:        1%{?dist}
Summary:        ShulGo minyan finder for Jewbuntu (panel widget and window)
License:        LicenseRef-ShulGo
URL:            https://shulgo.com
Source0:        jewbuntu-shulgo.tar.gz
Source1:        shulgo
BuildArch:      noarch
BuildRequires:  python3
Requires:       gjs
Requires:       gtk4
Requires:       libadwaita
Requires:       libsoup3
Requires:       glib2

%description
Nearby minyanim with a countdown, events, mikvaos and zmanim from ShulGo, as a
GNOME top-bar widget and a GTK4/libadwaita window sharing one set of settings.
Keeps the last good answer for offline use. Needs a per-user ShulGo API key;
none is included.

%prep
%autosetup -n jewbuntu-shulgo

%build
# Declare the GNOME Shell this build targets (tested headless by ci/fedora-test.sh).
python3 - %{shell_major} <<'PY'
import json, sys
p = "jewbuntu/extension/shulgo@jewbuntu.org/metadata.json"
m = json.load(open(p))
if sys.argv[1] not in m["shell-version"]:
    m["shell-version"].append(sys.argv[1])
json.dump(m, open(p, "w"), indent=2)
PY

%install
install -d %{buildroot}%{ext}/icons %{buildroot}%{ext}/shulgo/core %{buildroot}%{_datadir}/jewbuntu-shulgo/shulgo/core
install -m 644 jewbuntu/extension/shulgo@jewbuntu.org/{metadata.json,extension.js,prefs.js,stylesheet.css} %{buildroot}%{ext}/
install -m 644 jewbuntu/extension/shulgo@jewbuntu.org/icons/*.svg %{buildroot}%{ext}/icons/
install -m 644 shulgo-core/*.js %{buildroot}%{ext}/shulgo/core/
cp -a jewbuntu/src/shulgo/gnome %{buildroot}%{ext}/shulgo/
install -m 644 jewbuntu/app/main.js jewbuntu/app/style.css %{buildroot}%{_datadir}/jewbuntu-shulgo/
install -m 644 shulgo-core/*.js %{buildroot}%{_datadir}/jewbuntu-shulgo/shulgo/core/
cp -a jewbuntu/src/shulgo/gnome %{buildroot}%{_datadir}/jewbuntu-shulgo/shulgo/
install -D -m 644 jewbuntu/schemas/org.jewbuntu.shulgo.gschema.xml %{buildroot}%{_datadir}/glib-2.0/schemas/org.jewbuntu.shulgo.gschema.xml
install -D -m 644 jewbuntu/app/org.jewbuntu.ShulGo.desktop %{buildroot}%{_datadir}/applications/org.jewbuntu.ShulGo.desktop
install -D -m 644 jewbuntu/app/org.jewbuntu.ShulGo.svg %{buildroot}%{_datadir}/icons/hicolor/scalable/apps/org.jewbuntu.ShulGo.svg
install -D -m 644 jewbuntu/extension/shulgo@jewbuntu.org/icons/shulgo-symbolic.svg %{buildroot}%{_datadir}/icons/hicolor/symbolic/apps/org.jewbuntu.ShulGo-symbolic.svg
install -D -m 755 %{SOURCE1} %{buildroot}%{_bindir}/shulgo
find %{buildroot} -type f -name '*.js' -exec chmod 644 {} +

%files
%{_bindir}/shulgo
%{ext}
%{_datadir}/jewbuntu-shulgo
%{_datadir}/glib-2.0/schemas/org.jewbuntu.shulgo.gschema.xml
%{_datadir}/applications/org.jewbuntu.ShulGo.desktop
%{_datadir}/icons/hicolor/scalable/apps/org.jewbuntu.ShulGo.svg
%{_datadir}/icons/hicolor/symbolic/apps/org.jewbuntu.ShulGo-symbolic.svg

%changelog
* Thu Nov 12 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- Fedora Asahi Remix build from rhecht/shulgo (integrations/shulgo-core + integrations/jewbuntu).
