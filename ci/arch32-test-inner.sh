#!/bin/sh
# Runs inside the jewbuntu-arch32-test container (see ci/arch32-test.sh).
set -eu
fail() { echo "FAIL: $*"; exit 1; }
pass() { echo "PASS: $*"; }
PKGS="jewbuntu-skin jewbuntu-icons jewbuntu-core jewbuntu-xfce-desktop"
OVERLAY=/etc/xdg/jewbuntu
WALL=/usr/share/backgrounds/Jewbuntu/Jewbuntu-star-blue.jpg
# Run as the test account with a fresh session bus (xfconfd starts on demand). J = the Jewbuntu
# session's directories, S = the stock Xfce session's.
as_t() { printf '%s\n' "$2" > /tmp/cmd.sh; chmod 644 /tmp/cmd.sh; su t -c "env XDG_CONFIG_DIRS=$1 dbus-run-session -- sh /tmp/cmd.sh" 2>/dev/null; }
J() { as_t "$OVERLAY:/etc/xdg" "$1"; }
S() { as_t /etc/xdg "$1"; }
q() { echo "xfconf-query -c $1 -p $2"; }
echo "INFO: Arch Linux 32 workaround in place: $(pacman -Q pango) held ($(grep '^IgnorePkg' /etc/pacman.conf)), fontconfig $(pacman -Q fontconfig | cut -d' ' -f2)"
echo "$(uname -m) $(sed -n 's/^PRETTY_NAME=//p' /etc/os-release) / $(pacman -Q xfce4-session xfconf xfwm4 python | tr '\n' ' ')"
mkdir -p /run/dbus && dbus-daemon --system --fork 2>/dev/null || true
STOCK_THEME=$(S "$(q xsettings /Net/ThemeName)" || true)
STOCK_BUTTONS=$(S "$(q xfwm4 /general/button_layout)" || true)
echo "stock Xfce: theme=${STOCK_THEME:-unset} buttons=${STOCK_BUTTONS:-unset}"

echo "== install"
pacman -U --noconfirm --noprogressbar /pkgs/*.pkg.tar.zst >/tmp/install.log 2>&1 || { tail -20 /tmp/install.log; fail "pacman -U"; }
pacman -Q $PKGS || fail "packages not installed"
pass "installed with Arch Linux 32's own packages (pacman refuses files owned by other packages)"
for p in $PKGS; do pacman -Qi "$p" | grep -Eq '^Install Script +: No' || fail "$p has an install script"; done
pass "no install scripts (pacman hooks rebuild icon, font and desktop caches)"
pacman -Qi $PKGS | grep -E '^(Conflicts With|Replaces)' | grep -v ': None$' && fail "Conflicts/Replaces present" || pass "no Conflicts/Replaces"
pacman -Qi $PKGS | grep '^Architecture' | grep -v ': any$' && fail "not arch=any" || pass "all four packages are arch=any"
pacman -Qi $PKGS | awk -F': ' '/^Name/{n=$2}/^Installed Size/{print "INFO: " n " " $2}'
mine=$(pacman -Qlq $PKGS | grep -E '^/etc/xdg/xfce4/|^/usr/share/xfce4/|^/etc/lightdm/' || true)
[ -z "$mine" ] && pass "nothing in Xfce's or LightDM's own config directories" || fail "in distro dirs: $mine"
[ -f /usr/share/themes/Jewbuntu-Light-solid/xfwm4/themerc ] && [ -f /usr/share/themes/Jewbuntu-Light-solid/gtk-2.0/gtkrc ] \
  && [ -f /usr/share/icons/Jewbuntu/index.theme ] && [ -f "$WALL" ] && pass "skin (GTK2/3, xfwm4), icons, wallpaper present" || fail "files missing"
ls -d /usr/share/themes/Jewbuntu*/gnome-shell 2>/dev/null && fail "GNOME Shell theme shipped" || true
size=$(file -b "$WALL" | grep -o '[0-9]*x[0-9]*' | tail -1); [ "$size" = 1400x1050 ] && pass "wallpaper scaled to $size JPEG" || fail "wallpaper is $size"
grep -q svg /usr/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache && pass "SVG image loader registered (libxml2-legacy + Jewbuntu's loader hook)" || fail "no SVG loader: icons cannot draw"
ls /usr/lib/jewbuntu/python/jewbuntu/__pycache__/cli.cpython-*.pyc >/dev/null && pass "jewbuntu CLI precompiled" || fail "no bytecode"
jewbuntu version

cat > /tmp/check.py <<'PY'
import sys
sys.path.insert(0, "/usr/lib/jewbuntu/python")
from jewbuntu import desktop_defaults as dd
assert dd.backend() == "xfconf", dd.backend()
rows = dd.status()
bad = [f"{r['schema']} {r['key']}: {r['current']} (want {r['value']})" for r in rows if not r["matches_jewbuntu"]]
print("\n".join(bad) if bad else "OK %d" % len(rows))
PY
chmod 644 /tmp/check.py
check_defaults() {
  out=$(J "python3 -B /tmp/check.py")
  case "$out" in "OK "*) pass "all ${out#OK } Jewbuntu defaults active for a new account in the Jewbuntu session ($1)";; *) fail "defaults ($1): $out";; esac
  w=$(J "$(q xfce4-desktop /backdrop/screen0/monitorVirtual-1/workspace0/last-image)")
  [ "$w" = "$WALL" ] && pass "Jewbuntu wallpaper ($1)" || fail "wallpaper is $w ($1)"
}
echo "== defaults"
check_defaults "after install"
# xfconf merges our channel files over Xfce's: a stock property we do not set must still be there.
prop=$(python3 - <<'PY'
import xml.etree.ElementTree as ET
def leaves(f):
    out = {}
    def walk(n, pre):
        for p in n.findall("property"):
            path = pre + "/" + p.get("name")
            if p.get("type") not in ("empty", "array"):
                out[path] = p.get("value")
            walk(p, path)
    walk(ET.parse(f).getroot(), "")
    return out
stock = leaves("/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml")
ours = leaves("/etc/xdg/jewbuntu/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml")
k = next(k for k in sorted(stock) if k not in ours and stock[k])
print(k, stock[k])
PY
)
got=$(J "$(q xsettings "${prop% *}")")
[ "$got" = "${prop#* }" ] && pass "Xfce's own defaults still apply where Jewbuntu sets none (${prop% *}=$got)" || fail "merge: ${prop% *}=$got, stock ${prop#* }"
[ "$(S "$(q xsettings /Net/ThemeName)" || true)" = "$STOCK_THEME" ] && pass "stock Xfce session untouched (theme ${STOCK_THEME:-unset})" || fail "stock session changed"

echo "== existing account in the stock Xfce session: apply / undo (real xfconfd)"
S "set -e
  xfconf-query -c keyboard-layout -p /Default/XkbLayout -n -t string -s de
  xfconf-query -c keyboard-layout -p /Default/XkbVariant -n -t string -s nodeadkeys
  xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitorLVDS1/workspace0/last-image -n -t string -s /usr/share/backgrounds/xfce/xfce-shapes.svg
  jewbuntu skin status | grep -qi wallpaper
  jewbuntu skin apply >/tmp/apply.txt
  test \"\$($(q xsettings /Net/ThemeName))\" = Jewbuntu-Light-solid || { echo FAIL: theme; exit 1; }
  test \"\$($(q xfwm4 /general/button_layout))\" = \"CHM|\" || { echo FAIL: buttons; exit 1; }
  test \"\$($(q keyboard-layout /Default/XkbLayout))\" = de,il || { echo FAIL: layout; exit 1; }
  test \"\$($(q keyboard-layout /Default/XkbVariant))\" = nodeadkeys, || { echo FAIL: variant; exit 1; }
  test \"\$($(q xfce4-desktop /backdrop/screen0/monitorLVDS1/workspace0/last-image))\" = $WALL || { echo FAIL: wallpaper; exit 1; }
  echo PASS: apply set the skin, left-side buttons, wallpaper, and appended Hebrew to the German keyboard
  jewbuntu skin undo >/dev/null
  test \"\$($(q keyboard-layout /Default/XkbLayout))\" = de || { echo FAIL: undo layout; exit 1; }
  test \"\$($(q keyboard-layout /Default/XkbVariant))\" = nodeadkeys || { echo FAIL: undo variant; exit 1; }
  test \"\$($(q xfce4-desktop /backdrop/screen0/monitorLVDS1/workspace0/last-image))\" = /usr/share/backgrounds/xfce/xfce-shapes.svg || { echo FAIL: undo wallpaper; exit 1; }
  test \"\$($(q xsettings /Net/ThemeName) 2>/dev/null)\" = \"$STOCK_THEME\" || { echo FAIL: undo theme; exit 1; }
  echo PASS: undo restored keyboard, wallpaper and theme" | tee /tmp/s1.txt
grep -q "^PASS: undo" /tmp/s1.txt || fail "apply/undo in the stock session"
echo "== existing account in the Jewbuntu session: own choice reset to Jewbuntu default, undo returns it"
J "set -e
  xfconf-query -c xsettings -p /Net/ThemeName -n -t string -s Adwaita
  jewbuntu skin apply >/dev/null
  test \"\$($(q xsettings /Net/ThemeName))\" = Jewbuntu-Light-solid || { echo FAIL: theme; exit 1; }
  jewbuntu skin undo >/dev/null
  test \"\$($(q xsettings /Net/ThemeName))\" = Adwaita || { echo FAIL: undo; exit 1; }
  xfconf-query -c xsettings -p /Net/ThemeName -r
  echo PASS: Jewbuntu session apply/undo" | tee /tmp/s2.txt
grep -q "^PASS" /tmp/s2.txt || fail "apply/undo in the Jewbuntu session"

echo "== LightDM"
lightdm --show-config 2>&1 | grep -E 'user-session=jewbuntu' && pass "LightDM default session is Jewbuntu (from /usr/share/lightdm/lightdm.conf.d)" || fail "lightdm config: $(lightdm --show-config 2>&1 | tail -5)"
grep -aq 'lightdm-gtk-greeter.conf.d' /usr/bin/lightdm-gtk-greeter && pass "greeter reads lightdm-gtk-greeter.conf.d (Jewbuntu theme, icons, wallpaper)" || fail "greeter has no conf.d support"

echo "== real Xfce session (startjewbuntu on Xvfb 1024x768x24)"
rm -rf /home/t/.config/xfce4 /home/t/.cache/sessions
# Output to a file, not a pipe: D-Bus-started session daemons inherit it and would keep a pipe open.
su t -c 'sh /ci/arch32-session-check.sh /tmp/arch32-xfce.png' >/tmp/session.raw 2>&1 || true
pkill -u t 2>/dev/null; sleep 2; pkill -9 -u t 2>/dev/null || true
grep -E "^(PASS|FAIL|INFO)" /tmp/session.raw | tee /tmp/session.txt
[ -s /tmp/arch32-xfce.png ] && cp /tmp/arch32-xfce.png /out/arch32-xfce.png || true
grep -q "^FAIL" /tmp/session.txt && fail "Xfce session check"
grep -q "^PASS" /tmp/session.txt || fail "Xfce session check printed nothing"

echo "== Arch update of Xfce and LightDM (reinstall = same file writes and hooks)"
ok=0; for i in 1 2 3; do pacman -S --noconfirm --noprogressbar xfce4-session xfwm4 xfdesktop xfce4-panel xfce4-settings xfconf lightdm lightdm-gtk-greeter >/tmp/re.log 2>&1 && { ok=1; break; }; sleep 5; done
[ "$ok" = 1 ] || { tail -20 /tmp/re.log; fail "reinstall"; }
pacman -Qkk $PKGS >/tmp/qkk.txt 2>&1 && pass "Jewbuntu files unchanged (pacman -Qkk clean)" || { cat /tmp/qkk.txt; fail "pacman -Qkk"; }
check_defaults "after the update"

echo "== remove jewbuntu-xfce-desktop: Xfce's defaults come back"
pacman -R --noconfirm jewbuntu-xfce-desktop >/dev/null
[ "$(J "$(q xsettings /Net/ThemeName)" || true)" = "$STOCK_THEME" ] && pass "theme default back to Xfce's" || fail "theme after remove"
[ ! -e /usr/share/xsessions/jewbuntu.desktop ] && [ ! -e $OVERLAY ] && pass "Jewbuntu session and defaults gone" || fail "session left behind"
[ -f /home/t/.local/state/jewbuntu/skin.json ] && pass "per-user Jewbuntu data kept" || fail "user data removed"
echo "== remove everything"
pacman -R --noconfirm jewbuntu-core jewbuntu-skin jewbuntu-icons >/dev/null
left=$(ls -d /usr/share/themes/Jewbuntu* /usr/share/icons/Jewbuntu* /usr/share/backgrounds/Jewbuntu /usr/share/jewbuntu /usr/lib/jewbuntu $OVERLAY /etc/fonts/conf.d/65-jewbuntu* 2>/dev/null || true)
[ -z "$left" ] && pass "nothing left behind" || fail "left behind: $left"
[ -f /home/t/.local/state/jewbuntu/skin.json ] && pass "per-user data still kept after full removal" || fail "user data removed"
echo "ALL PASS"
