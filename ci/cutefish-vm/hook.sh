#!/bin/sh
# Test VM only (ci/cutefish-vm-iso.sh). Run by live-config as root (boot option hooks=...), before
# the login screen. Queues install.sh and holds Cutefish's login screen until it has finished, so
# the live system's automatic sign-in is the first sign-in after installing (as on a real install).
D=/run/live/medium/jewbuntu
cat > /etc/systemd/system/jewbuntu-vm-install.service <<UNIT
[Unit]
Description=Jewbuntu test VM: install the Cutefish skin with the one-file installer
Wants=network-online.target NetworkManager-wait-online.service
After=network-online.target NetworkManager-wait-online.service
[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/sh $D/install.sh
TimeoutStartSec=900
UNIT
mkdir -p /etc/systemd/system/cutefish-dm.service.d
cat > /etc/systemd/system/cutefish-dm.service.d/jewbuntu-vm.conf <<UNIT
[Unit]
Wants=jewbuntu-vm-install.service
After=jewbuntu-vm-install.service
UNIT
systemctl daemon-reload
systemctl start --no-block jewbuntu-vm-install.service
