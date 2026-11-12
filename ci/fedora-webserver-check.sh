#!/bin/sh
# Exercise the Jewbuntu Web Server on Fedora (Fedora Asahi Remix) for real: the RPM from
# ci/fedora-build.sh in a fedora container booted with systemd (real httpd, php-fpm, MariaDB,
# vsftpd@jewbuntu and firewalld units; native arm64 on Apple Silicon). Needs network for dnf,
# wordpress.org and Composer. Another device on the LAN is a network namespace joined by a
# veth pair, so its traffic goes through firewalld like a real one would.
#
# usage: ci/fedora-webserver-check.sh [RPM_DIR]   (default dist/fedora)
#   FEDORA=45 picks the release. Log: dist/fedora-webserver-check.log
#
# Container-only adjustments (in ci/Dockerfile.fedora-webserver): firewalld's IPv6 reverse-path
# filter and the zone's samba-client service are off, because Docker Desktop's kernel lacks the
# nftables pieces they need. Real Fedora kernels have them.
#
# Not covered in a container (see docs/asahi.md): SELinux in enforcing mode (the kernel has no
# SELinux; the check builds and queries the policy instead), the polkit password dialog, the
# GTK window, and Asahi hardware.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPMS="$(cd "${1:-$ROOT/dist/fedora}" && pwd)"
FEDORA="${FEDORA:-45}"
IMAGE="jewbuntu-fedora-webserver:$FEDORA"
LOG="${LOG:-$ROOT/dist/fedora-webserver-check.log}"
NAME="jewbuntu-fedora-webserver-check-$$"
mkdir -p "$ROOT/dist"
docker build -q --build-arg FEDORA="$FEDORA" -t "$IMAGE" -f "$ROOT/ci/Dockerfile.fedora-webserver" "$ROOT/ci" >/dev/null
docker run -d --name "$NAME" --privileged --tmpfs /run --tmpfs /run/lock \
  -v "$RPMS:/rpms:ro" -v "$ROOT/components/webserver/tests:/tests:ro" -v "$ROOT/ci:/ci:ro" "$IMAGE" >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
for i in $(seq 1 30); do docker exec "$NAME" test -f /ci/fedora-webserver-check-inner.sh 2>/dev/null && break; sleep 1; done
docker exec "$NAME" bash /ci/fedora-webserver-check-inner.sh 2>&1 | tee "$LOG" || true
echo "log: $LOG"
grep -q "^failures: 0$" "$LOG"
