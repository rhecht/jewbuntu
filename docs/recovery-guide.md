# Recovery guide

## Application-level (tested in the container, see test-results)

| Situation | Recovery |
| --- | --- |
| Settings look wrong after an update | Backups of every pre-migration file are in `~/.local/state/jewbuntu/backups/`. Copy one back to `~/.config/jewbuntu/settings.json` (an older schema is migrated again automatically). |
| Want to move settings to another machine/user | `jewbuntu export`, then `jewbuntu import FILE` (current settings are backed up first) |
| Desktop look changed and you want Jewbuntu's back | `jewbuntu defaults restore` (only Jewbuntu-managed keys) |
| Want stock Ubuntu look | `sudo apt remove jewbuntu-desktop`, or choose the "GNOME" session at login |
| Remove Jewbuntu entirely | `sudo apt purge 'jewbuntu-*'`. Your settings remain in your home folder until `jewbuntu reset`. |
| Downgraded Jewbuntu and settings are "newer" | The older version refuses to modify them; reinstall the newer version or restore a backup |

## OS-level (not automated by Jewbuntu)

Jewbuntu does **not** provide automatic OS rollback. A failed release upgrade is
recovered with your own backups and, if needed, a reinstall of Ubuntu followed by
installing Jewbuntu and `jewbuntu import`. Filesystem snapshots (e.g. on Btrfs or ZFS
layouts) are an option only if you set them up; they are not configured or tested
by Jewbuntu yet. In VMs, use hypervisor snapshots before every risky step.
