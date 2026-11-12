#!/bin/sh
# Build jewbuntu-skin and jewbuntu-icons .debs inside Ubuntu 26.04 from their git repos.
# Clones each repo's .git inside Linux (jewbuntu-icons has case-only filename pairs that a
# macOS checkout cannot hold) and builds as a non-root user.
# usage: ci/build-theme-debs.sh SKIN_REPO ICONS_REPO OUTDIR   (e.g. ../jewbuntu-skin ../jewbuntu-icons dist/themes)
set -eu
SKIN="$(cd "$1" && pwd)"; ICONS="$(cd "$2" && pwd)"; OUT="$3"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
docker build -q -t jewbuntu-build:26.04 -f "$ROOT/ci/Dockerfile.build" "$ROOT/ci" >/dev/null
docker run --rm -v "$SKIN/.git:/skin.git:ro" -v "$ICONS/.git:/icons.git:ro" -v "$OUT:/out" jewbuntu-build:26.04 sh -euc '
  for i in 1 2 3; do apt-get update -q >/dev/null && break; sleep 5; done
  apt-get install -y -q --no-install-recommends sassc libglib2.0-dev-bin libglib2.0-bin libxml2-utils imagemagick libgtk-3-bin >/dev/null
  useradd -m b
  su b -c "set -e; cd ~; git config --global --add safe.directory /skin.git; git config --global --add safe.directory /icons.git; git clone -q /skin.git jewbuntu-skin; git clone -q /icons.git jewbuntu-icons
    (cd jewbuntu-skin && dpkg-buildpackage -us -uc -b > ../skin.log 2>&1) || { tail -30 skin.log; exit 1; }
    (cd jewbuntu-icons && dpkg-buildpackage -us -uc -b > ../icons.log 2>&1) || { tail -30 icons.log; exit 1; }"
  cp /home/b/*.deb /out/
  cd /out && ls -la *.deb
'
