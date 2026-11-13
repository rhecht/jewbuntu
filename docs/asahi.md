# Jewbuntu for Asahi Linux (Apple Silicon Macs)

Jewbuntu's look runs on **Fedora Asahi Remix**, the official Asahi Linux distribution for
Apple Silicon Macs (all M1 and M2 models, with initial M3 support). It's an overlay, as on
Ubuntu: Jewbuntu's own RPM packages are added on top of Fedora, and Fedora and Asahi updates
keep coming as normal. One file installs them all: `jewbuntu-asahi-installer-<version>.run`.

What you get: the same look as Jewbuntu on Ubuntu. That means the Jewbuntu Skin (glass windows,
clear top bar, floating glass dock), Jewbuntu Icons, the Star of David wallpapers (blue in light
mode, purple in dark mode), the Inter font and Mac-style window buttons on the left. You also
get an English and Hebrew keyboard with Hebrew fonts, the Hub (Hebrew date, zmanim, Shabbat
times), the startup jingle, the Web Server app, and **"Jewbuntu for Asahi Linux"** on the
login screen, and the ShulGo minyan finder widget.

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

- **Installing:** a separate one-file installer, `jewbuntu-asahi-installer-<version>.run`
  (the Ubuntu one refuses to run on Fedora, and this one refuses Ubuntu). It installs with
  `dnf`, so Fedora's packages come from Fedora's repositories. Fedora and Asahi updates come
  through GNOME Software or `dnf` as usual. Jewbuntu updates come from a newer installer file.
- **Removing:** `--uninstall` on the same file (below) instead of `apt remove`.
- **Dock:** Fedora's GNOME has no dock, so Jewbuntu turns on Dash to Dock, styled exactly like
  the Ubuntu dock. It's enabled per account by `jewbuntu skin apply` or the first-login question.
- **Login screen:** "Jewbuntu for Asahi Linux" logo and the blurred Star of David background,
  as on Ubuntu, but done differently. Fedora has no login-theme switch like Ubuntu's, so
  Jewbuntu hands GNOME Shell a folder of its own theme files through GLib's standard
  `G_RESOURCE_OVERLAYS` setting, and no Fedora file is replaced. When a Fedora upgrade brings
  a GNOME version the skin has no login theme for yet, the login screen goes back to Fedora's
  own until a matching skin arrives.
- **First login:** Fedora shows its own welcome tour, and Jewbuntu asks once whether to apply
  the look.
- **Web Server:** setup downloads Apache (httpd), php-fpm, MariaDB, phpMyAdmin and vsftpd from
  Fedora, then writes only files of its own: Fedora's `httpd.conf` and `vsftpd.conf` stay
  untouched (FTP runs as its own `vsftpd@jewbuntu` service). SELinux stays enforcing: a small
  Jewbuntu policy module labels `~/Sites` for Apache and FTP. Sharing on the network also opens
  Fedora's firewall (firewalld), and only while sharing is on. FTP logins use your Fedora
  username. Details and undo steps: [web-server.md](web-server.md#on-fedora-asahi-remix).
- **ShulGo:** needs ShulGo f0a898c or later (the first version that runs on GNOME 51). That
  version renamed the extension to `jewbuntu@shulgo.com`. Jewbuntu moves an account's old
  ShulGo entry over at the next login, so the widget stays on. The API key is kept, but the
  saved place and options need picking once more.

## 1. Install Fedora Asahi Remix (GNOME edition)

From macOS on the Mac, follow [asahilinux.org/fedora](https://asahilinux.org/fedora/). The
installer runs from Terminal with `curl https://alx.sh | sh`, shrinks the macOS partition and
installs Linux next to macOS. **Choose the GNOME edition** (KDE Plasma is the default; Jewbuntu
needs GNOME). Back up the Mac first. Keep macOS, because Apple firmware updates come through it.

Jewbuntu currently targets Fedora Asahi Remix 45 (GNOME 51).

## 2. Run the Jewbuntu installer

Download `jewbuntu-asahi-installer-<version>.run` (about 15 MB) and its `.sha256` from
[SourceForge](https://sourceforge.net/projects/jewbuntu/files/) or
[GitHub Releases](https://github.com/rhecht/jewbuntu/releases/latest). On the Asahi Mac, in
Terminal (in the download folder):

```bash
sha256sum -c jewbuntu-asahi-installer-<version>.run.sha256   # optional: checks the download
sh jewbuntu-asahi-installer-<version>.run
```

Or download and run it in one go (0.1.0-m1.29 is the current release):

```bash
curl -fLO https://github.com/rhecht/jewbuntu/releases/download/v0.1.0-m1.29/jewbuntu-asahi-installer-0.1.0-m1.29.run
sh jewbuntu-asahi-installer-0.1.0-m1.29.run
```

It says what it will add and asks first, then asks for your password once. It checks that
this is Fedora 45 with GNOME, checks every package inside against its checksum, and installs
them with `dnf`. dnf fetches the rest from Fedora's own repositories: Dash to Dock, Blur my
Shell, User Themes, Inter, and the Hebrew fonts and spelling dictionary. Then it offers to
apply the look to your account now (your current look is backed up first). The Web Server
installs no server until you press **Set up** in the app.

| Option | What it does |
| --- | --- |
| `--yes` | Install without questions |
| `--no-look` | Install, but don't apply the look to your account now |
| `--uninstall` | Put your old look back and remove Jewbuntu (below) |
| `--list` | Show the packages inside |
| `--extract DIR` | Only unpack the `.rpm` files and their checksums into `DIR` |
| `--force` | Try on a release other than Fedora 45 (unsupported) |

**Updating Jewbuntu:** download a newer installer and run it the same way. Your settings stay.

## 3. Log out and back in

Log out and back in (or restart) to see the new desktop and login screen. New accounts start
with the Jewbuntu look. For any other account that already existed, Jewbuntu asks once, at
its next login, whether to apply the look. You can also do it yourself:

```bash
jewbuntu skin apply
```

This saves your current settings first, turns on the four extensions the look needs (User
Themes, Dash to Dock, Blur my Shell, Jewbuntu Look) and links GTK4/libadwaita apps to the
skin. Log out and back in to see everything. `jewbuntu skin status` lists what is set.

## Undo or remove

With the installer file:

```bash
sh jewbuntu-asahi-installer-<version>.run --uninstall
```

It asks first, runs `jewbuntu skin undo` for your account (your look from before Jewbuntu
comes back), then removes every Jewbuntu package with `dnf`. Fedora's own look, defaults and
login screen come back after you log out and back in. Other accounts that applied the look:
run `jewbuntu skin undo` as that user first.

Without the file, the same by hand:

```bash
jewbuntu skin undo                      # your account: back to the settings saved by apply
sudo dnf remove 'jewbuntu-*'            # everyone: Fedora's defaults and login screen come back
```

Removing never deletes your own files (`~/.local/state/jewbuntu` and the settings backup are
kept). A Web Server you set up keeps its sites in `~/Sites`; see
[web-server.md](web-server.md#on-fedora-asahi-remix) for removing the servers it installed.

## Why Fedora and Asahi updates don't break it

- Every file belongs to a Jewbuntu package. Nothing edits or replaces files from Fedora or
  Asahi packages, and there are no `Conflicts` or `Obsoletes` against them.
- The defaults are a gschema override (`zz_jewbuntu-asahi.gschema.override`). It changes
  defaults only, so anything you set yourself wins. The `zz_` name makes it sort after
  Fedora's own overrides (including gdm's login-screen logo), and later files win.
- The login-screen logo is the standard `org.gnome.login-screen logo` setting. The login
  theme reaches GNOME Shell through `G_RESOURCE_OVERLAYS`
  (`/usr/lib/environment.d/60-jewbuntu-login-theme.conf`), which serves Jewbuntu's
  stylesheet and assets in place of gnome-shell's built-in ones without changing gnome-shell's
  file. The skin keeps one theme folder per GNOME version
  (`/usr/share/jewbuntu-skin/gdm-overlay/<major>/`), and
  `/usr/libexec/jewbuntu/jewbuntu-login-theme` points the overlay at the one matching the
  installed gnome-shell, or at nothing.
- That link is the only thing install scripts do: `jewbuntu-asahi-desktop` updates it when
  it, gnome-shell or the skin is installed or updated, and removes it on removal. Fedora's own
  triggers rebuild the schema, icon and font caches.
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
- all defaults, the GDM logo and the login-theme link (also with a missing GNOME version);
- `jewbuntu skin apply`/`undo` for an existing account;
- a real headless GNOME Shell with the four extensions ACTIVE, plus a screenshot;
- the calendar service over D-Bus, the jingle, and the Hub as a window on that shell (screenshot);
- ShulGo as well, if its RPM is in `dist/fedora`;
- a reinstall of Fedora's gnome-shell, gdm and extensions (what an update does), with
  Jewbuntu checked again afterwards;
- removal.

`ci/installer-test-asahi.sh` runs the one-file installer in a clean Fedora 45 container:
`--list`, install, a damaged file being refused, and `--uninstall` leaving nothing under `/usr` (`ci/make-installer-asahi.sh` builds
it from `dist/fedora` into `dist/release`).

The containers do not test Asahi hardware or a real GDM login. Specs are in `packaging/fedora/`; set
`FEDORA=` and `SHELL_MAJOR=` for another release.

To see the look on a real desktop (and test SELinux and the password prompts), use a Fedora
Workstation VM in UTM: [vm-setup-fedora.md](vm-setup-fedora.md).
