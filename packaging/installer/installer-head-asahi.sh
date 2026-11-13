#!/bin/sh
# Jewbuntu @VERSION@ installer for Asahi Linux: Fedora Asahi Remix 45, GNOME edition (Apple Silicon Macs).
# Adds Jewbuntu's packages on top of Fedora. Everything else comes from Fedora's own repositories
# and keeps getting Fedora and Asahi updates. Also works on Fedora 45 Workstation (e.g. in a VM).
#
#   sh jewbuntu-asahi-installer-@VERSION@.run              install (asks before changing anything)
#   sh jewbuntu-asahi-installer-@VERSION@.run --yes        install without questions
#   sh jewbuntu-asahi-installer-@VERSION@.run --uninstall  restore your old look, remove Jewbuntu
#   sh jewbuntu-asahi-installer-@VERSION@.run --list       show the packages inside
#   sh jewbuntu-asahi-installer-@VERSION@.run --extract DIR   unpack the .rpm files only
#
# Options: --no-look  don't apply the Jewbuntu look to your account now
#          --force    install on a release other than Fedora 45 (unsupported)
# Undo by hand: jewbuntu skin undo; sudo dnf remove 'jewbuntu-*'   (your files are kept)
set -eu
JB_VERSION="@VERSION@"
PAYLOAD_SHA256="@PAYLOAD_SHA256@"
YES=0; LOOK=1; FORCE=0; MODE=install; EXTRACT_DIR=
while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) YES=1 ;;
    --no-look) LOOK=0 ;;
    --force) FORCE=1 ;;
    --uninstall|--remove) MODE=uninstall ;;
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

if [ "$(id -u)" = 0 ]; then
  SUDO=""; LOOK=0
else
  command -v sudo >/dev/null || die "sudo is needed to install packages."
  SUDO="sudo"
fi

if [ "$MODE" = uninstall ]; then
  cat <<EOF

  Remove Jewbuntu $JB_VERSION
  ---------------------------
  This puts back the look your account had before Jewbuntu (if it was applied),
  then removes every Jewbuntu package. Fedora's own look and defaults come back.
  Your files, and Jewbuntu's settings backup in ~/.local/state/jewbuntu, are kept.
  Other accounts: run 'jewbuntu skin undo' as that user first.

EOF
  ask "Remove Jewbuntu now?" || { echo "Nothing was changed."; exit 0; }
  if [ -n "$SUDO" ] && command -v jewbuntu >/dev/null; then
    jewbuntu skin undo || say "Could not restore the previous look; carrying on with the removal."
  fi
  [ -n "$SUDO" ] && say "Your password is needed to remove packages."
  $SUDO dnf remove -y 'jewbuntu-*' || die "dnf could not remove the packages; run: sudo dnf remove 'jewbuntu-*'"
  printf '\n  Jewbuntu is removed. Log out and back in to see Fedora'"'"'s desktop again.\n\n'
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
(cd "$TMP/jewbuntu/rpms" && sha256sum -c --quiet ../SHA256SUMS) || die "a package failed its checksum."
RPMS="$TMP/jewbuntu/rpms"

case "$MODE" in
  list) ls "$RPMS"; exit 0 ;;
  extract) mkdir -p "$EXTRACT_DIR"; cp "$RPMS"/*.rpm "$TMP/jewbuntu/SHA256SUMS" "$EXTRACT_DIR/"; say "Packages copied to $EXTRACT_DIR"; exit 0 ;;
esac

# Checks. (A missing file given to "." ends the shell silently, so test first.)
[ -r /etc/os-release ] || die "this installer is for Fedora Asahi Remix 45; this computer is running $(uname -s). Run it on the Asahi (or Fedora) computer instead."
. /etc/os-release
case " ${ID:-} ${ID_LIKE:-} " in *" fedora "*|*" fedora-asahi-remix "*) FEDORA=1 ;; *) FEDORA=0 ;; esac
if [ "$FEDORA" != 1 ] || [ "${VERSION_ID:-}" != 45 ]; then
  [ "$FORCE" = 1 ] || die "Jewbuntu $JB_VERSION for Asahi is for Fedora Asahi Remix 45; this is ${PRETTY_NAME:-unknown}. On Ubuntu, use jewbuntu-installer-*.run instead. (--force to try anyway; unsupported.)"
  say "Continuing on ${PRETTY_NAME:-unknown} because of --force (unsupported)."
fi
command -v gnome-shell >/dev/null || die "Jewbuntu needs the GNOME edition of Fedora Asahi Remix (this one has no GNOME Shell; KDE Plasma is not supported)."
command -v dnf >/dev/null || die "dnf is missing; this does not look like Fedora."

cat <<EOF

  Jewbuntu $JB_VERSION for Asahi Linux
  ------------------------------------
  This installs Jewbuntu's packages on top of Fedora:
    - the Mac-style Jewbuntu look: theme, icons, glass dock, clear top bar,
      Star of David wallpapers (blue light, purple dark), "Jewbuntu for Asahi Linux"
      on the login screen
    - Hebrew keyboard (Super+Space switches), fonts and spell checking
    - Jewbuntu Hub: Hebrew date, zmanim, calendar (works offline)
    - ShulGo widget in the top bar (needs your own ShulGo API key)
    - Web Server app: websites on this computer, local-only by default
    - the short startup jingle (can be switched off)
  Dash to Dock, Blur my Shell, fonts and the like come from Fedora.
  Nothing is removed, and no Fedora or Asahi file is changed. Your files are not touched.

EOF
ask "Install Jewbuntu now?" || { echo "Nothing was changed."; exit 0; }

chmod 755 "$TMP" "$TMP/jewbuntu" "$RPMS"; chmod 644 "$RPMS"/*.rpm
[ -n "$SUDO" ] && say "Your password is needed to install packages."
say "Installing Jewbuntu (this downloads a few Fedora packages and can take a while)…"
$SUDO dnf install -y "$RPMS"/*.rpm \
  || die "the installation did not finish (check the internet connection). Nothing was left half-installed; run this installer again."

if [ "$LOOK" = 1 ] && command -v jewbuntu >/dev/null; then
  echo
  if ask "Apply the Jewbuntu look to your account now? (Your current look is backed up; 'jewbuntu skin undo' restores it.)"; then
    jewbuntu skin apply || say "Could not apply the look now; it will be offered at your next login."
  fi
fi

cat <<EOF

  Jewbuntu $JB_VERSION is installed.

  Next: log out and back in (or restart) to see the new desktop.
  - Jewbuntu Hub, Web Server and ShulGo are in the app grid and the dock.
  - 'jewbuntu skin undo' restores your old look.
  - Updates: download a newer installer and run it the same way.
  - Remove: sh $(basename "$0") --uninstall   (or: jewbuntu skin undo; sudo dnf remove 'jewbuntu-*')

EOF
exit 0
__JEWBUNTU_PAYLOAD_BELOW__
