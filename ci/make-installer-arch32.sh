#!/bin/sh
# Build the one-file Jewbuntu installer for old 32-bit laptops (Arch Linux 32 i686 + Xfce): a shell
# script with the Jewbuntu packages appended, like ci/make-installer-asahi.sh does for Fedora.
# usage: ci/make-installer-arch32.sh VERSION OUTFILE PKGDIR...
#   e.g. ci/make-installer-arch32.sh 0.1.0-m1.29 dist/release/jewbuntu-arch32-installer-0.1.0-m1.29.run dist/arch32
# A shulgo-xfce package is included when one is found in PKGDIR (optional).
set -eu
VERSION="$1"; OUTFILE="$2"; shift 2
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/jewbuntu/packages"
for d in "$@"; do
  for f in "$d"/jewbuntu-*.pkg.tar.zst "$d"/shulgo-xfce-*.pkg.tar.zst; do
    [ -e "$f" ] && cp "$f" "$STAGE/jewbuntu/packages/"
  done
done
for p in skin icons core xfce-desktop; do
  n=$(ls "$STAGE/jewbuntu/packages/jewbuntu-$p-"[0-9]*.pkg.tar.zst 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = 1 ] || { echo "need exactly one jewbuntu-$p package, found $n" >&2; exit 1; }
done
n=$(ls "$STAGE/jewbuntu/packages" | wc -l | tr -d ' ')
(cd "$STAGE/jewbuntu/packages" && shasum -a 256 *.pkg.tar.zst > ../SHA256SUMS)
COPYFILE_DISABLE=1 tar --no-xattrs -C "$STAGE" -cf "$STAGE/payload.tar" jewbuntu
SUM=$(shasum -a 256 "$STAGE/payload.tar" | cut -d' ' -f1)
mkdir -p "$(dirname "$OUTFILE")"
sed -e "s/@VERSION@/$VERSION/g" -e "s/@PAYLOAD_SHA256@/$SUM/" "$ROOT/packaging/installer/installer-head-arch32.sh" > "$OUTFILE"
cat "$STAGE/payload.tar" >> "$OUTFILE"
chmod 755 "$OUTFILE"
(cd "$(dirname "$OUTFILE")" && shasum -a 256 "$(basename "$OUTFILE")" > "$(basename "$OUTFILE").sha256")
ls -la "$OUTFILE"; echo "packages: $n"; awk '{print "  " $2}' "$STAGE/jewbuntu/SHA256SUMS"
