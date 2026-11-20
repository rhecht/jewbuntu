#!/bin/sh
# Jewbuntu Classic: build the boot splash (usplash theme .so for Ubuntu 7.10).
#   1. render packaging/gutsy/usplash/usplash.svg at 640x480, 800x600 and 1024x768, as 8-bit
#      palette PNGs with the palette slots the theme uses (make-usplash-png.py)
#   2. compile jewbuntu-theme.c with 7.10's own gcc and libusplash-dev (old-releases archive) in
#      a throwaway 7.10 i386 container, so the .so matches that system exactly
# Output: dist/gutsy/usplash/jewbuntu-classic-usplash.so (packaged by ci/gutsy-build-debs.sh)
# usage: ci/gutsy-usplash.sh
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/gutsy/usplash"; SRC="$ROOT/dist/gutsy/sources"
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
mkdir -p "$OUT" "$SRC"
[ -f "$SRC/usplash_0.5.7.tar.gz" ] || curl -fsSL -o "$SRC/usplash_0.5.7.tar.gz" \
  https://old-releases.ubuntu.com/ubuntu/pool/main/u/usplash/usplash_0.5.7.tar.gz
INTER="$SRC/Inter-4.1.zip"; [ -f "$INTER" ] || { echo "run ci/gutsy-build-debs.sh first (fetches Inter)" >&2; exit 1; }

docker build -q -t jewbuntu-gutsy-tools -f "$ROOT/ci/Dockerfile.gutsy-tools" "$ROOT/ci" >/dev/null
docker run --rm -v "$ROOT/packaging/gutsy/usplash:/u:ro" -v "$SRC:/src:ro" -v "$OUT:/out" \
  jewbuntu-gutsy-tools sh -euc '
  mkdir -p /usr/share/fonts/truetype/inter
  unzip -q -j /src/Inter-4.1.zip "extras/ttf/Inter-SemiBold.ttf" -d /usr/share/fonts/truetype/inter && fc-cache -f >/dev/null
  rsvg-convert /u/usplash.svg -o /tmp/big.png
  for s in 640x480 800x600 1024x768; do
    w=${s%x*}; h=${s#*x}
    convert /tmp/big.png -resize ${w}x${h}! +dither -colors 240 -depth 8 rgb:/tmp/$s.rgb
    python3 /u/make-usplash-png.py $w $h /tmp/$s.rgb /out/splash_${w}_${h}.png
  done
  # Progress-bar images, palette slots 1 (track) and 2 (bar): 220x6 solid fills.
  python3 -c "import sys; sys.stdout.buffer.write(bytes([0x2a,0x55,0x9e])*220*6)" > /tmp/back.rgb
  python3 -c "import sys; sys.stdout.buffer.write(bytes([0x00,0x88,0xff])*220*6)" > /tmp/fore.rgb
  python3 /u/make-usplash-png.py 220 6 /tmp/back.rgb /out/bar_back.png
  python3 /u/make-usplash-png.py 220 6 /tmp/fore.rgb /out/bar_fore.png
  tar -xzf /src/usplash_0.5.7.tar.gz -C /tmp usplash/example-theme/helvB10.bdf
  cp /tmp/usplash/example-theme/helvB10.bdf /out/'

docker run --rm --platform linux/386 -v "$ROOT/packaging/gutsy/usplash:/u:ro" -v "$OUT:/out" \
  jewbuntu-gutsy-i386:rootfs sh -euc '
  echo "deb http://old-releases.ubuntu.com/ubuntu gutsy main" > /etc/apt/sources.list
  apt-get update -qq >/dev/null 2>&1
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --force-yes gcc libc6-dev libusplash-dev >/dev/null 2>&1
  mkdir /b && cd /b && cp /out/*.png /out/helvB10.bdf /u/jewbuntu-theme.c .
  for p in splash_640_480 splash_800_600 splash_1024_768 bar_back bar_fore; do pngtousplash $p.png > $p.png.c; gcc -fPIC -O2 -c $p.png.c -o $p.o; done
  bdftousplash helvB10.bdf > helvB10.bdf.c && gcc -fPIC -O2 -c helvB10.bdf.c -o helvB10.o
  gcc -fPIC -O2 -Wall -c jewbuntu-theme.c -o theme.o
  gcc -shared -Wl,--no-undefined -o /out/jewbuntu-classic-usplash.so theme.o splash_*.o bar_*.o helvB10.o -L/usr/lib -lusplash
  ls -la /out/jewbuntu-classic-usplash.so'
