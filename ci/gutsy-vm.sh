#!/bin/sh
# Jewbuntu Classic: boot the ISO in a headless QEMU (Pentium III, no SSE2) inside Docker and
# drive it through QEMU's monitor. Nothing appears on the host's screen.
#   ci/gutsy-vm.sh start [ISO] [RAM_MB]   boot the live CD (default: newest dist/gutsy ISO, 512 MB)
#   ci/gutsy-vm.sh shot NAME              screenshot -> dist/gutsy/test/NAME.png
#   ci/gutsy-vm.sh keys KEY...            e.g. ret, alt-f2, ctrl-alt-t
#   ci/gutsy-vm.sh type TEXT              type text (US layout)
#   ci/gutsy-vm.sh cmd 'MONITOR COMMAND'  raw QEMU monitor command
#   ci/gutsy-vm.sh stop
# QEMU runs in Docker's Linux VM, not as a macOS process like UTM's (see the note on UTM +
# MAMP kernel panics); the memory rule still applies: nothing else heavy while it runs.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/gutsy"
NAME=jewbuntu-classic-vm
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
mkdir -p "$OUT/test"
action="${1:-}"; [ $# -gt 0 ] && shift
case "$action" in
  start)
    ISO="${1:-$(ls -t "$OUT"/jewbuntu-classic-*.iso | head -1)}"; RAM="${2:-512}"
    docker build -q -t jewbuntu-gutsy-qemu - >/dev/null <<'EOF'
FROM ubuntu:26.04
RUN apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends \
      qemu-system-x86 python3 imagemagick && rm -rf /var/lib/apt/lists/*
EOF
    docker rm -f $NAME >/dev/null 2>&1 || true
    docker run -d --name $NAME -v "$(cd "$(dirname "$ISO")" && pwd)/$(basename "$ISO"):/disc.iso:ro" \
      -v "$OUT/test:/shots" -v "$ROOT/ci/gutsy-qemu.py:/qemu.py:ro" jewbuntu-gutsy-qemu \
      qemu-system-i386 -cpu pentium3 -m "$RAM" -machine pc -accel tcg -smp 1 \
        -cdrom /disc.iso -boot d -vga std -display none -usb -device usb-tablet \
        -netdev user,id=n0 -device e1000,netdev=n0 -audiodev none,id=a0 \
        -monitor unix:/tmp/mon.sock,server,nowait >/dev/null
    echo "started $NAME: $(basename "$ISO"), ${RAM} MB, Pentium III (TCG)"
    ;;
  shot) docker exec $NAME python3 /qemu.py /tmp/mon.sock shot "/shots/$1.png"; echo "$OUT/test/$1.png" ;;
  keys) docker exec $NAME python3 /qemu.py /tmp/mon.sock keys "$@" ;;
  type) docker exec $NAME python3 /qemu.py /tmp/mon.sock type "$*" ;;
  cmd)  docker exec $NAME python3 /qemu.py /tmp/mon.sock cmd "$*" ;;
  stop) docker rm -f $NAME >/dev/null && echo stopped ;;
  *) sed -n '2,9p' "$0"; exit 1 ;;
esac
