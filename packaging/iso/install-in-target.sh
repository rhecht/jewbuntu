#!/bin/sh
# Runs inside the newly installed system (chroot) at the end of Ubuntu's installer.
# Installs Jewbuntu from the disc; uses the network only for anything the disc lacks.
# Never fails the installation: on a problem, the user still gets Ubuntu and a note.
set -u
DIR=/var/cache/jewbuntu-install
LOG=/var/log/jewbuntu-install.log
{
  echo "== $(date -R) Jewbuntu install from the ISO"
  cat "$DIR/VERSION" 2>/dev/null
  export DEBIAN_FRONTEND=noninteractive
  if apt-get install -y -o Acquire::Retries=1 "$DIR"/debs/*.deb "$DIR"/extra/*.deb; then
    echo "Jewbuntu installed."
    rm -rf "$DIR"
  else
    echo "Jewbuntu could not be installed during setup."
    mkdir -p /usr/local/share/jewbuntu
    cp "$DIR"/debs/*.deb "$DIR"/extra/*.deb /usr/local/share/jewbuntu/ 2>/dev/null
    cat > /usr/local/share/jewbuntu/README.txt <<'TXT'
Jewbuntu could not be installed while Ubuntu was being set up (see /var/log/jewbuntu-install.log).
Connect to the internet, open Terminal and run:
  sudo apt install /usr/local/share/jewbuntu/*.deb
TXT
    rm -rf "$DIR"
  fi
} >> "$LOG" 2>&1
exit 0
