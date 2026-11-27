#!/bin/sh
# Jewbuntu @VERSION@ skin for @TITLE@.
# Adds the Jewbuntu touches to an existing desktop. The distribution itself is not changed, and
# keeps getting its own updates:
#   - a Star of David as the start-menu button on the panel
#   - the blue Star of David wallpaper on the desktop and the login screen
#   - the short Jewbuntu jingle when you sign in (can be switched off)
#   - ShulGo's minyan widget in the panel
#
#   sh @RUNNAME@              install (asks first)
#   sh @RUNNAME@ --yes        install without questions
#   sh @RUNNAME@ --no-shulgo  install without the ShulGo widget
#   sh @RUNNAME@ --uninstall  remove the Jewbuntu packages again
#   sh @RUNNAME@ --list       show the packages inside
#   sh @RUNNAME@ --extract DIR   unpack the .debs only
set -eu
JB_VERSION="@VERSION@"
JB_FLAVOR="@FLAVOR@"
PAYLOAD_SHA256="@PAYLOAD_SHA256@"
YES=0; SHULGO=1; MODE=install; EXTRACT_DIR=
while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) YES=1 ;;
    --no-shulgo) SHULGO=0 ;;
    --uninstall) MODE=uninstall ;;
    --list) MODE=list ;;
    --extract) MODE=extract; EXTRACT_DIR="${2:?--extract needs a directory}"; shift ;;
    --help|-h) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

say() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mError:\033[0m %s\n' "$*" >&2; exit 1; }
ask() { [ "$YES" = 1 ] && return 0; printf '%s [Y/n] ' "$1"; read -r a </dev/tty || a=n; case "$a" in ''|y|Y|yes) return 0 ;; *) return 1 ;; esac; }
installed() { dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "ok installed"; }

case "$JB_FLAVOR" in
  lubuntu)   PKGS="jewbuntu-lubuntu shulgo-xfce jewbuntu-branding jewbuntu-core"
             NAME="Lubuntu"; NEED=lxqt-panel ;;
  lubuntu18) PKGS="jewbuntu-lubuntu-lxde shulgo-xfce"
             NAME="Lubuntu 18.04"; NEED=lxpanel ;;
  mint)      PKGS="jewbuntu-mint shulgo-xfce"
             NAME="Linux Mint (Cinnamon)"; NEED=cinnamon ;;
  *) die "unknown edition $JB_FLAVOR" ;;
esac

if [ "$(id -u)" = 0 ]; then SUDO=""; else
  command -v sudo >/dev/null || die "sudo is needed to install packages."
  SUDO="sudo"
fi
FRONT="${DEBIAN_FRONTEND:-}"; [ "$YES" = 1 ] && FRONT=noninteractive

if [ "$MODE" = uninstall ]; then
  ask "Remove the Jewbuntu skin from $NAME? ($NAME's own look comes back; your files stay.)" || { echo "Nothing was changed."; exit 0; }
  # Your own panel layout gets Lubuntu's menu button back first (this part runs as you).
  if [ "$JB_FLAVOR" = lubuntu ] && [ -n "$SUDO" ] && command -v jewbuntu-lubuntu-session >/dev/null; then
    jewbuntu-lubuntu-session --undo >/dev/null 2>&1 || true
  fi
  if [ "$JB_FLAVOR" = mint ] && [ -n "$SUDO" ] && command -v jewbuntu-mint-session >/dev/null; then
    jewbuntu-mint-session --undo >/dev/null 2>&1 || true
  fi
  REMOVE=""
  for p in $PKGS; do installed "$p" && REMOVE="$REMOVE $p"; done
  [ -n "$REMOVE" ] || { say "No Jewbuntu packages are installed."; exit 0; }
  [ -n "$SUDO" ] && say "Your password is needed to remove packages."
  $SUDO env DEBIAN_FRONTEND="$FRONT" apt-get -o DPkg::Lock::Timeout=600 remove -y $REMOVE || die "removal did not finish; try: sudo apt remove$REMOVE"
  cat <<EOF

  The Jewbuntu skin is removed. Log out and back in to see $NAME's own menu
  button and wallpaper again. Your files are not touched.

EOF
  exit 0
fi

# Unpack and verify the payload (everything after the marker line).
TMP="$(mktemp -d /tmp/jewbuntu-installer.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT INT TERM
LINE=$(awk '/^__JEWBUNTU_PAYLOAD_BELOW__$/ { print NR + 1; exit }' "$0")
tail -n +"$LINE" "$0" > "$TMP/payload.tar"
echo "$PAYLOAD_SHA256  $TMP/payload.tar" | sha256sum -c --quiet - 2>/dev/null \
  || die "this installer file is damaged or incomplete; download it again."
tar -xf "$TMP/payload.tar" -C "$TMP"; rm "$TMP/payload.tar"
(cd "$TMP/jewbuntu/debs" && sha256sum -c --quiet ../SHA256SUMS) || die "a package failed its checksum."
DEBS="$TMP/jewbuntu/debs"

case "$MODE" in
  list) ls "$DEBS"; exit 0 ;;
  extract) mkdir -p "$EXTRACT_DIR"; cp "$DEBS"/*.deb "$TMP/jewbuntu/SHA256SUMS" "$EXTRACT_DIR/"; say "Packages copied to $EXTRACT_DIR"; exit 0 ;;
esac

# Checks: this is a skin, so the desktop it dresses has to be there.
command -v dpkg-query >/dev/null || die "this installer is for $NAME; this computer has no dpkg."
if ! installed "$NEED" && ! { [ "$NEED" = cinnamon ] && installed cinnamon-core; }; then
  case "$JB_FLAVOR" in
    lubuntu) die "Lubuntu's LXQt desktop (lxqt-panel) isn't installed here. This installer is for Lubuntu 22.04 or newer; for Lubuntu 18.04 use the lubuntu18 installer." ;;
    lubuntu18) die "Lubuntu 18.04's LXDE desktop (lxpanel) isn't installed here. For newer Lubuntu use the lubuntu installer." ;;
    mint) die "The Cinnamon desktop isn't installed here. This installer is for Linux Mint, Cinnamon edition." ;;
  esac
fi
if [ "$JB_FLAVOR" = lubuntu ]; then
  python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null \
    || die "this Lubuntu is too old for this installer (it needs Lubuntu 22.04 or newer). For Lubuntu 18.04 use the lubuntu18 installer."
fi
ARCH="$(dpkg --print-architecture)"

cat <<EOF

  Jewbuntu $JB_VERSION for $NAME ($ARCH)
  ------------------------------------
  This adds to your desktop:
    - a Star of David as the start-menu button on the panel
    - the blue Star of David wallpaper on the desktop and login screen
      (only where the default picture was; a wallpaper you chose yourself
      is kept)
    - the short Jewbuntu jingle when you sign in
EOF
[ "$SHULGO" = 1 ] && echo "    - ShulGo's minyan widget in the panel (you link it to ShulGo from its menu)"
cat <<EOF
  Nothing is removed and your files are not touched.

EOF
ask "Install the Jewbuntu skin now?" || { echo "Nothing was changed."; exit 0; }

chmod 755 "$TMP" "$TMP/jewbuntu" "$DEBS"; chmod 644 "$DEBS"/*.deb
[ "$SHULGO" = 1 ] || rm -f "$DEBS"/shulgo-xfce_*.deb
[ -n "$SUDO" ] && say "Your password is needed to install packages."
say "Refreshing package lists…"
$SUDO apt-get -o DPkg::Lock::Timeout=600 update -q || die "could not reach the package servers; check the internet connection."
say "Installing…"
$SUDO env DEBIAN_FRONTEND="$FRONT" apt-get -o DPkg::Lock::Timeout=600 install -y "$DEBS"/*.deb \
  || die "the installation did not finish. Run 'sudo apt -f install' and then run this installer again."

# Start ShulGo now in a running session rather than at the next sign-in (as you, like autostart).
if [ "$SHULGO" = 1 ] && [ -n "$SUDO" ] && [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] && command -v shulgo-xfce >/dev/null; then
  pgrep -u "$(id -u)" -f shulgo_xfce >/dev/null || (setsid shulgo-xfce >/dev/null 2>&1 &)
fi

cat <<EOF

  The Jewbuntu skin is installed. Log out and back in to see the
  Star of David menu button and wallpaper.
EOF
[ "$SHULGO" = 1 ] && echo "  - ShulGo: click its icon in the panel, then Link this computer, and approve the code on your phone at shulgo.com/link."
case "$JB_FLAVOR" in
  lubuntu|lubuntu18) echo "  - Lynx: a light text web browser, under Internet > Lynx Web Browser (Firefox is still there)." ;;
esac
case "$JB_FLAVOR" in
  lubuntu) echo "  - Jingle: 'jewbuntu startup-sound off' turns it off." ;;
  lubuntu18) echo "  - Jingle: 'jewbuntu-startup-sound off' turns it off." ;;
  mint) echo "  - Jingle: it is Cinnamon's sign-in sound now; System Settings > Sounds turns it off." ;;
esac
cat <<EOF
  - Remove: sh $(basename "$0") --uninstall   (your files are kept)

EOF
exit 0
__JEWBUNTU_PAYLOAD_BELOW__
