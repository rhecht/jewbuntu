#!/bin/sh
# Test VM only. Installs the Jewbuntu skin exactly as a user would (the .run with --yes) and adds
# the screenshot check to autostart. Cutefish's login screen waits for this (see hook.sh).
D=/run/live/medium/jewbuntu
exec > /var/log/jewbuntu-vm-install.log 2>&1
set -x
for i in $(seq 1 180); do getent hosts download.cutefish.org >/dev/null && break; sleep 1; done
sh $D/jewbuntu-cutefish-installer.run --yes
echo "installer exit: $?"
install -m644 $D/vmcheck.desktop /etc/xdg/autostart/jewbuntu-vmcheck.desktop
