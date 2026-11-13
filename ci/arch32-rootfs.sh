#!/bin/sh
# Build a minimal Arch Linux 32 (i686) base image for the arch32 build and test containers.
# Arch Linux 32 publishes ISOs but no container image or bootstrap tarball, so this runs
# pacman from the official x86_64 Arch image with an i686 configuration pointed at the
# Arch Linux 32 mirror, then imports the result. i686 binaries run under the qemu binfmt
# handler Docker Desktop ships (also on Apple Silicon).
#
# usage: ci/arch32-rootfs.sh            -> image jewbuntu-arch32-base:latest
#   MIRROR=https://mirror.archlinux32.org   ARCH32=i686 (pentium4 also works)
# Trust: packages are checked against the archlinux32-keyring, which is itself fetched
# from the mirror over HTTPS (the same trust step as booting the Arch Linux 32 ISO).
set -eu
MIRROR="${MIRROR:-https://mirror.archlinux32.org}"
ARCH32="${ARCH32:-i686}"
IMAGE="${IMAGE:-jewbuntu-arch32-base:latest}"
docker run --rm --privileged --platform linux/amd64 -e MIRROR="$MIRROR" -e ARCH32="$ARCH32" archlinux:latest sh -euc '
  cat > /tmp/pacman32.conf <<CONF
[options]
Architecture = $ARCH32
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
  kr=$(curl -fsS "$MIRROR/$ARCH32/core/" | grep -oE "archlinux32-keyring-[0-9][^\"]*-any\.pkg\.tar\.zst" | sort -V | tail -1)
  curl -fsSo /tmp/kr.pkg.tar.zst "$MIRROR/$ARCH32/core/$kr"
  mkdir -p /tmp/kr && bsdtar -xf /tmp/kr.pkg.tar.zst -C /tmp/kr
  cp /tmp/kr/usr/share/pacman/keyrings/* /usr/share/pacman/keyrings/
  pacman-key --populate archlinux32 >/dev/null 2>&1
  mkdir -p /rootfs/var/lib/pacman /rootfs/etc /tmp/cache
  ok=0; for i in 1 2 3; do pacman --noconfirm --noprogressbar -r /rootfs --config /tmp/pacman32.conf --cachedir /tmp/cache -Sy base archlinux32-keyring >/tmp/strap.log 2>&1 && { ok=1; break; }; sleep 5; done
  [ "$ok" = 1 ] || { tail -30 /tmp/strap.log >&2; exit 1; }
  grep -iE "error|warning" /tmp/strap.log | grep -v "could not get file information" | head -10 >&2 || true
  cp /tmp/pacman32.conf /rootfs/etc/pacman.conf.jewbuntu
  { echo "[options]"; echo "Architecture = $ARCH32"; echo "SigLevel = Required DatabaseOptional"; echo "LocalFileSigLevel = Optional"; echo "HoldPkg = pacman glibc"
    for r in core extra community; do echo "[$r]"; echo "Include = /etc/pacman.d/mirrorlist"; done; } > /rootfs/etc/pacman.conf
  echo "Server = $MIRROR/\$arch/\$repo" > /rootfs/etc/pacman.d/mirrorlist
  rm -f /rootfs/etc/pacman.conf.jewbuntu
  cp -a /etc/pacman.d/gnupg /rootfs/etc/pacman.d/
  tar -C /rootfs -c .
' | docker import -c 'CMD ["/bin/bash"]' - "$IMAGE" >/dev/null
# Docker 20.10 records the host architecture on imported images whatever --platform says, so
# run them without --platform: the binaries inside are i686 either way (uname -m shows it).
docker run --rm "$IMAGE" sh -c 'uname -m; pacman -Q linux-api-headers glibc pacman python 2>/dev/null; head -2 /etc/os-release'
