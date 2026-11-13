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
OTHERS=$(echo $PKGS | tr ' ' '\n' | grep -vx jewbuntu-asahi-desktop | tr '\n' ' ')
[ -z "$(rpm -q --scripts $OTHERS)" ] && pass "no scriptlets except the login-screen switch (caches come from Fedora's file triggers)" || fail "scriptlets present"
S=$(rpm -q --scripts --triggers jewbuntu-asahi-desktop | grep -vE "^(postinstall|preuninstall|triggerin|triggerpostun)|^$" || true)
[ -n "$S" ] && [ -z "$(echo "$S" | grep -v jewbuntu-login-theme)" ] && pass "asahi-desktop scriptlets only run jewbuntu-login-theme" || fail "unexpected scriptlets: $S"
echo "== login screen (GDM) overlay"
L=/usr/share/jewbuntu/gdm-overlay
[ "$(readlink $L)" = /usr/share/jewbuntu-skin/gdm-overlay/51 ] && pass "login-screen overlay on for GNOME 51 ($L)" || fail "overlay link: $(readlink $L)"
grep -q '^G_RESOURCE_OVERLAYS=/org/gnome/shell/theme=/usr/share/jewbuntu/gdm-overlay' /usr/lib/environment.d/60-jewbuntu-login-theme.conf && pass "G_RESOURCE_OVERLAYS set for sessions and GDM" || fail "environment.d file"
for f in gdm.css gdm-dark.css jewbuntu-gdm/assets/login-background.jpg; do [ -s "$L/$f" ] && pass "overlay has $f" || fail "overlay missing $f"; done
[ ! -e "$L/gnome-shell.css" ] && pass "user-session gnome-shell.css is not overlaid" || fail "gnome-shell.css overlaid"
mv /usr/share/jewbuntu-skin/gdm-overlay/51 /tmp/ov51; /usr/libexec/jewbuntu/jewbuntu-login-theme
[ ! -e "$L" ] && [ ! -L "$L" ] && pass "overlay switches off when the skin has no files for this GNOME (stock login screen)" || fail "overlay still on for unmatched GNOME"
mv /tmp/ov51 /usr/share/jewbuntu-skin/gdm-overlay/51; /usr/libexec/jewbuntu/jewbuntu-login-theme
[ -L "$L" ] && pass "overlay back on when a matching skin is present" || fail "overlay not restored"
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
import subprocess
rows = dd.status()
# Relocatable schemas (Ptyxis profiles) have no fixed path: read their default through any path.
reloc = set(subprocess.run(["gsettings", "list-relocatable-schemas"], capture_output=True, text=True).stdout.split())
for r in rows:
    if not r["schema_installed"] and r["schema"] in reloc:
        out = subprocess.run(["gsettings", "get", f"{r['schema']}:/org/jewbuntu/check/", r["key"]], capture_output=True, text=True)
        if out.returncode == 0:
            r["current"] = out.stdout.strip(); r["schema_installed"] = True
            r["matches_jewbuntu"] = dd._same(r["current"], r["value"])
bad = [f"{r['schema']} {r['key']}: {r['current']} (want {r['value']})" for r in rows if not (r["schema_installed"] and r["matches_jewbuntu"])]
print("\n".join(bad))
sys.exit(1 if bad else 0)
PY
  pass "all $(python3 -c 'import json;print(len(json.load(open("/usr/share/jewbuntu/desktop-defaults.json"))["keys"]))') Jewbuntu defaults active for a new account ($1)"
  [ "$(GREETER org.gnome.login-screen logo)" = "'$LOGO'" ] && pass "GDM shows \"Jewbuntu for Asahi Linux\" ($1)" || fail "GDM logo is $(GREETER org.gnome.login-screen logo) ($1)"
}
echo "== defaults"
check_defaults "after install"

echo "== dock, Fedora watermark, ShulGo widget for a new account"
FAV=$(G org.gnome.shell favorite-apps)
case "$FAV" in *org.jewbuntu.Hub.desktop*org.jewbuntu.WebServer.desktop*) pass "Hub and Web Server pinned in the dock ($FAV)";; *) fail "dock: $FAV";; esac
[ "$(G org.gnome.shell.extensions.background-logo logo-opacity)" = "uint32 0" ] && pass "Fedora's background logo hidden (opacity 0)" || fail "background logo opacity $(G org.gnome.shell.extensions.background-logo logo-opacity)"
if [ -n "$SHULGO_RPM" ]; then
  useradd -m fresh
  E=$(su fresh -c 'export GSETTINGS_BACKEND=keyfile XDG_CURRENT_DESKTOP=GNOME; jewbuntu config migrate --quiet >/dev/null 2>&1; gsettings get org.gnome.shell enabled-extensions')
  case "$E" in *jewbuntu@shulgo.com*) pass "ShulGo widget turned on at a new account's first login";; *) fail "ShulGo not enabled for a new account: $E";; esac
  E2=$(su fresh -c 'export GSETTINGS_BACKEND=keyfile XDG_CURRENT_DESKTOP=GNOME; gsettings set org.gnome.shell enabled-extensions "[]"; jewbuntu config migrate --quiet >/dev/null 2>&1; gsettings get org.gnome.shell enabled-extensions')
  case "$E2" in *jewbuntu@shulgo.com*) fail "ShulGo re-enabled after the user turned it off";; *) pass "ShulGo stays off once the user turns it off";; esac
fi

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
  [ "$(readlink ~/.local/share/org.gnome.Ptyxis/palettes/Jewbuntu.palette)" = /usr/share/jewbuntu/terminal/Jewbuntu.palette ] || { echo "FAIL: Terminal palette link"; exit 1; }
  echo "PASS: apply appended Hebrew, set the dock, enabled the 4 skin extensions (kept the user'"'"'s own), linked GTK4 and the Terminal palette to the skin"
  jewbuntu skin undo >/dev/null
  [ "$(gsettings get org.gnome.shell.extensions.dash-to-dock dock-position)" = "'"'"'LEFT'"'"'" ] || { echo "FAIL: undo dock"; exit 1; }
  # Undo restores the look; the ShulGo widget (its own app, turned on once by m1.29) stays as the user left it.
  U=$(gsettings get org.gnome.shell enabled-extensions)
  case "$U" in "['"'"'background-logo@fedorahosted.org'"'"']"|"['"'"'background-logo@fedorahosted.org'"'"', '"'"'jewbuntu@shulgo.com'"'"']") ;; *) echo "FAIL: undo extensions: $U"; exit 1;; esac
  grep -q mine ~/.config/gtk-4.0/gtk.css || { echo "FAIL: undo GTK4"; exit 1; }
  echo "PASS: undo restored dock, extensions and the user'"'"'s own GTK4 file"
  rm -rf ~/.config/glib-2.0 ~/.config/gtk-4.0 ~/.local/state/jewbuntu ~/.local/share/org.gnome.Ptyxis'

echo "== real GNOME Shell (headless) with the look applied"
mkdir -p /run/dbus && dbus-daemon --system --fork
rm -rf /run/systemd/seats   # no logind in a container: let the shell use its no-logind fallback
# Test account only: mark Fedora's first-login tour as shown so the screenshot shows the desktop.
EXTRA=""; [ -n "$SHULGO_RPM" ] && EXTRA="jewbuntu@shulgo.com"
cat > /tmp/session.sh <<SH
set -e
gsettings set org.gnome.shell welcome-dialog-last-shown-version 999
jewbuntu skin apply >/dev/null
if [ -n "$EXTRA" ]; then
  # An account from before ShulGo's rename: the old UUID is enabled. The login-time
  # migration (jewbuntu config migrate, run as the user) must swap in the new one.
  cur=\$(gsettings get org.gnome.shell enabled-extensions)
  gsettings set org.gnome.shell enabled-extensions "\${cur%]}, 'shulgo@jewbuntu.org']"
  jewbuntu config migrate --quiet >/dev/null 2>&1 || true
  now=\$(gsettings get org.gnome.shell enabled-extensions)
  case "\$now" in *"'$EXTRA'"*) case "\$now" in *shulgo@jewbuntu.org*) echo "FAIL: old ShulGo UUID still enabled: \$now";; *) echo "PASS: login migration replaced shulgo@jewbuntu.org with $EXTRA";; esac;;
    *) echo "FAIL: ShulGo not enabled after migration: \$now";; esac
fi
EXTRA_EXTS="$EXTRA" HUB_SHOT=/tmp/fedora-hub.png sh /ci/fedora-shell-check.sh /tmp/fedora-shell.png
SH
su t -c 'dbus-run-session -- sh /tmp/session.sh' 2>/dev/null | grep -E "^(PASS|FAIL|SKIP|INFO)" | tee /tmp/shell.txt
[ -s /tmp/fedora-shell.png ] && cp /tmp/fedora-shell.png /out/fedora-shell.png || true
[ -s /tmp/fedora-hub.png ] && cp /tmp/fedora-hub.png /out/fedora-hub.png || true
grep -q "^FAIL" /tmp/shell.txt && fail "GNOME Shell check"
if [ -n "$SHULGO_RPM" ] && [ -f /usr/share/glib-2.0/schemas/org.jewbuntu.shulgo.gschema.xml ]; then
  gsettings list-schemas | grep -qx org.jewbuntu.shulgo && pass "old ShulGo schema compiled, so ShulGo can migrate pre-rename settings" || fail "old ShulGo schema not compiled"
fi

echo "== Fedora update of gnome-shell, gdm and the extensions (reinstall = same file writes and triggers)"
for i in 1 2 3; do dnf -y -q reinstall gnome-shell gdm gnome-shell-extension-user-theme gnome-shell-extension-dash-to-dock gnome-shell-extension-blur-my-shell glib2 >/tmp/re.log 2>&1 && break; sleep 5; done || { tail -20 /tmp/re.log; fail "reinstall"; }
rpm -V $PKGS && pass "Jewbuntu files unchanged (rpm -V clean)" || fail "rpm -V reports changes"
[ "$(readlink /usr/share/jewbuntu/gdm-overlay)" = /usr/share/jewbuntu-skin/gdm-overlay/51 ] && pass "login-screen overlay still on after the gnome-shell update" || fail "overlay lost after update"
check_defaults "after the update"
su t -c "EXTRA_EXTS='$EXTRA' dbus-run-session -- sh /ci/fedora-shell-check.sh" 2>/dev/null | grep -E "^(PASS|FAIL)" | sed 's/$/ (after the update)/' | tee /tmp/shell2.txt
grep -q "^FAIL" /tmp/shell2.txt && fail "GNOME Shell check after update"

echo "== remove jewbuntu-asahi-desktop: Fedora's defaults come back"
dnf -y -q remove jewbuntu-asahi-desktop >/dev/null
[ "$(GREETER org.gnome.login-screen logo)" = "$FEDORA_LOGO" ] && pass "GDM logo back to Fedora's" || fail "logo after remove"
[ "$(G org.gnome.desktop.interface gtk-theme)" = "$FEDORA_THEME" ] && pass "GTK theme default back to Fedora's" || fail "gtk-theme after remove"
[ ! -e /usr/share/jewbuntu/gdm-overlay ] && [ ! -e /usr/lib/environment.d/60-jewbuntu-login-theme.conf ] && pass "login-screen overlay and its switch removed" || fail "overlay left after remove"
[ -f /home/t/.local/state/jewbuntu/skin.json ] && pass "per-user Jewbuntu data kept" || fail "user data removed"
echo "== remove everything"
dnf -y -q remove $PKGS >/dev/null 2>&1 || true
left=$(ls -d /usr/share/themes/Jewbuntu* /usr/share/icons/Jewbuntu* /usr/share/jewbuntu /usr/lib/jewbuntu /usr/share/glib-2.0/schemas/zz_jewbuntu* 2>/dev/null || true)
[ -z "$left" ] && pass "nothing left under /usr" || fail "left behind: $(find $left | head)"
[ -f /home/t/.local/state/jewbuntu/skin.json ] && pass "per-user data still kept after full removal" || fail "user data removed"
echo "ALL PASS"
