# ShulGo widget fixes: Lubuntu, Mint and Cutefish files rebuilt (2026-11-27)

ShulGo (rhecht/shulgo-widgets 9f8265b, tag desktop-v1.0.4) fixed three issues found on Lubuntu 26.10
(dist/lubuntu-vm/shulgo-xfce-lubuntu-report.md) plus a desktop-app regression:

- On LXQt, left-click on the tray icon did nothing (LXQt's panel sends Activate). ShulGo now
  exports its own tray item on LXQt and opens the menu at the pointer on Activate.
- Two icons after sign-in (XEmbed fallback); the autostart entry now carries `X-LXQt-Need-Tray=true`.
- A linked computer said "Nobody has approved this yet." while a leftover link request was pending;
  that line now shows only while there is no key.
- ShulGo desktop 1.0.3 had lost the first-click fix on Linux; 1.0.4 restores it.

Package: `shulgo-xfce 1.0.0.r202611271526+jb1` (Lubuntu, Mint) and `1.0.0.r202611271526` (Cutefish),
built by ci/flavors-build.sh. Jewbuntu packages unchanged (+lubuntu2 / +lubuntu18.2 / Mint, Cutefish).

| File | Size | SHA-256 |
| --- | --- | --- |
| jewbuntu-lubuntu-26.10-0.1.0-m1.29-64bit.iso | 4,033,413,120 | 0f51affd2a29f3aace743dd7ac325cabcb2de36bae9af6d75af7ab680c91326c |
| jewbuntu-lubuntu-27.04-daily-0.1.0-m1.29-64bit.iso | 4,060,151,808 | fb401ae1ebbbd3090f4983c54cab78b70d5c29f5ed0750235e278880c193b388 |
| jewbuntu-lubuntu-18.04-0.1.0-m1.29-32bit.iso | 1,201,209,344 | 12b960727798cbc2065a0bfffab1799cbd763db75a4c2e3dcaee57162cb9d901 |
| jewbuntu-mint-22.3-0.1.0-m1.29-64bit.iso | 3,095,003,136 | 2b08d8efd64dff8dad089b08530c954479ebbb247ec9560f46f0567ee01d6b74 |
| jewbuntu-lubuntu-installer-0.1.0-m1.29.run | 2,622,633 | 923bd6c6887f403d00b9eba36ee5f282e33cab2042b948f02c91dc50abd0888c |
| jewbuntu-lubuntu18-32bit-installer-0.1.0-m1.29.run | 2,567,404 | 49c10c0514c6df33716042f6873a8a6cbae23d12050ea4987880416aa54a099f |
| jewbuntu-mint-installer-0.1.0-m1.29.run | 2,435,731 | 3e20b49d8bb55a4f9345332071c4b1db6d92e615191fd7821b1c94bbe91c3029 |
| jewbuntu-cutefish-installer-0.1.0-m1.29.run | 524,079 | 9f9cf11a0f7b208019cc944f1158ce3436d91a22d30fe8114b754dc27eed7989 |

All four images: "checks: OK" inside the remastered system, shulgo-xfce 1.0.0.r202611271526+jb1
installed (ci/flavor-iso.sh).

## Verified

- Lubuntu 26.10 live session in UTM (emulated x86_64), with the fixed ShulGo files: one ShulGo icon;
  a **left-click** opens ShulGo's menu (`lubuntu-26.10-shulgo-left-click.jpg`); right-click still does.
- shulgo-xfce unit tests: 204 OK, including the new LXQt cases (Xfce, Classic and Lubuntu 18.04's
  LXDE keep the appindicator library).
- ShulGo desktop 1.0.4 on Cutefish's real screen (`shulgo-desktop-1.0.4-cutefish.txt`): first click
  opens the panel, second closes.

## Not tested

The rebuilt images and installers were not booted again: the Lubuntu check above ran on the earlier
image with the fixed files put in place. Lubuntu 27.04 and 18.04, Mint and Cutefish installers with
this build: not run. Arch 32 and Classic carry their own ShulGo builds and were not rebuilt.
