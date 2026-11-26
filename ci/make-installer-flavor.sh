#!/bin/sh
# Build the one-file Jewbuntu skin installer for Lubuntu or Linux Mint: a shell script with the
# .debs appended, like ci/make-installer-cutefish.sh. Every package in it is Architecture: all.
# usage: ci/make-installer-flavor.sh FLAVOR VERSION OUTFILE PKGDIR...
#   FLAVOR: lubuntu (Lubuntu 22.04 and newer, LXQt) | lubuntu18 (Lubuntu 18.04, LXDE) | mint
#   e.g. ci/make-installer-flavor.sh mint 0.1.0-m1.29 dist/release-flavors/jewbuntu-mint-installer-0.1.0-m1.29.run dist/flavors
set -eu
FLAVOR="$1"; VERSION="$2"; OUTFILE="$3"; shift 3
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
case "$FLAVOR" in
  lubuntu)   PKGS="jewbuntu-lubuntu shulgo-xfce jewbuntu-branding jewbuntu-core"; TITLE="Lubuntu (LXQt, 64-bit)" ;;
  lubuntu18) PKGS="jewbuntu-lubuntu-lxde shulgo-xfce"; TITLE="Lubuntu 18.04 (LXDE, 32-bit and 64-bit)" ;;
  mint)      PKGS="jewbuntu-mint shulgo-xfce"; TITLE="Linux Mint (Cinnamon)" ;;
  *) echo "unknown flavor $FLAVOR" >&2; exit 2 ;;
esac
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/jewbuntu/debs"
for d in "$@"; do
  for p in $PKGS; do
    for f in "$d"/${p}_*.deb; do [ -e "$f" ] && cp "$f" "$STAGE/jewbuntu/debs/"; done
  done
done
for p in $PKGS; do
  n=$(ls "$STAGE/jewbuntu/debs/${p}_"*.deb 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = 1 ] || { echo "need exactly one $p package, found $n" >&2; exit 1; }
done
(cd "$STAGE/jewbuntu/debs" && shasum -a 256 *.deb > ../SHA256SUMS)
COPYFILE_DISABLE=1 tar --no-xattrs -C "$STAGE" -cf "$STAGE/payload.tar" jewbuntu
SUM=$(shasum -a 256 "$STAGE/payload.tar" | cut -d' ' -f1)
mkdir -p "$(dirname "$OUTFILE")"
sed -e "s/@VERSION@/$VERSION/g" -e "s/@PAYLOAD_SHA256@/$SUM/" -e "s/@FLAVOR@/$FLAVOR/" \
    -e "s|@TITLE@|$TITLE|" -e "s|@RUNNAME@|$(basename "$OUTFILE")|g" \
    "$ROOT/packaging/installer/installer-head-flavor.sh" > "$OUTFILE"
cat "$STAGE/payload.tar" >> "$OUTFILE"
chmod 755 "$OUTFILE"
(cd "$(dirname "$OUTFILE")" && shasum -a 256 "$(basename "$OUTFILE")" > "$(basename "$OUTFILE").sha256")
ls -la "$OUTFILE"; awk '{print "  " $2}' "$STAGE/jewbuntu/SHA256SUMS"
