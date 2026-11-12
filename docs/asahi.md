# Jewbuntu for Asahi Linux (Apple Silicon Macs)

Jewbuntu's look runs on **Fedora Asahi Remix**, the official Asahi Linux distribution for
Apple Silicon Macs (all M1 and M2 models, with initial M3 support). It's an overlay, as on
Ubuntu: four RPM packages are added on top of Fedora, and Fedora and Asahi updates keep
coming as normal.

What you get: the same look as Jewbuntu on Ubuntu. That means the Jewbuntu Skin (glass windows,
clear top bar, floating glass dock), Jewbuntu Icons, the Star of David wallpapers (blue in light
mode, purple in dark mode), the Inter font and Mac-style window buttons on the left. You also
get an English and Hebrew keyboard with Hebrew fonts, the Hub (Hebrew date, zmanim, Shabbat
times), the startup jingle, the Web Server app, and **"Jewbuntu for Asahi Linux"** on the
login screen. The ShulGo widget is packaged too, but waits for a GNOME 51 fix (see below).

| Package | What it contains |
| --- | --- |
| `jewbuntu-skin` | GTK and GNOME Shell theme, wallpapers |
| `jewbuntu-icons` | Icon theme |
| `jewbuntu-core` | The `jewbuntu` command (`jewbuntu skin apply/undo/status`, settings) |
| `jewbuntu-asahi-desktop` | Jewbuntu defaults, login-screen logo, Jewbuntu Look extension, Hebrew |
| `jewbuntu-jewish-service`, `jewbuntu-hub` | Offline Jewish calendar service and the Hub app |
| `jewbuntu-branding` | Startup jingle, extra wallpapers |
| `jewbuntu-webserver` | Web Server app (httpd, php-fpm, MariaDB, phpMyAdmin, FTP) |
| `jewbuntu-shulgo` | ShulGo minyan finder: built separately from the private ShulGo repository |

## What works differently from Jewbuntu on Ubuntu

The look is the same. Some workflows differ because Fedora and GNOME differ:

- **Installing:** there's no one-file `.run` installer. You install the RPMs with `dnf`
  (step 2). Updates come from Fedora, through GNOME Software or `dnf`.
- **Dock:** Fedora's GNOME has no dock, so Jewbuntu turns on Dash to Dock, styled exactly like
  the Ubuntu dock. It's enabled per account by `jewbuntu skin apply` or the first-login question.
- **Login screen:** only the logo changes. The blurred Star of David login background used on
  Ubuntu isn't available on Fedora. Applying it would mean replacing a gnome-shell file, which
  updates would undo. The rest of the login screen stays as Fedora draws it.
- **First login:** Fedora shows its own welcome tour, and Jewbuntu asks once whether to apply
  the look.
- **Web Server:** setup downloads Apache (httpd), php-fpm, MariaDB, phpMyAdmin and vsftpd from
  Fedora, then writes only files of its own: Fedora's `httpd.conf` and `vsftpd.conf` stay
  untouched (FTP runs as its own `vsftpd@jewbuntu` service). SELinux stays enforcing: a small
  Jewbuntu policy module labels `~/Sites` for Apache and FTP. Sharing on the network also opens
  Fedora's firewall (firewalld), and only while sharing is on. FTP logins use your Fedora
  username. Details and undo steps: [web-server.md](web-server.md#on-fedora-asahi-remix).
- **ShulGo:** the top-bar widget doesn't load on GNOME 51 yet: it uses a GNOME Shell property
  that GNOME 51 removed. The ShulGo team has been asked for the fix. Until then, install
  `jewbuntu-shulgo` only for testing.

## 1. Install Fedora Asahi Remix (GNOME edition)

From macOS on the Mac, follow [asahilinux.org/fedora](https://asahilinux.org/fedora/). The
installer runs from Terminal with `curl https://alx.sh | sh`, shrinks the macOS partition and
installs Linux next to macOS. **Choose the GNOME edition** (KDE Plasma is the default; Jewbuntu
needs GNOME). Back up the Mac first. Keep macOS, because Apple firmware updates come through it.

Jewbuntu currently targets Fedora Asahi Remix 45 (GNOME 51).

## 2. Install the Jewbuntu packages

Download the `.rpm` files for your Fedora release into one folder (they are not
published yet; for now, build them with `ci/fedora-build.sh`, below). Then, in Terminal in
that folder:

```bash
sudo dnf install ./jewbuntu-*.rpm
```

dnf fetches the rest from Fedora's own repositories: Dash to Dock, Blur my Shell, User
Themes, Inter, and the Hebrew fonts and spelling dictionary. The Web Server installs no server
until you press **Set up** in the app.

## 3. Log out and back in

New accounts start with the Jewbuntu look. For an account that already existed, Jewbuntu
asks once, at the next login, whether to apply the look. You can also do it yourself:

```bash
jewbuntu skin apply
```

This saves your current settings first, turns on the four extensions the look needs (User
Themes, Dash to Dock, Blur my Shell, Jewbuntu Look) and links GTK4/libadwaita apps to the
skin. Log out and back in to see everything. `jewbuntu skin status` lists what is set.

## Undo or remove

```bash
jewbuntu skin undo                      # your account: back to the settings saved by apply
sudo dnf remove jewbuntu-asahi-desktop  # everyone: Fedora's defaults and login logo come back
sudo dnf remove 'jewbuntu-*'                # everything else
```

Run `jewbuntu skin undo` before removing the packages. Removing never deletes your own
files (`~/.local/state/jewbuntu` and the settings backup are kept).

## Why Fedora and Asahi updates don't break it

- Every file belongs to a Jewbuntu package. Nothing edits or replaces files from Fedora or
  Asahi packages, and there are no `Conflicts` or `Obsoletes` against them.
- The defaults are a gschema override (`zz_jewbuntu-asahi.gschema.override`). It changes
  defaults only, so anything you set yourself wins. The `zz_` name makes it sort after
  Fedora's own overrides (including gdm's login-screen logo), and later files win.
- The login screen gets only a logo through the standard `org.gnome.login-screen logo`
  setting. The full login-screen theme used on Ubuntu would have to replace gnome-shell's own
  file, which every gnome-shell update would undo, so it's left out on Fedora.
- The packages have no install scripts. Fedora's own triggers rebuild the schema, icon and
  font caches.
- Extensions only load on GNOME versions they declare. If a future GNOME release doesn't fit
  the skin or Jewbuntu Look, GNOME skips the extension and the desktop falls back to stock
  GNOME pieces instead of breaking. Each new Fedora release is tested before it's offered.

## Building and testing (developers)

Docker on an Apple Silicon Mac builds and tests natively (arm64):

```bash
export DOCKER_CONTEXT=desktop-linux
WORKTREE=1 ci/fedora-build.sh      # -> dist/fedora/*.rpm (skin and icons from ../jewbuntu-skin, ../jewbuntu-icons)
ci/fedora-test.sh                  # -> dist/fedora-test.log, dist/fedora-shell.png, dist/fedora-hub.png
ci/build-shulgo-rpm.sh /path/to/shulgo <commit>   # private ShulGo checkout -> dist/shulgo-fedora (never committed)
```

`ci/fedora-test.sh` runs these checks:

- installing from Fedora's repositories, file ownership, and no scriptlets;
- all defaults and the GDM logo;
- `jewbuntu skin apply`/`undo` for an existing account;
- a real headless GNOME Shell with the four extensions ACTIVE, plus a screenshot;
- the calendar service over D-Bus, the jingle, and the Hub as a window on that shell (screenshot);
- ShulGo as well, if its RPM is in `dist/fedora`;
- a reinstall of Fedora's gnome-shell, gdm and extensions (what an update does), with
  Jewbuntu checked again afterwards;
- removal.

It does not test Asahi hardware or a real GDM login. Specs are in `packaging/fedora/`; set
`FEDORA=` and `SHELL_MAJOR=` for another release.
