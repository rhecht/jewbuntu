#!/bin/sh
# Jewbuntu Classic (Ubuntu 7.10 i386), step 4: put the packages into the live system and
# build the ISO.
#   - copies the unpacked 7.10 root filesystem and installs into it (chroot; 7.10's own i386
#     programs run through Docker's emulation): gtk2-engines-murrine, culmus, python-simplejson
#     from Ubuntu's old-releases archive, then dist/gutsy/debs/*.deb (and ShulGo's, if built)
#   - sets the login screen theme, points apt at old-releases.ubuntu.com (the original
#     archive.ubuntu.com entries stopped working when 7.10 was retired)
#   - repacks it with squashfs-tools 3.2-r2 (the 2.6.22 kernel mounts only squashfs 3:0), 64 KB
#     blocks as on the original disc
#   - rebuilds the CD: Jewbuntu boot menu artwork and labels, Windows autorun extras removed
#     (2007 Windows installers, the K-Meleon browser and its launcher), new checksums
# Output: dist/gutsy/jewbuntu-classic-7.10-<version>-32bit.iso (+ .sha256, .md5)
# usage: ci/gutsy-remaster.sh
# Docs: docs/gutsy.md
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/gutsy"
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
VERSION="$(cat "$ROOT/packaging/gutsy/version.txt")"
ISO_NAME="jewbuntu-classic-7.10-${VERSION#0.1.0~}-32bit.iso"
SQUASHFS_SRC="$OUT/sources/squashfs_3.2r2.orig.tar.gz"
SQUASHFS_SHA=8482465d58d78099c608b32fc034921f7c8c3cf7934b5edc68c463cd450b40a7
[ -f "$SQUASHFS_SRC" ] || curl -fsSL -o "$SQUASHFS_SRC" \
  https://old-releases.ubuntu.com/ubuntu/pool/main/s/squashfs/squashfs_3.2r2.orig.tar.gz
got="$(shasum -a 256 "$SQUASHFS_SRC" 2>/dev/null || sha256sum "$SQUASHFS_SRC")"
[ "${got%% *}" = "$SQUASHFS_SHA" ] || { echo "squashfs 3.2r2 checksum mismatch" >&2; exit 1; }
ls "$OUT"/debs/jewbuntu-classic-desktop_*.deb "$OUT"/debs/jewbuntu-web-tools_*.deb >/dev/null

docker build -q -t jewbuntu-gutsy-tools -f "$ROOT/ci/Dockerfile.gutsy-tools" "$ROOT/ci" >/dev/null
# --privileged: the chroot needs /proc, /sys and /dev mounted for 7.10's package scripts.
docker run --rm --privileged -e VERSION="$VERSION" -e ISO_NAME="$ISO_NAME" \
  -v jewbuntu-gutsy:/work -v "$OUT:/out" -v "$ROOT/packaging:/pkg:ro" jewbuntu-gutsy-tools bash -euc '
  W=/work N=/work/new
  log() { echo "== $*"; }

  log "squashfs-tools 3.2-r2, the version Ubuntu 7.10 shipped (native build)"
  # The 7.10 kernel driver (squashfs 3.2) mounts only format 3:0; tools 3.3 and later write 3:1.
  cd /tmp && tar xzf /out/sources/squashfs_3.2r2.orig.tar.gz && cd squashfs3.2-r2/squashfs-tools
  make -s CFLAGS="-I. -O2 -std=gnu89 -fcommon -include sys/sysmacros.h -D_FILE_OFFSET_BITS=64 -D_LARGEFILE_SOURCE -D_GNU_SOURCE -Wno-return-mismatch -Wno-implicit-function-declaration -Wno-incompatible-pointer-types -Wno-int-conversion -Wno-implicit-int" >/dev/null 2>&1
  MKSQ=/tmp/squashfs3.2-r2/squashfs-tools/mksquashfs; $MKSQ -version | head -1

  log "copy the 7.10 root filesystem"
  rm -rf $N && cp -a $W/rootfs $N

  cleanup() {
    for m in dev/pts dev sys proc; do umount -l $N/$m 2>/dev/null || true; done
  }
  trap cleanup EXIT
  mount -t proc proc $N/proc; mount -t sysfs sys $N/sys
  mount --bind /dev $N/dev; mount -t devpts devpts $N/dev/pts
  cp /etc/resolv.conf $N/etc/resolv.conf
  printf "#!/bin/sh\nexit 101\n" > $N/usr/sbin/policy-rc.d; chmod 755 $N/usr/sbin/policy-rc.d
  chroot $N dpkg-divert --local --rename --add /sbin/initctl >/dev/null
  ln -sf /bin/true $N/sbin/initctl
  inroot() { chroot $N env LANG=C HOME=/root DEBIAN_FRONTEND=noninteractive "$@"; }

  log "apt: Ubuntu old-releases archive"
  cp $N/etc/apt/sources.list $N/etc/apt/sources.list.original-2007
  cat > $N/etc/apt/sources.list <<"EOF"
# Ubuntu 7.10 was retired in 2009; its packages now live on old-releases.ubuntu.com.
# Jewbuntu Classic set this up (the original entries are in sources.list.original-2007).
deb http://old-releases.ubuntu.com/ubuntu gutsy main restricted universe multiverse
deb http://old-releases.ubuntu.com/ubuntu gutsy-updates main restricted universe multiverse
deb http://old-releases.ubuntu.com/ubuntu gutsy-security main restricted universe multiverse
EOF
  # Only the release pocket for what goes on the disc: same versions as the rest of the CD.
  printf "deb http://old-releases.ubuntu.com/ubuntu gutsy main restricted universe\n" > /tmp/disc.list
  cp /tmp/disc.list $N/etc/apt/sources.list.d/jewbuntu-build.list
  mv $N/etc/apt/sources.list $N/etc/apt/sources.list.jb; touch $N/etc/apt/sources.list
  for i in 1 2 3; do inroot apt-get update -qq && break || sleep 10; done
  inroot apt-get install -y -q --force-yes gtk2-engines-murrine gtk2-engines-pixbuf culmus python-simplejson 2>&1 | tail -3

  log "Jewbuntu packages"
  mkdir -p $N/tmp/jb && cp /out/debs/*.deb $N/tmp/jb/
  inroot sh -c "dpkg -i /tmp/jb/*.deb" 2>&1 | tail -5
  inroot dpkg -l jewbuntu-classic-desktop jewbuntu-web-tools | tail -2
  rm -rf $N/tmp/jb

  log "login screen and live session"
  sed -i "s/^export USERNAME=.*/export USERNAME=\"jewbuntu\"/; s/^export USERFULLNAME=.*/export USERFULLNAME=\"Jewbuntu live session\"/; s/^export HOST=.*/export HOST=\"jewbuntu\"/" $N/etc/casper.conf
  grep ^export $N/etc/casper.conf
  sed -i "s/^GraphicalTheme=.*/GraphicalTheme=Jewbuntu/; s/^GtkTheme=.*/GtkTheme=Jewbuntu-Light-solid/; s/^GraphicalThemedColor=.*/GraphicalThemedColor=#5b86d6/" $N/etc/gdm/gdm.conf
  grep -E "^(GraphicalTheme|GtkTheme)=" $N/etc/gdm/gdm.conf

  # Our postinst ran update-initramfs; the live CD keeps only the .bak from Ubuntu, as on the original.
  KVER=$(ls $N/lib/modules | head -1); rm -f $N/boot/initrd.img-$KVER
  if [ -f $N/usr/lib/usplash/jewbuntu-classic.so ]; then
    # The original live initrd from Ubuntu (casper scripts, disc UUID), only the splash image swapped.
    log "initrd: the original, with the Jewbuntu boot splash"
    rm -rf /tmp/ird && mkdir /tmp/ird && cd /tmp/ird
    zcat $W/iso/casper/initrd.gz | cpio -id --quiet
    cp $N/usr/lib/usplash/jewbuntu-classic.so usr/lib/usplash/usplash-artwork.so
    # Live session account and computer name (casper 7.10 reads these from its own casper.conf,
    # not from boot options).
    cp $N/etc/casper.conf etc/casper.conf
    find . | cpio -o -H newc --quiet | gzip -9 > /tmp/initrd.new
    cd / && ls -la /tmp/initrd.new
  fi

  log "Firefox: welcome page as home page, no BBC live bookmark"
  # The ubufox extension sets the home page after the system pref files are read, so it goes
  # into the template for new profiles. The live bookmark fetched a BBC feed at every start and
  # raised a certificate warning (2007 root certificates).
  printf "\n// Jewbuntu Classic\nuser_pref(\"browser.startup.homepage\", \"file:///usr/share/jewbuntu-classic/welcome.html\");\n" >> $N/etc/firefox/profile/prefs.js
  sed -i "/FEEDURL=\"http:\/\/newsrss.bbc.co.uk/d" $N/etc/firefox/profile/bookmarks.html
  tail -2 $N/etc/firefox/profile/prefs.js; grep -c "bbc" $N/etc/firefox/profile/bookmarks.html || true

  log "clean up the chroot"
  inroot apt-get clean
  rm -f $N/etc/apt/sources.list.d/jewbuntu-build.list
  mv $N/etc/apt/sources.list.jb $N/etc/apt/sources.list
  rm -f $N/var/lib/apt/lists/*_dists_* 2>/dev/null || true
  rm -f $N/sbin/initctl; chroot $N dpkg-divert --local --rename --remove /sbin/initctl >/dev/null
  rm -f $N/usr/sbin/policy-rc.d $N/etc/resolv.conf $N/root/.bash_history
  inroot dpkg-query -W --showformat="\${Package} \${Version}\n" > /tmp/manifest
  cleanup; trap - EXIT

  log "new ISO tree"
  rm -rf $W/newiso && mkdir -p $W/newiso
  (cd $W/iso && tar --exclude=./casper/filesystem.squashfs -cf - .) | (cd $W/newiso && tar -xf -)
  cd $W/newiso
  rm -rf bin programs disctree pics start.exe start.ini start.bmp autorun.inf wubi-cdboot.exe ubuntu.ico
  cp /tmp/manifest casper/filesystem.manifest
  [ -f /tmp/initrd.new ] && cp /tmp/initrd.new casper/initrd.gz
  # Packages the installer removes after installing (casper, ubiquity ...), as on the original.
  cut -d" " -f1 $W/iso/casper/filesystem.manifest | sort > /tmp/all-old
  cut -d" " -f1 $W/iso/casper/filesystem.manifest-desktop | sort > /tmp/desk-old
  comm -23 /tmp/all-old /tmp/desk-old > /tmp/live-only
  awk "NR==FNR{skip[\$1]=1; next} !(\$1 in skip)" /tmp/live-only /tmp/manifest > casper/filesystem.manifest-desktop
  echo "Jewbuntu Classic 7.10 $VERSION (Ubuntu 7.10 \"Gutsy Gibbon\") - i386 ($(date -u +%Y%m%d))" > .disk/info
  sed -i "s/^#define DISKNAME .*/#define DISKNAME  Jewbuntu Classic 7.10 $VERSION (Ubuntu 7.10) - i386/" README.diskdefines

  log "boot menu"
  rsvg-convert /pkg/gutsy/artwork/boot-back.svg -o /tmp/back.png
  convert /tmp/back.png -interlace none -quality 92 -sampling-factor 2x2 -strip isolinux/back.jpg
  convert /tmp/back.png -resize 640x480 -colors 256 -type Palette isolinux/splash.pcx
  python3 - isolinux/isolinux.cfg <<"PY"
import re, sys
p = sys.argv[1]; s = open(p).read()
s = s.replace("^Start or install Ubuntu", "^Start or install Jewbuntu Classic")
s = s.replace("Start Ubuntu in safe ^graphics mode", "Start Jewbuntu Classic in safe ^graphics mode")
open(p, "w").write(s)
PY
  sed -i "s/Ubuntu 7.10/Jewbuntu Classic 7.10 (Ubuntu 7.10)/" isolinux/isolinux.txt 2>/dev/null || true
  grep -n "label\|append" isolinux/isolinux.cfg | head -6

  log "squashfs"
  $MKSQ $N casper/filesystem.squashfs -b 65536 -noappend -no-progress 2>&1 | grep -E "Filesystem size|Number of inodes" || true
  printf "%s" $(du -sx --block-size=1 $N | cut -f1) > casper/filesystem.size

  log "checksums and ISO"
  find . -type f ! -name md5sum.txt ! -path ./isolinux/boot.cat ! -path ./isolinux/isolinux.bin -print0 \
    | sort -z | xargs -0 md5sum > md5sum.txt
  rm -f /out/$ISO_NAME
  xorriso -as mkisofs -quiet -r -J -joliet-long -l -iso-level 2 -V "Jewbuntu Classic 7.10 i386" \
    -b isolinux/isolinux.bin -c isolinux/boot.cat -no-emul-boot -boot-load-size 4 -boot-info-table \
    -o /out/$ISO_NAME .
  cd /out && sha256sum $ISO_NAME > $ISO_NAME.sha256 && md5sum $ISO_NAME > $ISO_NAME.md5
  SIZE=$(stat -c %s $ISO_NAME); echo "ISO: $ISO_NAME $SIZE bytes"
  [ $SIZE -le 737280000 ] && echo "fits on an 80-minute (700 MB) CD-R" || echo "WARNING: larger than a 700 MB CD-R"
'
