#!/bin/sh
# Build jewbuntu-shulgo from a (private) ShulGo checkout; no ShulGo code is kept in this repo.
# usage: ci/build-shulgo-deb.sh SHULGO_CHECKOUT COMMIT [OUTDIR]
set -eu
SHULGO="$1"; REF="$2"; OUT="${3:-dist/shulgo}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHORT="$(git -C "$SHULGO" rev-parse --short "$REF")"
TMP="$(mktemp -d)"
mkdir -p "$TMP/src" "$ROOT/$OUT"
git -C "$SHULGO" archive --format=tar "$REF" integrations/shulgo-core integrations/jewbuntu | tar -x -C "$TMP/src" --strip-components=1
cp -R "$ROOT/packaging/shulgo-recipe/debian" "$TMP/src/debian"
# Needs rhecht/shulgo f0a898c or later (extension jewbuntu@shulgo.com, app/schema com.shulgo.ShulGo).
cp "$TMP/src/jewbuntu/extension/jewbuntu@shulgo.com/icons/shulgo-symbolic.svg" "$TMP/src/debian/com.shulgo.ShulGo-symbolic.svg"
DATE="$(git -C "$SHULGO" log -1 --format=%aD "$REF")"
cat > "$TMP/src/debian/changelog" <<CL
jewbuntu-shulgo (0.1.0~git$SHORT+26.04) resolute; urgency=medium

  * Built from rhecht/shulgo@$SHORT (integrations/shulgo-core + integrations/jewbuntu).

 -- Jewbuntu Developers <maintainers@jewbuntu.invalid>  $DATE
CL
docker build -q -t jewbuntu-build:26.04 -f "$ROOT/ci/Dockerfile.build" "$ROOT/ci" >/dev/null
docker run --rm -v "$TMP/src:/in:ro" -v "$ROOT/$OUT:/out" jewbuntu-build:26.04 sh -euc '
  cp -r /in /build && cd /build && dpkg-buildpackage -us -uc -b >/out/build.log 2>&1 && cp ../*.deb /out/'
ls "$ROOT/$OUT"/jewbuntu-shulgo_*"$SHORT"*.deb
