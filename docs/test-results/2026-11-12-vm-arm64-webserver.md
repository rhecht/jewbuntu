# VM test: release installers and Web Server (2026-11-11/12)

Ubuntu 26.04.1 LTS, arm64, UTM VM, GNOME Shell 50.1, Firefox 154 (snap). Owner at the desktop;
checks over SSH with a non-sudo key.

## Release installers (downloaded from GitHub inside the VM)

| Step | Result |
| --- | --- |
| m1.24 installer: upgrade from 0.1.0~m1.21 | pass: all packages upgraded, ShulGo (separate) kept, `dpkg --audit` clean |
| m1.25 installer: upgrade, new skin | pass: skin 0.1.0~git20261112.1, `~/.config/gtk-4.0` converted from copies to links, windows 96% opaque (CSS) |
| m1.26 installer: upgrade | pass: postinst `system-refresh` wrote PHP settings to the existing server |
| Installer run on macOS by mistake | m1.24 exited silently (bug, fixed: now explains and exits 1) |
| `curl` absent on stock Ubuntu desktop | noted; docs use the browser for downloading |

## Web Server on the real desktop

| Check | Result |
| --- | --- |
| Setup with polkit password prompt | pass, but Apache stopped right after (reload with changed Listen lines; fixed in m1.25 with restart) |
| Sharing switch with warning dialog | pass (owner turned it on and off) |
| Finish setup (adds phpMyAdmin, FTP, Composer) | pass |
| Create MySQL login | pass |
| Copy password button | fail in m1.25 (`set_text is not a function`); fixed in m1.26, confirmed with a temporary per-user copy, then removed |
| phpMyAdmin login (Firefox) | pass after one reload; the first attempt hit a stale-session message after three page loads within 2 s |
| WordPress site `shul`: download, database, setup in Firefox | pass: `http://shul.localhost` serves the installed site (title "Shul"), reached over `::1` |
| PHP warnings per request (PCRE JIT vs apache2 MemoryDenyWriteExecute) | seen in m1.25; m1.26 sets `pcre.jit=0`: 3 page loads, 0 new warnings |

Not checked by eye yet: whether app windows look solid after the m1.25 skin (CSS verified).
