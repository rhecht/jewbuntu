#!/bin/sh
# Runs as the unprivileged user inside the jewbuntu-arch32-build container (ci/arch32-build.sh).
set -eu
W=~/work; rm -rf "$W"; mkdir -p "$W"; cd "$W"
git config --global --add safe.directory '*'
deb_version() { sed -n '1s/^[^(]*(\([^+)]*\).*/\1/p' "$1/debian/changelog" | tr -d '~'; }
for r in skin icons; do
  git clone -q "/$r.git" "jewbuntu-$r"
  mkdir -p "$r"
  git -C "jewbuntu-$r" archive --prefix="jewbuntu-$r/" -o "$W/$r/jewbuntu-$r.tar.gz" HEAD
  cp "/recipes/PKGBUILD.$r" "$r/PKGBUILD"
done
mkdir -p core; cp /src/jewbuntu.tar.gz core/; cp /recipes/PKGBUILD core/
export PACKAGER="Jewbuntu Developers <maintainers@jewbuntu.invalid>"
build() {
  ( cd "$W/$1" && JB_VERSION="$2" makepkg -f --nodeps --noconfirm --noprogressbar >"$W/$1.log" 2>&1 ) \
    || { tail -40 "$W/$1.log"; exit 1; }
  echo "built $1 $2"
}
for r in ${ONLY:-skin icons core}; do
  case $r in
    skin|icons) build "$r" "$(deb_version "jewbuntu-$r")" ;;
    core) build core "$JB_VERSION" ;;
  esac
done
grep -E '^(Ran|OK|FAILED)' "$W/core.log" || true
