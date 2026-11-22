#!/bin/sh
# Jewbuntu Classic (Ubuntu 7.10 i386), step 2: a current Lynx and curl for a 2007 system.
#
# Ubuntu 7.10's own OpenSSL (0.9.8e) speaks only TLS 1.0, which today's HTTPS sites refuse, so
# its Firefox 2, Lynx 2.8.6 and Python 2.5 can no longer open them. These programs are built
# statically against OpenSSL 3.5 (TLS 1.2/1.3) with musl libc, for plain i686 (no SSE2, so a
# Pentium II/III runs them), and installed under /opt/jewbuntu with Mozilla's current CA list.
# Also built here: jewbuntu-tlsbridge, the local HTTPS helper Firefox 2 goes through.
#
# Output: dist/gutsy/opt-jewbuntu.tar.gz (the /opt/jewbuntu tree) and dist/gutsy/sources/
# (the exact source tarballs, offered next to the ISO as the GPL asks for Lynx).
# usage: ci/gutsy-tools-build.sh [SRC_DIR]   (SRC_DIR holds the tarballs below; fetched if missing)
# Docs: docs/gutsy.md
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/dist/gutsy/sources}"
OUT="$ROOT/dist/gutsy"
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
mkdir -p "$SRC" "$OUT"
SRC="$(cd "$SRC" && pwd)"

# name sha256 url
while read -r name sum url; do
  [ -f "$SRC/$name" ] || curl -fsSL -o "$SRC/$name" "$url"
  got="$(shasum -a 256 "$SRC/$name" 2>/dev/null || sha256sum "$SRC/$name")"
  [ "${got%% *}" = "$sum" ] || { echo "checksum mismatch: $name" >&2; exit 1; }
done <<'EOF'
openssl-3.5.9.tar.gz 603f5602e2eef00d77fbd429d34dcd5822bb301757a1bc9cdb24c670f1eb859a https://github.com/openssl/openssl/releases/download/openssl-3.5.9/openssl-3.5.9.tar.gz
curl-8.23.0.tar.xz 8dadd7d2536a314f982ad05a651b713f426bf7d02cc2c76cffb9796f2218e6c5 https://curl.se/download/curl-8.23.0.tar.xz
lynx2.9.3.tar.bz2 174b7f2866a60f3247ba75f5c7dbb10b124aede4a1359312de15f3bfebd2050f https://invisible-island.net/archives/lynx/tarballs/lynx2.9.3.tar.bz2
ncurses-6.6.tar.gz 355b4cbbed880b0381a04c46617b7656e362585d52e9cf84a67e2009b749ff11 https://ftp.gnu.org/gnu/ncurses/ncurses-6.6.tar.gz
zlib-1.4.tar.gz 02dd159783677a749c04adbdd02b55b8a2bcc7e054f51b76b549199a916ad584 https://zlib.net/zlib-1.4.tar.gz
cacert.pem 427c064216761a1e72a8b30f0d954d08cb6e4435a82091fb865afd20c8497285 https://curl.se/ca/cacert.pem
EOF

# Debian's i386 port targets plain i686 without SSE, and its musl-gcc inherits that baseline.
docker run --rm --platform linux/386 \
  -v "$SRC:/src:ro" -v "$OUT:/out" -v "$ROOT/packaging/gutsy/lynx:/lynxcfg:ro" \
  -v "$ROOT/packaging/gutsy/tlsbridge:/tlsbridge:ro" \
  debian:bookworm sh -euc '
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq >/dev/null
  apt-get install -y -qq --no-install-recommends musl-tools make perl xz-utils bzip2 file \
      ca-certificates linux-libc-dev >/dev/null
  # musl-gcc ignores the glibc include dirs; OpenSSL and curl want <linux/...> and <asm/...>.
  M=/usr/include/i386-linux-musl
  ln -sf /usr/include/linux /usr/include/asm-generic $M/
  ln -sf /usr/include/i386-linux-gnu/asm $M/asm
  export CC=musl-gcc CFLAGS="-Os -march=i686 -mtune=generic -fno-stack-protector" \
         LDFLAGS="-static" PKG_CONFIG=false
  P=/opt/jewbuntu S=/build/sw J=$(nproc)
  mkdir -p /build && cd /build
  for t in /src/*.tar.*; do tar xf "$t"; done

  cd /build/zlib-1.4
  ./configure --static --prefix=$S >/dev/null
  make -j$J >/dev/null
  make install >/dev/null

  cd /build/openssl-3.5.9
  # Runtime CPU detection picks SSE2 code only on CPUs that have it.
  ./Configure linux-elf no-shared no-tests no-docs no-async no-afalgeng no-engine no-module \
      no-legacy -static --prefix=$S --libdir=lib --openssldir=$P/etc/ssl $CFLAGS >/dev/null
  make -j$J >/tmp/openssl.log 2>&1 || { tail -30 /tmp/openssl.log; exit 1; }
  make install_sw >/dev/null

  cd /build/ncurses-6.6
  ./configure --prefix=$S --without-shared --without-cxx --without-ada --without-tests \
      --without-progs --without-manpages --enable-widec --disable-db-install \
      --with-terminfo-dirs=/etc/terminfo:/lib/terminfo:/usr/share/terminfo \
      --with-default-terminfo-dir=/usr/share/terminfo >/dev/null
  make -j$J >/tmp/ncurses.log 2>&1 || { tail -30 /tmp/ncurses.log; exit 1; }
  make install >/dev/null

  cd /build/curl-8.23.0
  ./configure --prefix=$P --disable-shared --enable-static --with-openssl=$S --with-zlib=$S \
      --with-ca-bundle=$P/etc/ssl/cert.pem --without-libpsl --without-brotli --without-zstd \
      --without-nghttp2 --without-libidn2 --without-librtmp --without-libssh2 --disable-ldap \
      --disable-manual --disable-docs CPPFLAGS="-I$S/include" LDFLAGS="-static -L$S/lib" \
      ac_cv_header_sys_eventfd_h=no ac_cv_func_eventfd=no >/dev/null
  # Kernel 2.6.22 has no eventfd2 (2.6.27+), and musl does not fall back when flags are given,
  # so curl'"'"'s eventfd wakeup fails at start ("Out of memory"). Use its socketpair wakeup.
  ! grep -q "define HAVE_EVENTFD 1" lib/curl_config.h
  make -j$J LDFLAGS="-all-static -L$S/lib" >/tmp/curl.log 2>&1 || { tail -30 /tmp/curl.log; exit 1; }
  install -D -m755 src/curl /stage$P/bin/curl

  cd /build/lynx2.9.3
  ./configure --prefix=$P --sysconfdir=$P/etc --with-ssl=$S --with-zlib --with-screen=ncursesw \
      --with-curses-dir=$S --enable-default-colors --enable-color-style --enable-ipv6 \
      --enable-nls=no --disable-full-paths --with-build-cflags= \
      CPPFLAGS="-I$S/include -I$S/include/ncursesw" LDFLAGS="-static -L$S/lib" \
      LIBS="-lssl -lcrypto -lz" >/dev/null
  make -j$J >/tmp/lynx.log 2>&1 || { tail -30 /tmp/lynx.log; exit 1; }
  install -D -m755 lynx /stage$P/bin/lynx
  install -D -m644 lynx.cfg /stage$P/etc/lynx.cfg
  install -D -m644 samples/lynx.lss /stage$P/etc/lynx-default.lss
  cat /lynxcfg/lynx-jewbuntu.cfg >> /stage$P/etc/lynx.cfg
  install -m644 /lynxcfg/jewbuntu.lss /stage$P/etc/lynx.lss   # Lynx requires its default .lss to exist

  # The TLS bridge for Firefox 2 (packaging/gutsy/tlsbridge), on the same OpenSSL.
  musl-gcc $CFLAGS -std=gnu99 -Wall -I$S/include /tlsbridge/jewbuntu-tlsbridge.c \
      -static -L$S/lib -lssl -lcrypto -o /stage$P/bin/jewbuntu-tlsbridge
  mkdir -p /tmp/tb && /stage$P/bin/jewbuntu-tlsbridge init /tmp/tb && /stage$P/bin/jewbuntu-tlsbridge version

  strip /stage$P/bin/*
  install -D -m644 /src/cacert.pem /stage$P/etc/ssl/cert.pem
  d=/stage$P/share/doc
  install -D -m644 /build/lynx2.9.3/COPYING $d/lynx/COPYING
  install -D -m644 /build/curl-8.23.0/COPYING $d/curl/COPYING
  install -D -m644 /build/openssl-3.5.9/LICENSE.txt $d/openssl/LICENSE.txt
  install -D -m644 /build/ncurses-6.6/COPYING $d/ncurses/COPYING
  install -D -m644 /build/zlib-1.4/LICENSE $d/zlib/LICENSE 2>/dev/null || install -D -m644 /build/zlib-1.4/README $d/zlib/README
  cp /usr/share/doc/musl/copyright $d/musl-copyright
  file /stage$P/bin/*
  tar -C /stage -czf /out/opt-jewbuntu.tar.gz opt
  /stage$P/bin/curl --version
  /stage$P/bin/lynx -version | head -3'
ls -la "$OUT/opt-jewbuntu.tar.gz"
