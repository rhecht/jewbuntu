# Asahi installer in a Fedora 45 VM: skin release 3 and the login screen (2026-11-13)

VM: UTM (QEMU, Apple M1 host) "Fedora 45 Jewbuntu preview", Fedora 45 Workstation, GNOME 51,
4 GB memory. It already had 0.1.0~m1.29 with jewbuntu-skin release 2.

1. The owner ran `jewbuntu-asahi-installer-0.1.0-m1.29.run` (sha256 363ceb58...fdac) in the VM.
   dnf reported the other eight packages as already installed, upgraded
   `jewbuntu-skin-0.1.0~git20261113.2-3.fc45` over `-2`, and printed "Complete!". The installer
   reported "Jewbuntu 0.1.0-m1.29 is installed". `jewbuntu skin apply`: "already applied".
   Screenshots: 2026-11-13-asahi-vm-installer-skin3-1.webp, -2.webp.
2. Shut down, memory set from 6 to 4 GB, started again.
3. GDM login screen, seen by the owner: the blurred Star of David background
   (reported "Star of David"). With skin release 2, which overlaid gdm.css, it had stayed
   Fedora's plain grey: GNOME 51's greeter loads gnome-shell-dark.css. So the greeter's
   gnome-shell does get G_RESOURCE_OVERLAYS from /usr/lib/environment.d.

Not tested: a real Apple Silicon Asahi install.
