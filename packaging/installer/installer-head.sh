#!/bin/sh
# Jewbuntu @VERSION@ installer for Ubuntu 26.04 LTS (amd64 and arm64).
# Turns an existing Ubuntu 26.04 desktop into Jewbuntu by installing Jewbuntu's packages.
# Everything else comes from Ubuntu's own archive and keeps getting Ubuntu's updates.
#
#   sh jewbuntu-installer-@VERSION@.run            install (asks before changing anything)
#   sh jewbuntu-installer-@VERSION@.run --yes      install without questions
#   sh jewbuntu-installer-@VERSION@.run --list     show the packages inside
#   sh jewbuntu-installer-@VERSION@.run --extract DIR   unpack the .debs only
#
# Options: --no-look  don't apply the Jewbuntu look to your account (new accounts get it anyway)
#          --force    install on a release other than Ubuntu 26.04 (unsupported)
# Undo: sudo apt remove 'jewbuntu-*'   (your files and settings are kept)
set -eu
JB_VERSION="@VERSION@"
PAYLOAD_SHA256="@PAYLOAD_SHA256@"
YES=0; LOOK=1; FORCE=0; MODE=install; EXTRACT_DIR=
while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) YES=1 ;;
    --no-look) LOOK=0 ;;
    --force) FORCE=1 ;;
    --list) MODE=list ;;
    --extract) MODE=extract; EXTRACT_DIR="${2:?--extract needs a directory}"; shift ;;
    --help|-h) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

say() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mError:\033[0m %s\n' "$*" >&2; exit 1; }
ask() { [ "$YES" = 1 ] && return 0; printf '%s [Y/n] ' "$1"; read -r a </dev/tty || a=n; case "$a" in ''|y|Y|yes) return 0 ;; *) return 1 ;; esac; }

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

# Checks.
# (A missing file given to "." ends the shell silently, so test first.)
[ -r /etc/os-release ] || die "this installer is for Ubuntu 26.04 LTS; this computer is running $(uname -s). Run it on the Ubuntu computer (or VM) instead."
. /etc/os-release
if [ "${ID:-}" != ubuntu ] || [ "${VERSION_ID:-}" != 26.04 ]; then
  [ "$FORCE" = 1 ] || die "Jewbuntu $JB_VERSION is for Ubuntu 26.04 LTS; this is ${PRETTY_NAME:-unknown}. (--force to try anyway; unsupported.)"
  say "Continuing on ${PRETTY_NAME:-unknown} because of --force (unsupported)."
fi
if [ "$(id -u)" = 0 ]; then
  SUDO=""; LOOK=0
else
  command -v sudo >/dev/null || die "sudo is needed to install packages."
  SUDO="sudo"
fi

cat <<EOF

  Jewbuntu $JB_VERSION
  -----------------
  This installs Jewbuntu's packages on top of your Ubuntu:
    - the Mac-style Jewbuntu desktop look (theme, icons, dock, clear top bar,
      Star of David wallpapers, matching login screen)
    - Hebrew keyboard (Super+Space switches), fonts and spell checking
    - Jewbuntu Hub: Hebrew date, zmanim, calendar (works offline)
    - Web Server app: websites on this computer, local-only by default
    - the short startup jingle (can be switched off)
  Ubuntu's own desktop packages are added if missing. Nothing is removed.
  Your files are not touched.

EOF
ask "Install Jewbuntu now?" || { echo "Nothing was changed."; exit 0; }

# apt's sandbox user must be able to read the packages.
chmod 755 "$TMP" "$TMP/jewbuntu" "$DEBS"; chmod 644 "$DEBS"/*.deb
[ -n "$SUDO" ] && say "Your password is needed to install packages."
say "Refreshing Ubuntu's package lists…"
$SUDO apt-get -o DPkg::Lock::Timeout=600 update -q || die "could not reach Ubuntu's package servers; check the internet connection."
say "Installing Jewbuntu (this can take a while)…"
FRONT="${DEBIAN_FRONTEND:-}"; [ "$YES" = 1 ] && FRONT=noninteractive
$SUDO env DEBIAN_FRONTEND="$FRONT" apt-get -o DPkg::Lock::Timeout=600 install -y "$DEBS"/*.deb \
  || die "the installation did not finish. Nothing is half-configured that apt cannot fix: run 'sudo apt -f install' and then run this installer again."

if [ "$LOOK" = 1 ] && command -v jewbuntu >/dev/null; then
  echo
  if ask "Apply the Jewbuntu look to your account now? (Your current look is backed up; 'jewbuntu skin undo' restores it.)"; then
    jewbuntu skin apply || say "Could not apply the look now; run 'jewbuntu skin apply' after logging in again."
  fi
fi

cat <<EOF

  Jewbuntu $JB_VERSION is installed.

  Next: log out and back in (or restart) to see the new desktop.
  - Jewbuntu Hub and Web Server are in the app grid.
  - 'jewbuntu doctor' checks the setup; 'jewbuntu skin undo' restores your old look.
  - Updates: download a newer installer and run it the same way.
  - Remove: sudo apt remove 'jewbuntu-*'   (your files and settings are kept)

EOF
exit 0
__JEWBUNTU_PAYLOAD_BELOW__
