#!/bin/sh
# Boot a remastered Lubuntu/Mint live ISO in a headless QEMU inside Docker (emulated x86, TCG) and
# take screenshots through QEMU's monitor. Nothing appears on the host's screen, and no UTM VM is
# involved (QEMU runs in Docker's Linux VM).
#   ci/flavor-vm.sh start ISO [RAM_MB] [i386|x86_64]   boot the live system (default 3072 MB, x86_64)
#   ci/flavor-vm.sh shot NAME                          screenshot -> dist/flavor-iso/test/NAME.png
#   ci/flavor-vm.sh keys KEY...  |  type TEXT  |  cmd 'MONITOR COMMAND'
#   ci/flavor-vm.sh stop
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/flavor-iso/test"
NAME=jewbuntu-flavor-vm
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
mkdir -p "$OUT"
action="${1:-}"; [ $# -gt 0 ] && shift
case "$action" in
  start)
    ISO="$1"; RAM="${2:-3072}"; ARCH="${3:-x86_64}"
    if [ "$ARCH" = i386 ]; then CPU="-cpu pentium3"; SMP=1; else CPU="-cpu max"; SMP=4; fi
    docker rm -f $NAME >/dev/null 2>&1 || true
    docker run -d --init --name $NAME -v "$(cd "$(dirname "$ISO")" && pwd)/$(basename "$ISO"):/disc.iso:ro" \
      -v "$OUT:/shots" -v "$ROOT/ci/gutsy-qemu.py:/qemu.py:ro" jewbuntu-gutsy-qemu \
      qemu-system-$ARCH $CPU -m "$RAM" -machine pc -accel tcg,thread=multi -smp $SMP \
        -cdrom /disc.iso -boot d -vga ${VGA:-std} -display none -usb -device usb-tablet \
        -netdev user,id=n0 -device e1000,netdev=n0 -audiodev none,id=a0 \
        -monitor unix:/tmp/mon.sock,server,nowait >/dev/null
    echo "started $NAME: $(basename "$ISO"), ${RAM} MB, $ARCH (TCG)"
    ;;
  shot)
    docker exec $NAME sh -c 'rm -f /tmp/s.ppm; python3 /qemu.py /tmp/mon.sock cmd "screendump /tmp/s.ppm" >/dev/null
      for i in 1 2 3 4 5 6 7 8 9 10; do sleep 1; s1=$(stat -c %s /tmp/s.ppm 2>/dev/null); sleep 1; [ -n "$s1" ] && [ "$s1" = "$(stat -c %s /tmp/s.ppm)" ] && break; done
      convert /tmp/s.ppm /shots/'"$1"'.png'
    echo "$OUT/$1.png" ;;
  keys) docker exec $NAME python3 /qemu.py /tmp/mon.sock keys "$@" ;;
  type) docker exec $NAME python3 /qemu.py /tmp/mon.sock type "$*" ;;
  cmd)  docker exec $NAME python3 /qemu.py /tmp/mon.sock cmd "$*" ;;
  stop) docker rm -f $NAME >/dev/null && echo stopped ;;
  *) sed -n '2,8p' "$0"; exit 1 ;;
esac
