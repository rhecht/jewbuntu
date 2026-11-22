#!/bin/sh
# Build the one-file Jewbuntu skin installer for Cutefish (Debian 13): a shell script with the
# Jewbuntu .debs appended, like ci/make-installer.sh does for Ubuntu. Every package in it is
# Architecture: all, so the same file serves amd64 and arm64.
# usage: ci/make-installer-cutefish.sh VERSION OUTFILE PKGDIR...
#   e.g. ci/make-installer-cutefish.sh 0.1.0-m1.29 dist/release-cutefish/jewbuntu-cutefish-installer-0.1.0-m1.29.run dist/cutefish dist/m1.29
set -eu
VERSION="$1"; OUTFILE="$2"; shift 2
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/jewbuntu/debs"
for d in "$@"; do
  for f in "$d"/jewbuntu-cutefish_*.deb "$d"/shulgo-xfce_*.deb "$d"/jewbuntu-branding_*.deb "$d"/jewbuntu-core_*.deb; do
    [ -e "$f" ] && cp "$f" "$STAGE/jewbuntu/debs/"
  done
done
for p in jewbuntu-cutefish shulgo-xfce jewbuntu-branding jewbuntu-core; do
  n=$(ls "$STAGE/jewbuntu/debs/${p}_"*.deb 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = 1 ] || { echo "need exactly one $p package, found $n" >&2; exit 1; }
done
(cd "$STAGE/jewbuntu/debs" && shasum -a 256 *.deb > ../SHA256SUMS)
COPYFILE_DISABLE=1 tar --no-xattrs -C "$STAGE" -cf "$STAGE/payload.tar" jewbuntu
SUM=$(shasum -a 256 "$STAGE/payload.tar" | cut -d' ' -f1)
mkdir -p "$(dirname "$OUTFILE")"
sed -e "s/@VERSION@/$VERSION/g" -e "s/@PAYLOAD_SHA256@/$SUM/" "$ROOT/packaging/installer/installer-head-cutefish.sh" > "$OUTFILE"
cat "$STAGE/payload.tar" >> "$OUTFILE"
chmod 755 "$OUTFILE"
(cd "$(dirname "$OUTFILE")" && shasum -a 256 "$(basename "$OUTFILE")" > "$(basename "$OUTFILE").sha256")
ls -la "$OUTFILE"; awk '{print "  " $2}' "$STAGE/jewbuntu/SHA256SUMS"
