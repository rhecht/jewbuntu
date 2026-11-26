#!/bin/sh
# Test VM only. Runs in the Cutefish session as the live user: records what the skin did, takes
# Cutefish's own screenshots in light and dark mode, then serves them on port 8765 for the host.
O=/tmp/jewbuntu-vm; mkdir -p $O
sleep 35
# The live system opens Cutefish's own installer, which would hide the wallpaper; close it.
pkill -f cutefish-installer; sleep 2
A="--session --dest org.cutefish.Services --object-path /org/cutefish/Services/Appearance"
{
  date; uname -m
  echo "== packages"; dpkg-query -W jewbuntu-cutefish shulgo-xfce jewbuntu-branding jewbuntu-core
  echo "== launchpad"; dpkg-divert --list | grep launchpad; grep -c "Star of David" /usr/share/cutefish-compositor/shell/launchpad.svg
  echo "== wallpaper helper"; jewbuntu-cutefish-session --status
  echo "== jingle"; cat ~/.local/state/jewbuntu/startup-sound.last
  echo "== tray"; gdbus call --session --dest org.kde.StatusNotifierWatcher --object-path /StatusNotifierWatcher --method org.freedesktop.DBus.Properties.Get org.kde.StatusNotifierWatcher RegisteredStatusNotifierItems
  N=$(gdbus call --session --dest org.kde.StatusNotifierWatcher --object-path /StatusNotifierWatcher --method org.freedesktop.DBus.Properties.Get org.kde.StatusNotifierWatcher RegisteredStatusNotifierItems | grep -o "org.kde.StatusNotifierItem-[0-9]*-1")
  echo "== ShulGo item ($N)"
  for p in ItemIsMenu Menu ToolTip IconName; do echo -n "$p: "; gdbus call --session --dest "$N" --object-path /StatusNotifierItem --method org.freedesktop.DBus.Properties.Get org.kde.StatusNotifierItem $p; done
  shulgo-xfce --check 2>/dev/null | grep -E "^tray"
  echo "== processes"; pgrep -a -f "shulgo_xfce|jewbuntu-cutefish-session"
  echo "== env"; echo "XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP WAYLAND_DISPLAY=$WAYLAND_DISPLAY"
} > $O/status.txt 2>&1
cutefish-screenshot $O/1-light.png >> $O/status.txt 2>&1
gdbus call $A --method org.cutefish.Services.Appearance.setDarkMode true >/dev/null; sleep 8
echo "== after dark mode" >> $O/status.txt; gdbus call $A --method org.freedesktop.DBus.Properties.Get org.cutefish.Services.Appearance wallpaper >> $O/status.txt 2>&1
cutefish-screenshot $O/2-dark.png >> $O/status.txt 2>&1
gdbus call $A --method org.cutefish.Services.Appearance.setDarkMode false >/dev/null; sleep 5
cutefish-screenshot $O/3-light-again.png >> $O/status.txt 2>&1
cp /var/log/jewbuntu-vm-install.log $O/ 2>/dev/null
journalctl --user -b --no-pager 2>/dev/null | grep -i -E "jewbuntu|shulgo|startup" | tail -40 > $O/user-journal.txt
cd $O && exec python3 -m http.server 8765
