#!/bin/sh
# Runs inside the jewbuntu-fedora-test container (see ci/fedora-test.sh).
set -eu
fail() { echo "FAIL: $*"; exit 1; }
pass() { echo "PASS: $*"; }
G() { XDG_CURRENT_DESKTOP=GNOME GSETTINGS_BACKEND=memory gsettings get "$@"; }
GREETER() { DCONF_PROFILE=gdm XDG_CURRENT_DESKTOP=GNOME-Greeter:GNOME gsettings get "$@"; }
PKGS="jewbuntu-skin jewbuntu-icons jewbuntu-core jewbuntu-asahi-desktop jewbuntu-jewish-service jewbuntu-hub jewbuntu-branding"
# jewbuntu-shulgo is built separately from the private ShulGo repo (ci/build-shulgo-rpm.sh): tested when present.
SHULGO_RPM=$(ls /rpms/jewbuntu-shulgo-*.rpm 2>/dev/null | head -1 || true)
[ -n "$SHULGO_RPM" ] && PKGS="$PKGS jewbuntu-shulgo"
LOGO=/usr/share/jewbuntu/branding/jewbuntu-asahi-logo-text-dark.svg
head -2 /etc/os-release; gnome-shell --version
echo "== before: Fedora defaults"
FEDORA_LOGO=$(GREETER org.gnome.login-screen logo); FEDORA_THEME=$(G org.gnome.desktop.interface gtk-theme)
echo "logo=$FEDORA_LOGO gtk-theme=$FEDORA_THEME"

echo "== install"
# The Web Server RPM has its own check (ci/fedora-webserver-check.sh).
FILES=""; for p in $PKGS; do FILES="$FILES $(ls /rpms/$p-[0-9]*.rpm | head -1)"; done
for i in 1 2 3; do dnf -y -q install $FILES >/tmp/install.log 2>&1 && break; sleep 5; done || { tail -20 /tmp/install.log; fail "dnf install"; }
rpm -q $PKGS || fail "packages not installed"
pass "installed with dependencies from Fedora's repositories"
[ -z "$(rpm -q --scripts $PKGS)" ] && pass "no install/remove scriptlets (caches come from Fedora's file triggers)" || fail "scriptlets present"
rpm -q --requires $PKGS | grep -iE "^jewbuntu|conflict|obsolete" | sort -u
[ -z "$(rpm -q --conflicts --obsoletes $PKGS 2>/dev/null | grep -v '^$')" ] && pass "no Conflicts/Obsoletes" || fail "Conflicts/Obsoletes present"
# One rpm database pass: every path any non-Jewbuntu package lists, against our files (not dirs).
rpm -qa --qf '%{NAME}\n' | grep -v '^jewbuntu-' | xargs rpm -ql 2>/dev/null | sort -u > /tmp/theirs
for p in $PKGS; do rpm -ql "$p"; done | while read -r f; do [ -d "$f" ] && [ ! -L "$f" ] || echo "$f"; done | sort -u > /tmp/ours
others=$(comm -12 /tmp/ours /tmp/theirs)
[ -z "$others" ] && pass "every file is owned only by a Jewbuntu package" || fail "files shared with: $others"
[ -d /usr/share/themes/Jewbuntu-Light/gnome-shell ] && [ -f /usr/share/icons/Jewbuntu/index.theme ] && [ -f "$LOGO" ] && pass "skin, icons and login logo present" || fail "files missing"
grep -q '"51"' /usr/share/gnome-shell/extensions/jewbuntu-look@jewbuntu/metadata.json && pass "Jewbuntu Look declares GNOME Shell 51" || fail "Jewbuntu Look metadata"
jewbuntu version

check_defaults() {
  python3 -B - <<'PY' || fail "defaults ($1)"
import os, sys
sys.path.insert(0, "/usr/lib/jewbuntu/python")
os.environ.update(XDG_CURRENT_DESKTOP="GNOME", GSETTINGS_BACKEND="memory")
from jewbuntu import desktop_defaults as dd
rows = dd.status()
bad = [f"{r['schema']} {r['key']}: {r['current']} (want {r['value']})" for r in rows if not (r["schema_installed"] and r["matches_jewbuntu"])]
print("\n".join(bad))
sys.exit(1 if bad else 0)
PY
  pass "all $(python3 -c 'import json;print(len(json.load(open("/usr/share/jewbuntu/desktop-defaults.json"))["keys"]))') Jewbuntu defaults active for a new account ($1)"
  [ "$(GREETER org.gnome.login-screen logo)" = "'$LOGO'" ] && pass "GDM shows \"Jewbuntu for Asahi Linux\" ($1)" || fail "GDM logo is $(GREETER org.gnome.login-screen logo) ($1)"
}
echo "== defaults"
check_defaults "after install"

echo "== Jewish calendar service, startup jingle"
mkdir -p /home/t/.config/jewbuntu
echo '{"schema_version":2,"location":{"name":"Toronto","latitude":43.65333,"longitude":-79.38389,"timezone":"America/Toronto"},"calendar":{"candle_lighting_minutes":18}}' > /home/t/.config/jewbuntu/settings.json
chown -R t:t /home/t/.config
J=$(su t -c 'dbus-run-session -- gdbus call --session --dest org.jewbuntu.Jewish1 --object-path /org/jewbuntu/Jewish1 --method org.jewbuntu.Jewish1.GetDay' 2>/dev/null || true)
echo "$J" | grep -q '"hebrew' && echo "$J" | grep -qi 'sunset\|shkia\|zmanim' && pass "calendar service starts on demand over D-Bus and answers GetDay (Toronto)" || fail "GetDay: $(echo "$J" | cut -c1-200)"
head -c 4 /usr/share/jewbuntu/sounds/jewbuntu-startup.wav | grep -q RIFF && pass "startup jingle rendered at build" || fail "jingle"
su t -c 'jewbuntu startup-sound --help' >/dev/null 2>&1 && pass "jewbuntu startup-sound available" || fail "startup-sound command"
[ -f /usr/share/applications/org.jewbuntu.Hub.desktop ] && pass "Hub in the app grid" || fail "Hub desktop file"

echo "== existing account: apply / undo (keyfile backend)"
su t -c 'set -eu; export GSETTINGS_BACKEND=keyfile XDG_CURRENT_DESKTOP=GNOME
  gsettings set org.gnome.desktop.input-sources sources "[(\"xkb\", \"us\")]"
  gsettings set org.gnome.shell.extensions.dash-to-dock dock-position LEFT
  gsettings set org.gnome.shell enabled-extensions "[\"background-logo@fedorahosted.org\"]"
  mkdir -p ~/.config/gtk-4.0 && echo "/* mine */" > ~/.config/gtk-4.0/gtk.css
  jewbuntu skin apply
  [ "$(gsettings get org.gnome.desktop.input-sources sources)" = "[('"'"'xkb'"'"', '"'"'us'"'"'), ('"'"'xkb'"'"', '"'"'il'"'"')]" ] || { echo "FAIL: Hebrew not appended"; exit 1; }
  [ "$(gsettings get org.gnome.shell.extensions.dash-to-dock dock-position)" = "'"'"'BOTTOM'"'"'" ] || { echo "FAIL: dock"; exit 1; }
  E=$(gsettings get org.gnome.shell enabled-extensions); echo "extensions: $E"
  for u in background-logo@fedorahosted.org user-theme@gnome-shell-extensions.gcampax.github.com dash-to-dock@micxgx.gmail.com blur-my-shell@aunetx jewbuntu-look@jewbuntu; do
    case "$E" in *"$u"*) ;; *) echo "FAIL: $u not enabled"; exit 1;; esac; done
  [ "$(readlink -f ~/.config/gtk-4.0/gtk.css)" = /usr/share/themes/Jewbuntu-Light/gtk-4.0/gtk.css ] || { echo "FAIL: libadwaita link"; exit 1; }
  echo "PASS: apply appended Hebrew, set the dock, enabled the 4 skin extensions (kept the user'"'"'s own), linked GTK4 to the skin"
  jewbuntu skin undo >/dev/null
  [ "$(gsettings get org.gnome.shell.extensions.dash-to-dock dock-position)" = "'"'"'LEFT'"'"'" ] || { echo "FAIL: undo dock"; exit 1; }
  [ "$(gsettings get org.gnome.shell enabled-extensions)" = "['"'"'background-logo@fedorahosted.org'"'"']" ] || { echo "FAIL: undo extensions"; exit 1; }
  grep -q mine ~/.config/gtk-4.0/gtk.css || { echo "FAIL: undo GTK4"; exit 1; }
  echo "PASS: undo restored dock, extensions and the user'"'"'s own GTK4 file"
  rm -rf ~/.config/glib-2.0 ~/.config/gtk-4.0 ~/.local/state/jewbuntu'

echo "== real GNOME Shell (headless) with the look applied"
mkdir -p /run/dbus && dbus-daemon --system --fork
rm -rf /run/systemd/seats   # no logind in a container: let the shell use its no-logind fallback
# Test account only: mark Fedora's first-login tour as shown so the screenshot shows the desktop.
EXTRA=""; [ -n "$SHULGO_RPM" ] && EXTRA="shulgo@jewbuntu.org"
cat > /tmp/session.sh <<SH
set -e
gsettings set org.gnome.shell welcome-dialog-last-shown-version 999
jewbuntu skin apply >/dev/null
if [ -n "$EXTRA" ]; then  # ShulGo is enabled like any extension the user turns on
  cur=\$(gsettings get org.gnome.shell enabled-extensions)
  gsettings set org.gnome.shell enabled-extensions "\${cur%]}, '$EXTRA']"
fi
EXTRA_EXTS="$EXTRA" HUB_SHOT=/tmp/fedora-hub.png sh /ci/fedora-shell-check.sh /tmp/fedora-shell.png
SH
su t -c 'dbus-run-session -- sh /tmp/session.sh' 2>/dev/null | grep -E "^(PASS|FAIL|SKIP|INFO)" | tee /tmp/shell.txt
[ -s /tmp/fedora-shell.png ] && cp /tmp/fedora-shell.png /out/fedora-shell.png || true
[ -s /tmp/fedora-hub.png ] && cp /tmp/fedora-hub.png /out/fedora-hub.png || true
grep -q "^FAIL" /tmp/shell.txt && fail "GNOME Shell check"

echo "== Fedora update of gnome-shell, gdm and the extensions (reinstall = same file writes and triggers)"
for i in 1 2 3; do dnf -y -q reinstall gnome-shell gdm gnome-shell-extension-user-theme gnome-shell-extension-dash-to-dock gnome-shell-extension-blur-my-shell glib2 >/tmp/re.log 2>&1 && break; sleep 5; done || { tail -20 /tmp/re.log; fail "reinstall"; }
rpm -V $PKGS && pass "Jewbuntu files unchanged (rpm -V clean)" || fail "rpm -V reports changes"
check_defaults "after the update"
su t -c "EXTRA_EXTS='$EXTRA' dbus-run-session -- sh /ci/fedora-shell-check.sh" 2>/dev/null | grep -E "^(PASS|FAIL)" | sed 's/$/ (after the update)/' | tee /tmp/shell2.txt
grep -q "^FAIL" /tmp/shell2.txt && fail "GNOME Shell check after update"

echo "== remove jewbuntu-asahi-desktop: Fedora's defaults come back"
dnf -y -q remove jewbuntu-asahi-desktop >/dev/null
[ "$(GREETER org.gnome.login-screen logo)" = "$FEDORA_LOGO" ] && pass "GDM logo back to Fedora's" || fail "logo after remove"
[ "$(G org.gnome.desktop.interface gtk-theme)" = "$FEDORA_THEME" ] && pass "GTK theme default back to Fedora's" || fail "gtk-theme after remove"
[ -f /home/t/.local/state/jewbuntu/skin.json ] && pass "per-user Jewbuntu data kept" || fail "user data removed"
echo "== remove everything"
dnf -y -q remove $PKGS >/dev/null 2>&1 || true
left=$(ls -d /usr/share/themes/Jewbuntu* /usr/share/icons/Jewbuntu* /usr/share/jewbuntu /usr/lib/jewbuntu /usr/share/glib-2.0/schemas/zz_jewbuntu* 2>/dev/null || true)
[ -z "$left" ] && pass "nothing left under /usr" || fail "left behind: $(find $left | head)"
[ -f /home/t/.local/state/jewbuntu/skin.json ] && pass "per-user data still kept after full removal" || fail "user data removed"
echo "ALL PASS"
