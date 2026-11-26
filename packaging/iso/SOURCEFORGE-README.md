# Jewbuntu

**A Jewish-friendly Ubuntu.** Hebrew, zmanim and a Mac-style look, as an overlay on
Ubuntu 26.04 LTS. Ubuntu itself is unchanged underneath: same installer, same updates,
same software.

**Preview release.** Source code, the one-file installer and issues are on GitHub:
[github.com/rhecht/jewbuntu](https://github.com/rhecht/jewbuntu).

## What's inside

- **Jewbuntu look:** a Mac-style theme (forked from MacTahoe, no Apple artwork), Jewbuntu
  icons, a glass dock and top bar, Star of David wallpapers (blue for light mode, purple for
  dark) and a matching login screen.
- **Hebrew:** English and Hebrew keyboards (Super+Space switches between them), fonts with
  nikud, and spell checking.
- **Jewbuntu Hub:** Hebrew date, zmanim, candle lighting and a calendar. It works fully
  offline.
- **Web Server:** one click sets up Apache, MySQL (MariaDB), PHP, phpMyAdmin, FTP and
  Composer.
  - Sites live at `http://NAME.localhost`; new ones can start empty, as WordPress or as
    CodeIgniter.
  - Only this computer can reach them, unless you switch sharing on.
- **ShulGo widget:** the next minyan near you in the top bar, plus events, mikvaos and zmanim,
  from [ShulGo](https://shulgo.com). It asks for your own ShulGo key the first time; no key
  is built in. Source: [github.com/rhecht/shulgo-widgets](https://github.com/rhecht/shulgo-widgets).

Nothing personal is on the disc. You choose your own name, computer name and password
during installation.

## Which file?

All the files are in the **`0.1.0-m1.29`** folder below, next to their `.sha256` checksums.

| You have | Download |
|---|---|
| An Intel/AMD PC, and you want a fresh install | **`jewbuntu-0.1.0-m1.29-intel-amd-64bit.iso`** (6.5 GB) |
| A computer already running Ubuntu 26.04, Intel/AMD **or ARM** | **`jewbuntu-installer-0.1.0-m1.29.run`** (10 MB). In Terminal, run `sh ~/Downloads/jewbuntu-installer-0.1.0-m1.29.run`, then log out and back in. It's also on [GitHub Releases](https://github.com/rhecht/jewbuntu/releases/latest). |
| An Apple Silicon Mac (M1/M2) running **Fedora Asahi Remix 45, GNOME edition** | **`jewbuntu-asahi-installer-0.1.0-m1.29.run`** (15 MB). See [Asahi Linux](#asahi-linux-apple-silicon-macs) below. Also on [GitHub Releases](https://github.com/rhecht/jewbuntu/releases/latest). |
| A computer running **Cutefish** (Intel/AMD **or ARM**) | **`jewbuntu-cutefish-installer-0.1.0-m1.29.run`** (0.5 MB): a light Jewbuntu skin over Cutefish's own Mac-like look. See [Cutefish](#cutefish-intelamd-and-arm) below. |
| A PC running (or ready for) **Lubuntu** or **Linux Mint**, including **32-bit PCs** that can run Lubuntu 18.04 | Ready-made ISOs and one-file installers for **Lubuntu 26.10**, **Lubuntu 27.04 (daily)**, **Lubuntu 18.04 32-bit** and **Linux Mint 22.3**. See [Lubuntu and Linux Mint](#lubuntu-and-linux-mint) below. |
| An **old 32-bit laptop** (about 2001, e.g. Pentium III, 256 MB) running **Arch Linux 32** | **`jewbuntu-arch32-installer-0.1.0-m1.29.run`**. **Web browsing is limited: use Lynx (text-based) or a newer device.** See [Old 32-bit laptops](#old-32-bit-laptops-arch-linux-32) below. |
| An **old PC from about 1998–2008** (Pentium II/III or newer, 256 MB) with a **CD drive**, and nothing installed you need to keep | **`jewbuntu-classic-7.10-c2-32bit.iso`** (729 MB, in the **`jewbuntu-classic-7.10-c2`** folder): a live CD that also installs. **Web browsing is limited: use Lynx (text-based) or a newer device.** See [Jewbuntu Classic](#jewbuntu-classic-the-2007-cd-for-the-oldest-pcs) below. |

## System requirements

- **A 64-bit Intel or AMD PC.** This ISO does not start on ARM computers, including Apple
  Silicon Macs.
- **Processor:** 2 GHz dual-core or better.
- **Memory:** 6 GB minimum (Ubuntu 26.04's own requirement). 8 GB is recommended if you
  will use the Web Server.
- **Disk:** 25 GB minimum, 30 GB or more recommended.
- **A USB stick of 8 GB or larger** to install from. **Writing the ISO erases everything on
  the stick.**
- **Internet is optional.** Jewbuntu installs completely from the USB stick. If you are
  online, Ubuntu also installs the latest security updates during setup.

**Older computers:** a 64-bit laptop with 4 GB of memory and a spinning hard disk will run
it, but slowly. Adding an SSD and 8 GB of memory makes a big difference.

## 1. Download and check

Download the `.iso` and the `.sha256` file next to it. Checking the download is optional,
but it confirms the file arrived intact. In a terminal, in the download folder:

- **Linux:** `sha256sum -c jewbuntu-0.1.0-m1.29-intel-amd-64bit.iso.sha256`
- **Mac:** `shasum -a 256 -c jewbuntu-0.1.0-m1.29-intel-amd-64bit.iso.sha256`
- **Windows (PowerShell):** `Get-FileHash .\jewbuntu-0.1.0-m1.29-intel-amd-64bit.iso`
  - Compare the result with the number in the `.sha256` file.

Expected SHA-256:
`24a067df08e4b0d13dbd5a50b6372325d797fef1d98093ae4983a6660cfd2bc5`

## 2. Make the USB stick

Use the tool for the computer you are making the stick on. **Choose the right drive:**
everything on it is erased.

**Windows: [Rufus](https://rufus.ie)** (free)
1. Insert the USB stick and open Rufus.
2. **Device:** your USB stick. **Boot selection:** SELECT, then choose the Jewbuntu ISO.
3. Click **START**. If Rufus asks how to write the image, choose **DD Image mode**.

**Mac: [balenaEtcher](https://etcher.balena.io)** (free)
1. Insert the USB stick and open Etcher.
2. **Flash from file:** choose the Jewbuntu ISO. **Select target:** your USB stick.
3. Click **Flash!** and enter your Mac password when asked.
4. If macOS then says the disk is not readable, click **Eject**. That is normal: Macs
   can't read Linux USB sticks.

**Ubuntu / Linux:** open **Startup Disk Creator** (built into Ubuntu), choose the ISO and
the USB stick, then click **Make Startup Disk**. balenaEtcher also works on Linux.

## 3. Install

1. Plug the stick into the PC you're installing on, then switch the PC on and open its
   boot menu. The key depends on the brand:

   | Brand | Boot menu key |
   |---|---|
   | Dell, Lenovo, Acer, Toshiba | F12 |
   | HP | F9 (or Esc, then F9) |
   | ASUS | F8 or Esc |
   | MSI | F11 |

   Choose the USB stick from the menu.
2. Choose **Try or Install Ubuntu**.
3. Go through Ubuntu's installer as usual: language, keyboard, network and disk, then your
   name, computer name and password. **"Erase disk and install" deletes everything on that
   computer's disk**, so back up first, or choose another option if you keep Windows
   alongside.
4. When asked about applications, **Default selection** is fine.
5. At the end, Jewbuntu is added automatically. Click **Restart Now**, remove the USB
   stick, and log in.
6. On your first login, Jewbuntu asks **"Apply the Jewbuntu look to this account?"** Click
   **Apply Jewbuntu look**, then log out and back in to get the glass dock, top bar and
   theme. Every new account gets the same question. You can undo it any time with
   `jewbuntu skin undo`.

The first start can take a little longer than usual.

## After installing

- **Jewbuntu Hub** and **Web Server** are in the app grid; the **ShulGo** widget is in the
  top bar.
- **Super+Space** switches between English and Hebrew typing.
- **Updates:** Ubuntu's updates arrive through Software Updater as usual. For Jewbuntu
  updates, download the newest one-file installer from GitHub and run it.
- **If the Jewbuntu step ever fails,** you still get a working Ubuntu. The packages are left
  in `/usr/local/share/jewbuntu/` with a README explaining the one command that finishes
  the job. The log is at `/var/log/jewbuntu-install.log`.

## Uninstalling

Jewbuntu only adds its own packages; removing them leaves a normal Ubuntu, and your files are
never touched. In Terminal (Ctrl+Alt+T):

1. `jewbuntu skin undo` puts your previous look back (once per account).
2. `sudo apt remove 'jewbuntu-*'` removes Jewbuntu (`sudo apt purge 'jewbuntu-*'` also removes
   its settings).
3. Log out and back in.

Details, including the Web Server and optional clean-up:
[docs/install.md](https://github.com/rhecht/jewbuntu/blob/main/docs/install.md#uninstalling).

## Asahi Linux (Apple Silicon Macs)

Jewbuntu's look, Hebrew, the Hub, the Web Server and ShulGo also run on
**Fedora Asahi Remix**, the official Asahi Linux distribution for M1 and M2 Macs. Jewbuntu
adds its own packages on top of Fedora; Fedora and Asahi updates keep coming as normal.

1. Install Fedora Asahi Remix 45 from macOS ([asahilinux.org/fedora](https://asahilinux.org/fedora/))
   and **choose the GNOME edition** (KDE Plasma is not supported).
2. In Fedora, download `jewbuntu-asahi-installer-0.1.0-m1.29.run` and its `.sha256`, then in
   Terminal, in the download folder:
   - `sha256sum -c jewbuntu-asahi-installer-0.1.0-m1.29.run.sha256` (optional check)
   - `sh jewbuntu-asahi-installer-0.1.0-m1.29.run`
3. Log out and back in.

**Uninstall:** `sh jewbuntu-asahi-installer-0.1.0-m1.29.run --uninstall` puts your previous
look back and removes every Jewbuntu package. Your files are never touched.

What's different from Ubuntu: Jewbuntu turns on Dash to Dock for the dock, Fedora shows its
own welcome tour, and the login screen theme is switched off automatically after a Fedora
upgrade to a GNOME version Jewbuntu doesn't support yet. Details:
[docs/asahi.md](https://github.com/rhecht/jewbuntu/blob/main/docs/asahi.md).

## Cutefish (Intel/AMD and ARM)

[Cutefish](https://cutefish.org) already looks like a Mac, so on Cutefish Jewbuntu is a light
skin on top of it. It adds:

- a **Star of David** as the dock's Launchpad ("start") button
- the **Star of David wallpapers**: blue in light mode, purple in dark mode
- the short **Jewbuntu jingle** when you sign in
- **ShulGo's minyan widget** in the top bar

The same file works on Intel/AMD and ARM computers. Cutefish keeps getting its own updates.

1. Install Cutefish ([cutefish.org](https://cutefish.org): the ISO, or on Debian 13 add
   Cutefish's repository and install `cutefish-desktop`).
2. Download `jewbuntu-cutefish-installer-0.1.0-m1.29.run` and its `.sha256`, then in Terminal,
   in the download folder:
   - `sha256sum -c jewbuntu-cutefish-installer-0.1.0-m1.29.run.sha256` (optional check)
   - `sh jewbuntu-cutefish-installer-0.1.0-m1.29.run`
3. The wallpaper changes straight away; log out and back in to see the new Launchpad button.
   A wallpaper you chose yourself is kept.
4. ShulGo: click its icon in the top bar, then **Link this computer**, and approve the code on
   your phone at shulgo.com/link.

**Uninstall:** `sh jewbuntu-cutefish-installer-0.1.0-m1.29.run --uninstall`. Cutefish's own
Launchpad button comes back; your files stay. Details:
[docs/cutefish.md](https://github.com/rhecht/jewbuntu/blob/main/docs/cutefish.md).

## Lubuntu and Linux Mint

Four more editions with a light Jewbuntu skin over a distribution that already works: the
distribution keeps its own installer, look and updates, and Jewbuntu adds:

- a **Star of David** as the start-menu button on the panel
- the **blue Star of David wallpaper** on the desktop and the login screen (only in place of the
  default picture; a wallpaper you chose yourself is kept)
- the short **Jewbuntu jingle** when you sign in
- **ShulGo's minyan widget** in the panel

Each comes two ways: a **ready-made ISO** (the distribution's own live ISO with Jewbuntu already
in it: write it to a USB stick, try it, install it with the distribution's own installer) or a
**one-file installer** for a computer that already runs that distribution.

| Edition | ISO | Installer for an existing system |
|---|---|---|
| **Lubuntu 26.10** "Stonking Stingray" (current release, 64-bit) | `jewbuntu-lubuntu-26.10-0.1.0-m1.29-64bit.iso` (4.0 GB) | `jewbuntu-lubuntu-installer-0.1.0-m1.29.run` (Lubuntu 22.04 or newer) |
| **Lubuntu 27.04** "Tenacious T-Rex" (daily development build, 64-bit) | `jewbuntu-lubuntu-27.04-daily-0.1.0-m1.29-64bit.iso` (4.0 GB) | the same `jewbuntu-lubuntu-installer` |
| **Lubuntu 18.04** (the last 32-bit Ubuntu, for old laptops) | `jewbuntu-lubuntu-18.04-0.1.0-m1.29-32bit.iso` (1.2 GB) | `jewbuntu-lubuntu18-32bit-installer-0.1.0-m1.29.run` (also works on 64-bit 18.04) |
| **Linux Mint 22.3** "Zena", Cinnamon (64-bit) | `jewbuntu-mint-22.3-0.1.0-m1.29-64bit.iso` (3.1 GB) | `jewbuntu-mint-installer-0.1.0-m1.29.run` |

**Installer:** download it and its `.sha256`, then in Terminal, in the download folder:
- `sha256sum -c FILE.run.sha256` (optional check)
- `sh FILE.run`, then log out and back in.
- ShulGo: click its icon in the panel, then **Link this computer**, and approve the code on your
  phone at shulgo.com/link.
- **Uninstall:** `sh FILE.run --uninstall`. The distribution's own menu button and wallpaper come
  back; your files stay.

Notes:
- Lubuntu 27.04 is Ubuntu's development series: expect daily changes until its release in April
  2027.
- Lubuntu 18.04 no longer gets free security updates from Ubuntu (it is in paid Extended Security
  Maintenance). It is here so 32-bit PCs that can run nothing newer stay useful. **Web browsing on
  its 2020 Firefox is limited: use a newer device for banking and other sensitive sites.**
- On Lubuntu 26.10/27.04, the installer's "minimal installation" choice leaves the skin out; run
  the `.run` installer afterwards to add it.
- On Mint, the jingle is Cinnamon's own sign-in sound: System Settings > Sounds turns it off.

Details: [docs/flavors.md](https://github.com/rhecht/jewbuntu/blob/main/docs/flavors.md).

## Old 32-bit laptops (Arch Linux 32)

A light edition for laptops from about 2001: a **Pentium III (or newer) with 256 MB** of memory,
running [Arch Linux 32](https://www.archlinux32.org) with the Xfce desktop. It gives you the
Jewbuntu look in a version old graphics chips can draw (no transparency), Hebrew typing, and
**ShulGo's next minyan right on the top bar**, with zmanim in its menu.

> **Web browsing is limited.** No current browser runs on a laptop this old: Firefox needs
> far more memory, and Chrome doesn't exist for these processors. Today's websites are built
> for much newer browsers, so many pages look broken or don't work here. For reading, use
> **Lynx**, the included text-based web browser (Dillo, also included, shows simple pages with
> pictures). For web apps, shopping, banking and the full ShulGo site, use a newer device.
> This edition puts ShulGo's information on the bar instead.

1. Install Arch Linux 32 (i686) with Xfce: see the [guide](https://github.com/rhecht/jewbuntu/blob/main/docs/arch32.md).
   Your CPU needs SSE (Pentium III or newer); a swap file is recommended.
2. Download `jewbuntu-arch32-installer-0.1.0-m1.29.run` and its `.sha256`, then in a terminal,
   in the download folder:
   - `sha256sum -c jewbuntu-arch32-installer-0.1.0-m1.29.run.sha256` (optional check)
   - `sh jewbuntu-arch32-installer-0.1.0-m1.29.run`

   It asks before every change. Arch Linux 32's current pango breaks every GTK program; the
   installer explains this and offers to hold the last working version. If you have no login
   screen yet, it offers to add one.
3. Log out and choose the **Jewbuntu** session (the plain Xfce session stays as it was).
4. ShulGo: click its icon on the top bar, then **Link this computer**, and approve the code on
   your phone at shulgo.com/link. A ShulGo administrator then approves the computer.

**Uninstall:** `sh jewbuntu-arch32-installer-0.1.0-m1.29.run --uninstall`. Xfce and your files
stay.

## Jewbuntu Classic (the 2007 CD, for the oldest PCs)

The original 2007 Jewbuntu CD (Ubuntu 7.10), remastered with the Jewbuntu look. It's a live CD
that also installs, it fits a 700 MB CD-R, and it runs on any **i686 PC (Pentium II/III or newer,
no SSE2 needed) with 256 MB** of memory. Everything is in the **`jewbuntu-classic-7.10-c2`**
folder, with its own README.

> **Web browsing is limited.** Today's websites are built for much newer browsers, so many
> pages look broken or don't work here, even with the disc's Firefox 3.6 and its
> secure-connection helper. For reading, use **Lynx**, the included text-based web browser. For
> web apps, shopping, banking and the full ShulGo site, use a newer device.

- The Jewbuntu look (skin, icons, wallpapers, a Mac-style top bar and dock, Jewbuntu boot and login
  screens), English and Hebrew typing (**Alt+Shift**), and **ShulGo** in the top bar.
- **Lynx**, a current text-based web browser with today's encryption, and **Firefox 3.6** with a
  secure-connection helper (the TLS bridge) that opens today's HTTPS sites for it and checks
  their certificates.
- An installer that fits today's screens and gives the installed system working software
  sources.
- **Ubuntu 7.10 has had no security updates since 2009.** Use it for writing, reading and light
  browsing, not for banking.

Burn `jewbuntu-classic-7.10-c2-32bit.iso` to a CD-R **as a disc image**, start the PC from it and
choose **Start or install Jewbuntu Classic**.
SHA-256: `2130b99387a7fc4911c9f24deadace10aa49ae97296c11cdee0d38fbfbb619fb`.
Details: [docs/gutsy.md](https://github.com/rhecht/jewbuntu/blob/main/docs/gutsy.md).
Known issues: some sites that prefer IPv6 (Wikipedia, some font servers) stalled in Firefox in
our virtual-machine test; and this exact ISO wasn't installed to a hard disk (an earlier c2 build
with the same installer was). See the folder's README.
The previous release (c1) stays in the `jewbuntu-classic-7.10-c1` folder.

## Status

**Tested:**
- The ISO's install path, start to finish, in an emulated Intel PC (with 0.1.0-m1.26):
  Ubuntu's installer with every screen interactive, security updates, the offline Jewbuntu
  step, the Jewbuntu login screen and wallpaper, and the first-login question applying the
  glass look. This ISO is built the same way with newer packages; its contents and boot
  setup were checked, not reinstalled.
- These packages (0.1.0-m1.29, with ShulGo) on Ubuntu 26.04: the one-file installer in a
  clean container (install, update, uninstall) and on the arm64 development VM, where the
  owner checked the look.

- The Asahi installer (0.1.0-m1.29) in a clean Fedora 45 container (install, uninstall) and
  in a Fedora 45 Workstation VM on an Apple Silicon Mac.

- The Arch Linux 32 edition (0.1.0-m1.29): its one-file installer in a clean i686 container
  (install, uninstall), and the packages in a real Xfce session there (look, panels, ShulGo
  starting, Arch updates, removal). An earlier build ran in an emulated Pentium III with 256 MB
  (UTM): it boots to the login screen in under a minute and uses about 125 MB when idle.

- Jewbuntu Classic 7.10: c1's live CD in an emulated Pentium III without SSE2, with 512 MB and
  with 256 MB (boot, desktop, Lynx and curl over HTTPS, Hebrew typing, the login screen, ShulGo's
  tray icon); c2 in UTM (live CD at 1024x768, the installer to a hard disk, working software
  sources on the installed system, Firefox over HTTPS through the secure-connection helper).

- Lubuntu and Linux Mint (0.1.0-m1.29): the packages installed inside each distribution's own live
  system while the ISOs were built, with the results checked there (diversions, default wallpaper
  and menu-button paths, panel layout, Cinnamon defaults, ShulGo on each Python). The Lubuntu 18.04
  ISO booted to its live desktop in an emulated Pentium III (Star of David wallpaper and menu
  button, ShulGo in the tray); the Mint ISO booted to its live Cinnamon desktop (Star of David wallpaper and menu button, ShulGo in the tray).

**Not yet tested:**
- real PC hardware, including Secure Boot (Ubuntu's signed boot files are unchanged)
- Asahi on a real Apple Silicon Mac
- the Arch Linux 32 edition on a real old laptop
- Jewbuntu Classic on real old PCs
- Hebrew typing in apps
- the Lubuntu and Mint ISOs installed to a disk, and on real hardware

Licence: Jewbuntu's own code is open source (see GitHub). Ubuntu and its packages keep
their own licences.
