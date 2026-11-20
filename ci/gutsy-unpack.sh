#!/bin/sh
# Jewbuntu Classic (Ubuntu 7.10 i386 remaster), step 1: unpack the original 2007 ISO.
#   - copies the ISO's files into the Docker volume "jewbuntu-gutsy" (/work/iso)
#   - unsquashes casper/filesystem.squashfs (squashfs 3.x, readable by squashfs-tools 4)
#   - imports the root filesystem as the image jewbuntu-gutsy-i386:rootfs (linux/386)
# usage: ci/gutsy-unpack.sh path/to/jewbuntu-7.10-desktop-i386.iso
# Docs: docs/gutsy.md
set -eu
ISO="$1"
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
ISO_DIR="$(cd "$(dirname "$ISO")" && pwd)"; ISO_NAME="$(basename "$ISO")"
EXPECT_SHA256=413b5ac2460f088f4aad9e4b48b0f81822f4eceee03b654cd146b196aff69ed1
got="$(shasum -a 256 "$ISO" 2>/dev/null || sha256sum "$ISO")"; got="${got%% *}"
if [ "$got" != "$EXPECT_SHA256" ] && [ -z "${GUTSY_ANY_ISO:-}" ]; then
  echo "unexpected ISO checksum $got (set GUTSY_ANY_ISO=1 to use it anyway)" >&2; exit 1
fi
docker volume create jewbuntu-gutsy >/dev/null
docker run --rm -v jewbuntu-gutsy:/work -v "$ISO_DIR:/in:ro" ubuntu:26.04 sh -euc '
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq >/dev/null && apt-get install -y -qq squashfs-tools xorriso >/dev/null
  rm -rf /work/iso /work/rootfs
  mkdir -p /work/iso
  xorriso -osirrox on -indev "/in/'"$ISO_NAME"'" -extract / /work/iso 2>/dev/null
  chmod -R u+w /work/iso
  unsquashfs -no-progress -d /work/rootfs /work/iso/casper/filesystem.squashfs >/dev/null
  du -sh /work/rootfs'
# docker import ignores --platform on this Docker (the image came out arm64), so build the
# image FROM scratch with BuildKit to get it labelled linux/386.
CTX="$(mktemp -d)"
docker run --rm -v jewbuntu-gutsy:/work ubuntu:26.04 tar -C /work/rootfs -c . > "$CTX/rootfs.tar"
printf 'FROM scratch\nADD rootfs.tar /\nCMD ["/bin/bash"]\n' > "$CTX/Dockerfile"
DOCKER_BUILDKIT=1 docker build -q --platform linux/386 -t jewbuntu-gutsy-i386:rootfs "$CTX"
rm -f "$CTX/rootfs.tar" "$CTX/Dockerfile"; rmdir "$CTX"
docker run --rm --platform linux/386 jewbuntu-gutsy-i386:rootfs sh -c 'cat /etc/lsb-release; python -V'
