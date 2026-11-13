#!/bin/sh
# Build the one-file Jewbuntu installer for Asahi Linux (Fedora Asahi Remix 45, GNOME): a shell
# script with the Jewbuntu RPMs appended, like ci/make-installer.sh does for Ubuntu.
# usage: ci/make-installer-asahi.sh VERSION OUTFILE RPMDIR...
#   e.g. ci/make-installer-asahi.sh 0.1.0-m1.29 dist/release/jewbuntu-asahi-installer-0.1.0-m1.29.run dist/fedora
# jewbuntu-shulgo is included (owner's decision 2026-11-13: public at github.com/rhecht/shulgo-widgets;
# build it with ci/build-shulgo-rpm.sh). Its API key stays per user.
set -eu
VERSION="$1"; OUTFILE="$2"; shift 2
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/jewbuntu/rpms"
for d in "$@"; do
  for f in "$d"/jewbuntu-*.rpm; do
    [ -e "$f" ] && cp "$f" "$STAGE/jewbuntu/rpms/"
  done
done
for p in skin icons core asahi-desktop jewish-service hub branding webserver shulgo; do
  n=$(ls "$STAGE/jewbuntu/rpms/jewbuntu-$p-"[0-9]*.rpm 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = 1 ] || { echo "need exactly one jewbuntu-$p RPM, found $n" >&2; exit 1; }
done
n=$(ls "$STAGE/jewbuntu/rpms" | wc -l | tr -d ' ')
[ "$n" = 9 ] || { echo "expected 9 packages, found $n" >&2; exit 1; }
(cd "$STAGE/jewbuntu/rpms" && shasum -a 256 *.rpm > ../SHA256SUMS)
COPYFILE_DISABLE=1 tar --no-xattrs -C "$STAGE" -cf "$STAGE/payload.tar" jewbuntu
SUM=$(shasum -a 256 "$STAGE/payload.tar" | cut -d' ' -f1)
mkdir -p "$(dirname "$OUTFILE")"
sed -e "s/@VERSION@/$VERSION/g" -e "s/@PAYLOAD_SHA256@/$SUM/" "$ROOT/packaging/installer/installer-head-asahi.sh" > "$OUTFILE"
cat "$STAGE/payload.tar" >> "$OUTFILE"
chmod 755 "$OUTFILE"
(cd "$(dirname "$OUTFILE")" && shasum -a 256 "$(basename "$OUTFILE")" > "$(basename "$OUTFILE").sha256")
ls -la "$OUTFILE"; echo "packages: $n"; awk '{print "  " $2}' "$STAGE/jewbuntu/SHA256SUMS"
