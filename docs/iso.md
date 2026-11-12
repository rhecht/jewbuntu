# The Jewbuntu ISO

A bootable installer for Intel/AMD PCs: Ubuntu's official desktop ISO with Jewbuntu added.
It installs Ubuntu exactly as Ubuntu's own installer does, then adds Jewbuntu to the new
system. It is built from the same packages as the one-file installer.

## What is different from Ubuntu's ISO

Only two additions; Ubuntu's installer, kernel and boot setup are unchanged:

- `/jewbuntu/`: the Jewbuntu packages (ShulGo excluded), plus the few Ubuntu packages
  they need that Ubuntu's installer does not put on disk (Hebrew fonts, spell checker and
  similar, about 9 MB), so Jewbuntu installs without internet.
- `/autoinstall.yaml`: keeps **every installer screen interactive**. Each person still
  chooses their language, keyboard, network, disk, name, computer name and password.
  Its only job is one step after Ubuntu is installed: install Jewbuntu from the disc into
  the new system (`/jewbuntu/install-in-target.sh`, logged to
  `/var/log/jewbuntu-install.log`).

Nothing personal is on the ISO: no user, password, computer name, location or keys.

If that last step fails, the installation still finishes as plain Ubuntu, and the packages
are left in `/usr/local/share/jewbuntu/` with a README explaining the one command to finish.

## Building

On a Mac or Linux machine with Docker and about 15 GB free:

```bash
curl -LO https://releases.ubuntu.com/26.04/ubuntu-26.04.1-desktop-amd64.iso    # check against SHA256SUMS
ci/container-build.sh vX.Y.Z dist/release-debs                                # Jewbuntu packages
ci/build-theme-debs.sh ../jewbuntu-skin ../jewbuntu-icons dist/themes           # skin and icons
ci/build-iso.sh ubuntu-26.04.1-desktop-amd64.iso jewbuntu-X.Y.Z-amd64.iso X.Y.Z dist/release-debs dist/themes
```

`ci/build-iso.sh` reads the installed-system package list from Ubuntu's disc
(`casper/minimal.manifest`), asks apt which packages Jewbuntu needs beyond it
(`ci/iso/resolve-deps.sh`, checksum-verified downloads from Ubuntu's archive), and repacks
with `xorriso ... -boot_image any replay`, which keeps Ubuntu's BIOS and UEFI boot setup.
