#!/bin/sh
# Runs inside the Cutefish test image (ci/Dockerfile.cutefish) as root, with the packages in /pkgs
# and results going to /out. Called by ci/cutefish-test.sh.
set -u
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "PASS  $*"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL  $*"; }
check() { d="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$d"; else bad "$d"; fi; }
ARCH="$(dpkg --print-architecture)"
SHELLDIR=/usr/share/cutefish-compositor/shell
BG=/usr/share/backgrounds/cutefishos
echo "== Debian $(cat /etc/debian_version) $ARCH, cutefish-compositor $(dpkg-query -W -f='${Version}' cutefish-compositor)"
ORIG_SUM="$(sha256sum $SHELLDIR/launchpad.svg | cut -d' ' -f1)"

echo "== install"
for i in 1 2 3; do apt-get update -q >/dev/null 2>&1 && break; sleep 5; done
if DEBIAN_FRONTEND=noninteractive apt-get install -y -q /pkgs/*.deb > /tmp/apt.log 2>&1; then ok "apt installs $(ls /pkgs | tr '\n' ' ')"; else bad "apt install"; tail -20 /tmp/apt.log; fi
check "Launchpad picture diverted by jewbuntu-cutefish" sh -c "dpkg-divert --list $SHELLDIR/launchpad.svg | grep -q jewbuntu-cutefish"
check "Launchpad picture is the Star of David" grep -q "Star of David" $SHELLDIR/launchpad.svg
check "Cutefish's own Launchpad picture kept aside, unchanged" sh -c "[ \"\$(sha256sum $SHELLDIR/launchpad.svg.cutefish | cut -d' ' -f1)\" = $ORIG_SUM ]"
check "light wallpaper installed (JPEG, which Cutefish draws)" sh -c "file $BG/jewbuntu-star-blue.jpg | grep -q JPEG"
check "dark wallpaper installed (JPEG)" sh -c "file $BG/jewbuntu-star-purple.jpg | grep -q JPEG"
check "Cutefish's default wallpaper untouched" test -s $BG/default.jpg
for f in jewbuntu-cutefish.desktop jewbuntu-startup-sound.desktop shulgo-xfce.desktop; do
  check "autostart entry $f" test -f /etc/xdg/autostart/$f
done
check "jingle file present" test -s /usr/share/jewbuntu/sounds/jewbuntu-startup.wav
check "ShulGo icon in hicolor" test -f /usr/share/icons/hicolor/scalable/apps/shulgo.svg

echo "== a desktop session (headless compositor, Cutefish settings service, PipeWire)"
useradd -m -s /bin/sh fresh; useradd -m -s /bin/sh chooser
cat > /tmp/session.sh <<'EOS'
#!/bin/sh
# Starts what a Cutefish login starts, without a screen: the compositor (which draws the dock, top
# bar and tray), the settings service, PipeWire, then the three Jewbuntu autostart programs.
export XDG_RUNTIME_DIR=/tmp/rt-$(id -u); mkdir -p $XDG_RUNTIME_DIR; chmod 700 $XDG_RUNTIME_DIR
eval $(dbus-launch --sh-syntax); echo "export DBUS_SESSION_BUS_ADDRESS='$DBUS_SESSION_BUS_ADDRESS'" > $XDG_RUNTIME_DIR/env
export XDG_CURRENT_DESKTOP=Cutefish XDG_SESSION_TYPE=wayland WAYLAND_DISPLAY=wayland-1
echo "export XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR WAYLAND_DISPLAY=wayland-1 XDG_CURRENT_DESKTOP=Cutefish" >> $XDG_RUNTIME_DIR/env
(cutefish-compositor --no-drm --no-xwayland --socket wayland-1 --headless-outputs 1 \
   --capture-client /usr/bin/cutefish-screenshot > ~/compositor.log 2>&1 &)
sleep 4
(cutefish-services > ~/services.log 2>&1 &)
(pipewire > ~/pipewire.log 2>&1 &); sleep 1; (wireplumber > ~/wireplumber.log 2>&1 &); sleep 3
# No sound card in a container: a null output stands in for the speakers.
pw-cli create-node adapter '{ factory.name=support.null-audio-sink node.name=jewbuntu-test-out media.class=Audio/Sink object.linger=true audio.position=[ FL FR ] }' >/dev/null 2>&1; sleep 2
EOS
chmod 755 /tmp/session.sh
run_as() { u="$1"; shift; su "$u" -c ". /tmp/rt-\$(id -u)/env; $*"; }
prop() { run_as "$1" "gdbus call --session --dest org.cutefish.Services --object-path /org/cutefish/Services/Appearance --method org.freedesktop.DBus.Properties.Get org.cutefish.Services.Appearance $2"; }
wp_is() { prop "$1" wallpaper | grep -q "$2"; }
setwp() { run_as "$1" "gdbus call --session --dest org.cutefish.Services --object-path /org/cutefish/Services/Appearance --method org.cutefish.Services.Appearance.$2" >/dev/null; }

# --- account 1: brand new, still on Cutefish's default wallpaper
su fresh -c /tmp/session.sh
check "fresh: Cutefish default wallpaper before Jewbuntu runs" wp_is fresh default.jpg
run_as fresh "nohup jewbuntu-cutefish-session > ~/jcs.log 2>&1 &"; sleep 4
check "fresh: Jewbuntu blue wallpaper set at first login (light mode)" wp_is fresh jewbuntu-star-blue.jpg
check "fresh: saved in Cutefish's own settings file" grep -q "Wallpaper=$BG/jewbuntu-star-blue.jpg" /home/fresh/.config/cutefish/services.conf
check "fresh: state file written" grep -q '"applied": true' /home/fresh/.local/state/jewbuntu/cutefish-skin.json
setwp fresh "setDarkMode true"; sleep 3
check "fresh: dark mode switches to the purple wallpaper" wp_is fresh jewbuntu-star-purple.jpg
setwp fresh "setDarkMode false"; sleep 3
check "fresh: light mode switches back to blue" wp_is fresh jewbuntu-star-blue.jpg
setwp fresh "setWallpaper '$BG/wallpaper-2.jpg'"; sleep 1
setwp fresh "setDarkMode true"; sleep 3
check "fresh: a wallpaper the user picks is never switched" wp_is fresh wallpaper-2.jpg
setwp fresh "setDarkMode false"; sleep 1

echo "== jingle"
J="$(run_as fresh 'jewbuntu-startup-sound; cat ~/.local/state/jewbuntu/startup-sound.last' 2>&1)"; echo "   $J" | tail -2
echo "$J" | grep -q "played" && ok "startup jingle plays at sign-in (PipeWire dummy output)" || bad "startup jingle: $J"
J2="$(run_as fresh 'jewbuntu-startup-sound; cat ~/.local/state/jewbuntu/startup-sound.last' 2>&1)"
echo "$J2" | grep -q "already played this boot" && ok "jingle plays only once per boot" || bad "jingle second run: $J2"

echo "== ShulGo"
run_as fresh "shulgo-xfce --check" > /tmp/sg-check.txt 2>&1; sed 's/^/   /' /tmp/sg-check.txt
grep -q -i "ayatana" /tmp/sg-check.txt && ok "ShulGo finds its tray library (AyatanaAppIndicator3)" || bad "ShulGo tray library"
# Cutefish's top bar (and the tray watcher inside it) runs only with a real display, which a
# container doesn't have, so a minimal stand-in watcher (ci/sni-watcher-standin.py) takes its place:
# it shows that ShulGo announces itself over the tray protocol Cutefish's top bar implements
# (StatusNotifierItem + DBusMenu). Seeing it drawn needs a real Cutefish screen.
run_as fresh "nohup python3 /standin.py > ~/standin.log 2>&1 &"; sleep 2
run_as fresh "nohup shulgo-xfce > ~/shulgo.log 2>&1 &"; sleep 6
ITEMS="$(run_as fresh 'gdbus call --session --dest org.kde.StatusNotifierWatcher --object-path /StatusNotifierWatcher --method org.freedesktop.DBus.Properties.Get org.kde.StatusNotifierWatcher RegisteredStatusNotifierItems' 2>&1)"
echo "   tray items: $ITEMS"
echo "$ITEMS" | grep -q "/" && ok "ShulGo registers as a tray item (stand-in watcher)" || bad "ShulGo did not register as a tray item"
ITEM="$(echo "$ITEMS" | sed -n "s/.*'\([^']*\)'.*/\1/p" | head -1)"
SVC="${ITEM%%/*}"; OBJ="/${ITEM#*/}"
MENU="$(run_as fresh "gdbus call --session --dest $SVC --object-path $OBJ --method org.freedesktop.DBus.Properties.Get org.kde.StatusNotifierItem Menu" 2>&1)"
echo "   menu: $MENU"
echo "$MENU" | grep -q "objectpath" && ok "ShulGo's tray item has a DBusMenu (what Cutefish's tray opens)" || bad "no DBusMenu on ShulGo's item"
ICON="$(run_as fresh "gdbus call --session --dest $SVC --object-path $OBJ --method org.freedesktop.DBus.Properties.Get org.kde.StatusNotifierItem IconName" 2>&1)"
echo "   icon: $ICON"
echo "$ICON" | grep -q shulgo && ok "ShulGo's tray icon is named shulgo (installed in hicolor)" || bad "tray icon name: $ICON"
pgrep -u fresh -f shulgo_xfce >/dev/null && ok "ShulGo still running" || { bad "ShulGo exited"; tail -5 /home/fresh/shulgo.log; }

# --- account 2: had already chosen a wallpaper before Jewbuntu was installed
su chooser -c /tmp/session.sh
setwp chooser "setWallpaper '$BG/wallpaper-3.jpg'"; sleep 1
run_as chooser "nohup jewbuntu-cutefish-session > ~/jcs.log 2>&1 &"; sleep 4
check "chooser: an account's own wallpaper is kept at first login" wp_is chooser wallpaper-3.jpg
run_as chooser "jewbuntu-cutefish-session --apply" >/dev/null 2>&1
check "chooser: --apply sets the Jewbuntu wallpaper on request" wp_is chooser jewbuntu-star
run_as chooser "jewbuntu-cutefish-session --undo" >/dev/null 2>&1
check "chooser: --undo goes back to Cutefish's default" wp_is chooser default.jpg
check "chooser: --undo is remembered" grep -q '"undone": true' /home/chooser/.local/state/jewbuntu/cutefish-skin.json

# --- an account the first build (PNG wallpapers, which Cutefish never drew) had set up
setwp chooser "setWallpaper '$BG/jewbuntu-star-blue.png'"; sleep 1
run_as chooser "jewbuntu-cutefish-session --status >/dev/null; nohup jewbuntu-cutefish-session > ~/jcs2.log 2>&1 &"; sleep 4
check "chooser: a wallpaper left by the PNG build is moved to the JPEG" wp_is chooser jewbuntu-star-blue.jpg

echo "== remove"
DEBIAN_FRONTEND=noninteractive apt-get remove -y -q jewbuntu-cutefish shulgo-xfce > /tmp/rm.log 2>&1 && ok "apt remove" || bad "apt remove"
check "Cutefish's own Launchpad picture is back" sh -c "[ \"\$(sha256sum $SHELLDIR/launchpad.svg | cut -d' ' -f1)\" = $ORIG_SUM ]"
check "no diversion left" sh -c "! dpkg-divert --list | grep -q jewbuntu"
check "home files kept on removal" test -f /home/fresh/.local/state/jewbuntu/cutefish-skin.json

for f in compositor services jcs shulgo; do cp /home/fresh/$f.log /out/$f-fresh.log 2>/dev/null; done
echo "== $ARCH: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
