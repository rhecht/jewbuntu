# Lubuntu editions with Lynx: images and installers (2026-11-26/27)

These files were replaced on 2026-11-27 by the ShulGo-fix rebuild (same names, new checksums):
see ../2026-11-27-shulgo-fix/.

Packages: `jewbuntu-lubuntu 0.1.0~m1.29+lubuntu2`, `jewbuntu-lubuntu-lxde 0.1.0~m1.29+lubuntu18.2`
(both add `lynx` and the "Lynx Web Browser" menu entry), `shulgo-xfce 1.0.0.r202611260814+jb1`
(shulgo-widgets 9dd4d71, autostart entry with `X-LXQt-Need-Tray=true`).

| File | Size | SHA-256 |
| --- | --- | --- |
| jewbuntu-lubuntu-26.10-0.1.0-m1.29-64bit.iso | 4,033,413,120 | ec39ca872fff5540f981dd5b52596f78f0cff568011e7fe783af6a1efee8d207 |
| jewbuntu-lubuntu-27.04-daily-0.1.0-m1.29-64bit.iso | 4,060,151,808 | 21d66115b7d55e204cc99bc1492b7e77a7e4d52f0d6c6fcbfd1de958debd1be6 |
| jewbuntu-lubuntu-18.04-0.1.0-m1.29-32bit.iso | 1,201,209,344 | b096f13dba7bec783f2e660ba2731d34db56f520fb11a286b9d7cc6167d192e0 |
| jewbuntu-lubuntu-installer-0.1.0-m1.29.run | 2,621,609 | 685dac9e7f215e1e08700dc34f97ae8c79b96cc1b0f5d25213730d02b2add3ca |
| jewbuntu-lubuntu18-32bit-installer-0.1.0-m1.29.run | 2,566,892 | 62867e15f8e5ffe5556bdf9e4790f3cc188fb69cf8293f6dff9e5116da7b49ba |

## Lynx settings

With the first settings file (copied from Arch Linux 32, `INCLUDE:/etc/lynx.cfg`) every https page
failed on Ubuntu ("Can't access startfile"): Ubuntu keeps Lynx's settings in `/etc/lynx/lynx.cfg`,
so `SSL_CERT_FILE` was never set. With `INCLUDE:/etc/lynx/lynx.cfg`, in i386 Ubuntu 18.04
(Lynx 2.8.9dev16) and amd64 Ubuntu 26.10 (Lynx 2.9.3) containers: DuckDuckGo Lite opens, a search
for "jewbuntu" returns results, and en.wikipedia.org/wiki/Hanukkah loads.

## In the images (ci/flavor-iso.sh)

All three: "checks: OK" inside the remastered system; lynx and lynx-common installed from the
distribution's archive (2.9.3-2 on 26.10/27.04, 2.8.9dev16-3 on 18.04).

## Lubuntu 18.04 image, emulated Pentium III (QEMU in Docker, 1 GB)

Live desktop with the wallpaper, Star of David menu button and ShulGo (`lubuntu-18.04-live-desktop.png`);
Menu > Internet lists Firefox Web Browser and Lynx Web Browser (`lubuntu-18.04-internet-menu.png`);
Lynx Web Browser opens in LXTerminal on DuckDuckGo Lite over https (`lubuntu-18.04-lynx.png`).

## Lubuntu 26.10 image, emulated x86_64 PC (UTM, virtio-vga, 4 GB)

The live system's first start waits for snapd seeding (about 20 minutes emulated) with a dark screen,
then Lubuntu's Try/Install window; after "Try Lubuntu" the LXQt desktop shows the Star of David
wallpaper, menu button and one ShulGo icon (`lubuntu-26.10-live-desktop.jpg`); Menu > Internet >
Lynx Web Browser opens in QTerminal on DuckDuckGo Lite (`lubuntu-26.10-lynx.jpg`).

Earlier the same day, on the stock Lubuntu 26.10 live ISO with the add-on installer (same packages
except the Lynx include fix): desktop screenshot taken inside the guest (`lubuntu-26.10-live-desktop.png`),
ShulGo's right-click menu (`lubuntu-26.10-shulgo-menu.png`) and settings window
(`lubuntu-26.10-shulgo-settings.png`); the owner linked it to a ShulGo account and its menu showed
Maariv times. Left-click on the ShulGo icon does nothing on LXQt (reported to ShulGo). Without
`X-LXQt-Need-Tray=true` two ShulGo icons appeared after sign-in; with it, one.

Not tested: the 27.04 image booted, installing to a disk, real hardware, the jingle with sound.
