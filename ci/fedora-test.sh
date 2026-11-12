#!/bin/sh
# Install / defaults / skin / GNOME Shell / update-survival / removal test of the Fedora
# Asahi Remix RPMs in a clean Fedora container (native arm64 on Apple Silicon).
#
# usage: ci/fedora-test.sh [RPM_DIR]     (default dist/fedora, from ci/fedora-build.sh)
#   FEDORA=45 picks the release. Log: dist/fedora-test.log; screenshot: dist/fedora-shell.png
#
# What it proves (and what it does not):
#   + the RPMs install with Fedora's own packages only, own only their own files, have no scriptlets
#   + Jewbuntu defaults (and the "Jewbuntu for Asahi Linux" login logo) win over Fedora's/gdm's
#   + `jewbuntu skin apply/undo` for an existing account, libadwaita symlinks
#   + a real GNOME Shell (headless, virtual monitor) runs the skin's extensions ACTIVE
#   + reinstalling Fedora's gnome-shell/gdm/extensions (what an update does) leaves Jewbuntu intact
#   + removing the packages brings Fedora's defaults back and keeps per-user data
#   - NOT Asahi hardware, a real login/GDM greeter session, or a visual check of every app
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPMS="$(cd "${1:-$ROOT/dist/fedora}" && pwd)"
FEDORA="${FEDORA:-45}"
IMAGE="jewbuntu-fedora-test:$FEDORA"
LOG="${LOG:-$ROOT/dist/fedora-test.log}"
mkdir -p "$ROOT/dist"
docker build -q --target test --build-arg FEDORA="$FEDORA" -t "$IMAGE" -f "$ROOT/ci/Dockerfile.fedora" "$ROOT/ci" >/dev/null
docker run --rm -v "$RPMS:/rpms:ro" -v "$ROOT/ci:/ci:ro" -v "$ROOT/dist:/out" "$IMAGE" sh /ci/fedora-test-inner.sh 2>&1 | tee "$LOG"
echo "log: $LOG"
grep -q "^ALL PASS" "$LOG"
