# Jewbuntu for Asahi Linux (Apple Silicon Macs)

Jewbuntu's look runs on **Fedora Asahi Remix**, the official Asahi Linux distribution for
Apple Silicon Macs (all M1 and M2 models, with initial M3 support). It's an overlay, as on
Ubuntu: four RPM packages are added on top of Fedora, and Fedora and Asahi updates keep
coming as normal.

What you get today: the Jewbuntu Skin (windows, top bar, dock), Jewbuntu Icons, the Star
of David wallpapers, the Inter font, Mac-style window buttons on the left, an English and
Hebrew keyboard with Hebrew fonts, and **"Jewbuntu for Asahi Linux"** on the login screen.

Not yet available on Asahi: the ShulGo widgets, the Web Server app, the Hub and the
startup jingle. These are planned (see STATUS.md).

| Package | What it contains |
| --- | --- |
| `jewbuntu-skin` | GTK and GNOME Shell theme, wallpapers |
| `jewbuntu-icons` | Icon theme |
| `jewbuntu-core` | The `jewbuntu` command (`jewbuntu skin apply/undo/status`, settings) |
| `jewbuntu-asahi-desktop` | Jewbuntu defaults, login-screen logo, Jewbuntu Look extension, Hebrew |

## 1. Install Fedora Asahi Remix (GNOME edition)

From macOS on the Mac, follow [asahilinux.org/fedora](https://asahilinux.org/fedora/). The
installer runs from Terminal with `curl https://alx.sh | sh`, shrinks the macOS partition and
installs Linux next to macOS. **Choose the GNOME edition** (KDE Plasma is the default; Jewbuntu
needs GNOME). Back up the Mac first. Keep macOS, because Apple firmware updates come through it.

Jewbuntu currently targets Fedora Asahi Remix 45 (GNOME 51).

## 2. Install the Jewbuntu packages

Download the four `.rpm` files for your Fedora release into one folder (they are not
published yet; for now, build them with `ci/fedora-build.sh`, below). Then, in Terminal in
that folder:

```bash
sudo dnf install ./jewbuntu-*.rpm
```

dnf fetches the rest from Fedora's own repositories: Dash to Dock, Blur my Shell, User
Themes, Inter, and the Hebrew fonts and spelling dictionary.

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
sudo dnf remove jewbuntu-core jewbuntu-skin jewbuntu-icons
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
ci/fedora-test.sh                  # -> dist/fedora-test.log, dist/fedora-shell.png
```

`ci/fedora-test.sh` runs these checks:

- installing from Fedora's repositories, file ownership, and no scriptlets;
- all defaults and the GDM logo;
- `jewbuntu skin apply`/`undo` for an existing account;
- a real headless GNOME Shell with the four extensions ACTIVE, plus a screenshot;
- a reinstall of Fedora's gnome-shell, gdm and extensions (what an update does), with
  Jewbuntu checked again afterwards;
- removal.

It does not test Asahi hardware or a real GDM login. Specs are in `packaging/fedora/`; set
`FEDORA=` and `SHELL_MAJOR=` for another release.
