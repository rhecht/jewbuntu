# Jewbuntu for old 32-bit laptops (Arch Linux 32 + Xfce)

This brings the Jewbuntu look to laptops from about 2001: a Pentium III with 256 MB of RAM is
the target. Modern GNOME can't run on hardware like that, and official Arch Linux has supported
only 64-bit PCs since 2017, so this port uses:

- **[Arch Linux 32](https://www.archlinux32.org/)**, the community-maintained 32-bit Arch. Its
  `i686` build needs SSE but not SSE2, which suits a Pentium III. Its `pentium4` build needs SSE2.
- **Xfce 4.18** on X11, with compositing off.

It's an overlay, as on Ubuntu and Fedora: four packages are added on top of Arch Linux 32, and
Arch updates keep coming as normal.

What you get: the Jewbuntu Skin in its **solid** version (no transparency, which old graphics
chips can't draw), Jewbuntu Icons, the Star of David wallpapers scaled for screens of the time,
the Inter font, window buttons on the left, the light variant of Jewbuntu Icons (dark status icons that stay readable on the light top bar), a slim top bar and a dock at the bottom, an English
and Hebrew keyboard (Super+Space switches) and Hebrew fonts, and a Jewbuntu login screen.

Not yet available: ShulGo (a light Xfce tray version exists in rhecht/shulgo-widgets, untested
here), the Web Server app, the Hub and the startup jingle.

| Package | What it contains |
| --- | --- |
| `jewbuntu-skin` | GTK 2/3/4 and Xfce window theme (solid), wallpapers |
| `jewbuntu-icons` | Icon theme |
| `jewbuntu-core` | The `jewbuntu` command (`jewbuntu skin apply/undo/status`, settings) |
| `jewbuntu-xfce-desktop` | The "Jewbuntu" session: Xfce defaults, panels, login screen, Hebrew |

## Check the CPU first

On the laptop, in any Linux live system:

```bash
grep -o -w -e sse -e sse2 -e cmov /proc/cpuinfo | sort -u
```

`sse` and `cmov` means `i686` works. With `sse2` as well, `pentium4` works too. Without `sse`
(Pentium II, K6), only Arch Linux 32's `i486` build fits, and it has almost no desktop packages.

## 1. Install Arch Linux 32 with Xfce

Follow Arch Linux 32's installation guide (archlinux32.org) for a base system. Then add Xfce and the
login screen:

```bash
sudo pacman -S xorg-server xfce4 lightdm lightdm-gtk-greeter
sudo systemctl enable lightdm
```

With 256 MB of RAM, add a swap file or zram (see the Arch Wiki's "Swap" page).

### Required for now: hold pango at 1.54.0

As of November 2026, Arch Linux 32's i686 repositories ship **pango 1.58.2, which needs a newer
fontconfig than the 2.14.1 they ship**. Every GTK program then fails to start (`symbol lookup
error: ... FcConfigSetDefaultSubstitute`), and that includes xfwm4, the Xfce panel and Thunar.
Until Arch Linux 32 rebuilds fontconfig, install the last working pango from their own signed
archive and hold it:

```bash
sudo pacman -U https://archive.archlinux32.org/packages/p/pango/pango-1:1.54.0-1.0-i686.pkg.tar.zst
```

Then add `IgnorePkg = pango` under `[options]` in `/etc/pacman.conf`. Remove that line once
`pacman -Si fontconfig` shows version 2.15 or newer. pango 1.57.1 and the 1.58.2-1.1 rebuild are
broken too; 1.54.0, 1.52.2 and 1.50.14 work.

### Handled for you: SVG images

Arch Linux 32's librsvg (which draws SVG images, and every Jewbuntu icon is one) and its
ImageMagick were built against `libxml2.so.2`, but its libxml2 2.15 ships a newer version
of that library. Without a fix, GTK draws no SVG at all. `jewbuntu-xfce-desktop` depends on
Arch Linux 32's own `libxml2-legacy`, which provides the old library, and adds a small pacman
hook that refreshes GTK's image-loader cache when either is installed. Nothing to do by hand.

## 2. Install the Jewbuntu packages

Put the four `.pkg.tar.zst` files in one folder (they aren't published yet; for now, build them
with `ci/arch32-build.sh`, below). Then:

```bash
sudo pacman -U ./jewbuntu-*.pkg.tar.zst
```

pacman fetches the rest from Arch Linux 32's repositories (Xfce pieces, Docklike, Inter,
DejaVu, the Hebrew dictionary).

## 3. Log in to the "Jewbuntu" session

LightDM now starts the **Jewbuntu** session by default for accounts that haven't picked one.
The session menu on the login screen still offers the plain **Xfce Session**.

Without a display manager (saves memory): put `exec startjewbuntu` in `~/.xinitrc` and run
`startx`.

New accounts start with the full look, including the top bar and dock. For an account that
already existed, Jewbuntu asks once at login whether to apply the look (this needs `zenity`).
You can also run it yourself:

```bash
jewbuntu skin apply
```

This saves your current settings first, then sets the skin, icons, font, window buttons,
wallpaper and keyboard. Your own panels are left alone; only new accounts get the Jewbuntu
panels. `jewbuntu skin status` lists what is set.

## Undo or remove

```bash
jewbuntu skin undo                         # your account: back to the settings saved by apply
sudo pacman -R jewbuntu-xfce-desktop       # everyone: the Jewbuntu session goes, Xfce's defaults stay
sudo pacman -R jewbuntu-core jewbuntu-skin jewbuntu-icons
```

Removing never deletes your own files (`~/.local/state/jewbuntu` and the settings backup are kept).

## Why Arch updates don't break it

- Every file belongs to a Jewbuntu package, and pacman refuses to install a file another
  package owns. Nothing is installed in Xfce's or LightDM's own directories.
- The defaults live in `/etc/xdg/jewbuntu`. Only the Jewbuntu session reads them: `startjewbuntu`
  puts that folder first in `XDG_CONFIG_DIRS`. xfconf merges them over Xfce's own defaults, and
  anything a user sets wins. The plain "Xfce Session" never sees them.
- LightDM and its greeter get Jewbuntu's settings through their drop-in folders
  (`/usr/share/lightdm/lightdm.conf.d`, `/usr/share/lightdm/lightdm-gtk-greeter.conf.d`).
  `/etc/lightdm/*.conf` still wins.
- The packages have no install scripts. Arch's own pacman hooks rebuild the icon, font and
  desktop caches.
- Jewbuntu's files under `/etc` are marked as `backup`, so your edits survive updates
  (pacman writes `.pacnew` files instead of overwriting them).

## Building and testing (developers)

Arch Linux 32 publishes no container image, so `ci/arch32-rootfs.sh` builds one from the
official x86_64 Arch image, pointing an i686 pacman at the Arch Linux 32 mirror. On Apple Silicon,
the i686 containers run under Docker Desktop's qemu emulation: slow, but real i686 binaries.

```bash
export DOCKER_CONTEXT=desktop-linux
ci/arch32-rootfs.sh                 # once: base image jewbuntu-arch32-base
WORKTREE=1 ci/arch32-build.sh       # -> dist/arch32/*.pkg.tar.zst (skin and icons from ../jewbuntu-skin, ../jewbuntu-icons)
ci/arch32-test.sh                   # -> dist/arch32-test.log, dist/arch32-xfce.png
```

`ci/arch32-test.sh` covers:
- install from Arch Linux 32's repositories, with no install scripts, no Conflicts/Replaces,
  and nothing in Xfce's or LightDM's directories;
- all defaults in the Jewbuntu session, merged with Xfce's, and the stock session left stock;
- `jewbuntu skin apply`/`undo` for an existing account against a real xfconfd;
- a real Xfce session on Xvfb at 1024×768 (window manager, theme, panels, keyboard), with a
  screenshot;
- LightDM's default session;
- a reinstall of Xfce and LightDM (what an update does);
- removal.

It does not test a Pentium III, 256 MB of RAM, real graphics or a real LightDM login. Those
need a VM with an old CPU model, or the laptop itself.
