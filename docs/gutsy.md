# Jewbuntu Classic: the 2007 Jewbuntu disc, dressed up (Ubuntu 7.10, 32-bit)

Jewbuntu Classic is the original 2007 Jewbuntu CD (`jewbuntu-7.10-desktop-i386.iso`, which was
plain Ubuntu 7.10 "Gutsy Gibbon"), remastered with the Jewbuntu look. It is for PCs from roughly
1998–2008 that run nothing newer: any i686 CPU (Pentium Pro/II/III, Pentium 4, Athlon, early
Atom), no SSE2 needed, 256 MB of RAM or more (384 MB is comfortable for the live CD).

It sits next to the other two editions for old hardware:

| Edition | Base | Good for |
| --- | --- | --- |
| Jewbuntu (Ubuntu 26.04) | current Ubuntu, GNOME 50 | 64-bit Intel/AMD PCs |
| Jewbuntu for Arch Linux 32 | Arch Linux 32 + Xfce | 32-bit laptops with SSE that need current software |
| **Jewbuntu Classic** | Ubuntu 7.10 + GNOME 2.20 | the oldest machines; a live CD that boots almost anywhere |

## What is on the disc

Everything from the original Ubuntu 7.10 CD (Firefox 2, OpenOffice.org 2.3, GNOME 2.20, the
installer), plus:

- **The Jewbuntu Skin**, solid version: the GTK 2 and Metacity themes from
  [jewbuntu-skin](https://github.com/rhecht/jewbuntu-skin) (no transparency, which old graphics
  chips can't draw), window buttons on the left.
- **Jewbuntu-Classic icons**: Jewbuntu Icons cut down to the 1,188 icon names GNOME 2.20 and its
  programs ask for, pre-rendered to PNG at 16–48 px (11 MB instead of 80 MB of SVG, and nothing
  for a Pentium III to render at login). Older icon names (`gnome-fs-directory` and so on) are
  linked to the new ones. Anything missing falls back to GNOME's own icons.
- **Star of David wallpapers**, the **Inter** font, Hebrew fonts (Culmus) and an English +
  Hebrew keyboard (**Alt+Shift** switches; the keyboard indicator on the top bar shows which).
- **A Mac-inspired panel layout**: menus, window list, tray, keyboard, volume and clock on the top
  bar (the clock shows weekday and time; Log Out is in the System menu), and a centred dock at the bottom (Home, Firefox, Lynx, Terminal, Writer, Text Editor,
  Help, Trash, Show Desktop). Ubuntu's Deskbar applet is left off the panel: it costs about
  15 MB of RAM.
- **A Jewbuntu login screen** (GDM theme), boot menu, boot splash (usplash) and session splash.
- **Lynx 2.9.3 and curl 8.23.0** with current encryption (see below).
- **A welcome page** (Applications → System Tools, and Firefox's home page) that explains what
  works and what doesn't.
- **ShulGo** in the top bar's tray: the ShulGo project's GNOME 2 widget (Python 2.5 and GTK 2),
  which makes its HTTPS calls through the bundled curl. `ci/build-shulgo-gtk2-deb.sh` packages it
  from a ShulGo checkout and first runs its tests under 7.10's own Python 2.5.

The live session's account is `jewbuntu` and the computer is called `jewbuntu`. apt points at
`old-releases.ubuntu.com`, where Ubuntu 7.10's packages now live (the original 2007 entries
are kept in `/etc/apt/sources.list.original-2007`).

## The web in 2026 on a 2007 system: why Lynx

Almost every website now requires TLS 1.2 or newer. Ubuntu 7.10's OpenSSL 0.9.8 only speaks
TLS 1.0, so Firefox 2, the 2007 Lynx and Python 2.5 all fail to connect, and no package from
that era can fix it.

So Jewbuntu Classic adds `jewbuntu-web-tools`: **Lynx 2.9.3 and curl 8.23.0, built statically
against OpenSSL 3.5 and musl libc** for plain i686 (they run on a Pentium II), with Mozilla's
current list of certificate authorities. They live in `/opt/jewbuntu`, so nothing from Ubuntu is
replaced; `/usr/bin/lynx` points there. Lynx shows pages as text: fine for news, Wikipedia,
search (it starts on DuckDuckGo's text page) and most reading. It uses Jewbuntu colours that stay
readable in light and dark terminals.

Firefox 2 stays on the disc for local files and the few sites that still accept old browsers.

## Please be honest with users about security

Ubuntu 7.10 stopped getting security updates in April 2009. The welcome page says so: fine for
writing, reading, learning and light browsing; not for banking or anything private; keep it
behind a home router. Lynx and curl themselves are current, but the rest of the system is not.

## Building (developers)

On a Mac or Linux machine with Docker and about 10 GB free. Each step is a script in `ci/`:

```bash
export DOCKER_CONTEXT=desktop-linux
ci/gutsy-unpack.sh ~/Downloads/jewbuntu-7.10-desktop-i386.iso   # Docker volume jewbuntu-gutsy + image jewbuntu-gutsy-i386:rootfs
ci/gutsy-tools-build.sh       # static i686 Lynx + curl -> dist/gutsy/opt-jewbuntu.tar.gz (+ sources)
WORKTREE=1 ci/arch32-build.sh # the solid skin + icons (shared with the Arch Linux 32 port), if not built yet
ci/gutsy-build-debs.sh        # -> dist/gutsy/debs/jewbuntu-classic-desktop_*.deb, jewbuntu-web-tools_*.deb
ci/gutsy-remaster.sh          # -> dist/gutsy/jewbuntu-classic-7.10-<version>-32bit.iso
```

How it works:

- **Unpack**: the ISO's squashfs (format 3.0) is read by today's `unsquashfs`. The root
  filesystem goes into a Docker volume and an i386 image, which 7.10's own programs run in
  through Docker's emulation (Python 2.5.1, PyGTK 2.12).
- **Packages** are ordinary `.deb`s (gzip-compressed, which the 2007 dpkg reads). Defaults go in
  through `/usr/share/gconf/defaults` (`20_jewbuntu-classic` and `30_jewbuntu-panel.entries`,
  the second generated from Ubuntu's own panel layout by `packaging/gutsy/make-panel.py`), so
  every user can still change them and nothing Ubuntu ships is edited. The icon theme is made
  by `packaging/gutsy/make-icons.py`.
- **Remaster**: a copy of the root filesystem gets the packages in a chroot, then is packed with
  **squashfs-tools 3.2-r2** (the version Ubuntu 7.10 shipped), built from source, because the 2.6.22 kernel only mounts squashfs format 3:0,
  with 64 KB blocks like the original. The CD keeps Ubuntu's kernel, initrd and installer.
  The Windows autorun extras (2007 Windows installers for Firefox, Thunderbird and AbiWord, and
  the K-Meleon browser) are removed: they are outdated and unsafe, and freeing their 30 MB keeps
  the ISO within a 700 MB CD-R.

Sources for everything built here (Lynx, curl, OpenSSL, ncurses, zlib, squashfs-tools, usplash, Inter)
are published next to the ISO.

## Known gaps

- Firefox 2 can't open most sites (see above). There's no fix for that on 7.10.
- Not tested yet: installing to a hard disk, real Pentium II/III machines and their graphics
  chips, sound and printing. The live CD was tested in QEMU as a Pentium III without SSE2, with
  512 MB and with 256 MB (docs/test-results/2026-11-19-gutsy-qemu.md).
- The boot menu's own colours (orange text) come from Ubuntu's gfxboot theme, which is compiled;
  only its background and labels are Jewbuntu's.

## Lessons from the 2007 base (for whoever touches this next)

- The 2.6.22 kernel mounts only squashfs format 3:0: squashfs-tools 3.3 and later write 3:1,
  which fails with "Invalid argument" and drops the live CD to an initramfs shell.
- Casper 7.10 ignores `username=`/`hostname=` boot options; they come from `casper.conf` inside
  the initrd. Rebuilding the initrd with mkinitramfs loses the disc UUID file, so the remaster
  keeps Ubuntu's initrd and swaps single files in it.
- Static musl programs run on 2.6.22, but syscalls newer than that with flags have no fallback:
  curl's eventfd wakeup failed with "Out of memory" until it was built without eventfd.
- GTK 2.12 stops reading an rc file at its first unknown option; murrine 0.53 predates
  `textstyle`, `glowstyle` and friends, and the pixmap engine predates `direction`.
- usplash passes theme colour numbers through as raw pixels in 16-bit modes; draw with images.
