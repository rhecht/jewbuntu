#!/bin/sh
# Build a bootable Arch Linux 32 (i686) disk image with Xfce, LightDM and the Jewbuntu packages,
# for a VM that imitates the owner's laptop (Pentium III, 256 MB): see ci/arch32-utm.sh.
#
# usage: ci/arch32-vm-image.sh [PKG_DIR] [OUT.qcow2]
#   PKG_DIR defaults to dist/arch32 (ci/arch32-build.sh); OUT to dist/arch32-vm.qcow2
#   SHULGO_DIR=path   also copy an unpacked shulgo-xfce checkout to /opt/shulgo-xfce (first run)
#
# TEST VM ONLY: root has no password and logs in on the serial console (ttyS0), which UTM
# exposes on 127.0.0.1 only. Never ship this image. The Jewbuntu packages themselves set no
# passwords. Same Arch Linux 32 workarounds as docs/arch32.md: pango held at 1:1.54.0
# (libxml2-legacy comes in as a jewbuntu-xfce-desktop dependency).
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKGS="$(cd "${1:-$ROOT/dist/arch32}" && pwd)"
OUT="${2:-$ROOT/dist/arch32-vm.qcow2}"
mkdir -p "$(dirname "$OUT")"; OUTDIR="$(cd "$(dirname "$OUT")" && pwd)"; OUTNAME="$(basename "$OUT")"
MIRROR="${MIRROR:-https://mirror.archlinux32.org}"
SHULGO_MOUNT=""
[ -n "${SHULGO_DIR:-}" ] && SHULGO_MOUNT="-v $(cd "$SHULGO_DIR" && pwd):/shulgo:ro"
# shellcheck disable=SC2086
docker run --rm --privileged --platform linux/amd64 -v "$PKGS:/pkgs:ro" -v "$OUTDIR:/out" $SHULGO_MOUNT \
  -e MIRROR="$MIRROR" -e OUTNAME="$OUTNAME" archlinux:latest sh -euc '
  # Docker 20.10 cannot apply the pacman download sandbox (seccomp/landlock): turn it off here.
  sed -i "/^\[options\]/a DisableSandbox" /etc/pacman.conf
  pacman -Sy --noconfirm --needed --noprogressbar arch-install-scripts syslinux qemu-img dosfstools e2fsprogs >/dev/null
  cat > /tmp/pacman32.conf <<CONF
[options]
Architecture = i686
SigLevel = Required DatabaseOptional
LocalFileSigLevel = Optional
ParallelDownloads = 5
[core]
Server = $MIRROR/\$arch/\$repo
[extra]
Server = $MIRROR/\$arch/\$repo
[community]
Server = $MIRROR/\$arch/\$repo
CONF
  pacman-key --init >/dev/null 2>&1
  kr=$(curl -fsS "$MIRROR/i686/core/" | grep -oE "archlinux32-keyring-[0-9][^\"]*-any\.pkg\.tar\.zst" | sort -V | tail -1)
  curl -fsSo /tmp/kr.pkg.tar.zst "$MIRROR/i686/core/$kr"
  mkdir -p /tmp/kr && bsdtar -xf /tmp/kr.pkg.tar.zst -C /tmp/kr
  cp /tmp/kr/usr/share/pacman/keyrings/* /usr/share/pacman/keyrings/
  pacman-key --populate archlinux32 >/dev/null 2>&1

  IMG=/tmp/disk.img
  truncate -s 6G $IMG
  echo "label: dos
start=2048, type=83, bootable" | sfdisk -q $IMG
  LOOP=$(losetup --find --show --offset $((2048*512)) $IMG)
  mkfs.ext4 -q -L jewbuntu -O ^64bit,^metadata_csum $LOOP   # syslinux reads plain ext4 only
  mkdir -p /mnt && mount $LOOP /mnt

  # Base system, kernel, Xfce, LightDM. The Jewbuntu packages pull in the rest.
  ok=0; for i in 1 2 3; do
    pacstrap -C /tmp/pacman32.conf -G -M /mnt base linux mkinitcpio syslinux sudo \
      xorg-server xf86-video-vesa xf86-input-libinput xorg-xwd xorg-xdpyinfo xorg-setxkbmap \
      lightdm lightdm-gtk-greeter mousepad zenity procps-ng \
      python-gobject gtk3 libayatana-appindicator >/tmp/strap.log 2>&1 && { ok=1; break; }; sleep 5; done
  [ "$ok" = 1 ] || { tail -30 /tmp/strap.log; exit 1; }
  cp -a /etc/pacman.d/gnupg /mnt/etc/pacman.d/
  { echo "[options]"; echo "Architecture = i686"; echo "IgnorePkg = pango"; echo "SigLevel = Required DatabaseOptional"; echo "LocalFileSigLevel = Optional"
    for r in core extra community; do echo "[$r]"; echo "Include = /etc/pacman.d/mirrorlist"; done; } > /mnt/etc/pacman.conf
  echo "Server = $MIRROR/\$arch/\$repo" > /mnt/etc/pacman.d/mirrorlist

  # Arch Linux 32 workaround (docs/arch32.md), then the Jewbuntu packages, as a user would.
  arch-chroot /mnt pacman -U --noconfirm --noprogressbar \
    https://archive.archlinux32.org/packages/p/pango/pango-1:1.54.0-1.0-i686.pkg.tar.zst >/tmp/pango.log 2>&1 || { tail /tmp/pango.log; exit 1; }
  # Not /tmp: arch-chroot mounts an empty tmpfs there.
  mkdir -p /mnt/var/cache/jewbuntu-pkgs && cp /pkgs/*.pkg.tar.zst /mnt/var/cache/jewbuntu-pkgs/
  arch-chroot /mnt sh -c "pacman -U --noconfirm --noprogressbar /var/cache/jewbuntu-pkgs/*.pkg.tar.zst" >/tmp/jb.log 2>&1 || { tail -20 /tmp/jb.log; exit 1; }
  rm -rf /mnt/var/cache/jewbuntu-pkgs
  [ -d /shulgo ] && cp -a /shulgo /mnt/opt/shulgo-xfce || true

  # Boot: initramfs with every storage driver (no autodetect inside a container), syslinux.
  sed -i "s/^HOOKS=.*/HOOKS=(base udev modconf block filesystems keyboard fsck)/" /mnt/etc/mkinitcpio.conf
  sed -i "s/^PRESETS=.*/PRESETS=(\x27default\x27)/" /mnt/etc/mkinitcpio.d/linux.preset
  rm -f /mnt/boot/initramfs-linux-fallback.img
  arch-chroot /mnt mkinitcpio -P >/tmp/mkinit.log 2>&1 || { tail -20 /tmp/mkinit.log; exit 1; }
  UUID=$(blkid -s UUID -o value $LOOP)
  echo "UUID=$UUID / ext4 rw,noatime 0 1" > /mnt/etc/fstab
  mkdir -p /mnt/boot/syslinux
  cp /usr/lib/syslinux/bios/*.c32 /mnt/boot/syslinux/
  cat > /mnt/boot/syslinux/syslinux.cfg <<CFG
SERIAL 0 115200
DEFAULT jewbuntu
PROMPT 0
TIMEOUT 10
LABEL jewbuntu
  LINUX ../vmlinuz-linux
  APPEND root=UUID=$UUID rw console=tty0 console=ttyS0,115200
  INITRD ../initramfs-linux.img
CFG
  extlinux --install /mnt/boot/syslinux >/dev/null
  dd if=/usr/lib/syslinux/bios/mbr.bin of=$IMG bs=440 count=1 conv=notrunc 2>/dev/null

  # System settings: name, swap the size of the RAM (docs/arch32.md), network, LightDM.
  echo jewbuntu-p3 > /mnt/etc/hostname
  echo "LANG=en_US.UTF-8" > /mnt/etc/locale.conf
  sed -i "s/^#en_US.UTF-8/en_US.UTF-8/" /mnt/etc/locale.gen && arch-chroot /mnt locale-gen >/dev/null
  dd if=/dev/zero of=/mnt/swapfile bs=1M count=256 2>/dev/null && chmod 600 /mnt/swapfile && mkswap /mnt/swapfile >/dev/null
  echo "/swapfile none swap defaults 0 0" >> /mnt/etc/fstab
  printf "[Match]\nName=en* eth*\n[Network]\nDHCP=yes\n" > /mnt/etc/systemd/network/20-wired.network
  arch-chroot /mnt systemctl enable systemd-networkd systemd-resolved lightdm >/dev/null 2>&1
  arch-chroot /mnt useradd -m -c "Jewbuntu Test" -G wheel tester
  arch-chroot /mnt passwd -d root >/dev/null   # TEST VM ONLY (serial console on 127.0.0.1)
  printf "%%wheel ALL=(ALL:ALL) NOPASSWD: ALL\n" > /mnt/etc/sudoers.d/10-test-vm

  arch-chroot /mnt pacman -Q pango libxml2-legacy jewbuntu-skin jewbuntu-icons jewbuntu-core jewbuntu-xfce-desktop
  ln -sf /run/systemd/resolve/stub-resolv.conf /mnt/etc/resolv.conf   # last: arch-chroot needs a real file
  sync; umount /mnt; losetup -d $LOOP
  qemu-img convert -c -O qcow2 $IMG "/out/$OUTNAME"
  ls -la "/out/$OUTNAME"
'
