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
are kept in `/etc/apt/sources.list.original-2007`). The installer is preseeded to use
old-releases too (`preseed/ubuntu.seed`), so an installed system gets working apt sources,
including the 7.10 security updates.

The screen is at least 800x600 (the installer's minimum) and 1024x768 in a virtual machine:
`packaging/gutsy/casper/21jewbuntu_xmodes` runs in the initrd after casper writes `xorg.conf`.

## The web in 2026 on a 2007 system: Lynx, curl and the TLS bridge

Almost every website now requires TLS 1.2 or newer. Ubuntu 7.10's OpenSSL 0.9.8 only speaks
TLS 1.0, so Firefox 2, the 2007 Lynx and Python 2.5 all fail to connect, and no package from
that era can fix it.

So Jewbuntu Classic adds `jewbuntu-web-tools`: **Lynx 2.9.3 and curl 8.23.0, built statically
against OpenSSL 3.5 and musl libc** for plain i686 (they run on a Pentium II), with Mozilla's
current list of certificate authorities. They live in `/opt/jewbuntu`, so nothing from Ubuntu is
replaced; `/usr/bin/lynx` points there. Lynx shows pages as text: fine for news, Wikipedia,
search (it starts on DuckDuckGo's text page) and most reading. It uses Jewbuntu colours that stay
readable in light and dark terminals.

### Firefox 3.6

`jewbuntu-firefox` puts Mozilla's official Firefox 3.6.28 build (March 2012, the last 3.6) in
`/opt/firefox-3.6`, unchanged, and makes it the `firefox` command (`dpkg-divert`; Ubuntu's
Firefox 2 stays as `/usr/bin/firefox.ubuntu`). It is the newest Firefox that runs on 7.10's own
libraries: 4 to 10 would need a newer C++ library, and 52 ESR (the last for CPUs without SSE2)
a private copy of a newer base system. Its settings (the bridge, the start page, no update
checks, the user agent below) are in `distribution/distribution.ini`, Mozilla's customisation
file. The launcher (`packaging/gutsy/firefox/firefox`) makes the profile on first start and
adds the bridge's authority before Firefox opens, so the first page is already trusted.
Source: https://ftp.mozilla.org/pub/firefox/releases/3.6.28/source/

### HTTPS: the TLS bridge

Firefox 2 and 3.6 speak TLS 1.0 only (NSS 3.11 and 3.12), and TLS 1.2 arrived in Firefox 27,
which needs a newer GTK than 7.10 has. So `jewbuntu-web-tools` also carries
**jewbuntu-tlsbridge** (`packaging/gutsy/tlsbridge/`), a small program built on the same
OpenSSL 3.5:

- It listens on `127.0.0.1:3129` only. Firefox sends every HTTPS request there
  (3.6: `distribution.ini`; Firefox 2: `/etc/firefox/pref/jewbuntu-tlsbridge.js`); plain HTTP
  goes direct as before.
- For each request it connects to the real site with TLS 1.2 or 1.3, checks the certificate
  against Mozilla's list and the site's name, then answers Firefox with TLS 1.0 and a
  certificate for that site signed by an authority that exists on this computer only.
- Firefox can no longer see the real certificate, so the bridge refuses any site whose
  certificate fails, and shows Firefox a page saying why (expired, wrong name, self-signed).
  Revocation is not checked, as with Lynx and curl.
- The authority is made at first start (`/etc/init.d/jewbuntu-tlsbridge`, a few seconds on a
  Pentium III). Its key is in `/var/lib/jewbuntu-tlsbridge`, readable only by the `jbtls`
  system account the bridge runs as. Nothing is shipped on the CD (the remaster fails if it
  is), and an installed system makes its own at first boot.
- Trust: the start script puts the authority in `/etc/firefox/profile`, the template Firefox
  copies into new profiles, with Ubuntu's own `certutil` (libnss3-tools). Existing profiles
  are updated at login, as their owner (`/etc/xdg/autostart/jewbuntu-tlsbridge-trust.desktop`),
  skipping any profile Firefox has open. Root scripts never touch home directories.
- No site names are logged. Purging the package removes the authority, its key and the template
  store it made.

HTTPS then connects, but pages still have to work in a 2012 browser. Simple sites and mobile
pages usually do; sites that need today's JavaScript or layout will be blank or broken. Lynx
remains the better choice for reading.

Anti-bot filters (SiteGround's, among others) drop any request that says Firefox 2, 3.6 or even
4, before the site sees it, which looks like a blank page; shulgo.com and bluefringes.com did in
testing. Firefox 52, the last for Pentium III-class computers, gets through, so both Firefoxes
introduce themselves as `Firefox/52.0 Jewbuntu-Classic/7.10` (`general.useragent.override`).

## Please be honest with users about security

Ubuntu 7.10 stopped getting security updates in April 2009. The welcome page says so: fine for
writing, reading, learning and light browsing; not for banking or anything private; keep it
behind a home router. Lynx, curl and the TLS bridge are current, but Firefox 2 and the rest of
the system are not: a page can still attack the 2006 browser even over a well-checked connection.

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
  with 64 KB blocks like the original. The CD keeps Ubuntu's kernel, initrd and installer;
  the initrd only gets the boot splash, `casper.conf` and the screen-size script; the
  installer gets the old-releases mirror (preseed, and one line in its time zone step) and a
  small patch so its window fits 800x600.
  The Windows autorun extras (2007 Windows installers for Firefox, Thunderbird and AbiWord, and
  the K-Meleon browser) are removed: they are outdated and unsafe, and freeing their 30 MB keeps
  the ISO within a 700 MB CD-R.

Sources for everything built here (Lynx, curl, OpenSSL, ncurses, zlib, squashfs-tools, usplash, Inter)
are published next to the ISO.

## Known gaps

- Firefox 3.6 reaches HTTPS sites through the TLS bridge, but many of today's sites need more
  JavaScript and CSS than a 2012 browser has (see above).
- Sites that prefer IPv6 (Wikipedia, cdn.jsdelivr.net) stalled at "Waiting for…" in the UTM
  test, where IPv6 isn't carried. The bridge tries addresses in the order DNS gives them, 15
  seconds each; trying IPv4 first is the suspected fix (not confirmed).
- Not tested yet: real Pentium II/III machines and their graphics chips, sound and printing.
  Installing to a hard disk was tested in UTM (docs/test-results/2026-11-22-gutsy-c2-utm.md). The live CD was tested in QEMU as a Pentium III without SSE2, with
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
- Casper 7.10 rewrites `xorg.conf` at every boot (`casper-bottom/20xconfig`). Its mode list skips
  800x600, and without monitor details (EDID) X gets no sync ranges and starts at 640x480, where
  Ubiquity's buttons fall off the screen. Fixed after 20xconfig, not in the squashfs.
- Ubiquity 1.6 writes the installed sources from `mirror/http/hostname` and
  `apt-setup/security_host`, but its time zone step (`/usr/share/ubiquity/tzsetup`) sets
  `mirror/country` to the chosen country, and choose-mirror then picks that country's mirror
  (us.archive.ubuntu.com) over a preseeded host. The remaster drops that line. Its GTK frontend
  is called `gtk_ui`.
- The 2007 choose-mirror only knows `mirror/country` = `enter information manually`; the later
  value `manual` is not a country to it, so it still used the installer's country
  (gb.archive.ubuntu.com, all commented out as "failed to verify"). As a safety net
  `ubiquity/success_command` runs `preseed/jewbuntu-apt-sources.sh` after the install, which
  points any leftover archive or security line at old-releases and switches it back on.
- Ubiquity's window is as tall as its tallest page (the time zone map, 562 pixels), so with a
  title bar it does not fit 800x600. On short screens the remaster's patch drops the title bar
  and moves the window to the top of the work area once it is mapped: metacity centres a window
  taller than the work area, and the glade file asks GTK to keep it centred.
