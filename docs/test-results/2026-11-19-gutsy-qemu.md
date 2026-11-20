# Jewbuntu Classic 7.10 c1: live CD in QEMU (2026-11-19/20)

ISO: `jewbuntu-classic-7.10-c1-32bit.iso` (built by `ci/gutsy-remaster.sh`), booted with
`ci/gutsy-vm.sh start`: QEMU 10 `qemu-system-i386 -cpu pentium3 -m 512` (TCG, inside Docker on
the M1 iMac), standard VGA, e1000 with user-mode networking. Screenshots through QEMU's monitor
(`ci/gutsy-qemu.py`), in `2026-11-19-gutsy/`. The guest reported kernel `2.6.22-14-generic` and
CPU flags with `sse` but no `sse2`.

| Check | Result | Evidence |
| --- | --- | --- |
| Fits a 700 MB CD-R | Pass: 714.7 MB of 737.3 MB | build log |
| 256 MB of RAM | Pass: boots to the full live desktop with `-m 256` | seen live |
| Boot menu (gfxboot): Jewbuntu artwork, "Start or install Jewbuntu Classic" labels | Pass | boot-menu.png |
| Boot splash (usplash theme in Ubuntu's own initrd) | Pass, after three fixes: squashfs must be format 3:0 (tools 3.2-r2; 3.4's 3:1 is rejected with "Invalid argument" and casper drops to the initramfs shell), and the progress bar is drawn from images because usplash passes colour numbers through as raw pixels in 16-bit modes (the track came out black), and the theme library must link the bar images (an undefined symbol made usplash fall back to text; now linked with `--no-undefined`) | boot-splash.png |
| Live desktop: Jewbuntu Light skin, Jewbuntu-Classic icons, Star of David wallpaper, Jewbuntu star on the menu, centred dock at the bottom, weekday clock, live user `jewbuntu@jewbuntu` | Pass, after fixes (Apple logo from the icon source's status/ and mimes/ copies of start-here; Ubuntu's panel file names top_panel where it means bottom_panel for y_bottom; casper 7.10 ignores username=/hostname= boot options, so casper.conf in the initrd is edited) | desktop-shulgo-tray.png, desktop-terminal.png |
| GTK 2 theme parses on GTK 2.12 / murrine 0.53 | Pass after `packaging/gutsy/gtk2-compat.py`; before it, main.rc stopped at line 968 (murrine `textstyle`), dropping ~1,400 lines of styles. Verified with 7.10's own GTK under Xvfb: 3 parse errors before, 0 after (only the missing "adwaita" engine warning remains) | container check |
| Lynx 2.9.3 over HTTPS (OpenSSL 3.5, TLS 1.2/1.3) on the 2007 kernel | Pass: en.wikipedia.org and lite.duckduckgo.com load, Jewbuntu colours readable | lynx-wikipedia-https.png, curl-lynx-tls.png |
| curl 8.23.0 over HTTPS | Pass after rebuilding without eventfd: kernel 2.6.22 has no eventfd2 and musl gives no fallback when flags are set, so curl failed at start with "(27) Out of memory". Now `200`, `ssl_verify_result 0` for https://shulgo.com/ | curl-lynx-tls.png |
| Firefox 2 opens the welcome page; no BBC live-bookmark certificate warning | Pass (home page set in the new-profile template; ubufox overrides system pref files) | firefox-welcome.png |
| English/Hebrew keyboard, Alt+Shift, indicator USA/Isr | Pass; Hebrew in fixed-width text was faint until DejaVu Sans was made the fallback after DejaVu Sans Mono | hebrew-typing.png |
| Login screen (GDM 2.20 theme) | Pass, rendered by 7.10's own gdmgreeter (theme-tester mode) under Xvfb at 800x600 and 1024x768: light glass, dark readable text, one colour scheme | login-800x600.png, login-1024x768.png |
| ShulGo tray (jewbuntu-shulgo-gtk2) | 6460517: **Fail**, `--check` passed but the widget exited at start (`TypeError: tooltip() keywords must be strings`: unicode keys in **kwargs, rejected by Python 2.5; shulgo-crash-6460517.png). Reported; fixed by the ShulGo session in **9af0b58** (also `os.makedirs(exist_ok=)`, a 3.2 keyword). 9af0b58: its `make check` (every test file) and `make check-display` (4 tests, the real tray under Xvfb) pass under 7.10's Python 2.5 in `ci/build-shulgo-gtk2-deb.sh`, and on the live CD it autostarts and its icon shows in the top bar's tray. **Pass.** The menu was not opened (QEMU monitor mouse clicks did not reach the guest) | desktop-shulgo-tray.png |

Not tested: installing to a hard disk with Ubiquity, real Pentium II/III hardware and its graphics
chips, sound, and printing. Most checks used 512 MB; the live desktop also came up with 256 MB.
