#!/bin/sh
# Heavier check: install jewbuntu-desktop (pulls ubuntu-desktop-minimal) in a container and
# verify dependency resolution and that the vendor defaults reach the real GNOME/dock schemas.
# Not a graphical test: nothing is rendered.
# usage: ci/container-desktop-test.sh DIST
set -eu
DIST="$(cd "$1" && pwd)"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${LOG:-$ROOT/dist/container-desktop-test.log}"
docker run --rm -v "$DIST:/dist:ro" -v "$ROOT/ci/desktop-skin-check.sh:/skin-check.sh:ro" jewbuntu-build:26.04 sh -euc '
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  START=$(date +%s)
  apt-get install -y -qq --no-install-recommends /dist/jewbuntu-core_*.deb /dist/jewbuntu-branding_*.deb \
      /dist/jewbuntu-hebrew_*.deb /dist/jewbuntu-upgrade-tools_*.deb /dist/jewbuntu-desktop_*.deb $(ls /dist/jewbuntu-gnome_*.deb /dist/jewbuntu-skin_*.deb /dist/jewbuntu-jewish-service_*.deb 2>/dev/null) > /tmp/apt.log 2>&1 \
      || { tail -30 /tmp/apt.log; exit 1; }
  echo "installed in $(( $(date +%s) - START ))s; packages now: $(dpkg -l | grep -c ^ii)"
  grep -i "schema" /tmp/apt.log | grep -i -E "warn|error|ignor" || echo "no schema compile warnings in apt log"
  echo "--- gnome-shell: $(gnome-shell --version 2>/dev/null || dpkg-query -W -f "\${Version}" gnome-shell)"
  echo "--- effective defaults in the ubuntu session (memory backend, fresh user):"
  for k in "org.gnome.shell.extensions.dash-to-dock dock-position" "org.gnome.shell.extensions.dash-to-dock extend-height" \
           "org.gnome.desktop.wm.preferences button-layout" "org.gnome.desktop.interface accent-color" \
           "org.gnome.desktop.background picture-uri-dark" "org.gnome.desktop.input-sources sources" "org.gnome.mutter center-new-windows"; do
    printf "%-60s %s\n" "$k" "$(XDG_CURRENT_DESKTOP=ubuntu:GNOME GSETTINGS_BACKEND=memory gsettings get $k 2>&1)"
  done
  echo "--- jewbuntu defaults status:"
  XDG_CURRENT_DESKTOP=ubuntu:GNOME GSETTINGS_BACKEND=memory jewbuntu defaults status
  echo "--- existing-user skin test:"
  sh /skin-check.sh
  echo "--- jewbuntu upgrade-check:"
  jewbuntu upgrade-check | head -12
' 2>&1 | tee "$LOG"
