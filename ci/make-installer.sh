#!/bin/sh
# Build the one-file Jewbuntu installer: a shell script with the public .debs appended.
# usage: ci/make-installer.sh VERSION OUTFILE DEBDIR...
#   e.g. ci/make-installer.sh 0.1.0-m1.24 dist/release/jewbuntu-installer-0.1.0-m1.24.run dist/worktree dist/themes
# jewbuntu-shulgo is never included (ShulGo is private and distributed separately).
set -eu
VERSION="$1"; OUTFILE="$2"; shift 2
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/jewbuntu/debs"
for d in "$@"; do
  for f in "$d"/*.deb; do
    case "$(basename "$f")" in jewbuntu-shulgo*) continue ;; esac
    cp "$f" "$STAGE/jewbuntu/debs/"
  done
done
n=$(ls "$STAGE/jewbuntu/debs" | wc -l | tr -d ' ')
[ "$n" -ge 10 ] || { echo "expected at least 10 packages, found $n" >&2; exit 1; }
for p in core branding hebrew desktop gnome jewish-service hub upgrade-tools webserver skin icons; do
  ls "$STAGE/jewbuntu/debs/jewbuntu-${p}_"*.deb >/dev/null 2>&1 || { echo "missing jewbuntu-$p" >&2; exit 1; }
done
(cd "$STAGE/jewbuntu/debs" && shasum -a 256 *.deb > ../SHA256SUMS)
COPYFILE_DISABLE=1 tar --no-xattrs -C "$STAGE" -cf "$STAGE/payload.tar" jewbuntu
SUM=$(shasum -a 256 "$STAGE/payload.tar" | cut -d' ' -f1)
mkdir -p "$(dirname "$OUTFILE")"
sed -e "s/@VERSION@/$VERSION/" -e "s/@PAYLOAD_SHA256@/$SUM/" "$ROOT/packaging/installer/installer-head.sh" > "$OUTFILE"
cat "$STAGE/payload.tar" >> "$OUTFILE"
chmod 755 "$OUTFILE"
(cd "$(dirname "$OUTFILE")" && shasum -a 256 "$(basename "$OUTFILE")" > "$(basename "$OUTFILE").sha256")
ls -la "$OUTFILE"; echo "packages: $n"; cat "$STAGE/jewbuntu/SHA256SUMS" | awk '{print "  " $2}'
