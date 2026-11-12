# Jewbuntu Icons for Fedora Asahi Remix. Built by ci/fedora-build.sh from a git archive of
# github.com/rhecht/jewbuntu-icons (cloned inside Linux: the repo has case-only file name
# pairs a macOS checkout cannot hold). Icon caches come from Fedora's own file triggers.
Name:           jewbuntu-icons
Version:        %{jb_version}
Release:        1%{?dist}
Summary:        Jewbuntu Icons - Mac-inspired icon theme
License:        GPL-3.0-or-later
URL:            https://github.com/rhecht/jewbuntu-icons
Source0:        jewbuntu-icons.tar.gz
BuildArch:      noarch
BuildRequires:  bash gtk-update-icon-cache findutils

%description
Rounded squircle app icons, Mac-blue folders and Mac-like colours, based on
the MacTahoe icon theme (GPL-3.0). Icons that copied Apple's own app icons
are replaced by original designs. Provides Jewbuntu, Jewbuntu-dark and
Jewbuntu-light.

%prep
%autosetup -n jewbuntu-icons

%build
mkdir -p stage-icons
TERM=xterm bash ./install.sh -d "$PWD/stage-icons"
find stage-icons -name icon-theme.cache -delete
test -e stage-icons/Jewbuntu/apps/scalable/org.gnome.Nautilus.svg

%install
install -d %{buildroot}%{_datadir}/icons
cp -a stage-icons/. %{buildroot}%{_datadir}/icons/

%files
%license COPYING
%doc README.md
%{_datadir}/icons/Jewbuntu
%{_datadir}/icons/Jewbuntu-dark
%{_datadir}/icons/Jewbuntu-light

%changelog
* Thu Nov 12 2026 Jewbuntu Developers <maintainers@jewbuntu.invalid> - %{jb_version}-1
- First Fedora Asahi Remix build, same sources as the Ubuntu package.
