#!/bin/sh
# Install / upgrade / remove test for Jewbuntu packages in a clean Ubuntu 26.04 container.
#
# usage: ci/container-test.sh OLD_DIST [NEW_DIST]
#   OLD_DIST / NEW_DIST: directories with .debs from ci/container-build.sh.
#
# What it proves (and what it does not):
#   + packages install from a *signed* local APT repo scoped with Signed-By
#   + the APT pin stops the Jewbuntu origin replacing Ubuntu packages (decoy test)
#   + settings written as a normal user survive a package upgrade and are migrated
#     *as that user*; a verified backup is kept
#   + remove and purge never delete per-user data; reinstall picks it up again
#   - it is NOT a VM, graphical-session, boot, audio or hardware test
set -eu
OLD="$1"; NEW="${2:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE=jewbuntu-build:26.04
LOG="${LOG:-$ROOT/dist/container-test.log}"
docker build -q -t "$IMAGE" -f "$ROOT/ci/Dockerfile.build" "$ROOT/ci" >/dev/null
OLD_ABS="$(cd "$OLD" && pwd)"
if [ -n "$NEW" ]; then
  set -- -v "$(cd "$NEW" && pwd):/new:ro" -e HAVE_NEW=1
else
  set -- -e HAVE_NEW=0
fi
docker run --rm -v "$OLD_ABS:/old:ro" "$@" -v "$ROOT/ci/container-test-inner.sh:/inner.sh:ro" \
  "$IMAGE" sh /inner.sh 2>&1 | tee "$LOG"
echo "log: $LOG"
