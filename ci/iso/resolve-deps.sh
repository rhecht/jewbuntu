#!/bin/bash
# Inside an amd64 Ubuntu 26.04 container: work out which packages Jewbuntu needs beyond what
# Ubuntu's installer puts on disk (/stage/minimal.manifest), and download them into
# /stage/jewbuntu/extra, checksum-verified by apt.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
for i in 1 2 3; do apt-get update -q >/dev/null && break; sleep 5; done
# A dpkg status file claiming exactly the packages Ubuntu installs, so apt plans only the rest.
# 26.04 manifests are diff-style ("--- / +++" headers, "+pkg<TAB>version"), with snap entries.
awk '/^(---|\+\+\+) / { next }
     { sub(/^[+ ]/, "", $1) }
     $1 ~ /^snap:/ || NF < 2 { next }
     { split($1, a, ":"); printf "Package: %s\nStatus: install ok installed\nVersion: %s\nArchitecture: %s\n\n", a[1], $2, (a[2] ? a[2] : "all") }' \
    /stage/minimal.manifest > /tmp/status
echo "installed-system debs: $(grep -c '^Package:' /tmp/status)"
cd /stage/jewbuntu/debs
apt-get install -y --print-uris -qq -o Dir::State::status=/tmp/status ./*.deb > /tmp/plan 2>/tmp/apt.err \
    || { cat /tmp/apt.err; exit 1; }
# Lines: 'URL' FILENAME SIZE HASH
awk '$1 ~ /^.http/ { gsub("\047", "", $1); print $1, $2, $4 }' /tmp/plan | grep -v ' jewbuntu-' > /tmp/uris || true
echo "extra packages to bundle: $(wc -l < /tmp/uris)"
cd /stage/jewbuntu/extra
while read -r url name hash; do
    for i in 1 2 3; do /usr/lib/apt/apt-helper download-file "$url" "$name" "$hash" >/dev/null && break; sleep 3; done
    [ -s "$name" ] || { echo "failed to download $name"; exit 1; }
done < /tmp/uris
echo "downloaded: $(ls | wc -l), size: $(du -sh . | cut -f1)"
ls | sed 's/_.*//' | tr '\n' ' '; echo
