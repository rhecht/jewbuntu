# Upgrade guide

| Change | Risk | What Jewbuntu does | Your action |
| --- | --- | --- | --- |
| Ubuntu security/package updates | Low | Nothing special | Keep updating normally |
| LTS point release (e.g. 26.04.1 → 26.04.2) | Low-medium | Point releases are re-checked and the matrix records the tested point release | Normal updates |
| Kernel update / HWE | Medium on old hardware | Doctor records kernel; hardware rows re-tested | Reboot when prompted; keep the previous kernel in GRUB |
| GNOME minor update | Low | Extension tested per major | None |
| Jewbuntu package update | Low | Settings migrated at next login as you, backup kept | Log out and in |
| **Ubuntu release upgrade** | High | Readiness report; repo re-enrollment gated by the support matrix | Supervised steps below |

## Release upgrade, step by step

1. `jewbuntu upgrade-check`. It inspects only and changes nothing. Fix anything marked STOP.
2. Back up your files. `jewbuntu export` saves Jewbuntu settings to your home folder.
3. Use Ubuntu's own upgrader: Software & Updates, or `sudo do-release-upgrade`. Do not edit codenames in APT files.
4. Ubuntu disables third-party sources, including Jewbuntu's, during the upgrade. This is expected.
5. After the reboot: `jewbuntu upgrade-check`, then `sudo jewbuntu repo enroll`. It enables the suite for the *new* codename only if Jewbuntu supports it. If not, it refuses: keep using the Hub and core tools and wait for a Jewbuntu update.
6. `sudo apt update && sudo apt install --only-upgrade 'jewbuntu-*'`, then log out and in.

A package downgrade cannot undo an Ubuntu release upgrade. See [recovery-guide.md](recovery-guide.md).
