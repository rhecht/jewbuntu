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

All three files are in the **`0.1.0-m1.29`** folder below, next to their `.sha256` checksums.

| You have | Download |
|---|---|
| An Intel/AMD PC, and you want a fresh install | **`jewbuntu-0.1.0-m1.29-amd64.iso`** (6.5 GB) |
| A computer already running Ubuntu 26.04, Intel/AMD **or ARM** | **`jewbuntu-installer-0.1.0-m1.29.run`** (10 MB). In Terminal, run `sh ~/Downloads/jewbuntu-installer-0.1.0-m1.29.run`, then log out and back in. It's also on [GitHub Releases](https://github.com/rhecht/jewbuntu/releases/latest). |
| An Apple Silicon Mac (M1/M2) running **Fedora Asahi Remix 45, GNOME edition** | **`jewbuntu-asahi-installer-0.1.0-m1.29.run`** (15 MB). See [Asahi Linux](#asahi-linux-apple-silicon-macs) below. Also on [GitHub Releases](https://github.com/rhecht/jewbuntu/releases/latest). |

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

- **Linux:** `sha256sum -c jewbuntu-0.1.0-m1.29-amd64.iso.sha256`
- **Mac:** `shasum -a 256 -c jewbuntu-0.1.0-m1.29-amd64.iso.sha256`
- **Windows (PowerShell):** `Get-FileHash .\jewbuntu-0.1.0-m1.29-amd64.iso`
  - Compare the result with the number in the `.sha256` file.

Expected SHA-256:
`ccf06f35332bab189f503d0799c0e06be95cac251937b44a1009de2ca5984d47`

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

**Not yet tested:**
- real PC hardware, including Secure Boot (Ubuntu's signed boot files are unchanged)
- Asahi on a real Apple Silicon Mac
- Hebrew typing in apps

Licence: Jewbuntu's own code is open source (see GitHub). Ubuntu and its packages keep
their own licences.
