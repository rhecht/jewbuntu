#!/bin/sh
# Build the Fedora Asahi Remix RPMs: jewbuntu-skin, jewbuntu-icons (from their sibling repos)
# and jewbuntu-core + jewbuntu-asahi-desktop and jewbuntu-webserver (from this repo), in a
# Fedora container.
#
# usage: ci/fedora-build.sh [OUTDIR] [SKIN_REPO] [ICONS_REPO]
#   OUTDIR defaults to dist/fedora; repos default to ../jewbuntu-skin and ../jewbuntu-icons.
#   WORKTREE=1   include this repo's uncommitted changes (the theme repos always build HEAD)
#   FEDORA=45    Fedora release to build in; SHELL_MAJOR=51 is the GNOME Shell it targets
# The theme repos are cloned inside Linux (jewbuntu-icons has case-only file name pairs
# that a macOS checkout cannot hold). Runs natively on Apple Silicon (arm64).
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/fedora}"
SKIN="$(cd "${2:-$ROOT/../jewbuntu-skin}" && pwd)"
ICONS="$(cd "${3:-$ROOT/../jewbuntu-icons}" && pwd)"
FEDORA="${FEDORA:-45}"; SHELL_MAJOR="${SHELL_MAJOR:-51}"
IMAGE="jewbuntu-fedora-build:$FEDORA"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cd "$ROOT"
if [ "${WORKTREE:-0}" = 1 ]; then
  git ls-files -co --exclude-standard | COPYFILE_DISABLE=1 tar --no-xattrs -s '#^#jewbuntu/#' -czf "$TMP/jewbuntu.tar.gz" -T -
else
  git archive --prefix=jewbuntu/ -o "$TMP/jewbuntu.tar.gz" HEAD
fi
JB_VERSION="$(sed -n 's/^__version__ = "\(.*\)"/\1/p' components/core/jewbuntu/version.py)"
docker build -q --target build --build-arg FEDORA="$FEDORA" -t "$IMAGE" -f ci/Dockerfile.fedora ci >/dev/null
docker run --rm -v "$SKIN/.git:/skin.git:ro" -v "$ICONS/.git:/icons.git:ro" -v "$TMP:/src:ro" \
  -v "$ROOT/packaging/fedora:/specs:ro" -v "$OUT:/out" \
  -e JB_VERSION="$JB_VERSION" -e SHELL_MAJOR="$SHELL_MAJOR" "$IMAGE" sh -euc '
  su b -c "set -eu; cd ~; S=~/rpmbuild/SOURCES; mkdir -p \$S
    git config --global --add safe.directory \"*\"
    deb_version() { sed -n \"1s/^[^(]*(\\([^+)]*\\).*/\\1/p\" \"\$1/debian/changelog\"; }
    for r in skin icons; do
      git clone -q /\$r.git jewbuntu-\$r
      git -C jewbuntu-\$r archive --prefix=jewbuntu-\$r/ -o \$S/jewbuntu-\$r.tar.gz HEAD
    done
    cp /src/jewbuntu.tar.gz \$S/
    build() { rpmbuild -bb --define \"jb_version \$2\" --define \"jb_shell_major $SHELL_MAJOR\" /specs/\$1.spec > \$1.log 2>&1 || { tail -40 \$1.log; exit 1; }; }
    build jewbuntu-skin \$(deb_version jewbuntu-skin)
    build jewbuntu-icons \$(deb_version jewbuntu-icons)
    build jewbuntu $JB_VERSION
    build jewbuntu-webserver $JB_VERSION
    grep -E \"^(Ran|OK|FAILED)\" jewbuntu.log || true"
  rm -f /out/*.rpm
  cp /home/b/rpmbuild/RPMS/noarch/*.rpm /out/
  cd /out && ls -la *.rpm
'
