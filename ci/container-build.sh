#!/bin/sh
# Build Jewbuntu .debs inside an Ubuntu 26.04 container from a clean git export.
# usage: ci/container-build.sh [git-ref] [outdir]
#   git-ref defaults to HEAD; uncommitted changes are included only for HEAD via WORKTREE=1.
set -eu
REF="${1:-HEAD}"
OUT="${2:-dist/$(echo "$REF" | tr '/' '_')}"
IMAGE=jewbuntu-build:26.04
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
docker build -q -t "$IMAGE" -f ci/Dockerfile.build ci >/dev/null
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
if [ "${WORKTREE:-0}" = 1 ]; then
  git ls-files -co --exclude-standard | COPYFILE_DISABLE=1 tar --no-xattrs -cf "$TMP/src.tar" -T -
else
  git archive --format=tar -o "$TMP/src.tar" "$REF"
fi
docker run --rm -v "$TMP:/in:ro" -v "$ROOT/$OUT:/out" "$IMAGE" sh -euc '
  mkdir -p /build/jewbuntu && tar -xf /in/src.tar -C /build/jewbuntu
  cd /build/jewbuntu
  dpkg-buildpackage -us -uc -b 2>&1 | tee /out/build.log | tail -5
  lintian --tag-display-limit 0 ../*.changes > /out/lintian.txt 2>&1 || true
  cp ../*.deb ../*.changes ../*.buildinfo /out/
  cd /out && sha256sum *.deb > SHA256SUMS
  for d in *.deb; do echo "== $d"; dpkg-deb -c "$d" | awk "{print \$6, \$7, \$8}"; done > contents.txt
'
echo "artifacts in $OUT"
