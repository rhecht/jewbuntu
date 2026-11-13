#!/bin/sh
# Build jewbuntu-shulgo from a ShulGo checkout (private rhecht/shulgo or the public rhecht/shulgo-widgets
# mirror); no ShulGo code is kept in this repo.
# usage: ci/build-shulgo-deb.sh SHULGO_CHECKOUT COMMIT [OUTDIR]
set -eu
SHULGO="$1"; REF="$2"; OUT="${3:-dist/shulgo}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHORT="$(git -C "$SHULGO" rev-parse --short "$REF")"
TMP="$(mktemp -d)"
mkdir -p "$TMP/src" "$ROOT/$OUT"
# Private repo (rhecht/shulgo) keeps them under integrations/; the public mirror
# (rhecht/shulgo-widgets) at the top level. Both unpack to $TMP/src/{shulgo-core,jewbuntu}.
if git -C "$SHULGO" cat-file -e "$REF:integrations/jewbuntu" 2>/dev/null; then
  git -C "$SHULGO" archive --format=tar "$REF" integrations/shulgo-core integrations/jewbuntu | tar -x -C "$TMP/src" --strip-components=1
else
  git -C "$SHULGO" archive --format=tar "$REF" shulgo-core jewbuntu | tar -x -C "$TMP/src"
fi
cp -R "$ROOT/packaging/shulgo-recipe/debian" "$TMP/src/debian"
# Needs rhecht/shulgo f0a898c or later (extension jewbuntu@shulgo.com, app/schema com.shulgo.ShulGo).
cp "$TMP/src/jewbuntu/extension/jewbuntu@shulgo.com/icons/shulgo-symbolic.svg" "$TMP/src/debian/com.shulgo.ShulGo-symbolic.svg"
DATE="$(git -C "$SHULGO" log -1 --format=%aD "$REF")"
# Version from the commit's UTC timestamp so it always increases (a bare hash sorts randomly,
# and 0.1.0~git<hash> sorted below the old 0.1.0~m1.21, so apt never upgraded those installs).
# 0.1.1 sorts above every 0.1.0~ version.
STAMP="$(TZ=UTC git -C "$SHULGO" log -1 --date=format-local:%Y%m%d%H%M --format=%cd "$REF")"
VERSION="0.1.1~git$STAMP.$SHORT+26.04"
cat > "$TMP/src/debian/changelog" <<CL
jewbuntu-shulgo ($VERSION) resolute; urgency=medium

  * Built from ShulGo $SHORT (shulgo-core + the GNOME widget and app).

 -- Jewbuntu Developers <maintainers@jewbuntu.invalid>  $DATE
CL
docker build -q -t jewbuntu-build:26.04 -f "$ROOT/ci/Dockerfile.build" "$ROOT/ci" >/dev/null
docker run --rm -v "$TMP/src:/in:ro" -v "$ROOT/$OUT:/out" jewbuntu-build:26.04 sh -euc '
  cp -r /in /build && cd /build && dpkg-buildpackage -us -uc -b >/out/build.log 2>&1 && cp ../*.deb /out/'
ls "$ROOT/$OUT"/jewbuntu-shulgo_*"$SHORT"*.deb
