#!/bin/sh
# Build shulgo-xfce (ShulGo's minyan widget for Xfce) for Arch Linux 32, from the public mirror
# github.com/rhecht/shulgo-widgets at a commit, using ShulGo's own recipe
# (shulgo-xfce/packaging/PKGBUILD) with its source pointed at that commit's tarball. ShulGo code
# never goes into this repository. Like ci/build-shulgo-deb.sh for Ubuntu.
# usage: ci/build-shulgo-arch32.sh COMMIT [OUTDIR]        (OUTDIR defaults to dist/arch32)
# The version is the recipe's pkgver plus ".r" and the commit time, so newer commits sort higher.
set -eu
COMMIT="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${2:-$ROOT/dist/arch32}"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
IMAGE="${IMAGE:-jewbuntu-arch32-build:latest}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/src" "$TMP/build"
curl -fsSL "https://codeload.github.com/rhecht/shulgo-widgets/tar.gz/$COMMIT" -o "$TMP/build/shulgo-widgets-$COMMIT.tar.gz"
tar -xzf "$TMP/build/shulgo-widgets-$COMMIT.tar.gz" -C "$TMP/src" "shulgo-widgets-$COMMIT/shulgo-xfce/packaging/PKGBUILD"
WHEN="$(gh api "repos/rhecht/shulgo-widgets/commits/$COMMIT" --jq .commit.committer.date | tr -d -- '-:TZ' | cut -c1-12)"
BASE="$(sed -n 's/^pkgver=//p' "$TMP/src/shulgo-widgets-$COMMIT/shulgo-xfce/packaging/PKGBUILD")"
sed -e "s|^pkgver=.*|pkgver=$BASE.r$WHEN|" \
    -e "s|^source=.*|source=(\"shulgo-widgets-$COMMIT.tar.gz\")|" \
    -e "s|^_src=.*|_src=\"shulgo-widgets-$COMMIT/shulgo-xfce\"|" \
    "$TMP/src/shulgo-widgets-$COMMIT/shulgo-xfce/packaging/PKGBUILD" > "$TMP/build/PKGBUILD"
grep -E '^(pkgver|source|_src)=' "$TMP/build/PKGBUILD"
chmod -R a+rX "$TMP/build"
docker run --rm -v "$TMP/build:/recipe:ro" -v "$OUT:/out" "$IMAGE" sh -euc '
  su b -c "set -e; rm -rf ~/sg && cp -r /recipe ~/sg && cd ~/sg && PACKAGER=\"Jewbuntu Developers <maintainers@jewbuntu.invalid>\" makepkg -f --nodeps --noconfirm --noprogressbar > ~/sg.log 2>&1 || { tail -30 ~/sg.log; exit 1; }; grep -E \"^(Ran|OK|FAILED)\" ~/sg.log || true"
  rm -f /out/shulgo-xfce-*.pkg.tar.zst
  cp /home/b/sg/shulgo-xfce-*.pkg.tar.zst /out/
  ls -la /out/shulgo-xfce-*.pkg.tar.zst
'
