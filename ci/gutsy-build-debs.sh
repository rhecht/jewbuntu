#!/bin/sh
# Jewbuntu Classic (Ubuntu 7.10 i386), step 3: build the packages that go on the disc.
#   jewbuntu-classic-desktop_*_all.deb  skin (GTK 2 + Metacity, solid), Jewbuntu-Classic icons
#                                       (PNG), wallpapers, Inter, GNOME 2.20 defaults and panel
#                                       layout, login screen, splash, welcome page
#   jewbuntu-web-tools_*_i386.deb      current Lynx and curl in /opt/jewbuntu (ci/gutsy-tools-build.sh)
# Needs: ci/gutsy-unpack.sh (Docker volume jewbuntu-gutsy), ci/gutsy-tools-build.sh, the Arch
# skin and icon packages (ci/arch32-build.sh; the solid skin and the icons are the same files),
# and the Inter 4.1 zip.
# usage: ci/gutsy-build-debs.sh [SKIN_PKG ICONS_PKG INTER_ZIP]
# Docs: docs/gutsy.md
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/gutsy"
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
SKIN_PKG="${1:-$(ls -t "$ROOT"/dist/arch32/jewbuntu-skin-*.pkg.tar.zst | head -1)}"
ICONS_PKG="${2:-$(ls -t "$ROOT"/dist/arch32/jewbuntu-icons-*.pkg.tar.zst | head -1)}"
INTER_ZIP="${3:-$OUT/sources/Inter-4.1.zip}"
INTER_SHA=9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e
VERSION="$(cat "$ROOT/packaging/gutsy/version.txt")"
mkdir -p "$OUT/sources"
[ -f "$INTER_ZIP" ] || curl -fsSL -o "$INTER_ZIP" https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip
got="$(shasum -a 256 "$INTER_ZIP" 2>/dev/null || sha256sum "$INTER_ZIP")"
[ "${got%% *}" = "$INTER_SHA" ] || { echo "Inter zip checksum mismatch" >&2; exit 1; }
[ -f "$OUT/opt-jewbuntu.tar.gz" ] || { echo "run ci/gutsy-tools-build.sh first" >&2; exit 1; }

docker build -q -t jewbuntu-gutsy-tools -f "$ROOT/ci/Dockerfile.gutsy-tools" "$ROOT/ci" >/dev/null
IN="$(mktemp -d)"
cp "$SKIN_PKG" "$IN/skin.pkg.tar.zst"; cp "$ICONS_PKG" "$IN/icons.pkg.tar.zst"; cp "$INTER_ZIP" "$IN/inter.zip"
cp -R "$ROOT/../jewbuntu-skin/wallpaper" "$IN/wallpaper"

docker run --rm -e VERSION="$VERSION" -v jewbuntu-gutsy:/work:ro -v "$IN:/in:ro" \
  -v "$ROOT/packaging:/pkg:ro" -v "$OUT:/out" jewbuntu-gutsy-tools sh -euc '
  R=/work/rootfs G=/pkg/gutsy B=/build
  mkdir -p $B/skin $B/icons && cd $B
  tar --zstd -xf /in/skin.pkg.tar.zst -C $B/skin
  tar --zstd -xf /in/icons.pkg.tar.zst -C $B/icons
  mkdir -p /usr/share/fonts/truetype/inter
  unzip -q -j /in/inter.zip "extras/ttf/Inter-Regular.ttf" "extras/ttf/Inter-Italic.ttf" \
      "extras/ttf/Inter-Bold.ttf" "extras/ttf/Inter-BoldItalic.ttf" "LICENSE.txt" -d $B/inter
  cp $B/inter/*.ttf /usr/share/fonts/truetype/inter/ && fc-cache -f >/dev/null

  ### jewbuntu-classic-desktop
  D=$B/desktop; mkdir -p $D/DEBIAN
  # Themes: only what GNOME 2.20 reads (GTK 2 and Metacity); Ubuntu 7.10 has no GTK 3/4.
  for v in Light Dark; do
    t=Jewbuntu-$v-solid
    mkdir -p $D/usr/share/themes/$t
    cp -a $B/skin/usr/share/themes/$t/index.theme $B/skin/usr/share/themes/$t/gtk-2.0 \
          $B/skin/usr/share/themes/$t/metacity-1 $D/usr/share/themes/$t/
    python3 $G/gtk2-compat.py $D/usr/share/themes/$t/gtk-2.0   # GTK 2.12 / murrine 0.53
  done
  # Icons: names used on 7.10, as PNG.
  cd $R/usr/share/icons
  find gnome Human hicolor Tangerine \( -name "*.png" -o -name "*.svg" -o -name "*.xpm" \) -printf "%f\n" \
    | sed "s/\.[a-z]*\$//" > $B/names
  grep -h "^Icon=" $R/usr/share/applications/*.desktop $R/usr/share/applications/*/*.desktop \
      $R/usr/share/desktop-directories/*.directory 2>/dev/null | sed "s/^Icon=//; s#.*/##; s/\.[a-z]*\$//" >> $B/names
  echo web-browser >> $B/names
  sort -u -o $B/names $B/names
  cd gnome && find . -type l -printf "%f %l %P\n" \
    | awk "{n=\$1; sub(/\.[a-z]+\$/,\"\",n); t=\$2; sub(/.*\//,\"\",t); sub(/\.[a-z]+\$/,\"\",t); split(\$3,a,\"/\"); print n, t, a[2]}" \
    | sort -u > $B/aliases
  I=$D/usr/share/icons/Jewbuntu-Classic; mkdir -p $I
  python3 $G/make-icons.py $B/names $B/aliases $B/icons/usr/share/icons/Jewbuntu \
      $B/icons/usr/share/icons/Jewbuntu-light $I start-here=/pkg/arch32/jewbuntu-menu.svg \
      distributor-logo=/pkg/arch32/jewbuntu-menu.svg gnome-main-menu=/pkg/arch32/jewbuntu-menu.svg
  install -D -m644 $B/icons/usr/share/icons/Jewbuntu/COPYING $D/usr/share/doc/jewbuntu-classic-desktop/COPYING.icons

  # Wallpapers at 1280x960: enough for screens of the time, quick to decode on old CPUs.
  W=$D/usr/share/backgrounds/jewbuntu; mkdir -p $W
  for s in Jewbuntu-day.jpeg Jewbuntu-night.jpeg Jewbuntu-star-blue.png Jewbuntu-star-purple.png; do
    convert /in/wallpaper/$s -resize 1280x960^ -gravity center -extent 1280x960 -quality 88 \
      -interlace none $W/${s%.*}.jpg
  done
  mkdir -p $D/usr/share/gnome-background-properties
  { echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"; echo "<!DOCTYPE wallpapers SYSTEM \"gnome-wp-list.dtd\">"; echo "<wallpapers>"
    for n in Jewbuntu-star-blue Jewbuntu-star-purple Jewbuntu-day Jewbuntu-night; do
      printf "  <wallpaper>\n    <name>%s</name>\n    <filename>/usr/share/backgrounds/jewbuntu/%s.jpg</filename>\n    <options>zoom</options>\n    <shade_type>solid</shade_type>\n    <pcolor>#5b86d6</pcolor>\n    <scolor>#5b86d6</scolor>\n  </wallpaper>\n" "$(echo $n | tr - " ")" $n
    done; echo "</wallpapers>"; } > $D/usr/share/gnome-background-properties/jewbuntu-classic.xml

  # Fonts.
  install -d $D/usr/share/fonts/truetype/inter
  install -m644 $B/inter/*.ttf $D/usr/share/fonts/truetype/inter/
  install -D -m644 $B/inter/LICENSE.txt $D/usr/share/doc/jewbuntu-classic-desktop/LICENSE.Inter

  # GNOME defaults and panel layout (derived from Ubuntu'"'"'s own, which stays untouched).
  install -D -m644 $G/gconf/20_jewbuntu-classic $D/usr/share/gconf/defaults/20_jewbuntu-classic
  python3 $G/make-panel.py $R/usr/share/gconf/defaults/05_panel-default-setup.entries \
      $D/usr/share/gconf/defaults/30_jewbuntu-panel.entries

  # Splash, login screen.
  mkdir -p $D/usr/share/pixmaps/splash
  rsvg-convert $G/artwork/splash.svg -o $D/usr/share/pixmaps/splash/jewbuntu-splash.png
  T=$D/usr/share/gdm/themes/Jewbuntu; mkdir -p $T
  cp $G/gdm-theme/GdmGreeterTheme.desktop $G/gdm-theme/Jewbuntu.xml $T/
  cp $G/artwork/gdm-box.svg $T/box.svg; cp $G/artwork/gdm-entry.svg $T/entry.svg; cp $G/artwork/gdm-bar.svg $T/bar.svg
  convert /in/wallpaper/Jewbuntu-star-blue.png -resize 1024x768^ -gravity center -extent 1024x768 -quality 88 $T/background.jpg
  convert $T/background.jpg -resize 240x180 $T/screenshot.png
  cp $I/16x16/apps/preferences-desktop-locale.png $T/icon-language.png
  cp $I/16x16/apps/gnome-session.png $T/icon-session.png
  cp $I/16x16/actions/system-log-out.png $T/icon-options.png

  # Boot splash (ci/gutsy-usplash.sh), if built.
  if [ -f /out/usplash/jewbuntu-classic-usplash.so ]; then
    install -D -m644 /out/usplash/jewbuntu-classic-usplash.so $D/usr/lib/usplash/jewbuntu-classic.so
  fi

  # Readable Hebrew in fixed-width text (fontconfig 2.4 reads /etc/fonts/conf.d directly).
  install -D -m644 $G/fontconfig/65-jewbuntu-classic-hebrew.conf $D/etc/fonts/conf.d/65-jewbuntu-classic-hebrew.conf
  echo /etc/fonts/conf.d/65-jewbuntu-classic-hebrew.conf > $D/DEBIAN/conffiles

  # Menu entries, welcome page.
  install -D -m644 $G/welcome.html $D/usr/share/jewbuntu-classic/welcome.html
  install -D -m644 $G/jewbuntu-welcome.desktop $D/usr/share/applications/jewbuntu-welcome.desktop

  SIZE=$(du -sk $D/usr | cut -f1)
  cat > $D/DEBIAN/control <<CTL
Package: jewbuntu-classic-desktop
Version: $VERSION
Architecture: all
Maintainer: Jewbuntu Developers <maintainers@jewbuntu.invalid>
Installed-Size: $SIZE
Depends: gtk2-engines-murrine, gtk2-engines-pixbuf, culmus, gconf2
Recommends: jewbuntu-web-tools
Section: gnome
Priority: optional
Homepage: https://github.com/rhecht/jewbuntu
Description: Jewbuntu look for Ubuntu 7.10 (Jewbuntu Classic)
 Jewbuntu Skin (solid GTK 2 and Metacity theme), Jewbuntu-Classic icons, Star of David
 wallpapers, the Inter font, a Mac-inspired GNOME panel layout with a dock, English and
 Hebrew keyboard layouts (Alt+Shift), a Jewbuntu login screen and a welcome page.
 Settings come in through /usr/share/gconf/defaults, so each user can still change them.
CTL
  cat > $D/DEBIAN/postinst <<"SH"
#!/bin/sh
set -e
if [ "$1" = configure ]; then
  [ -x /usr/sbin/update-gconf-defaults ] && update-gconf-defaults
  [ -x /usr/bin/gtk-update-icon-cache ] && gtk-update-icon-cache -f -q -t /usr/share/icons/Jewbuntu-Classic || true
  [ -x /usr/bin/fc-cache ] && fc-cache -f /usr/share/fonts/truetype/inter || true
  if [ -f /usr/lib/usplash/jewbuntu-classic.so ]; then
    # Higher priority than the Ubuntu theme (10), so the alternative picks it in auto mode.
    update-alternatives --install /usr/lib/usplash/usplash-artwork.so usplash-artwork.so \
      /usr/lib/usplash/jewbuntu-classic.so 60
    update-initramfs -u 2>/dev/null || true
  fi
fi
exit 0
SH
  cat > $D/DEBIAN/postrm <<"SH"
#!/bin/sh
set -e
if [ "$1" = remove ] || [ "$1" = purge ]; then
  [ -x /usr/sbin/update-gconf-defaults ] && update-gconf-defaults || true
  rm -f /usr/share/icons/Jewbuntu-Classic/icon-theme.cache
  if [ "$1" = remove ]; then
    update-alternatives --remove usplash-artwork.so /usr/lib/usplash/jewbuntu-classic.so 2>/dev/null || true
    update-initramfs -u 2>/dev/null || true
  fi
  rmdir /usr/share/icons/Jewbuntu-Classic 2>/dev/null || true
fi
exit 0
SH
  chmod 755 $D/DEBIAN/postinst $D/DEBIAN/postrm
  find $D -type d -exec chmod 755 {} +

  ### jewbuntu-web-tools
  T=$B/webtools; mkdir -p $T/DEBIAN $T/usr/bin
  tar -xzf /out/opt-jewbuntu.tar.gz -C $T
  ln -s /opt/jewbuntu/bin/lynx $T/usr/bin/lynx
  install -D -m644 $G/jewbuntu-lynx.desktop $T/usr/share/applications/jewbuntu-lynx.desktop
  SIZE=$(du -sk $T/opt $T/usr | awk "{s+=\$1} END {print s}")
  cat > $T/DEBIAN/control <<CTL
Package: jewbuntu-web-tools
Version: $VERSION
Architecture: i386
Maintainer: Jewbuntu Developers <maintainers@jewbuntu.invalid>
Installed-Size: $SIZE
Conflicts: lynx
Replaces: lynx
Provides: lynx, www-browser
Section: web
Priority: optional
Homepage: https://github.com/rhecht/jewbuntu
Description: Current Lynx and curl for Ubuntu 7.10 (Jewbuntu Classic)
 Ubuntu 7.10 can no longer open most HTTPS sites: its OpenSSL only speaks TLS 1.0. This
 package adds Lynx 2.9.3 (text web browser) and curl 8.23.0, statically built with OpenSSL
 3.5 (TLS 1.2 and 1.3) and musl for plain i686 CPUs, with Mozilla'"'"'s current list of
 certificate authorities. Everything lives in /opt/jewbuntu; /usr/bin/lynx points there.
CTL
  find $T -type d -exec chmod 755 {} +

  mkdir -p /out/debs; rm -f /out/debs/jewbuntu-classic-desktop_*.deb /out/debs/jewbuntu-web-tools_*.deb
  dpkg-deb -Zgzip --root-owner-group -b $D /out/debs/jewbuntu-classic-desktop_${VERSION}_all.deb >/dev/null
  dpkg-deb -Zgzip --root-owner-group -b $T /out/debs/jewbuntu-web-tools_${VERSION}_i386.deb >/dev/null
  ls -la /out/debs'
rm -rf "$IN"
