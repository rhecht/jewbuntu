#!/bin/sh
# Build the Jewbuntu skin for Cutefish (Debian 13, amd64 and arm64 alike: both packages are
# Architecture: all) into OUTDIR:
#   jewbuntu-cutefish   Star of David Launchpad button, light/dark Star of David wallpapers, the
#                       per-account wallpaper helper; depends on jewbuntu-branding for the jingle
#   shulgo-xfce         ShulGo's tray widget, built from the public mirror rhecht/shulgo-widgets at
#                       SHULGO_COMMIT with the same file layout as ShulGo's own PKGBUILD (no ShulGo
#                       code is kept in this repository)
# usage: ci/cutefish-build.sh VERSION SHULGO_COMMIT [OUTDIR]
#   e.g. ci/cutefish-build.sh 0.1.0~m1.29+cutefish1 ea1cca8 dist/cutefish
# Needs Docker (image from ci/Dockerfile.cutefish, built here if missing) and gh.
set -eu
VERSION="$1"; SHULGO="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${3:-$ROOT/dist/cutefish}"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
IMAGE="${IMAGE:-jewbuntu-cutefish-test:arm64}"
SKIN="${SKIN:-$ROOT/../jewbuntu-skin}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -q -t "$IMAGE" -f "$ROOT/ci/Dockerfile.cutefish" "$ROOT/ci" >/dev/null

# --- jewbuntu-cutefish
C="$ROOT/packaging/cutefish"; P="$TMP/jewbuntu-cutefish"
install -d "$P/DEBIAN" "$P/usr/bin" "$P/etc/xdg/autostart" "$P/usr/share/cutefish-compositor/shell" \
  "$P/usr/share/backgrounds/cutefishos" "$P/usr/share/doc/jewbuntu-cutefish"
sed "s/@VERSION@/$VERSION/" "$C/control.in" > "$P/DEBIAN/control"
install -m755 "$C/preinst" "$C/postrm" "$P/DEBIAN/"
echo /etc/xdg/autostart/jewbuntu-cutefish.desktop > "$P/DEBIAN/conffiles"
install -m755 "$C/jewbuntu-cutefish-session" "$P/usr/bin/"
install -m644 "$C/jewbuntu-cutefish.desktop" "$P/etc/xdg/autostart/"
install -m644 "$C/launchpad.svg" "$P/usr/share/cutefish-compositor/shell/launchpad.svg"
# The same Star of David wallpapers as Ubuntu's defaults (blue = light, purple = dark), taken from
# the skin repository's committed files and converted to JPEG in the container below: Cutefish's
# desktop draws JPEG wallpapers but not PNG ones.
mkdir -p "$TMP/walls"
git -C "$SKIN" show HEAD:wallpaper/Jewbuntu-star-blue.png > "$TMP/walls/jewbuntu-star-blue.png"
git -C "$SKIN" show HEAD:wallpaper/Jewbuntu-star-purple.png > "$TMP/walls/jewbuntu-star-purple.png"
cat > "$P/usr/share/doc/jewbuntu-cutefish/copyright" <<'EOF'
Jewbuntu skin for Cutefish. https://jewbuntu.com
Launchpad icon and helper: Jewbuntu Developers, original work.
Wallpapers: from github.com/rhecht/jewbuntu-skin (owner-supplied; licence to be confirmed).
EOF

# --- shulgo-xfce
curl -fsSL "https://codeload.github.com/rhecht/shulgo-widgets/tar.gz/$SHULGO" -o "$TMP/sg.tar.gz"
mkdir -p "$TMP/sgsrc"; tar -xzf "$TMP/sg.tar.gz" -C "$TMP/sgsrc"
SRC="$(ls -d "$TMP"/sgsrc/shulgo-widgets-*/shulgo-xfce)"
BASE="$(sed -n 's/^pkgver=//p' "$SRC/packaging/PKGBUILD")"
WHEN="$(gh api "repos/rhecht/shulgo-widgets/commits/$SHULGO" --jq .commit.committer.date | tr -d -- '-:TZ' | cut -c1-12)"
SHORT="$(gh api "repos/rhecht/shulgo-widgets/commits/$SHULGO" --jq .sha | cut -c1-7)"
S="$TMP/shulgo-xfce"
install -d "$S/DEBIAN" "$S/usr/lib/shulgo-xfce/shulgo_xfce" "$S/usr/bin" "$S/usr/share/applications" \
  "$S/etc/xdg/autostart" "$S/usr/share/icons/hicolor/scalable/apps" "$S/usr/share/doc/shulgo-xfce"
install -m644 "$SRC"/shulgo_xfce/*.py "$S/usr/lib/shulgo-xfce/shulgo_xfce/"
install -m755 "$SRC/bin/shulgo-xfce" "$SRC/bin/shulgo-bar" "$S/usr/bin/"
install -m644 "$SRC/packaging/shulgo-xfce.desktop" "$S/usr/share/applications/"
install -m644 "$SRC/packaging/shulgo-xfce-autostart.desktop" "$S/etc/xdg/autostart/shulgo-xfce.desktop"
install -m644 "$SRC/packaging/shulgo.svg" "$S/usr/share/icons/hicolor/scalable/apps/"
install -m644 "$SRC/README.md" "$S/usr/share/doc/shulgo-xfce/"
echo /etc/xdg/autostart/shulgo-xfce.desktop > "$S/DEBIAN/conffiles"
cat > "$S/DEBIAN/control" <<EOF
Package: shulgo-xfce
Version: $BASE.r$WHEN
Architecture: all
Maintainer: ShulGo <info@shulgo.com>
Section: utils
Priority: optional
Depends: python3, python3-gi, gir1.2-gtk-3.0, gir1.2-ayatanaappindicator3-0.1
Homepage: https://shulgo.com
Description: The next minyan near you in the tray, with today's zmanim, from ShulGo
 GTK3 tray widget (StatusNotifierItem). Built for Jewbuntu on Cutefish from
 github.com/rhecht/shulgo-widgets at $SHORT.
EOF

chmod -R a+rX "$TMP"
docker run --rm -v "$TMP:/w" -v "$OUT:/out" -v "$SRC:/sg:ro" "$IMAGE" sh -euc '
  command -v pngtopnm >/dev/null && command -v cjpeg >/dev/null || { apt-get update -q >/dev/null 2>&1; apt-get install -y -q libjpeg-turbo-progs netpbm >/dev/null 2>&1; }
  for w in jewbuntu-star-blue jewbuntu-star-purple; do
    pngtopnm /w/walls/$w.png | cjpeg -quality 92 -optimize > /w/jewbuntu-cutefish/usr/share/backgrounds/cutefishos/$w.jpg
    chmod 644 /w/jewbuntu-cutefish/usr/share/backgrounds/cutefishos/$w.jpg
  done
  file /w/jewbuntu-cutefish/usr/share/backgrounds/cutefishos/*.jpg
  cd /sg && TZ=America/Toronto python3 -m unittest discover -s tests 2>&1 | tail -3
  for p in jewbuntu-cutefish shulgo-xfce; do
    dpkg-deb --root-owner-group -Zxz --build /w/$p /out/ >/dev/null
  done
  rm -rf /tmp/x
  ls -la /out/*.deb'
