#!/bin/sh
# Jewbuntu @VERSION@ skin for Cutefish (Debian 13, amd64 and arm64).
# Adds the Jewbuntu touches to an existing Cutefish desktop. Cutefish itself is not changed, and
# keeps getting Cutefish's and Debian's updates:
#   - a Star of David as the dock's Launchpad ("start") button
#   - Star of David wallpapers: blue in light mode, purple in dark mode
#   - the short Jewbuntu jingle when you sign in (once per boot; can be switched off)
#   - ShulGo's minyan widget in the top bar
#
#   sh jewbuntu-cutefish-installer-@VERSION@.run              install (asks first)
#   sh jewbuntu-cutefish-installer-@VERSION@.run --yes        install without questions
#   sh jewbuntu-cutefish-installer-@VERSION@.run --no-shulgo  install without the ShulGo widget
#   sh jewbuntu-cutefish-installer-@VERSION@.run --uninstall  remove the Jewbuntu packages again
#   sh jewbuntu-cutefish-installer-@VERSION@.run --list       show the packages inside
#   sh jewbuntu-cutefish-installer-@VERSION@.run --extract DIR   unpack the .debs only
set -eu
JB_VERSION="@VERSION@"
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

if [ "$(id -u)" = 0 ]; then SUDO=""; else
  command -v sudo >/dev/null || die "sudo is needed to install packages."
  SUDO="sudo"
fi
FRONT="${DEBIAN_FRONTEND:-}"; [ "$YES" = 1 ] && FRONT=noninteractive

if [ "$MODE" = uninstall ]; then
  ask "Remove the Jewbuntu skin from Cutefish? (Cutefish's own Launchpad button comes back; your files stay.)" || { echo "Nothing was changed."; exit 0; }
  PKGS=""
  for p in jewbuntu-cutefish shulgo-xfce jewbuntu-branding jewbuntu-core; do
    dpkg-query -W -f='${Status}' "$p" 2>/dev/null | grep -q "ok installed" && PKGS="$PKGS $p"
  done
  [ -n "$PKGS" ] || { say "No Jewbuntu packages are installed."; exit 0; }
  [ -n "$SUDO" ] && say "Your password is needed to remove packages."
  $SUDO env DEBIAN_FRONTEND="$FRONT" apt-get -o DPkg::Lock::Timeout=600 remove -y $PKGS || die "removal did not finish; try: sudo apt remove$PKGS"
  cat <<EOF

  The Jewbuntu skin is removed. Log out and back in to see Cutefish's own Launchpad button.
  Your wallpaper stays as it is; pick another one in Settings > Wallpaper, or (before
  removing) run 'jewbuntu-cutefish-session --undo' to go back to Cutefish's default.

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

# Checks: this is a skin for Cutefish, so Cutefish has to be there.
command -v dpkg-query >/dev/null || die "this installer is for Cutefish (Debian 13); this computer has no dpkg."
if ! dpkg-query -W -f='${Status}' cutefish-compositor 2>/dev/null | grep -q "ok installed"; then
  die "Cutefish isn't installed here. Install Cutefish first (cutefish.org: the Cutefish ISO, or on Debian 13 add Cutefish's repository and run 'sudo apt install cutefish-desktop'), then run this again."
fi
ARCH="$(dpkg --print-architecture)"
case "$ARCH" in amd64|arm64) ;; *) say "Cutefish is built for amd64 and arm64; this is $ARCH. Continuing, as nothing here is architecture-specific." ;; esac

cat <<EOF

  Jewbuntu $JB_VERSION for Cutefish ($ARCH)
  ------------------------------------
  This adds to your Cutefish desktop:
    - a Star of David as the dock's Launchpad ("start") button
    - Star of David wallpapers: blue in light mode, purple in dark mode
      (only for accounts still on Cutefish's default wallpaper; one you
      chose yourself is kept)
    - the short Jewbuntu jingle when you sign in (once per boot)
EOF
[ "$SHULGO" = 1 ] && echo "    - ShulGo's minyan widget in the top bar (you link it to ShulGo from its menu)"
cat <<EOF
  Cutefish's look is otherwise unchanged. Nothing is removed and your
  files are not touched.

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

# In a running Cutefish session, start the wallpaper helper and ShulGo now rather than at the next
# sign-in. They run as you, like the autostart entries do.
if [ -n "$SUDO" ] && [ "${XDG_CURRENT_DESKTOP:-}" = Cutefish ] && [ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  pgrep -u "$(id -u)" -f jewbuntu-cutefish-session >/dev/null || (setsid jewbuntu-cutefish-session >/dev/null 2>&1 &)
  [ "$SHULGO" = 1 ] && command -v shulgo-xfce >/dev/null && ! pgrep -u "$(id -u)" -f shulgo_xfce >/dev/null && (setsid shulgo-xfce >/dev/null 2>&1 &)
fi

cat <<EOF

  The Jewbuntu skin is installed.

  - The new Launchpad button shows after you log out and back in.
  - Wallpaper: set now (or at your next sign-in). Settings > Wallpaper lists
    both Jewbuntu wallpapers; choosing any wallpaper there is respected.
EOF
[ "$SHULGO" = 1 ] && echo "  - ShulGo: click its icon in the top bar, then Link this computer, and approve the code on your phone at shulgo.com/link."
cat <<EOF
  - Jingle: 'jewbuntu startup-sound off' turns it off.
  - Remove: sh $(basename "$0") --uninstall   (your files are kept)

EOF
exit 0
__JEWBUNTU_PAYLOAD_BELOW__
