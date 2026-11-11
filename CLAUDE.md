# CLAUDE.md: guide for continuing Jewbuntu

Read first: `STATUS.md` (what is done and verified), `docs/architecture.md`,
`docs/decisions/`. The original build brief is the product requirement; key rules are
summarised here.

## Non-negotiables

- Overlay packages on supported Ubuntu LTS. No kernel/installer/GNOME Shell forks, no codename rewriting, no custom OS updater, no Conflicts against Ubuntu metapackages.
- Root maintainer scripts never touch home directories. Per-user migrations run as the user.
- Upgrades preserve settings; remove/purge preserve user data; reset is explicit and lists what it removes.
- Never claim a test passed without evidence in `docs/test-results/`. Never mark `pass` in `support-matrix.json` without it.
- Never invent Shulgo endpoints, flags or contracts. Use fixtures plus a labelled demo mode until the real API is documented.
- No AI computes zmanim or psak. No telemetry, default passwords, embedded keys, or silent cloud fallback.
- Don't write to physical disks/USB without an explicit target and authorization.

## Layout

- `components/core/jewbuntu/`: Python package (stdlib only). Other components add modules to the same package dir: `components/hardware-doctor/jewbuntu/doctor.py`, `components/upgrade-tools/jewbuntu/{upgrade,repo}.py`, `components/branding/jewbuntu/startup_sound.py`. `__init__.py` extends `__path__` so the source tree works uninstalled.
- `bin/`: launchers (work from source or installed).
- `packaging/`: files installed by packages (overrides, units, conffiles, manifests).
- `debian/`: one native source → binary packages. Version `<upstream>+<ubuntu-version>`; keep `components/core/jewbuntu/version.py` in sync (a test enforces it).
- `assets/`: wallpapers (SVG) and the jingle source (`hava-nagila-8bit.json` + `synth.py`, rendered at build).
- `support-matrix.json`: machine-readable support claims.
- `ci/`: container build/test scripts. `tests/unit/`: unittest suite (`make test`).

## Commands

```bash
make test                                              # unit tests (any OS with python3)
export DOCKER_CONTEXT=desktop-linux                    # on Rafi's Mac
WORKTREE=1 ci/container-build.sh HEAD dist/worktree    # build debs incl. uncommitted changes
ci/container-build.sh v0.1.0-m1.1 dist/v0.1.0-m1.1     # build a tag
ci/container-test.sh dist/v0.1.0-m1.1 dist/worktree    # install → upgrade → migrate → remove/purge
ci/container-desktop-test.sh dist/worktree             # jewbuntu-desktop over ubuntu-desktop-minimal
```

## Changing the settings schema

1. Bump `SCHEMA_VERSION`, update `DEFAULTS`, add `MIGRATIONS[n] = fn` (pure, keeps unknown keys).
2. Update `validate()`, add unit tests (migration plus interrupted write), and bump the version in `debian/changelog` and `version.py`.
3. Tag the previous release, then run `ci/container-test.sh dist/<old-tag> dist/worktree`.

## Environment notes (Rafi's iMac)

- Apple M1, macOS 26.6.2. Docker Desktop works (context `desktop-linux`). Use the `ubuntu:26.04` image; pass `--platform linux/amd64` explicitly when you need amd64 (emulated, slow).
- VMware Fusion 12.2.0 is installed but Intel-only, so it cannot run VMs on this M1.
- Ubuntu's archive returned transient 503s on 2026-11-11; retry apt on failure.
- macOS `tar` adds `._*` AppleDouble files unless `COPYFILE_DISABLE=1` (already handled in `ci/container-build.sh`).

## Related repositories

- Skin: `../jewbuntu-skin` = github.com/rhecht/jewbuntu-skin (fork of vinceliuice/MacTahoe-gtk-theme, MIT). `main` carries the Jewbuntu changes; merge `upstream/main` to update. Build: non-root `dpkg-buildpackage -us -uc -b` (needs TERM set, which the rules handle).
- Shulgo widget: github.com/rhecht/shulgo, `integrations/shulgo-core` + `integrations/jewbuntu` (both needed). Owned by the Shulgo session; report bugs there, do not edit.
- VM access: `ssh -i ~/.ssh/jewbuntu_vm_ed25519 user@192.168.64.2` (key authorised by the owner; no sudo). Set XDG_CURRENT_DESKTOP=ubuntu:GNOME and the session bus address when using gsettings over SSH.

## Next steps

See STATUS.md "Milestone 2". Start with the Hebcal-in-GJS spike (ADR 0003).
