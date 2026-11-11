#!/bin/sh
# Runs inside the container (see ci/container-test.sh). Fails fast on any unmet expectation.
set -eu
export DEBIAN_FRONTEND=noninteractive
PASS=0
ok()   { PASS=$((PASS+1)); echo "PASS: $*"; }
fail() { echo "FAIL: $*"; exit 1; }
step() { echo; echo "=== $*"; }
as_user() { runuser -u tester -- env HOME=/home/tester XDG_RUNTIME_DIR=/tmp/tester-run "$@"; }

step "environment"
. /etc/os-release; echo "$PRETTY_NAME ($VERSION_CODENAME) $(uname -m)"
apt-get update -qq
apt-get install -y -qq --no-install-recommends libglib2.0-bin gsettings-desktop-schemas fontconfig >/dev/null
useradd -m -s /bin/bash tester
mkdir -p /tmp/tester-run && chown tester /tmp/tester-run

step "signed local repository (ephemeral test key; never a release key)"
export GNUPGHOME=/tmp/gnupg; mkdir -m 700 -p "$GNUPGHOME"
gpg --batch --quiet --passphrase '' --quick-gen-key "Jewbuntu Test Archive (ephemeral) <test@jewbuntu.invalid>" ed25519 sign 1d
gpg --batch --export > /usr/share/keyrings/jewbuntu-archive-keyring.gpg
mkdir -p /repo/pool /decoy/DEBIAN
# Decoy: a fake base-files with a huge version. The APT pin must stop it from installing.
printf 'Package: base-files\nVersion: 999:1\nArchitecture: all\nMaintainer: test <t@t>\nDescription: decoy\n decoy\n' > /decoy/DEBIAN/control
dpkg-deb --build /decoy /repo/pool/base-files_999_all.deb >/dev/null
publish() {
  cd /repo
  mkdir -p dists/resolute-testing/main/binary-all dists/resolute-testing/main/binary-$(dpkg --print-architecture)
  apt-ftparchive packages pool > dists/resolute-testing/main/binary-all/Packages
  cp dists/resolute-testing/main/binary-all/Packages dists/resolute-testing/main/binary-$(dpkg --print-architecture)/Packages
  apt-ftparchive -o APT::FTPArchive::Release::Origin=Jewbuntu -o APT::FTPArchive::Release::Label=Jewbuntu \
    -o APT::FTPArchive::Release::Suite=resolute-testing -o APT::FTPArchive::Release::Codename=resolute-testing \
    -o APT::FTPArchive::Release::Components=main -o "APT::FTPArchive::Release::Architectures=all $(dpkg --print-architecture)" \
    release dists/resolute-testing > dists/resolute-testing/Release
  rm -f dists/resolute-testing/InRelease
  gpg --batch --yes --clearsign -o dists/resolute-testing/InRelease dists/resolute-testing/Release
  cd /
}
cp /old/*.deb /repo/pool/
publish
printf 'Types: deb\nURIs: file:///repo\nSuites: resolute-testing\nComponents: main\nSigned-By: /usr/share/keyrings/jewbuntu-archive-keyring.gpg\n' > /etc/apt/sources.list.d/jewbuntu.sources
apt-get update -qq 2>&1 | grep -v "^W: .*unsigned" || true
apt-cache policy jewbuntu-core | grep -q "file:/repo" && ok "repository signed by scoped key is accepted" || fail "repository signed by scoped key is accepted"

step "install old version"
OLD_VER=$(dpkg-deb -f /old/jewbuntu-core_*.deb Version)
apt-get install -y -qq jewbuntu-core jewbuntu-branding jewbuntu-hebrew jewbuntu-upgrade-tools >/dev/null
[ "$(dpkg-query -W -f '${Version}' jewbuntu-core)" = "$OLD_VER" ] && ok "installed $OLD_VER" || fail "installed OLD_VER"
jewbuntu --version
jewbuntu version
[ -L /etc/systemd/user/default.target.wants/jewbuntu-migrate.service ] && ok "per-user migration unit enabled globally" || echo "NOTE: migrate unit not enabled via symlink (check dh_installsystemduser)"
[ -f /etc/jewbuntu/repository.conf ] && ok "conffile /etc/jewbuntu/repository.conf present" || fail "conffile /etc/jewbuntu/repository.conf present"
SRC=$(XDG_CURRENT_DESKTOP=ubuntu:GNOME GSETTINGS_BACKEND=memory gsettings get org.gnome.desktop.input-sources sources)
echo "input-sources default under ubuntu session: $SRC"
[ "$SRC" = "[('xkb', 'us'), ('xkb', 'il')]" ] && ok "Hebrew keyboard default applied via vendor override" || fail "Hebrew keyboard default applied via vendor override"
fc-match 'sans-serif:lang=he' | grep -q "Noto Sans Hebrew" && ok "fontconfig prefers Noto Sans Hebrew for Hebrew sans" || { fc-match 'sans-serif:lang=he'; fail "Hebrew font preference"; }
fc-list : family | grep -q "Frank Ruehl CLM" && fc-list : family | grep -q "Ezra SIL" && ok "Culmus and Ezra SIL nikud fonts installed" || fail "nikud fonts installed"

step "doctor and readiness report (inspection only)"
jewbuntu doctor
jewbuntu upgrade-check || true
jewbuntu upgrade-check --json | python3 -c 'import json,sys; r=json.load(sys.stdin); assert r["matrix_entry"]["codename"]=="resolute"; print("overall:", r["overall"])' && ok "readiness report recognises resolute" || fail "readiness report recognises resolute"

step "repository enrollment uses support matrix and pins namespace"
sed -i 's|^url=.*|url=file:///repo|' /etc/jewbuntu/repository.conf
jewbuntu repo enroll --channel testing
grep -q "Suites: resolute-testing" /etc/apt/sources.list.d/jewbuntu.sources && ok "enroll wrote suite for running codename" || fail "enroll wrote suite for running codename"
if jewbuntu repo enroll --channel stable 2>/tmp/err; then fail "stable channel should be refused while resolute is in-development"; else ok "refused channel not offered in matrix: $(cat /tmp/err)"; fi
apt-get update -qq
apt-get install -y -qq --only-upgrade base-files >/dev/null 2>&1 || true
case "$(dpkg-query -W -f '${Version}' base-files)" in 999*) fail "decoy base-files from Jewbuntu origin was installed";; *) ok "pin blocked decoy base-files ($(dpkg-query -W -f '${Version}' base-files) kept)";; esac

step "user settings with the old version"
as_user jewbuntu config set location.timezone America/Toronto
as_user jewbuntu config set location.latitude 43.65
as_user jewbuntu config set location.longitude -79.38
as_user jewbuntu config set calendar.region '"israel"'
as_user jewbuntu config set sound.startup false
python3 - <<'EOF'
import json; p="/home/tester/.config/jewbuntu/settings.json"; d=json.load(open(p)); d["unknown_future_key"]={"keep":True}; json.dump(d,open(p,"w"))
EOF
as_user cat /home/tester/.config/jewbuntu/settings.json
[ "$(stat -c %U /home/tester/.config/jewbuntu/settings.json)" = tester ] && ok "settings owned by the user" || fail "settings owned by the user"
as_user jewbuntu startup-sound preview || true
as_user jewbuntu export /home/tester/before-upgrade.tar.gz

if [ "${HAVE_NEW}" = 1 ]; then
  step "upgrade to new version from the signed repo"
  NEW_VER=$(dpkg-deb -f /new/jewbuntu-core_*.deb Version)
  cp /new/*.deb /repo/pool/
  publish
  apt-get update -qq
  apt-get install -y -qq --only-upgrade jewbuntu-core jewbuntu-branding jewbuntu-hebrew jewbuntu-upgrade-tools >/dev/null
  [ "$(dpkg-query -W -f '${Version}' jewbuntu-core)" = "$NEW_VER" ] && ok "upgraded $OLD_VER -> $NEW_VER" || fail "upgraded OLD_VER -> NEW_VER"
  ls /home/tester/.local/state/jewbuntu/backups 2>/dev/null && fail "root maintainer scripts must not touch the user's home" || ok "package upgrade did not touch the user's home"
  step "per-user migration (what jewbuntu-migrate.service runs at the user's next login)"
  as_user jewbuntu config migrate
  as_user jewbuntu config migrate | grep -q '"current"' && ok "migration idempotent" || fail "migration idempotent"
  as_user cat /home/tester/.config/jewbuntu/settings.json
  cat > /tmp/check_upgrade.py <<'EOF'
import json, glob
d = json.load(open("/home/tester/.config/jewbuntu/settings.json"))
assert d["location"]["timezone"] == "America/Toronto", d
assert d["location"]["latitude"] == 43.65
assert d["calendar"]["region"] == "israel"
assert d["unknown_future_key"] == {"keep": True}
if d["schema_version"] >= 2:
    assert d["sound"]["startup"]["enabled"] is False, d["sound"]
print("schema_version", d["schema_version"], "sound", d.get("sound"))
backups = glob.glob("/home/tester/.local/state/jewbuntu/backups/*.json")
assert backups, "backup expected"
print("backup:", backups)
EOF
  chmod 644 /tmp/check_upgrade.py
  as_user python3 /tmp/check_upgrade.py
  ok "settings preserved through upgrade + migration, backup kept"
  as_user jewbuntu config validate && ok "migrated settings validate" || fail "migrated settings validate"
fi

step "remove and purge keep user data"
apt-get remove -y -qq jewbuntu-core jewbuntu-branding jewbuntu-hebrew jewbuntu-upgrade-tools >/dev/null
[ -f /home/tester/.config/jewbuntu/settings.json ] && ok "remove kept user settings" || fail "remove kept user settings"
[ -f /etc/jewbuntu/repository.conf ] && ok "remove kept conffile" || fail "remove kept conffile"
apt-get purge -y -qq jewbuntu-core jewbuntu-branding jewbuntu-hebrew jewbuntu-upgrade-tools >/dev/null
[ -f /home/tester/.config/jewbuntu/settings.json ] && ok "purge kept user settings" || fail "purge kept user settings"
[ ! -e /etc/jewbuntu/repository.conf ] && ok "purge removed system conffile" || fail "purge removed system conffile"
[ ! -e /etc/apt/sources.list.d/jewbuntu.sources ] && ok "purge removed generated APT source" || fail "purge removed generated APT source"
[ ! -e /etc/fonts/conf.d/65-jewbuntu-hebrew.conf ] && ok "purge removed fontconfig link" || fail "purge removed fontconfig link"
SRC=$(XDG_CURRENT_DESKTOP=ubuntu:GNOME GSETTINGS_BACKEND=memory gsettings get org.gnome.desktop.input-sources sources)
[ "$SRC" != "[('xkb', 'us'), ('xkb', 'il')]" ] && ok "vendor override gone after removal (now $SRC)" || fail "vendor override gone after removal (now SRC)"
LEFT=$(find /usr/lib/jewbuntu /usr/share/jewbuntu 2>/dev/null | wc -l)
[ "$LEFT" = 0 ] && ok "no untracked files left in /usr (no stray bytecode)" || { find /usr/lib/jewbuntu /usr/share/jewbuntu; fail "leftover files"; }

step "reinstall picks up existing settings; export/import roundtrip"
printf 'Types: deb\nURIs: file:///repo\nSuites: resolute-testing\nComponents: main\nSigned-By: /usr/share/keyrings/jewbuntu-archive-keyring.gpg\n' > /etc/apt/sources.list.d/jewbuntu.sources
apt-get update -qq && apt-get install -y -qq jewbuntu-core jewbuntu-branding >/dev/null
[ "$(as_user jewbuntu config get location.timezone)" = '"America/Toronto"' ] && ok "reinstalled package sees preserved settings" || fail "reinstalled package sees preserved settings"
as_user jewbuntu reset --yes --no-export >/dev/null
[ ! -e /home/tester/.config/jewbuntu ] && ok "explicit reset removed user data" || fail "explicit reset removed user data"
as_user jewbuntu import /home/tester/before-upgrade.tar.gz >/dev/null
[ "$(as_user jewbuntu config get calendar.region)" = '"israel"' ] && ok "import restored exported settings" || fail "import restored exported settings"

echo; echo "ALL CHECKS PASSED ($PASS)"
