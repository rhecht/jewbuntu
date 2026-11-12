#!/bin/bash
# Screenshot the Web Server app under Xvfb in Ubuntu 26.04: before setup, then after the
# helper has installed the stack and added two sites. usage: ci/webserver-screenshot.sh DISTDIR OUTDIR
set -eu
DIST="${1:?}"; OUT="${2:?}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; mkdir -p "$OUT"
docker run --rm ${PLATFORM:+--platform $PLATFORM} -v "$ROOT/$DIST:/dist:ro" -v "$(cd "$OUT" && pwd):/out" -v "$ROOT/components/webserver/tests:/tests:ro" ubuntu:26.04 bash -c '
set -u; export DEBIAN_FRONTEND=noninteractive
for i in 1 2 3; do apt-get update -q >/dev/null 2>&1 && break; sleep 5; done
apt-get install -y -q xvfb imagemagick sudo fonts-inter /dist/jewbuntu-webserver_*.deb >/tmp/apt.log 2>&1 || { tail /tmp/apt.log; exit 1; }
useradd -m t
Xvfb :99 -screen 0 760x820x24 >/dev/null 2>&1 & sleep 1; export DISPLAY=:99
shot() {
  sudo -u t env DISPLAY=:99 GDK_BACKEND=x11 GSK_RENDERER=cairo GTK_A11Y=none LANG=C.UTF-8 HOME=/home/t \
    jewbuntu-webserver > /out/$1.log 2>&1 & APP=$!; sleep 6
  import -window root /out/$1.png; kill $APP; wait $APP 2>/dev/null
  grep -iE "error|critical|warning" /out/$1.log | grep -v -e libEGL -e DRI3 | head -5 || true
}
shot webserver-setup
sudo -u t env DISPLAY=:99 GDK_BACKEND=x11 gjs -m /tests/clipboard-test.js 2>&1 | grep -v -e libEGL -e DRI3
H=/usr/libexec/jewbuntu/jewbuntu-webserver-helper
for i in 1 2 3; do JEWBUNTU_TEST_USER=t $H install >/dev/null && break; sleep 5; done
JEWBUNTU_TEST_USER=t $H add-site blog >/dev/null; JEWBUNTU_TEST_USER=t $H add-site shul-site >/dev/null
shot webserver-main
ls -la /out/*.png'
