#!/bin/sh
# Build the Arch Linux 32 packages: jewbuntu-skin, jewbuntu-icons (from their sibling repos)
# and jewbuntu-core + jewbuntu-xfce-desktop (from this repo), with makepkg in an i686 container.
#
# usage: ci/arch32-build.sh [OUTDIR] [SKIN_REPO] [ICONS_REPO]
#   OUTDIR defaults to dist/arch32; repos default to ../jewbuntu-skin and ../jewbuntu-icons.
#   WORKTREE=1   include this repo's uncommitted changes (the theme repos always build HEAD)
#   ONLY="core"  rebuild only some of skin/icons/core, keeping the other packages in OUTDIR
# Makes the base image with ci/arch32-rootfs.sh first if it is missing. Versions drop the
# Debian "~" (pacman would sort 0.1.0.m1 after 0.1.0): 0.1.0~m1.26 -> 0.1.0m1.26, which
# pacman sorts before 0.1.0 like a pre-release.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/arch32}"
SKIN="$(cd "${2:-$ROOT/../jewbuntu-skin}" && pwd)"
ICONS="$(cd "${3:-$ROOT/../jewbuntu-icons}" && pwd)"
BASE="${BASE:-jewbuntu-arch32-base:latest}"
IMAGE="jewbuntu-arch32-build:latest"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cd "$ROOT"
docker image inspect "$BASE" >/dev/null 2>&1 || IMAGE="$BASE" sh ci/arch32-rootfs.sh
if [ "${WORKTREE:-0}" = 1 ]; then
  git ls-files -co --exclude-standard | COPYFILE_DISABLE=1 tar --no-xattrs -s '#^#jewbuntu/#' -czf "$TMP/jewbuntu.tar.gz" -T -
else
  git archive --prefix=jewbuntu/ -o "$TMP/jewbuntu.tar.gz" HEAD
fi
JB_VERSION="$(sed -n 's/^__version__ = "\(.*\)"/\1/p' components/core/jewbuntu/version.py | tr -d '~')"
docker build -q --target build --build-arg BASE="$BASE" -t "$IMAGE" -f ci/Dockerfile.arch32 ci >/dev/null
docker run --rm -v "$SKIN/.git:/skin.git:ro" -v "$ICONS/.git:/icons.git:ro" -v "$TMP:/src:ro" \
  -v "$ROOT/packaging/arch32:/recipes:ro" -v "$ROOT/ci:/ci:ro" -v "$OUT:/out" \
  -e JB_VERSION="$JB_VERSION" -e ONLY="${ONLY:-skin icons core}" "$IMAGE" sh -euc '
  su b -c "ONLY=\"$ONLY\" sh /ci/arch32-build-inner.sh"
  for f in /home/b/work/*/*.pkg.tar.zst; do
    n=$(basename "$f" | sed "s/-[^-]*-[^-]*-any\.pkg\.tar\.zst$//")
    rm -f /out/"$n"-[0-9]*-any.pkg.tar.zst
  done
  cp /home/b/work/*/*.pkg.tar.zst /out/
  cd /out && ls -la *.pkg.tar.zst
'
