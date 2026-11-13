# Installing Jewbuntu

There are two ways in:

- **Fresh install on an Intel/AMD PC: the Jewbuntu ISO.** Ubuntu's own installer with
  Jewbuntu added. It's 6.5 GB, too big for GitHub, so it's hosted on
  [SourceForge](https://sourceforge.net/projects/jewbuntu/files/). That page has the
  system requirements (64-bit Intel/AMD, 2 GHz dual-core, 6 GB memory, 25 GB disk, an
  8 GB or larger USB stick) and steps for writing the USB stick on Windows (Rufus), Mac
  (balenaEtcher) and Ubuntu (Startup Disk Creator). On first login, click **Apply Jewbuntu
  look**, then log out and back in. The page's text is kept in
  [`packaging/iso/SOURCEFORGE-README.md`](../packaging/iso/SOURCEFORGE-README.md).
- **A computer already running Ubuntu 26.04 LTS** (desktop or server, Intel/AMD or ARM):
  the one-file installer, `jewbuntu-installer-VERSION.run`, described below. It's on the
  [Releases page](https://github.com/rhecht/jewbuntu/releases) and on SourceForge.

## 1. Install Ubuntu 26.04 LTS

If the computer doesn't have it yet, download Ubuntu 26.04 LTS Desktop from
[ubuntu.com/download/desktop](https://ubuntu.com/download/desktop) and install it as usual.
Ubuntu's installer asks for your name, computer name, username and password, so
Jewbuntu never ships with anyone's account or details. Install the updates it offers.

## 2. Download the Jewbuntu installer

On the Ubuntu computer, open the
[latest release](https://github.com/rhecht/jewbuntu/releases/latest) and download
`jewbuntu-installer-VERSION.run` (and, optionally, the `.sha256` file next to it).

Optional check, in a terminal in your Downloads folder:

```bash
sha256sum -c jewbuntu-installer-*.run.sha256
```

It should say `OK`. The installer also checks itself and refuses to run if the
download is damaged.

## 3. Run it

Open **Terminal** (Ctrl+Alt+T) and run:

```bash
sh ~/Downloads/jewbuntu-installer-*.run
```

It explains what it will install and asks before changing anything. Enter your password
when asked. It can take a while, because it may add Ubuntu desktop packages.
At the end it offers to apply the Jewbuntu look to your account. Your old look is backed
up, and `jewbuntu skin undo` restores it.

Then **log out and back in**.

## Afterwards

- **Jewbuntu Hub** (Hebrew date, zmanim, calendar) and **Web Server** are in the app grid.
- The **ShulGo** widget (next minyan, events, mikvaos, zmanim) is in the top bar. The first
  time, it asks for your own ShulGo key; nothing is built in.
- Press **Super+Space** to switch between English and Hebrew typing.
- `jewbuntu doctor` checks the setup.
- **Updating:** download the newer installer and run it the same way. Ubuntu's own updates
  keep coming through Software Updater as usual, and never replace Jewbuntu's look.

## Uninstalling

Jewbuntu only adds its own packages, so removing them leaves a normal Ubuntu. Your files are
never touched. In **Terminal** (Ctrl+Alt+T):

1. **Put your previous look back** (once per account, while still logged in):

   ```bash
   jewbuntu skin undo
   ```

2. **Remove Jewbuntu:**

   ```bash
   sudo apt remove 'jewbuntu-*'
   ```

   This keeps Jewbuntu's settings in case you reinstall. To remove those too, use
   `sudo apt purge 'jewbuntu-*'` instead.

3. **Log out and back in.** The Jewbuntu top bar, dock style, ShulGo widget and wallpaper are
   gone, and Ubuntu's own look is back.

Optional:

- `sudo apt autoremove` removes packages that were installed only for Jewbuntu (Hebrew fonts
  and language packs, the extension manager). It lists them first; keep any you still want.
- If you set up the **Web Server**, Apache, MySQL (MariaDB), PHP, phpMyAdmin and FTP stay
  installed, because your sites may depend on them. Your sites in `~/Sites` are kept. To remove
  the servers as well: `sudo apt remove apache2 mariadb-server php phpmyadmin vsftpd`.
- `jewbuntu reset` (before removing) deletes your personal Jewbuntu data, such as Hub settings.
  It lists what it removes and asks you to confirm.

Tested on a clean Ubuntu 26.04: install, then `skin undo`, `remove` and `purge` leave no
Jewbuntu packages, apt consistent, and the user's files in place.

## Options

```bash
sh jewbuntu-installer-*.run --help      # all options
sh jewbuntu-installer-*.run --list      # packages inside
sh jewbuntu-installer-*.run --yes       # no questions (for scripted installs)
sh jewbuntu-installer-*.run --no-look   # install, but leave your current look alone
```

## Not in the installer

- **ShulGo** (minyanim, mikvaos, events) is distributed separately.
- A bootable **Jewbuntu ISO** is planned. Ubuntu's desktop ISO is about 6 GB, which is
  over GitHub's 2 GB limit per release file, so it needs other hosting.
