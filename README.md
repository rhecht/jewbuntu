# Jewbuntu

A Jewish desktop layer for **supported Ubuntu LTS releases**: Mac-inspired GNOME
defaults, good Hebrew support, Jewish calendar and zmanim, Shulgo integration,
and optional local AI and developer tools.

Jewbuntu is **not a fork**. It is a set of ordinary Debian packages that sit on
top of Ubuntu 26.04 LTS. Ubuntu keeps its own kernel, installer, updates and
release upgrader. Your settings live in your home folder and come with you when
Ubuntu moves to a new release.

> Status: **preview releases.** See [STATUS.md](STATUS.md) for what has been verified
> and what remains untested.

## Install

**Fresh install on an Intel/AMD PC:** download the Jewbuntu ISO from
[SourceForge](https://sourceforge.net/projects/jewbuntu/files/), write it to a USB stick
and install. Requirements and USB steps are on that page and in
[docs/install.md](docs/install.md).

**Already on Ubuntu 26.04 LTS** (Intel/AMD or ARM): download `jewbuntu-installer-VERSION.run` from the
[latest release](https://github.com/rhecht/jewbuntu/releases/latest) and run:

```bash
sh ~/Downloads/jewbuntu-installer-*.run
```

**Uninstall:** `jewbuntu skin undo`, then `sudo apt remove 'jewbuntu-*'`, then log out and back in.
Your files are never touched.

Full instructions, including uninstalling: [docs/install.md](docs/install.md).

## Packages

| Package | What it does | State |
| --- | --- | --- |
| `jewbuntu-core` | Settings (versioned, migrated as the user), `jewbuntu` command, hardware doctor, support matrix | Built, container-tested |
| `jewbuntu-branding` | Wallpapers, 8-bit "Hava Nagila" startup jingle | Built, container-tested (no audio in container) |
| `jewbuntu-hebrew` | English and Hebrew keyboards, nikud fonts, spell checker | Built, container-tested |
| `jewbuntu-upgrade-tools` | Upgrade readiness report, repository enrollment | Built, container-tested |
| `jewbuntu-desktop` | Metapackage and Mac-inspired GNOME defaults | Built; graphical result not yet seen in a VM |
| `jewbuntu-jewish-service`, `jewbuntu-hub`, `jewbuntu-gnome` | Calendar/zmanim service, Hub app, panel look | Built; seen working in the VM |
| `jewbuntu-webserver` | Web Server app: local Apache/MariaDB/PHP, WordPress, CodeIgniter | Built, container-tested; not yet seen in the VM |
| `jewbuntu-node`, `jewbuntu-ai`, `jewbuntu-dev` | Headless node, local AI, developer pack | Milestone 4 |

## Commands

```bash
jewbuntu doctor                 # hardware report and profile suggestion
jewbuntu config show            # your effective settings
jewbuntu config set location.timezone America/Toronto
jewbuntu upgrade-check          # Ubuntu upgrade readiness (changes nothing)
jewbuntu export                 # save your settings to a .tar.gz
jewbuntu import FILE            # restore them (backs up current settings first)
jewbuntu defaults status        # which desktop settings Jewbuntu manages
jewbuntu defaults restore       # reset only those keys
jewbuntu startup-sound preview  # hear the jingle; 'on' / 'off' to switch
jewbuntu reset                  # remove your Jewbuntu data (lists it and asks first)
```

## Building

On Ubuntu 26.04:

```bash
sudo apt install build-essential debhelper devscripts lintian python3
make test
dpkg-buildpackage -us -uc -b
```

On macOS (or anywhere with Docker):

```bash
ci/container-build.sh HEAD dist/head          # .debs + lintian + SHA256SUMS
ci/container-test.sh                          # install / upgrade / remove test
```

## Installing on a clean Ubuntu 26.04 VM (package route)

```bash
sudo apt install ./jewbuntu-core_*.deb ./jewbuntu-branding_*.deb \
                 ./jewbuntu-hebrew_*.deb ./jewbuntu-upgrade-tools_*.deb \
                 ./jewbuntu-desktop_*.deb
```

Log out and back in to get the new defaults and the startup jingle.

## Documentation

- [docs/architecture.md](docs/architecture.md): how the parts fit together
- [docs/decisions/](docs/decisions/): architecture decision records
- [docs/vm-setup.md](docs/vm-setup.md): VM testing advice for this project's hardware
- [docs/upgrade-guide.md](docs/upgrade-guide.md), [docs/recovery-guide.md](docs/recovery-guide.md)
- [docs/support-policy.md](docs/support-policy.md), [support-matrix.json](support-matrix.json)
- [docs/hardware-support.md](docs/hardware-support.md), [docs/shulgo-integration.md](docs/shulgo-integration.md)

## Licence

Proposed: GPL-3.0-or-later for code, CC-BY-SA-4.0 for artwork and audio
(pending the project owner's confirmation; see `docs/decisions/0007-licensing.md`).
