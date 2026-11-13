#!/bin/sh
# Build jewbuntu-shulgo as an RPM for Fedora Asahi Remix from a (private) ShulGo checkout.
# No ShulGo code is kept in this repo; the RPM lands in OUTDIR (dist/ is not committed).
# usage: ci/build-shulgo-rpm.sh SHULGO_CHECKOUT COMMIT [OUTDIR]     (default dist/shulgo-fedora)
#   FEDORA=45, SHELL_MAJOR=51 as for ci/fedora-build.sh. Never publish the RPM without the owner.
set -eu
SHULGO="$1"; REF="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${3:-$ROOT/dist/shulgo-fedora}"
FEDORA="${FEDORA:-45}"; SHELL_MAJOR="${SHELL_MAJOR:-51}"
IMAGE="jewbuntu-fedora-build:$FEDORA"
SHORT="$(git -C "$SHULGO" rev-parse --short "$REF")"
# Version from the commit's UTC timestamp so it always increases (a bare hash sorts randomly).
# 0.1.1 sorts above every 0.1.0~ version. Same scheme as ci/build-shulgo-deb.sh.
STAMP="$(TZ=UTC git -C "$SHULGO" log -1 --date=format-local:%Y%m%d%H%M --format=%cd "$REF")"
VERSION="0.1.1~git$STAMP.$SHORT"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/jewbuntu-shulgo"
git -C "$SHULGO" archive --format=tar "$REF" integrations/shulgo-core integrations/jewbuntu \
  | tar -x -C "$TMP/jewbuntu-shulgo" --strip-components=1
COPYFILE_DISABLE=1 tar -C "$TMP" -czf "$TMP/jewbuntu-shulgo.tar.gz" jewbuntu-shulgo
cp "$ROOT/packaging/shulgo-recipe/debian/shulgo" "$ROOT/packaging/shulgo-recipe/jewbuntu-shulgo.spec" "$TMP/"
docker build -q --target build --build-arg FEDORA="$FEDORA" -t "$IMAGE" -f "$ROOT/ci/Dockerfile.fedora" "$ROOT/ci" >/dev/null
docker run --rm -v "$TMP:/in:ro" -v "$OUT:/out" "$IMAGE" sh -euc "
  su b -c 'set -eu; mkdir -p ~/rpmbuild/SOURCES; cp /in/jewbuntu-shulgo.tar.gz /in/shulgo ~/rpmbuild/SOURCES/
    rpmbuild -bb --define \"jb_version $VERSION\" --define \"jb_shell_major $SHELL_MAJOR\" /in/jewbuntu-shulgo.spec > ~/build.log 2>&1 || { tail -30 ~/build.log; exit 1; }'
  cp /home/b/rpmbuild/RPMS/noarch/jewbuntu-shulgo-*.rpm /out/"
ls "$OUT"/jewbuntu-shulgo-*"$SHORT"*.rpm
