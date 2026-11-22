# Jewbuntu skin for Cutefish (amd64 and arm64)

[Cutefish](https://cutefish.org) already looks like a Mac, so on Cutefish Jewbuntu is a light skin
that adds four touches and leaves the rest of Cutefish's look alone:

- **A Star of David as the "start" button**: the Launchpad button at the left end of the dock.
- **Star of David wallpapers**: blue in light mode, purple in dark mode, the same pictures as
  Jewbuntu's Ubuntu defaults. When Cutefish switches between light and dark, the wallpaper follows.
- **The Jewbuntu jingle when you sign in**: the short 8-bit Hava Nagila, once per boot.
- **ShulGo's minyan widget in the top bar**: the next minyan near you and today's zmanim.

It's an overlay, like every Jewbuntu edition: four packages on top of Cutefish, which keeps getting
Cutefish's and Debian's updates. Every package is `Architecture: all`, so one installer serves both
Intel/AMD (amd64) and ARM (arm64) computers.

| Package | What it contains |
| --- | --- |
| `jewbuntu-cutefish` | Star of David Launchpad button, the two wallpapers, the wallpaper helper |
| `jewbuntu-branding` | The jingle and its once-per-boot player (the same package as on Ubuntu) |
| `jewbuntu-core` | The `jewbuntu` command and settings (`jewbuntu startup-sound on/off`) |
| `shulgo-xfce` | ShulGo's tray widget (GTK3/Python), built from the public `rhecht/shulgo-widgets` mirror |

## What Cutefish is (as of November 2026)

Cutefish 1.0 is a Debian 13 (trixie) distribution for amd64 and arm64, with its own Wayland
compositor and toolkit (the earlier Qt/KWin desktop is gone). There are nightly ISOs only, no
stable release yet. It can also be added to an existing Debian 13 from Cutefish's APT repository
(`deb https://download.cutefish.org/debian trixie-nightly main`, key fingerprint
`5F52 7F0C B976 4BA0 AF99 BAE5 F4A4 30BC 9E10 91A7`).

## Install

On a computer running Cutefish, download `jewbuntu-cutefish-installer-VERSION.run` from
[SourceForge](https://sourceforge.net/projects/jewbuntu/files/) and run it in Terminal:

```bash
sh ~/Downloads/jewbuntu-cutefish-installer-*.run
```

It asks first, then asks for your password. `--yes` skips the questions; `--no-shulgo` leaves the
ShulGo widget out. The wallpaper changes straight away; the new Launchpad button shows after you log
out and back in. To use ShulGo, click its icon in the top bar, then **Link this computer**, and
approve the code on your phone at shulgo.com/link.

## Remove

```bash
sh ~/Downloads/jewbuntu-cutefish-installer-*.run --uninstall
```

Cutefish's own Launchpad button comes back at the next sign-in. Your files are never touched, and
your wallpaper stays as it is. Before removing, `jewbuntu-cutefish-session --undo` puts Cutefish's
default wallpaper back.

## How it works

- **Launchpad button.** Cutefish draws it from `/usr/share/cutefish-compositor/shell/launchpad.svg`,
  a fixed path. `jewbuntu-cutefish` replaces that file with `dpkg-divert`, Debian's own mechanism
  for this: Cutefish's file is kept, and goes on being updated, as `launchpad.svg.cutefish`, and
  removing the package moves it back. Cutefish updates never overwrite the Star of David.
- **Wallpapers.** The two pictures go in `/usr/share/backgrounds/cutefishos/` as JPEG (Cutefish's
  desktop draws JPEG wallpapers but not PNG ones: a PNG falls back to the plain background colour),
  so they appear in
  Settings > Wallpaper. Cutefish keeps each account's wallpaper in
  `~/.config/cutefish/services.conf` and has no system-wide default, so a small helper,
  `jewbuntu-cutefish-session`, runs at sign-in (from `/etc/xdg/autostart`) as the user:
  - The first time, it sets the blue wallpaper (purple in dark mode), but only if the account is
    still on Cutefish's default. A wallpaper someone chose is kept.
  - While a Jewbuntu wallpaper is showing, it follows Cutefish's light/dark switch
    (`darkModeChanged` on `org.cutefish.Services`). Pick any other wallpaper and it stops.
  - `--apply` sets the Jewbuntu wallpaper on request; `--undo` goes back to Cutefish's default and
    stops it reapplying; `--status` shows what it sees.
- **Jingle.** `jewbuntu-branding`'s autostart entry, as on Ubuntu. It plays once per boot, waits
  for PipeWire, respects a muted output and the quiet schedule.
- **ShulGo.** Cutefish's top bar implements the standard tray protocol (StatusNotifierItem with
  DBusMenu), which ShulGo's Xfce widget already speaks through AyatanaAppIndicator3, so the same
  widget works unchanged. It starts from `/etc/xdg/autostart/shulgo-xfce.desktop`.

## Testing

```bash
export DOCKER_CONTEXT=desktop-linux
ci/cutefish-build.sh 0.1.0~m1.29+cutefish1 <shulgo-widgets commit> dist/cutefish
ci/cutefish-test.sh dist/cutefish dist/m1.29              # arm64; add "-- amd64" for amd64 (emulated)
ci/make-installer-cutefish.sh 0.1.0-m1.29 dist/release-cutefish/jewbuntu-cutefish-installer-0.1.0-m1.29.run dist/cutefish dist/m1.29
ci/installer-test-cutefish.sh dist/release-cutefish/jewbuntu-cutefish-installer-0.1.0-m1.29.run [amd64]
```

The test image (`ci/Dockerfile.cutefish`) is Debian 13 with Cutefish from Cutefish's own repository.
The test runs Cutefish's compositor without a screen (`--no-drm`) together with Cutefish's settings
service and PipeWire, and checks the install, the diversion, the first-login wallpaper, light/dark
switching, that a chosen wallpaper is kept, `--apply`/`--undo`, the jingle (played to a null
output), ShulGo, and clean removal.

Cutefish's top bar, its tray and its screenshot service run only with a real display, so in a
container ShulGo is checked against a stand-in tray watcher (`ci/sni-watcher-standin.py`).

On a real Cutefish screen, in a UTM VM with no one at the keyboard:

```bash
ci/cutefish-vm-iso.sh ~/Downloads/cutefish-1.0-nightly-…-arm64.iso dist/release-cutefish/jewbuntu-cutefish-installer-0.1.0-m1.29.run dist/cutefish-vm/test.iso
ci/cutefish-utm.sh dist/cutefish-vm/test.iso && utmctl start "Jewbuntu Cutefish test"
curl -O http://GUEST:8765/status.txt -O http://GUEST:8765/1-light.png -O http://GUEST:8765/2-dark.png
```

The test ISO (never published) uses live-config's `hooks=` boot option to run the one-file
installer before the login screen, holds the login screen until it has finished, and then the live
system's automatic sign-in is the first sign-in after installing. A small autostart check
(`ci/cutefish-vm/vmcheck.sh`) records the state, closes the live installer window, takes Cutefish's
own screenshots in light and dark mode, and serves them on port 8765. Don't restart
`cutefish-dm` in the live system: sessions started after that get no runtime directory and fail.
Results: `docs/test-results/2026-11-22-cutefish-*`.
