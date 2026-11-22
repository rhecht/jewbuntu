#!/bin/sh
# Test only: make a copy of a Cutefish live ISO that, with no one at the keyboard, installs the
# Jewbuntu skin with the one-file installer before the login screen, signs in again fresh, takes
# Cutefish's own screenshots (light, dark, light) and serves them on http://GUEST:8765/.
# It uses live-config's documented hooks= boot option and adds a serial console (the live user
# is "cutefish", password "live", Debian live's default). Not for distribution.
# usage: ci/cutefish-vm-iso.sh CUTEFISH.iso INSTALLER.run OUT.iso
set -eu
ISO="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
RUN="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
OUT="$3"; mkdir -p "$(dirname "$OUT")"; OUT="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/jewbuntu" "$TMP/hooks"
cp "$ROOT"/ci/cutefish-vm/install.sh "$ROOT"/ci/cutefish-vm/vmcheck.sh "$ROOT"/ci/cutefish-vm/vmcheck.desktop "$TMP/jewbuntu/"
cp "$RUN" "$TMP/jewbuntu/jewbuntu-cutefish-installer.run"
cp "$ROOT/ci/cutefish-vm/hook.sh" "$TMP/hooks/jewbuntu.sh"
docker run --rm -v "$ISO:/in.iso:ro" -v "$TMP:/w" -v "$(dirname "$OUT"):/out" jewbuntu-cutefish-test:arm64 sh -euc '
  command -v xorriso >/dev/null || { apt-get update -q >/dev/null; apt-get install -y -q xorriso >/dev/null; }
  xorriso -osirrox on -indev /in.iso -extract /boot/grub/grub.cfg /w/grub.cfg >/dev/null 2>&1
  chmod u+w /w/grub.cfg
  # First (default) entry: run the hook, add a serial console, keep the screen as the main console.
  sed -i "0,/findiso=\${iso_path}/s||findiso=\${iso_path} hooks=file:///run/live/medium/live/config-hooks/jewbuntu.sh console=ttyAMA0 console=tty0|" /w/grub.cfg
  grep -m1 "hooks=" /w/grub.cfg
  rm -f /out/'"$(basename "$OUT")"'
  xorriso -indev /in.iso -outdev /out/'"$(basename "$OUT")"' \
    -map /w/grub.cfg /boot/grub/grub.cfg -map /w/jewbuntu /jewbuntu -map /w/hooks /live/config-hooks \
    -boot_image any replay 2>&1 | tail -3'
ls -la "$OUT"
