#!/bin/sh
# Build jewbuntu-shulgo-gtk2 (ShulGo's tray widget for Ubuntu 7.10: Python 2.5, PyGTK 2.12) from a
# ShulGo checkout: the private rhecht/shulgo (integrations/shulgo-gtk2) or the public mirror
# rhecht/shulgo-widgets (shulgo-gtk2). No ShulGo code is kept in this repo.
# Output goes next to the other Jewbuntu Classic packages, so ci/gutsy-remaster.sh puts it on the CD.
# usage: ci/build-shulgo-gtk2-deb.sh SHULGO_CHECKOUT COMMIT
set -eu
SHULGO="$1"; REF="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/gutsy/debs"
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
SHORT="$(git -C "$SHULGO" rev-parse --short "$REF")"
STAMP="$(TZ=UTC git -C "$SHULGO" log -1 --date=format-local:%Y%m%d%H%M --format=%cd "$REF")"
VERSION="0.1.1~git$STAMP.$SHORT"
TMP="$(mktemp -d)"
if git -C "$SHULGO" cat-file -e "$REF:integrations/shulgo-gtk2" 2>/dev/null; then
  git -C "$SHULGO" archive --format=tar "$REF" integrations/shulgo-gtk2 | tar -x -C "$TMP" --strip-components=1
else
  git -C "$SHULGO" archive --format=tar "$REF" shulgo-gtk2 | tar -x -C "$TMP"
fi
mkdir -p "$OUT"
# The widget's own tests, under Ubuntu 7.10's real Python 2.5 and PyGTK 2.12 (image from
# ci/gutsy-unpack.sh): `check` (no display) and `check-display` (the real tray under Xvfb).
if [ -z "${SKIP_SHULGO_TESTS:-}" ]; then
  docker run --rm --platform linux/386 -v "$TMP/shulgo-gtk2:/src:ro" jewbuntu-gutsy-i386:rootfs sh -euc '
    echo "deb http://old-releases.ubuntu.com/ubuntu gutsy main universe" > /etc/apt/sources.list
    apt-get update -qq >/dev/null 2>&1 || true
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --force-yes python-simplejson xvfb >/dev/null 2>&1
    cp -r /src /t && cd /t
    for t in check check-display; do
      make $t PYTHON=python2.5 >/tmp/$t.log 2>&1 || { cat /tmp/$t.log; echo "make $t FAILED" >&2; exit 1; }
      echo "make $t: $(grep -c "^OK" /tmp/$t.log) OK"
    done'
fi
docker build -q -t jewbuntu-gutsy-tools -f "$ROOT/ci/Dockerfile.gutsy-tools" "$ROOT/ci" >/dev/null
docker run --rm -e VERSION="$VERSION" -e SHORT="$SHORT" -v "$TMP/shulgo-gtk2:/src:ro" -v "$OUT:/out" \
  jewbuntu-gutsy-tools sh -euc '
  cp -r /src /build && cd /build
  P=/pkg; make -s install DESTDIR=$P PREFIX=/usr
  mkdir -p $P/DEBIAN
  cat > $P/DEBIAN/control <<CTL
Package: jewbuntu-shulgo-gtk2
Version: $VERSION
Architecture: all
Maintainer: Jewbuntu Developers <maintainers@jewbuntu.invalid>
Installed-Size: $(du -sk $P/usr $P/etc | awk "{s+=\$1} END {print s}")
Depends: python (>= 2.5), python-gtk2, python-simplejson, jewbuntu-web-tools
Section: gnome
Priority: optional
Homepage: https://shulgo.com
Description: ShulGo in the GNOME 2 tray (Jewbuntu Classic)
 The next minyan near you, with today'"'"'s zmanim, in the panel'"'"'s notification area.
 Written for Ubuntu 7.10 (Python 2.5, GTK 2.12). Its HTTPS calls go through the current
 curl in jewbuntu-web-tools, since Ubuntu 7.10'"'"'s own TLS is too old for today'"'"'s servers.
 Built from ShulGo $SHORT.
CTL
  cat > $P/DEBIAN/postinst <<"SH"
#!/bin/sh
set -e
if [ "$1" = configure ] && [ -x /usr/bin/gtk-update-icon-cache ]; then
  gtk-update-icon-cache -f -q -t /usr/share/icons/hicolor || true
fi
exit 0
SH
  chmod 755 $P/DEBIAN/postinst
  find $P -type d -exec chmod 755 {} +
  rm -f /out/jewbuntu-shulgo-gtk2_*.deb
  dpkg-deb -Zgzip --root-owner-group -b $P /out/jewbuntu-shulgo-gtk2_${VERSION}_all.deb >/dev/null
  dpkg-deb -c /out/jewbuntu-shulgo-gtk2_${VERSION}_all.deb | awk "{print \$6}" | grep -v "/$"'
rm -rf "$TMP"
ls "$OUT"/jewbuntu-shulgo-gtk2_*"$SHORT"*.deb
