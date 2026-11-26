#!/bin/sh
# Build the Jewbuntu skins for Lubuntu and Linux Mint (all Architecture: all) into OUTDIR:
#   jewbuntu-lubuntu       Lubuntu 26.10 / 27.04 (LXQt): Star of David menu button, wallpaper and
#                          login-screen picture; the jingle comes from jewbuntu-branding
#   jewbuntu-lubuntu-lxde  Lubuntu 18.04 (LXDE, the last 32-bit Ubuntu): the same touches and its
#                          own small jingle player (18.04's Python 3.6 is too old for jewbuntu-core)
#   jewbuntu-mint          Linux Mint 22 (Cinnamon): Cinnamon defaults only (gschema override)
#   shulgo-xfce            ShulGo's GTK3 tray widget from the public rhecht/shulgo-widgets mirror at
#                          SHULGO_COMMIT, with dependencies that 18.04 can meet too
# usage: ci/flavors-build.sh VERSION SHULGO_COMMIT [OUTDIR]
#   e.g. ci/flavors-build.sh 0.1.0~m1.29 9dd4d71 dist/flavors
# Needs Docker, gh, and dist/m1.29 (jewbuntu-branding, for the rendered jingle).
set -eu
BASEVER="$1"; SHULGO="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${3:-$ROOT/dist/flavors}"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
SKIN="${SKIN:-$ROOT/../jewbuntu-skin}"
BRANDING="$(ls "$ROOT"/dist/m1.29/jewbuntu-branding_*_all.deb | head -1)"
IMAGE=jewbuntu-gutsy-tools
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
F="$ROOT/packaging/flavors"
docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -q -t "$IMAGE" -f "$ROOT/ci/Dockerfile.gutsy-tools" "$ROOT/ci" >/dev/null

mkdir -p "$TMP/walls"
git -C "$SKIN" show HEAD:wallpaper/Jewbuntu-star-blue.png > "$TMP/walls/jewbuntu-star-blue.png"
git -C "$SKIN" show HEAD:wallpaper/Jewbuntu-star-purple.png > "$TMP/walls/jewbuntu-star-purple.png"
cp "$BRANDING" "$TMP/branding.deb"

copyright() {
  cat <<EOF
Jewbuntu skin for $1. https://jewbuntu.com
Star of David icon, scripts and settings: Jewbuntu Developers, original work.
Wallpapers: from github.com/rhecht/jewbuntu-skin (owner-supplied; licence to be confirmed).
Jingle: Jewbuntu's 8-bit arrangement of the traditional melody "Hava Nagila" (see jewbuntu-branding).
EOF
}

# --- jewbuntu-lubuntu (LXQt)
P="$TMP/jewbuntu-lubuntu"; S="$F/lubuntu"
install -d "$P/DEBIAN" "$P/usr/bin" "$P/usr/lib/jewbuntu/lubuntu" "$P/etc/xdg/autostart" \
  "$P/usr/share/jewbuntu/lubuntu" "$P/usr/share/backgrounds/jewbuntu" "$P/usr/share/lubuntu/wallpapers" \
  "$P/usr/share/sddm/themes/lubuntu" "$P/usr/share/doc/jewbuntu-lubuntu"
sed "s/@VERSION@/$BASEVER+lubuntu1/" "$S/control.in" > "$P/DEBIAN/control"
install -m755 "$S/preinst" "$S/postinst" "$S/postrm" "$P/DEBIAN/"
install -m644 "$S/triggers" "$P/DEBIAN/"
echo /etc/xdg/autostart/jewbuntu-lubuntu.desktop > "$P/DEBIAN/conffiles"
install -m755 "$S/jewbuntu-lubuntu-session" "$P/usr/bin/"
install -m755 "$S/panel-icon" "$P/usr/lib/jewbuntu/lubuntu/"
install -m644 "$S/jewbuntu-lubuntu.desktop" "$P/etc/xdg/autostart/"
install -m644 "$F/common/jewbuntu-start.svg" "$P/usr/share/jewbuntu/lubuntu/"
install -m644 "$TMP/walls/"*.png "$P/usr/share/backgrounds/jewbuntu/"
ln -s /usr/share/backgrounds/jewbuntu/jewbuntu-star-blue.png "$P/usr/share/lubuntu/wallpapers/lubuntu-default-wallpaper.png"
ln -s /usr/share/backgrounds/jewbuntu/jewbuntu-star-blue.png "$P/usr/share/sddm/themes/lubuntu/wall.png"
copyright "Lubuntu (LXQt)" > "$P/usr/share/doc/jewbuntu-lubuntu/copyright"

# --- jewbuntu-lubuntu-lxde (18.04)
P="$TMP/jewbuntu-lubuntu-lxde"; S="$F/lubuntu-lxde"
install -d "$P/DEBIAN" "$P/usr/bin" "$P/etc/xdg/autostart" "$P/usr/share/jewbuntu/lubuntu" \
  "$P/usr/share/jewbuntu/sounds" "$P/usr/share/backgrounds/jewbuntu" "$P/usr/share/lubuntu/wallpapers" \
  "$P/usr/share/lubuntu/images" "$P/usr/share/doc/jewbuntu-lubuntu-lxde"
sed "s/@VERSION@/$BASEVER+lubuntu18.1/" "$S/control.in" > "$P/DEBIAN/control"
install -m755 "$S/preinst" "$S/postrm" "$P/DEBIAN/"
echo /etc/xdg/autostart/jewbuntu-startup-sound.desktop > "$P/DEBIAN/conffiles"
install -m755 "$S/jewbuntu-startup-sound" "$P/usr/bin/"
install -m644 "$S/jewbuntu-startup-sound.desktop" "$P/etc/xdg/autostart/"
install -m644 "$F/common/jewbuntu-start.svg" "$P/usr/share/jewbuntu/lubuntu/"
install -m644 "$TMP/walls/"*.png "$P/usr/share/backgrounds/jewbuntu/"
ln -s /usr/share/backgrounds/jewbuntu/jewbuntu-star-blue.png "$P/usr/share/lubuntu/wallpapers/lubuntu-default-wallpaper.png"
ln -s /usr/share/jewbuntu/lubuntu/jewbuntu-start-48.png "$P/usr/share/lubuntu/images/lubuntu-logo.png"
copyright "Lubuntu 18.04 (LXDE)" > "$P/usr/share/doc/jewbuntu-lubuntu-lxde/copyright"

# --- jewbuntu-mint (Cinnamon)
P="$TMP/jewbuntu-mint"; S="$F/mint"
install -d "$P/DEBIAN" "$P/usr/bin" "$P/etc/xdg/autostart" "$P/usr/share/glib-2.0/schemas" "$P/usr/share/backgrounds/jewbuntu" \
  "$P/usr/share/cinnamon-background-properties" "$P/usr/share/icons/hicolor/scalable/apps" \
  "$P/usr/share/sounds/jewbuntu" "$P/usr/share/doc/jewbuntu-mint"
sed "s/@VERSION@/$BASEVER+mint2/" "$S/control.in" > "$P/DEBIAN/control"
install -m755 "$S/preinst" "$S/postinst" "$S/postrm" "$P/DEBIAN/"
install -m644 "$S/triggers" "$P/DEBIAN/"
echo /etc/xdg/autostart/jewbuntu-mint.desktop > "$P/DEBIAN/conffiles"
install -m755 "$S/jewbuntu-mint-session" "$P/usr/bin/"
install -m644 "$S/jewbuntu-mint.desktop" "$P/etc/xdg/autostart/"
install -m644 "$S/zz_jewbuntu-mint.gschema.override" "$P/usr/share/glib-2.0/schemas/"
install -m644 "$S/jewbuntu.xml" "$P/usr/share/cinnamon-background-properties/"
install -m644 "$F/common/jewbuntu-start.svg" "$F/common/jewbuntu-start-symbolic.svg" "$P/usr/share/icons/hicolor/scalable/apps/"
install -m644 "$TMP/walls/"*.png "$P/usr/share/backgrounds/jewbuntu/"
copyright "Linux Mint (Cinnamon)" > "$P/usr/share/doc/jewbuntu-mint/copyright"

# --- shulgo-xfce
curl -fsSL "https://codeload.github.com/rhecht/shulgo-widgets/tar.gz/$SHULGO" -o "$TMP/sg.tar.gz"
mkdir -p "$TMP/sgsrc"; tar -xzf "$TMP/sg.tar.gz" -C "$TMP/sgsrc"
SRC="$(ls -d "$TMP"/sgsrc/shulgo-widgets-*/shulgo-xfce)"
SGVER="$(sed -n 's/^pkgver=//p' "$SRC/packaging/PKGBUILD")"
WHEN="$(gh api "repos/rhecht/shulgo-widgets/commits/$SHULGO" --jq .commit.committer.date | tr -d -- '-:TZ' | cut -c1-12)"
SHORT="$(gh api "repos/rhecht/shulgo-widgets/commits/$SHULGO" --jq .sha | cut -c1-7)"
G="$TMP/shulgo-xfce"
install -d "$G/DEBIAN" "$G/usr/lib/shulgo-xfce/shulgo_xfce" "$G/usr/bin" "$G/usr/share/applications" \
  "$G/etc/xdg/autostart" "$G/usr/share/icons/hicolor/scalable/apps" "$G/usr/share/doc/shulgo-xfce"
install -m644 "$SRC"/shulgo_xfce/*.py "$G/usr/lib/shulgo-xfce/shulgo_xfce/"
install -m755 "$SRC/bin/shulgo-xfce" "$SRC/bin/shulgo-bar" "$G/usr/bin/"
install -m644 "$SRC/packaging/shulgo-xfce.desktop" "$G/usr/share/applications/"
install -m644 "$SRC/packaging/shulgo-xfce-autostart.desktop" "$G/etc/xdg/autostart/shulgo-xfce.desktop"
install -m644 "$SRC/packaging/shulgo.svg" "$G/usr/share/icons/hicolor/scalable/apps/"
install -m644 "$SRC/README.md" "$G/usr/share/doc/shulgo-xfce/"
echo /etc/xdg/autostart/shulgo-xfce.desktop > "$G/DEBIAN/conffiles"
cat > "$G/DEBIAN/control" <<EOF
Package: shulgo-xfce
Version: $SGVER.r$WHEN
Architecture: all
Maintainer: ShulGo <info@shulgo.com>
Section: utils
Priority: optional
Depends: python3, python3-gi, gir1.2-gtk-3.0, gir1.2-ayatanaappindicator3-0.1 | gir1.2-appindicator3-0.1, gir1.2-dbusmenu-gtk3-0.4
Homepage: https://shulgo.com
Description: The next minyan near you in the tray, with today's zmanim, from ShulGo
 GTK3 tray widget (StatusNotifierItem, with an XEmbed fallback). Built for
 Jewbuntu on Lubuntu and Linux Mint from github.com/rhecht/shulgo-widgets at
 $SHORT.
EOF

chmod -R a+rX "$TMP"
docker run --rm -v "$TMP:/w" -v "$OUT:/out" "$IMAGE" sh -euc '
  command -v oggenc >/dev/null || { apt-get update -qq >/dev/null 2>&1; DEBIAN_FRONTEND=noninteractive apt-get install -y -qq vorbis-tools >/dev/null 2>&1; }
  mkdir -p /tmp/br && cd /tmp/br && ar x /w/branding.deb && tar --zstd -xf data.tar.zst ./usr/share/jewbuntu/sounds/jewbuntu-startup.wav
  WAV=/tmp/br/usr/share/jewbuntu/sounds/jewbuntu-startup.wav
  install -m644 $WAV /w/jewbuntu-lubuntu-lxde/usr/share/jewbuntu/sounds/
  oggenc -Q -q 6 -o /w/jewbuntu-mint/usr/share/sounds/jewbuntu/jewbuntu-startup.oga $WAV
  chmod 644 /w/jewbuntu-mint/usr/share/sounds/jewbuntu/jewbuntu-startup.oga
  rsvg-convert -w 48 -h 48 /w/jewbuntu-lubuntu-lxde/usr/share/jewbuntu/lubuntu/jewbuntu-start.svg \
    -o /w/jewbuntu-lubuntu-lxde/usr/share/jewbuntu/lubuntu/jewbuntu-start-48.png
  chmod 644 /w/jewbuntu-lubuntu-lxde/usr/share/jewbuntu/lubuntu/jewbuntu-start-48.png
  file /w/jewbuntu-mint/usr/share/sounds/jewbuntu/*.oga /w/jewbuntu-lubuntu-lxde/usr/share/jewbuntu/lubuntu/*.png
  for p in jewbuntu-lubuntu jewbuntu-lubuntu-lxde jewbuntu-mint shulgo-xfce; do
    rm -f /out/${p}_*.deb
    dpkg-deb --root-owner-group -Zxz --build /w/$p /out/ >/dev/null
  done
  ls -la /out/*.deb'
