#!/bin/sh
# Install / defaults / skin / real Xfce session / update-survival / removal test of the Arch
# Linux 32 packages in a clean i686 container (emulated on Apple Silicon: slow but real i686).
#
# usage: ci/arch32-test.sh [PKG_DIR]     (default dist/arch32, from ci/arch32-build.sh)
#   Log: dist/arch32-test.log; screenshot: dist/arch32-xfce.png
#
# What it proves (and what it does not):
#   + the packages install from Arch Linux 32's repositories, are arch=any, have no install
#     scripts, no Conflicts/Replaces, and put nothing in Xfce's own directories
#   + the Jewbuntu session's defaults win and merge with Xfce's; the stock Xfce session stays stock
#   + `jewbuntu skin apply/undo` for an existing account, against a real xfconfd
#   + a real Xfce 4.18 session (startjewbuntu, Xvfb 1024x768x24) with Jewbuntu's window manager
#     theme, panels and English+Hebrew keyboard, plus a screenshot
#   + LightDM picks the Jewbuntu session; reinstalling Xfce/LightDM (an update) changes nothing
#   + removal brings Xfce's defaults back and keeps per-user data
#   - NOT a Pentium III, 256 MB of RAM, real graphics, or a real LightDM login (VM test does that)
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKGS="$(cd "${1:-$ROOT/dist/arch32}" && pwd)"
BASE="${BASE:-jewbuntu-arch32-base:latest}"
IMAGE="jewbuntu-arch32-test:latest"
LOG="${LOG:-$ROOT/dist/arch32-test.log}"
mkdir -p "$ROOT/dist"
docker build -q --target test --build-arg BASE="$BASE" -t "$IMAGE" -f "$ROOT/ci/Dockerfile.arch32" "$ROOT/ci" >/dev/null
docker run --rm -v "$PKGS:/pkgs:ro" -v "$ROOT/ci:/ci:ro" -v "$ROOT/dist:/out" "$IMAGE" sh /ci/arch32-test-inner.sh 2>&1 | tee "$LOG"
echo "log: $LOG"
grep -q "^ALL PASS" "$LOG"
