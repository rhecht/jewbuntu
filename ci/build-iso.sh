#!/bin/sh
# Build a Jewbuntu ISO from Ubuntu's official desktop ISO, without changing Ubuntu's installer
# or boot setup: adds /jewbuntu (Jewbuntu .debs + dependencies missing from the installed
# system, so it also installs offline) and /autoinstall.yaml (every installer screen stays
# interactive; one late command installs Jewbuntu into the new system).
#
# usage: ci/build-iso.sh BASE.iso OUT.iso VERSION DEBDIR...
#   e.g. ci/build-iso.sh ../iso/ubuntu-26.04.1-desktop-amd64.iso ../iso/jewbuntu-0.1.0-m1.26-amd64.iso \
#        0.1.0-m1.26 dist/worktree dist/themes
# jewbuntu-shulgo is included (owner's decision 2026-11-13: the widget is public at
# github.com/rhecht/shulgo-widgets; build it with ci/build-shulgo-deb.sh). Its API key stays per user.
set -eu
BASE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
OUTDIR="$(mkdir -p "$(dirname "$2")" && cd "$(dirname "$2")" && pwd)"; OUT="$OUTDIR/$(basename "$2")"
VERSION="$3"; shift 3
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$ROOT/build/iso-stage"
rm -rf "$STAGE"; mkdir -p "$STAGE/jewbuntu/debs" "$STAGE/jewbuntu/extra"
for d in "$@"; do
  for f in "$d"/*.deb; do
    cp "$f" "$STAGE/jewbuntu/debs/"
  done
done
cp "$ROOT/packaging/iso/install-in-target.sh" "$STAGE/jewbuntu/"
cp "$ROOT/packaging/iso/autoinstall.yaml" "$STAGE/"
echo "Jewbuntu $VERSION ($(ls "$STAGE/jewbuntu/debs" | wc -l | tr -d ' ') packages) on $(basename "$BASE")" > "$STAGE/jewbuntu/VERSION"

# 1. Read the installed-system package list from the disc (native container, fast I/O).
docker build -q -t jewbuntu-build:26.04 -f "$ROOT/ci/Dockerfile.build" "$ROOT/ci" >/dev/null
docker run --rm -v "$BASE:/base.iso:ro" -v "$STAGE:/stage" jewbuntu-build:26.04 sh -euc '
  apt-get update -q >/dev/null && apt-get install -y -q --no-install-recommends xorriso >/dev/null
  xorriso -osirrox on -indev /base.iso -extract /casper/minimal.manifest /stage/minimal.manifest \
          -extract /.disk/info /stage/disk-info 2>/dev/null
  echo "base: $(cat /stage/disk-info)"; echo "installed-system packages: $(wc -l < /stage/minimal.manifest)"'

# 2. Resolve what Jewbuntu needs beyond that, for amd64, against Ubuntu 26.04, and download it.
docker run --rm --platform linux/amd64 -v "$STAGE:/stage" -v "$ROOT/ci/iso:/ci:ro" ubuntu:26.04-amd64 bash /ci/resolve-deps.sh

# 3. Repack: Ubuntu's ISO + /jewbuntu + /autoinstall.yaml, boot setup replayed unchanged.
rm -f "$OUT"
docker run --rm -v "$BASE:/base.iso:ro" -v "$STAGE:/stage:ro" -v "$OUTDIR:/out" jewbuntu-build:26.04 sh -euc "
  apt-get update -q >/dev/null && apt-get install -y -q --no-install-recommends xorriso >/dev/null
  cd /stage && find jewbuntu autoinstall.yaml -type f | sort | xargs md5sum | sed 's#  #  ./#' > /tmp/md5-add
  xorriso -osirrox on -indev /base.iso -extract /md5sum.txt /tmp/md5sum.txt 2>/dev/null
  cat /tmp/md5-add >> /tmp/md5sum.txt
  xorriso -indev /base.iso -outdev /out/$(basename "$OUT") \
    -map /stage/jewbuntu /jewbuntu -map /stage/autoinstall.yaml /autoinstall.yaml \
    -map /tmp/md5sum.txt /md5sum.txt -boot_image any replay 2>&1 | grep -E 'Writing|written|ISO image produced|FAILURE|SORRY' | tail -5"
(cd "$OUTDIR" && shasum -a 256 "$(basename "$OUT")" > "$(basename "$OUT").sha256")
ls -la "$OUT"
