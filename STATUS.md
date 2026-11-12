# Status

Last updated: 2026-11-11. Legend: **Implemented** (code exists) ·
**Auto-verified** (automated test passed) · **Manually verified** (seen by a person) ·
**Experimental** · **Planned**. Test status: Pass / Fail / Not tested.

## Milestone 1: installable foundation and upgrade skeleton (in progress)

| Item | State | Test status |
| --- | --- | --- |
| Source control, repo layout, ADRs, CLAUDE.md | Implemented | n/a |
| Exact base recorded (26.04.1 resolute, GNOME 50.1, GJS 1.88, Python 3.14) | Implemented (from container image) | ISO checksum: Not tested yet |
| `jewbuntu-core`: settings schema, atomic writes, backups, migrations, export/import/reset | Implemented | Auto-verified (unit + container) |
| Hardware doctor (`jewbuntu doctor`) | Implemented | Auto-verified (fixtures, container); real hardware Not tested |
| Compatibility/readiness report, matrix-gated repo enrollment | Implemented | Auto-verified (container) |
| `jewbuntu-branding`: wallpapers, startup jingle (rendered at build), once-per-boot player | Implemented | Logic Auto-verified; **playback Not tested** (no audio in container); melody needs ear check |
| `jewbuntu-hebrew`: us+il default, nikud fonts, fontconfig | Implemented | Auto-verified (container); typing in apps Not tested |
| `jewbuntu-desktop`: metapackage + Mac-inspired vendor defaults | Implemented | Defaults Auto-verified against GNOME 50.1 schemas; **visual result Not tested** |
| Upgrade between two Jewbuntu versions without losing settings | Implemented | **Pass** in container (m1.1 → m1.2) |
| Uninstall preserves data | Implemented | **Pass** in container |
| Install on a clean VM | Not started (needs VM) | Not tested |
| Startup-sound setting in onboarding/settings UI | Planned (M2 Hub); CLI `jewbuntu startup-sound on/off/preview` exists | n/a |
| Optional Mac-style shortcut preset | Planned | n/a |
| Man pages for `jewbuntu`, `jewbuntu-startup-sound` | Planned (lintian warnings) | n/a |

**Milestone 1 stays open until** the packages are installed on a clean Ubuntu 26.04.1 VM
and the checklist in `docs/vm-setup.md` is recorded.

## Milestone 1.3 additions (2026-11-11)

| Item | State | Test status |
| --- | --- | --- |
| Mac-style dock (floating, translucent, rounded, dots, always visible), Inter font, weekday clock | Implemented | Defaults Auto-verified on GNOME 50.1 schemas; visual Not tested |
| `jewbuntu-gnome`: "Jewbuntu Look" extension, translucent top bar, clock on the right (GNOME 50 only) | Implemented | Syntax-checked; **runtime Not tested** (needs VM session) |
| `jewbuntu skin apply/undo/status` + one-time first-login question for existing accounts | Implemented | Auto-verified (unit + container with real schemas: apply and undo) |
| Hebrew keyboard for existing users (appended, not replaced) | Implemented via skin | Auto-verified in container; VM Not tested |
| Muted audio after VM startup | Investigating (Jewbuntu never changes volume) | Not diagnosed |
| True blur ("frosted glass") | Superseded in m1.7: Ubuntu 26.04 packages no blur extension, so Blur my Shell v78 is vendored in `jewbuntu-gnome` (see below) | see m1.7 / m1.16 rows |
| Install Shulgo's Linux widget | Waiting for Shulgo build | n/a |

## Status at 0.1.0~m1.7 (2026-11-11 afternoon)

| Item | State | Test status |
| --- | --- | --- |
| Jewbuntu Skin = public fork github.com/rhecht/jewbuntu-skin (MacTahoe, MIT), packaged as `jewbuntu-skin` from that repo's `debian/` | Implemented | Package builds (12 theme variants); container: theme active after skin apply; **visual Not tested** |
| Apple logo/wallpapers/screenshots removed from the fork; original Jewbuntu wallpapers + 2 Star of David wallpapers (owner-supplied, licence TBC, 1586×992) | Implemented | n/a |
| Blur my Shell v78 vendored unmodified in `jewbuntu-gnome` | Implemented | Schema compiles; **Pass** in arm64 VM at m1.16: extension ACTIVE on GNOME 50.1 (docs/test-results/2026-11-11-vm-arm64.md) |
| `skin apply` = theme + User Themes + Blur my Shell + Hebrew + libadwaita (~/.config/gtk-4.0) with undo | Implemented | Auto-verified (unit + container) |
| Calendar core (Hebcal 6.16 in GJS), `jewbuntu-jewish-service` D-Bus | Implemented | 12 fixture tests vs hebcal.com; GJS = Node output; service exercised on a session bus |
| `jewbuntu-hub` (Today/Calendar/Minyanim/Resources/Settings) | Implemented | Screenshots under Xvfb in Ubuntu 26.04; not yet run in the VM |
| Shulgo widget (github.com/rhecht/shulgo @ 42487bf, integrations/{shulgo-core,jewbuntu}) | Tested per-user in VM | App runs on GNOME 50 (markup bug found and fixed upstream). Extension declares 45-49: GNOME 50 test staged with version validation off **in the dev VM only**; revert after. Not yet packaged as `jewbuntu-shulgo` |
| Ulauncher + Liquid Glass theme | Not started | Ulauncher is not in Ubuntu's archive |
| MacTahoe icons (Apple-lookalike) | Planned as opt-in per-user download, not in the image | n/a |
| Siri-like voice prompter | Planned for the very end | n/a |

VM (`jewbuntu-dev-arm64`) state: kept in session notes, not in the repo.

## Status at 0.1.0~m1.18 (2026-11-11 evening)

Seen working in the arm64 UTM VM (GNOME Shell 50.1), see docs/test-results/2026-11-11-vm-arm64.md:
- Jewbuntu Skin (rhecht/jewbuntu-skin): theme, glass dock without box, clear top bar with WCAG-adaptive text,
  login screen (blurred Star of David + Jewbuntu logo) via the gdm-theme.gresource alternative.
- Jewbuntu Icons (rhecht/jewbuntu-icons): default icon theme; 23 Apple-copied icons replaced by originals.
- Default wallpapers: Star of David blue (light) / purple (dark).
- Settings migration v1->v2 at login (autostart) with verified backup.
- ShulGo (jewbuntu-shulgo, built separately from the private rhecht/shulgo, last at cb34bdc): GNOME 50 declared and loaded with version validation ON;
  navy menu, all four tabs with live data, prefs/API key, offline strip with automatic recovery.
- Hub (jewbuntu-hub): Today/Calendar/Settings; Minyanim tab hands off to ShulGo.

Not yet seen: ShulGo system location after the 83eeaa9 GeoClue fix (rest of that path never executed);
startup jingle at a cold boot with audible volume; Hebrew typing/RTL copy-paste in apps; amd64 image; physical hardware.

Planned: first-run setup (incl. "Num Lock on at login"), Ulauncher + Liquid Glass, ISO (M3), node/AI packs (M4),
Siri-like voice prompter (very end).

Lite (Xfce) note: for ShulGo use its GTK app (integrations/jewbuntu/app, no GNOME Shell imports) plus a
StatusNotifierItem tray icon (Shulgo session will add it) rather than the Electron shulgo-desktop .deb.
Measure both on the VM before deciding; the memory comparison is unmeasured (also in shulgo docs/TODO.md).

## Status at 0.1.0~m1.25 (2026-11-12)

- Release installer m1.24 upgraded the VM from m1.21 cleanly (ShulGo kept, dpkg clean).
- Found in the VM and fixed: Apache stopped after Web Server setup (reload with changed Listen
  lines; now restart); app windows see-through (skin built with MacTahoe --blur but no
  application blur; skin 0.1.0~git20261112.1 builds without it; shell CSS and login bundle
  byte-identical).
- Web Server adds phpMyAdmin (local-only via <Location>), vsftpd (user login, chroot ~/Sites,
  local-only unless sharing; TLS required while sharing) and a per-user MySQL login.
  69/69 container checks; "from the network" checks use a second source address because
  Apache's "Require local" admits clients whose address equals the server's.
- GTK4 look is now symlinked to the skin; m1.24-era copies are converted at login.

## Status at 0.1.0~m1.24 (2026-11-11 night)

- **Web Server** (jewbuntu-webserver): GTK4 app plus one polkit helper. Container-tested on Ubuntu 26.04
  (ci/webserver-check.sh, log in docs/test-results/): setup, sites, PHP, database, sharing on/off including
  LAN refusal when off, and WordPress (full install), CodeIgniter 4 and empty sites created through the
  app's own code. Not yet seen in the VM: the GUI password prompt, the browser opening the sites.
- **One-file installer** (`jewbuntu-installer-VERSION.run`, built by ci/make-installer.sh): all public
  packages including the skin and icons; ShulGo excluded. Published as a GitHub Release asset.
  Instructions: docs/install.md.
- ISO: not built. Ubuntu's desktop ISO (~6 GB) exceeds GitHub's 2 GB per-asset limit; needs other hosting.

## Milestone 2: useful Jewish desktop (in progress)

Hebcal-in-GJS spike → `jewbuntu-jewish-service` (D-Bus) → Hub (GTK4/libadwaita:
Today, Calendar, Nearby Minyanim, Resources, Settings) → onboarding → Shulgo adapter
with fixtures and demo mode → thin `jewbuntu-gnome` extension for GNOME 50.
Replace the startup sound's weekly quiet-window fallback with calendar times.

## Milestones 3-5: planned

ISO from the same packages (ADR 0009), node profile, dev pack, AI tooling with
admission control, signed hosted repository.

## After Jewbuntu: Asahi Linux port (planned, not started)

**Starts only after Jewbuntu for Ubuntu is verified and launched.**

Bring the Jewbuntu look to Apple Silicon M1/M2 Macs on Asahi Linux, as an option for
M1s once macOS support fades. Base: **Fedora Asahi Remix** (GNOME edition). Ubuntu is not a
good fit on Apple Silicon for now. Scope: the skin and look, the ShulGo widgets, and the
Web Server (LAMP) app with its setup.

- Likely to carry over: `jewbuntu-skin` (no CPU-specific code; build for Fedora's GNOME
  version with `SKIN_SHELL_VERSION`), vendor gsettings defaults, the Jewbuntu Look extension,
  `jewbuntu-core`.
- Needs work: RPM packaging instead of `debian/` (Fedora uses dnf), Fedora package names
  (fonts, Hebrew), Dash to Dock instead of Ubuntu Dock (map the dock settings), repository
  enrollment for dnf, Apple Silicon awareness in `jewbuntu doctor` (speakers, notch, displays).
- ShulGo: an RPM build of the private rhecht/shulgo (an RPM version of `ci/build-shulgo-deb.sh`;
  still never copied into this repo); declare the GNOME version Fedora ships.
- Web Server (`jewbuntu-webserver`): Fedora differs from Ubuntu in Apache (`httpd`,
  `/etc/httpd/conf.d`, no `a2ensite`, PHP via php-fpm), database packages (MariaDB or
  `community-mysql`), and firewalld. **SELinux** is enforcing by default and will affect
  `~/Sites`, phpMyAdmin and vsftpd (file labels and booleans such as `httpd_enable_homedirs`).
  Re-run the container checks (`ci/webserver-check.sh`) on Fedora.
- Check first: which GNOME version Fedora Asahi Remix ships at that time. Asahi supports
  M1/M2 today and intends to support M3/M4 later, so don't tie anything to M1/M2.
- **Must survive Asahi and Fedora updates** (same overlay rule as on Ubuntu):
  - Ship everything as separate Jewbuntu packages that own only their own files. Never edit
    or replace files owned by Fedora/Asahi packages, and no `Conflicts`/`Obsoletes` against them.
  - Settings through our own gschema overrides or dconf defaults, not by changing distro files.
  - Login-screen skin: Fedora has no `update-alternatives` for GDM's theme bundle as Ubuntu
    does, and replacing gnome-shell's file would be undone by every gnome-shell update. Find
    a method that survives updates, or leave the login screen stock.
  - Fedora moves to a new GNOME release every six months. If the skin or an extension
    doesn't fit a new version, the desktop must fall back to stock GNOME cleanly, never break.
    Test each Fedora release before it's offered.

## Blockers / needs from Rafi

- **VM host**: the installed VMware Fusion 12.2.0 is Intel-only and cannot run VMs on the M1. Install UTM (or Fusion 13+) for an arm64 VM. Say which OS the HP runs, to decide whether it can host the amd64 VM.
- Listen to the jingle and confirm or correct the melody (`assets/sounds/hava-nagila-8bit.json`).
- Licence choice (ADR 0007).
- Permission to read `/Applications/MAMP/htdocs/shulgo` for the Shulgo API contract (M2).
