#!/bin/sh
# Test the Jewbuntu skin for Cutefish on Debian 13 with Cutefish Desktop from Cutefish's own APT
# repository: install, a headless Cutefish session (wallpaper light/dark, jingle, ShulGo in the
# tray protocol), then removal.
# usage: ci/cutefish-test.sh PKGDIR... [-- ARCH]     ARCH is arm64 (default, native) or amd64 (emulated)
#   e.g. ci/cutefish-test.sh dist/cutefish dist/m1.29
# PKGDIRs must hold jewbuntu-cutefish, shulgo-xfce, jewbuntu-branding and jewbuntu-core .debs.
# Writes dist/cutefish-test-ARCH/ (screenshots, logs) and prints the results.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCH=arm64; DIRS=""
while [ $# -gt 0 ]; do
  case "$1" in --) ARCH="$2"; shift 2 ;; *) DIRS="$DIRS $1"; shift ;; esac
done
IMAGE="jewbuntu-cutefish-test:$ARCH"
docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -q --platform "linux/$ARCH" -t "$IMAGE" -f "$ROOT/ci/Dockerfile.cutefish" "$ROOT/ci" >/dev/null
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
for d in $DIRS; do
  for f in "$d"/jewbuntu-cutefish_*.deb "$d"/shulgo-xfce_*.deb "$d"/jewbuntu-branding_*.deb "$d"/jewbuntu-core_*.deb; do
    [ -e "$f" ] && cp "$f" "$TMP/"
  done
done
ls "$TMP"
OUT="$ROOT/dist/cutefish-test-$ARCH"; rm -rf "$OUT"; mkdir -p "$OUT"
docker run --rm --platform "linux/$ARCH" -v "$TMP:/pkgs:ro" -v "$OUT:/out" -v "$ROOT/ci/cutefish-test-inner.sh:/t.sh:ro" -v "$ROOT/ci/sni-watcher-standin.py:/standin.py:ro" \
  "$IMAGE" sh /t.sh 2>&1 | tee "$OUT/test.log"
