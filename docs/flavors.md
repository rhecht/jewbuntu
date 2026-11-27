# Jewbuntu skins for Lubuntu and Linux Mint

Four more editions, each a light skin over a distribution that already works, in the same spirit as
the Cutefish edition: the distribution keeps its own kernel, installer, look and updates, and
Jewbuntu adds four touches.

- **A Star of David as the start-menu button** on the panel.
- **The blue Star of David wallpaper** on the desktop and the login screen. Only where the
  distribution's default picture was: a wallpaper someone chose is kept.
- **The Jewbuntu jingle at sign-in**: the short 8-bit Hava Nagila.
- **ShulGo's minyan widget** in the panel (`shulgo-xfce`, the GTK3 tray widget).

The two Lubuntu editions also add **Lynx**, a text web browser, as "Lynx Web Browser" under
Internet: it opens in the desktop's terminal with Jewbuntu's settings (a search page made for text
browsers, readable colours), as on the Arch Linux 32 edition. Firefox stays; Lynx is there for old
PCs where Firefox is slow (added 2026-11-26, packages `+lubuntu2` and `+lubuntu18.2`).

| Edition | Base | Download | Packages |
| --- | --- | --- | --- |
| Lubuntu (LXQt) | Lubuntu 26.10 "Stonking Stingray" and the 27.04 "Tenacious T-Rex" daily, amd64 | ISO for each, plus `jewbuntu-lubuntu-installer` (any Lubuntu 22.04 or newer) | `jewbuntu-lubuntu`, `jewbuntu-branding`, `jewbuntu-core`, `shulgo-xfce`, `lynx` |
| Lubuntu 18.04 (LXDE) | Lubuntu 18.04.5, the last 32-bit Ubuntu (i386; the installer also works on amd64 18.04) | ISO plus `jewbuntu-lubuntu18-32bit-installer` | `jewbuntu-lubuntu-lxde`, `shulgo-xfce`, `lynx` |
| Linux Mint (Cinnamon) | Linux Mint 22.3 "Zena", amd64 | ISO plus `jewbuntu-mint-installer` | `jewbuntu-mint`, `shulgo-xfce` |

The ISOs are the distributions' own live ISOs with the packages already installed: boot, try,
install with the distribution's own installer (Calamares on Lubuntu 26.10/27.04, Ubiquity on
18.04 and Mint), and the installed system has the skin. The `.run` installers add the same
packages to a computer that already runs the distribution.

## How each skin works

**Lubuntu 22.04+ (LXQt), `jewbuntu-lubuntu`.** `dpkg-divert` moves three of Lubuntu's files aside
(Lubuntu's copies go on being updated under the `.lubuntu` name, and come back when the package
is removed):

- `/usr/share/lubuntu/wallpapers/lubuntu-default-wallpaper.png`, the default desktop picture (a
  link Lubuntu repoints every release), now a link to the Star of David;
- `/usr/share/sddm/themes/lubuntu/wall.png`, the login screen's picture;
- `/etc/xdg/xdg-Lubuntu/lxqt/panel.conf`, the default panel layout for new accounts. It is made
  from Lubuntu's own file by `/usr/lib/jewbuntu/lubuntu/panel-icon`, which adds `ownIcon=true` and
  the Star of David `icon=` to the menu button (`[fancymenu]`/`[mainmenu]`) and copies everything
  else line for line. A dpkg trigger remakes it when Lubuntu updates its layout.

Accounts that already had their own panel layout get the menu button once, at their next sign-in,
from `jewbuntu-lubuntu-session` (an autostart entry that runs as the user; a backup is kept as
`panel.conf.before-jewbuntu`, and a menu icon someone picked is left alone).
`jewbuntu-lubuntu-session --undo` puts Lubuntu's button back; the installer's `--uninstall` runs it
first. The jingle is `jewbuntu-branding`'s, as on Ubuntu (`jewbuntu startup-sound off`).

**Lubuntu 18.04 (LXDE), `jewbuntu-lubuntu-lxde`.** Two diversions: the default wallpaper (also the
login screen's background) and `/usr/share/lubuntu/images/lubuntu-logo.png`, the picture on the
panel's menu button. Every account still on Lubuntu's defaults shows them, existing ones included,
with no per-user step. 18.04 has Python 3.6, too old for `jewbuntu-core`, so the package carries a
small player of its own (`jewbuntu-startup-sound`, `off`/`on`/`preview`): once per boot, through
PulseAudio, quiet when the output is muted, at 70% of the current volume. ShulGo runs on 18.04's
Python 3.6 and finds Ubuntu's AppIndicator3, which lxpanel's indicator plugin shows.

**Linux Mint (Cinnamon), `jewbuntu-mint`.** No files are replaced: a GSettings override
(`zz_jewbuntu-mint.gschema.override`, read after Mint's own) changes Cinnamon's defaults only, so
anything someone set for themselves wins:

- `org.cinnamon app-menu-icon-name` and `system-icon`: `jewbuntu-start` (the menu button);
- `org.cinnamon.desktop.background picture-uri` (and GNOME's): the Star of David;
- `x.dm.slick-greeter background`: the login screen;
- `org.cinnamon.sounds login-file` and `login-enabled`: the jingle as Cinnamon's own sign-in sound
  (System Settings > Sounds turns it off).

Both wallpapers are listed in Cinnamon's Backgrounds settings.

## Build and test

```bash
export DOCKER_CONTEXT=desktop-linux
ci/flavors-build.sh 0.1.0~m1.29 <shulgo-widgets commit> dist/flavors
ci/make-installer-flavor.sh lubuntu   0.1.0-m1.29 dist/release-flavors/jewbuntu-lubuntu-installer-0.1.0-m1.29.run dist/flavors dist/m1.29
ci/make-installer-flavor.sh lubuntu18 0.1.0-m1.29 dist/release-flavors/jewbuntu-lubuntu18-32bit-installer-0.1.0-m1.29.run dist/flavors
ci/make-installer-flavor.sh mint      0.1.0-m1.29 dist/release-flavors/jewbuntu-mint-installer-0.1.0-m1.29.run dist/flavors
ci/flavor-iso.sh lubuntu   ~/Downloads/…/lubuntu-26.10-desktop-amd64.iso dist/flavor-iso/jewbuntu-lubuntu-26.10-0.1.0-m1.29-64bit.iso dist/flavors dist/m1.29
ci/flavor-iso.sh lubuntu18 ~/Downloads/…/lubuntu-18.04.5-desktop-i386.iso dist/flavor-iso/jewbuntu-lubuntu-18.04-0.1.0-m1.29-32bit.iso dist/flavors
ci/flavor-iso.sh mint      ~/Downloads/…/linuxmint-22.3-cinnamon-64bit-ubuntu-noble.iso dist/flavor-iso/jewbuntu-mint-22.3-0.1.0-m1.29-64bit.iso dist/flavors
ci/flavor-vm.sh start dist/flavor-iso/<iso> [RAM] [i386]; ci/flavor-vm.sh shot NAME; ci/flavor-vm.sh stop
```

`ci/flavor-iso.sh` installs the packages into the ISO's live system through an overlay mount and a
chroot (the ISO's amd64/i386 programs run under Docker's emulation; the dependencies come from the
distribution's own archive), checks the result inside the chroot (packages, diversions, the
resolved wallpaper and menu-button paths, the panel layout, the Cinnamon defaults, ShulGo's imports
on the system's Python), and folds the changes into the squashfs:

- Lubuntu 24.04 and newer stack three layers: `minimal`, `minimal.standard` and
  `minimal.standard.live`. Calamares installs `minimal` + `minimal.standard`, so the skin goes into
  `minimal.standard` (with overlayfs whiteouts kept, since that layer sits on another), and is
  installed again over the live layer, which carries its own package list. A "minimal
  installation" (only the bottom layer) does not include the skin; the `.run` installer adds it.
- Lubuntu 18.04 and Mint have one `filesystem.squashfs`, rebuilt whole (`filesystem.size` and
  `filesystem.manifest` updated; 18.04's `filesystem.squashfs.gpg` signature is dropped, as it no
  longer matches).

`md5sum.txt` is updated, and xorriso replays the original BIOS and UEFI boot setup, so the boot
menus are the distributions' own.

`ci/flavor-vm.sh` boots an ISO in a headless QEMU inside Docker (emulated x86, no UTM) and takes
screenshots through QEMU's monitor. Results: `docs/test-results/2026-11-26-flavors.md`.
