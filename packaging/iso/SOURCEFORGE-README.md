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

All four files are in the **`0.1.0-m1.29`** folder below, next to their `.sha256` checksums.

| You have | Download |
|---|---|
| An Intel/AMD PC, and you want a fresh install | **`jewbuntu-0.1.0-m1.29-intel-amd-64bit.iso`** (6.5 GB) |
| A computer already running Ubuntu 26.04, Intel/AMD **or ARM** | **`jewbuntu-installer-0.1.0-m1.29.run`** (10 MB). In Terminal, run `sh ~/Downloads/jewbuntu-installer-0.1.0-m1.29.run`, then log out and back in. It's also on [GitHub Releases](https://github.com/rhecht/jewbuntu/releases/latest). |
| An Apple Silicon Mac (M1/M2) running **Fedora Asahi Remix 45, GNOME edition** | **`jewbuntu-asahi-installer-0.1.0-m1.29.run`** (15 MB). See [Asahi Linux](#asahi-linux-apple-silicon-macs) below. Also on [GitHub Releases](https://github.com/rhecht/jewbuntu/releases/latest). |
| An **old 32-bit laptop** (about 2001, e.g. Pentium III, 256 MB) running **Arch Linux 32** | **`jewbuntu-arch32-installer-0.1.0-m1.29.run`**. **Not for modern web browsing.** See [Old 32-bit laptops](#old-32-bit-laptops-arch-linux-32) below. |
| An **old PC from about 1998–2008** (Pentium II/III or newer, 256 MB) with a **CD drive**, and nothing installed you need to keep | **`jewbuntu-classic-7.10-c1-32bit.iso`** (715 MB, in the **`jewbuntu-classic-7.10-c1`** folder): a live CD that also installs. See [Jewbuntu Classic](#jewbuntu-classic-the-2007-cd-for-the-oldest-pcs) below. |

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

## Old 32-bit laptops (Arch Linux 32)

A light edition for laptops from about 2001: a **Pentium III (or newer) with 256 MB** of memory,
running [Arch Linux 32](https://www.archlinux32.org) with the Xfce desktop. It gives you the
Jewbuntu look in a version old graphics chips can draw (no transparency), Hebrew typing, and
**ShulGo's next minyan right on the top bar**, with zmanim in its menu.

> **Not for modern web browsing.** No current browser runs on a laptop this old: Firefox needs
> far more memory, and Chrome doesn't exist for these processors. The included **Dillo** and
> **Lynx** (text only) show simple pages like news and Wikipedia, but not today's web apps
> (Gmail, shopping, banking, the full ShulGo website). This edition puts the information on
> the bar instead.

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
no SSE2 needed) with 256 MB** of memory. Everything is in the **`jewbuntu-classic-7.10-c1`**
folder, with its own README.

- The Jewbuntu look (skin, icons, wallpapers, a Mac-style top bar and dock, Jewbuntu boot and login
  screens), English and Hebrew typing (**Alt+Shift**), and **ShulGo** in the top bar.
- **Lynx**, a current text browser with today's encryption, because the 2007 Firefox on the disc
  can't open most websites any more.
- **Ubuntu 7.10 has had no security updates since 2009.** Use it for writing, reading and light
  browsing, not for banking.

Burn `jewbuntu-classic-7.10-c1-32bit.iso` to a CD-R **as a disc image**, start the PC from it and
choose **Start or install Jewbuntu Classic**.
SHA-256: `73f4ce3c7b11d1045ca730c24971137a520c13fff0c5c7c009c3fd8ad509cd46`.
Details: [docs/gutsy.md](https://github.com/rhecht/jewbuntu/blob/main/docs/gutsy.md).

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

- Jewbuntu Classic 7.10 (c1): the live CD in an emulated Pentium III without SSE2, with 512 MB
  and with 256 MB: boot, desktop, Lynx and curl over HTTPS, Hebrew typing, the login screen and
  ShulGo's tray icon. Installing it to a hard disk was not tested.

**Not yet tested:**
- real PC hardware, including Secure Boot (Ubuntu's signed boot files are unchanged)
- Asahi on a real Apple Silicon Mac
- the Arch Linux 32 edition on a real old laptop
- Jewbuntu Classic installed to a hard disk, and on real old PCs
- Hebrew typing in apps

Licence: Jewbuntu's own code is open source (see GitHub). Ubuntu and its packages keep
their own licences.
