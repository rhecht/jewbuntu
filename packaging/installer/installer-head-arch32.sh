#!/bin/sh
# Jewbuntu @VERSION@ installer for old 32-bit laptops: Arch Linux 32 (i686) with Xfce, for example a
# Pentium III with 256 MB. Adds Jewbuntu's packages on top of Arch Linux 32; everything else comes
# from Arch Linux 32's own repositories and keeps getting its updates. Guide: docs/arch32.md.
#
#   sh jewbuntu-arch32-installer-@VERSION@.run              install (asks before changing anything)
#   sh jewbuntu-arch32-installer-@VERSION@.run --yes        install without questions
#   sh jewbuntu-arch32-installer-@VERSION@.run --uninstall  restore your old look, remove Jewbuntu
#   sh jewbuntu-arch32-installer-@VERSION@.run --list       show the packages inside
#   sh jewbuntu-arch32-installer-@VERSION@.run --extract DIR   unpack the .pkg.tar.zst files only
#
# Options: --no-look     don't apply the Jewbuntu look to your account now
#          --no-lightdm  don't offer to install the LightDM login screen
#          --force       install on something other than Arch Linux 32 (unsupported)
# Undo by hand: jewbuntu skin undo; sudo pacman -R jewbuntu-xfce-desktop jewbuntu-core jewbuntu-skin jewbuntu-icons
set -eu
JB_VERSION="@VERSION@"
PAYLOAD_SHA256="@PAYLOAD_SHA256@"
PANGO_URL="https://archive.archlinux32.org/packages/p/pango/pango-1:1.54.0-1.0-i686.pkg.tar.zst"
YES=0; LOOK=1; DM=1; FORCE=0; MODE=install; EXTRACT_DIR=
while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) YES=1 ;;
    --no-look) LOOK=0 ;;
    --no-lightdm) DM=0 ;;
    --force) FORCE=1 ;;
    --uninstall|--remove) MODE=uninstall ;;
    --list) MODE=list ;;
    --extract) MODE=extract; EXTRACT_DIR="${2:?--extract needs a directory}"; shift ;;
    --help|-h) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
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
  command -v sudo >/dev/null || die "sudo is needed to install packages (or run this as root)."
  SUDO="sudo"
fi

if [ "$MODE" = uninstall ]; then
  cat <<EOF

  Remove Jewbuntu $JB_VERSION
  ---------------------------
  This puts back the look your account had before Jewbuntu (if it was applied),
  then removes the Jewbuntu packages. Xfce and everything else stay installed.
  Your files, and Jewbuntu's settings backup in ~/.local/state/jewbuntu, are kept.
  Other accounts: run 'jewbuntu skin undo' as that user first.

EOF
  ask "Remove Jewbuntu now?" || { echo "Nothing was changed."; exit 0; }
  if [ -n "$SUDO" ] && command -v jewbuntu >/dev/null; then
    jewbuntu skin undo || say "Could not restore the previous look; carrying on with the removal."
  fi
  [ -n "$SUDO" ] && say "Your password is needed to remove packages."
  PKGS=$(pacman -Qq jewbuntu-xfce-desktop jewbuntu-core jewbuntu-skin jewbuntu-icons shulgo-xfce 2>/dev/null || true)
  [ -n "$PKGS" ] || { echo "Jewbuntu is not installed."; exit 0; }
  # Plain -R: Xfce and the other dependencies stay, so nothing else on the laptop breaks.
  # shellcheck disable=SC2086
  $SUDO pacman -R --noconfirm $PKGS || die "pacman could not remove the packages; run: sudo pacman -R $PKGS"
  printf '\n  Jewbuntu is removed. Log out and back in; choose "Xfce Session" at the login screen.\n'
  printf '  (If the installer held pango for Arch Linux 32, that hold stays in /etc/pacman.conf.)\n\n'
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
(cd "$TMP/jewbuntu/packages" && sha256sum -c --quiet ../SHA256SUMS) || die "a package failed its checksum."
PKGDIR="$TMP/jewbuntu/packages"

case "$MODE" in
  list) ls "$PKGDIR"; exit 0 ;;
  extract) mkdir -p "$EXTRACT_DIR"; cp "$PKGDIR"/*.pkg.tar.zst "$TMP/jewbuntu/SHA256SUMS" "$EXTRACT_DIR/"; say "Packages copied to $EXTRACT_DIR"; exit 0 ;;
esac

# Checks. (A missing file given to "." ends the shell silently, so test first.)
[ -r /etc/os-release ] || die "this installer is for Arch Linux 32; this computer is running $(uname -s)."
. /etc/os-release
if [ "${ID:-}" != arch32 ]; then
  [ "$FORCE" = 1 ] || die "Jewbuntu $JB_VERSION for old laptops is for Arch Linux 32; this is ${PRETTY_NAME:-unknown}. On Ubuntu use jewbuntu-installer-*.run, on Asahi jewbuntu-asahi-installer-*.run. (--force to try anyway; unsupported.)"
  say "Continuing on ${PRETTY_NAME:-unknown} because of --force (unsupported)."
fi
command -v pacman >/dev/null || die "pacman is missing; this does not look like Arch Linux 32."
grep -qw sse /proc/cpuinfo 2>/dev/null || say "Warning: this CPU has no SSE. Arch Linux 32's i686 desktop packages need it (Pentium III or newer)."
MEM=$(awk '/^MemTotal:/ { print int($2 / 1024) }' /proc/meminfo 2>/dev/null || echo 0)
SWAP=$(awk '/^SwapTotal:/ { print int($2 / 1024) }' /proc/meminfo 2>/dev/null || echo 0)

# Arch Linux 32 (2026-11): its pango needs a newer fontconfig than it ships, and then no GTK program
# starts. Hold the last pango that works, from Arch Linux 32's own signed archive (docs/arch32.md).
PANGO_FIX=0
FC=$(pacman -Q fontconfig 2>/dev/null | cut -d' ' -f2 || true)
[ -n "$FC" ] || FC=$(pacman -Si fontconfig 2>/dev/null | awk '/^Version/ { print $3; exit }')
PG=$(pacman -Q pango 2>/dev/null | cut -d' ' -f2 || true)            # installed pango, if any
[ -n "$PG" ] || PG=$(pacman -Si pango 2>/dev/null | awk '/^Version/ { print $3; exit }')   # else the repo's
if [ -n "$FC" ] && [ -n "$PG" ] && [ "$(vercmp "$FC" 2:2.15)" -lt 0 ] && [ "$(vercmp "$PG" 1:1.55)" -ge 0 ]; then
  PANGO_FIX=1
fi

cat <<EOF

  Jewbuntu $JB_VERSION for old laptops (Arch Linux 32 + Xfce)
  -----------------------------------------------------------
  This installs Jewbuntu's packages on top of Arch Linux 32:
    - the Mac-style Jewbuntu look for Xfce: solid theme (no transparency), icons,
      left-side window buttons, a slim top bar and a dock, Star of David wallpapers
    - a "Jewbuntu" session at the login screen (the plain Xfce session stays as it was)
    - Hebrew keyboard (Super+Space switches) and fonts
    - ShulGo: the next minyan on the top bar, with zmanim in its menu
      (link it to your ShulGo account from its menu: "Link this computer")
    - two light web browsers that fit 256 MB: Dillo, and Lynx (text only)
  Xfce and everything else come from Arch Linux 32. Nothing is removed, and no
  Arch file is changed. Your files are not touched.

  NOT FOR MODERN WEB BROWSING. No current browser runs on a laptop this old (Firefox
  needs far more memory; Chrome doesn't exist for these processors). Dillo and Lynx show
  simple pages like news and Wikipedia, but not today's web apps (Gmail, shopping,
  banking, the full ShulGo website). Jewbuntu puts the information on the bar instead.

  This computer: ${MEM} MB of memory, ${SWAP} MB of swap.
EOF
[ "$SWAP" -gt 0 ] || [ "$MEM" -ge 512 ] || printf '  With under 512 MB and no swap, add a swap file first (Arch Wiki: "Swap").\n'
echo
ask "Install Jewbuntu now?" || { echo "Nothing was changed."; exit 0; }

if [ "$PANGO_FIX" = 1 ]; then
  cat <<EOF

  Arch Linux 32 problem: its pango is newer than its fontconfig supports, so no GTK
  program (Xfce included) can start. The fix is to install pango 1.54.0 from Arch Linux 32's
  own signed archive and add "IgnorePkg = pango" to /etc/pacman.conf until they rebuild
  fontconfig. Remove that line once 'pacman -Si fontconfig' shows 2.15 or newer.

EOF
  if ask "Hold pango at 1.54.0 now?"; then
    [ -n "$SUDO" ] && say "Your password is needed to install packages."
    $SUDO pacman -U --noconfirm "$PANGO_URL" || die "could not install pango 1.54.0 (check the internet connection)."
    grep -q '^IgnorePkg.*\bpango\b' /etc/pacman.conf || $SUDO sed -i 's/^\[options\]$/[options]\nIgnorePkg = pango/' /etc/pacman.conf
  else
    say "Skipped. Xfce will not start until pango is held or Arch Linux 32 fixes fontconfig."
  fi
fi

chmod 755 "$TMP" "$TMP/jewbuntu" "$PKGDIR"; chmod 644 "$PKGDIR"/*.pkg.tar.zst
[ -n "$SUDO" ] && say "Your password is needed to install packages."
say "Installing Jewbuntu (this downloads Xfce and other Arch Linux 32 packages if they're missing; on an old laptop it can take a while)…"
$SUDO pacman -U --needed --noconfirm "$PKGDIR"/*.pkg.tar.zst \
  || die "the installation did not finish (check the internet connection). Nothing was left half-installed; run this installer again."

if [ "$DM" = 1 ] && [ ! -e /etc/systemd/system/display-manager.service ]; then
  echo
  if ask "No login screen is set up. Install the LightDM login screen (Jewbuntu-themed) and start Jewbuntu at boot?"; then
    $SUDO pacman -S --needed --noconfirm lightdm lightdm-gtk-greeter || die "could not install LightDM."
    $SUDO systemctl enable lightdm.service || say "Could not enable LightDM; enable it with: sudo systemctl enable lightdm"
  else
    say "No login screen: put 'exec startjewbuntu' in ~/.xinitrc and run startx."
  fi
fi

if [ "$LOOK" = 1 ] && command -v jewbuntu >/dev/null && [ -n "${DISPLAY:-}" ]; then
  echo
  if ask "Apply the Jewbuntu look to your account now? (Your current look is backed up; 'jewbuntu skin undo' restores it.)"; then
    jewbuntu skin apply || say "Could not apply the look now; it will be offered at your next login."
  fi
fi

cat <<EOF

  Jewbuntu $JB_VERSION is installed.

  Next: log out, choose the "Jewbuntu" session at the login screen (or restart).
  - 'jewbuntu skin undo' restores your old look.
  - Updates: download a newer installer and run it the same way.
  - Remove: sh $(basename "$0") --uninstall

EOF
exit 0
__JEWBUNTU_PAYLOAD_BELOW__
