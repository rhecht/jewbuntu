# 2026-11-11: Milestone 1 automated checks (container, not VM)

## Environment

| Item | Value |
| --- | --- |
| Host | iMac M1, macOS 26.6.2, arm64, 16 GB |
| Container engine | Docker Desktop, engine 20.10.14 (aarch64) |
| Base image | `ubuntu:26.04` (Ubuntu 26.04.1 LTS resolute), digest `sha256:6a06111c3b0a8600feadb270aec771dc239bf407b25625f93f44ab00e11f4d3c`, **arm64** |
| Build image | `ci/Dockerfile.build` (debhelper 13.31ubuntu1, lintian 2.129.0ubuntu2.2, python3 3.14.3) |
| Source | tag `v0.1.0-m1.1` (schema 1) and branch `milestone-1/foundation` (0.1.0~m1.2, schema 2) |

The packages are `Architecture: all`. These results show package behaviour on an
arm64 Ubuntu 26.04.1 userland. They are **not** amd64 image, VM, graphical, boot,
audio or hardware results.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Unit tests (41) on macOS Python 3.10 | Pass | `make test` |
| Unit tests (41) on Ubuntu Python 3.14 during `dpkg-buildpackage` | Pass | `dist/*/build.log` (dh_auto_test) |
| Package build | Pass | 5 debs per version |
| Lintian | Pass with 2 warnings (`no-manual-page` for `jewbuntu`, `jewbuntu-startup-sound`) | `dist/worktree/lintian.txt` |
| Install from a signed local repo trusted via `Signed-By` only | Pass | `ci/container-test.sh` |
| APT pin blocks a decoy `base-files 999:1` from the Jewbuntu origin | Pass | same |
| Repo enrollment gated by matrix (testing accepted, stable refused) | Pass | same |
| Per-user migrate unit enabled globally (`systemctl --global`) | Pass (symlink present; not executed by systemd in the container) | same |
| Hebrew input-source vendor default (`us`, `il`) in the ubuntu session | Pass | gsettings, memory backend |
| fontconfig: Hebrew sans → Noto Sans Hebrew, serif → Noto Serif Hebrew; Latin unchanged | Pass | `fc-match` |
| Nikud fonts installed (Frank Ruehl CLM, Ezra SIL) | Pass | `fc-list` |
| Doctor and readiness report run; readiness recognises `resolute` | Pass | same |
| Settings written as an ordinary user, owned by that user | Pass | same |
| Startup sound with no audio hardware exits harmlessly ("no audio output available") | Pass | same |
| **Upgrade 0.1.0~m1.1 → 0.1.0~m1.2 through the signed repo** | Pass | same |
| Package upgrade did not touch the user's home | Pass | same |
| Per-user migration v1→v2 (run as the user, as the unit would at login): values and unknown keys kept, verified backup created, idempotent, validates | Pass | same |
| Remove keeps user settings and conffile; purge keeps user settings, removes conffile, generated APT source and fontconfig link | Pass | same |
| No untracked files left under `/usr` after purge | Pass | same |
| Reinstall sees preserved settings; explicit reset removes data; importing the schema-1 export into schema 2 restores settings | Pass | same |
| `jewbuntu-desktop` installs over `ubuntu-desktop-minimal` (1028 packages, 66 s), no schema compile warnings | Pass | `ci/container-desktop-test.sh` |
| All 15 managed desktop keys resolve to Jewbuntu defaults under GNOME Shell 50.1 schemas (dock bottom, left buttons, blue accent, wallpapers, Hebrew) | Pass | same |
| Reproducible package build: two clean builds of the same tree give identical SHA-256 for all 5 debs | Pass after fix (first attempt Failed: build-time mtimes; fixed in `debian/rules`) | same host and build image only; cross-architecture builders not compared (the rendered WAV relies on floating-point `math.sin`) |

Container summary line: `ALL CHECKS PASSED (28)`.

## Not tested (requires VM or hardware)

Graphical session rendering, dock behaviour, Hebrew typing in real apps, mixed
RTL/LTR copy/paste, startup jingle playback, unlock/resume non-replay, systemd user
unit execution at real login, amd64 install, live boot, physical hardware.

## Artifacts (SHA-256)

0.1.0~m1.1+26.04:
```
4071b05f610dafa73c8d3574202cb916f5d37ec7ab723011afa1fe265cb76e22  jewbuntu-branding_0.1.0~m1.1+26.04_all.deb
0d8ef05beeb719acc02a3e70b7d226382e65ab82d93a7beb7b4eb6dfe20abdc7  jewbuntu-core_0.1.0~m1.1+26.04_all.deb
2a2fbbd6bd8f5d3993abec7d84971988327149c4eea06a447ff75f8a585c8595  jewbuntu-desktop_0.1.0~m1.1+26.04_all.deb
08c44bfccf5f840809eea4117ee0db512bb508d8a5d1292ebd2f0ddd8b7df834  jewbuntu-hebrew_0.1.0~m1.1+26.04_all.deb
7e0421d1543c1cb325ab636c21ce9f8794f1abe3f947685eee004e91f0ea5ce3  jewbuntu-upgrade-tools_0.1.0~m1.1+26.04_all.deb
```
(built before the reproducibility fix, so not byte-reproducible)

0.1.0~m1.2+26.04 (reproducible build):
```
81ce280b52425aa3ed0e0d9938e8145953973d1eaf31d047bb3eade793397a8e  jewbuntu-branding_0.1.0~m1.2+26.04_all.deb
44bf6558cae59c95b242ecb6e8e71acf848dd5aece132022f0be450ba5ea9431  jewbuntu-core_0.1.0~m1.2+26.04_all.deb
fadce7fea35b7969bbae6e26ac80342c379044bda0603dc323e991808e525a06  jewbuntu-desktop_0.1.0~m1.2+26.04_all.deb
942184efe9439364e26e6dc0dce38396bed682e7e04ea3a448e0507d35c79fab  jewbuntu-hebrew_0.1.0~m1.2+26.04_all.deb
17287619f9509fd000ee1644636b66496e72a0716119c0dc2d0a0c4c31b6bc4a  jewbuntu-upgrade-tools_0.1.0~m1.2+26.04_all.deb
```
Raw logs: `2026-11-11-container-test.log`, `2026-11-11-container-desktop-test.log` (desktop test ran on the pre-fix m1.2 build; the only change since is `debian/rules` mtime normalisation).
