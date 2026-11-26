#!/bin/sh
# Remaster a Lubuntu or Linux Mint live ISO with the Jewbuntu skin already installed.
#   - installs the Jewbuntu packages (and their dependencies from the distribution's own archive)
#     into the live system through an overlay mount and a chroot (the ISO's own amd64 or i386
#     programs run through Docker's emulation)
#   - folds the changes into the right squashfs: Lubuntu 24.04+ stacks layers (minimal,
#     minimal.standard, minimal.standard.live); the installer copies minimal + minimal.standard,
#     so the skin goes into minimal.standard, and is installed again over the live layer so the
#     live session's package list matches. Lubuntu 18.04 and Mint have one filesystem.squashfs.
#   - rebuilds the ISO with xorriso, replaying the original boot setup (BIOS and UEFI)
#   - checks inside the remastered system: packages, diversions, defaults (logged)
# The distribution's installer, kernel and boot menu are not changed.
# usage: ci/flavor-iso.sh FLAVOR SRC_ISO OUT_ISO PKGDIR...
#   FLAVOR: lubuntu | lubuntu18 | mint
set -eu
FLAVOR="$1"; SRC="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"; OUT="$3"; shift 3
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$(dirname "$OUT")"; OUTDIR="$(cd "$(dirname "$OUT")" && pwd)"; OUTNAME="$(basename "$OUT")"
: "${DOCKER_CONTEXT:=desktop-linux}"; export DOCKER_CONTEXT
case "$FLAVOR" in
  lubuntu)   PKGS="jewbuntu-lubuntu shulgo-xfce jewbuntu-branding jewbuntu-core"; COMP="-comp xz" ;;
  lubuntu18) PKGS="jewbuntu-lubuntu-lxde shulgo-xfce"; COMP="-comp gzip" ;;
  mint)      PKGS="jewbuntu-mint shulgo-xfce"; COMP="-comp xz" ;;
  *) echo "unknown flavor $FLAVOR" >&2; exit 2 ;;
esac
DEBS="$(mktemp -d)"; trap 'rm -rf "$DEBS"' EXIT
for p in $PKGS; do
  f="$(for d in "$@"; do ls "$d"/${p}_*.deb 2>/dev/null || true; done | head -1)"
  [ -n "$f" ] || { echo "missing $p package" >&2; exit 1; }
  cp "$f" "$DEBS/"
done
chmod -R a+rX "$DEBS"
docker volume create jewbuntu-flavors >/dev/null
docker run --rm --privileged -e FLAVOR="$FLAVOR" -e COMP="$COMP" -e OUTNAME="$OUTNAME" -e PKGS="$PKGS" \
  -v "$SRC:/src.iso:ro" -v "$DEBS:/debs:ro" -v "$OUTDIR:/out" -v "$ROOT/ci/flavors:/tools:ro" \
  -v jewbuntu-flavors:/work jewbuntu-gutsy-tools bash -euc '
  log() { echo "== $(date +%H:%M:%S) $*"; }
  W=/work/$FLAVOR; rm -rf $W; mkdir -p $W/iso $W/new/casper
  mount -o loop,ro /src.iso $W/iso
  cleanup() {
    for m in $W/merged/dev/pts $W/merged/dev $W/merged/sys $W/merged/proc $W/merged; do umount -l $m 2>/dev/null || true; done
    for l in $W/l*; do umount -l $l 2>/dev/null || true; done
    umount -l $W/iso 2>/dev/null || true
  }
  trap cleanup EXIT

  # install_into LOWER... : overlay over the given squashfs files (bottom first), install the
  # packages in a chroot, leave the changes in $W/upper.
  install_into() {
    rm -rf $W/upper $W/ovlwork $W/merged; mkdir -p $W/upper $W/ovlwork $W/merged
    lowers=""; i=0
    for sq in "$@"; do
      i=$((i + 1)); mkdir -p $W/l$i; mountpoint -q $W/l$i && umount $W/l$i
      mount -o loop,ro "$sq" $W/l$i
      lowers="$W/l$i${lowers:+:$lowers}"
    done
    mount -t overlay overlay -o lowerdir=$lowers,upperdir=$W/upper,workdir=$W/ovlwork,index=off,redirect_dir=off,metacopy=off $W/merged
    N=$W/merged
    mount -t proc proc $N/proc; mount -t sysfs sys $N/sys
    mount --bind /dev $N/dev; mount -t devpts devpts $N/dev/pts
    rm -f $N/etc/resolv.conf; cp /etc/resolv.conf $N/etc/resolv.conf
    printf "#!/bin/sh\nexit 101\n" > $N/usr/sbin/policy-rc.d; chmod 755 $N/usr/sbin/policy-rc.d
    mkdir -p $N/tmp/jb; cp /debs/*.deb $N/tmp/jb/
    inroot() { chroot $N env LANG=C.UTF-8 HOME=/root DEBIAN_FRONTEND=noninteractive PATH=/usr/sbin:/usr/bin:/sbin:/bin "$@"; }
    for t in 1 2 3; do inroot apt-get update -q -o APT::Update::Post-Invoke-Success::= >/tmp/apt-update.log 2>&1 && break || { tail -3 /tmp/apt-update.log; sleep 15; }; done
    inroot sh -c "apt-get install -y -q --no-install-recommends /tmp/jb/*.deb" 2>&1 | grep -vE "^(Get|Selecting|Preparing|Unpacking|Reading|\(Reading)" | tail -25
    inroot dpkg-query -W -f="\${Package} \${Version} \${Status}\n" $PKGS
    for p in $PKGS; do inroot dpkg-query -W -f="\${Status}" $p | grep -q "ok installed"; done
    checks
    inroot dpkg-query -W --showformat="\${Package} \${Version}\n" > $W/manifest
    inroot apt-get clean
    rm -rf $N/tmp/jb
    for m in dev/pts dev sys proc; do umount -l $N/$m; done
    umount $N
    for l in $W/l*; do umount $l; done
    # Build noise out of the change set, so the originals underneath show through again.
    for p in etc/resolv.conf usr/sbin/policy-rc.d var/lib/apt/lists var/cache/apt var/log tmp root run \
             var/cache/debconf/config.dat-old var/cache/debconf/templates.dat-old var/lib/dpkg/lock var/lib/dpkg/lock-frontend; do
      rm -rf $W/upper/$p
    done
    log "changes: $(du -sh $W/upper | cut -f1)"
  }

  checks() {
    log "checks in the remastered system"
    inroot dpkg-divert --list | grep -i jewbuntu || true
    case $FLAVOR in
      lubuntu)
        inroot readlink -f /usr/share/lubuntu/wallpapers/lubuntu-default-wallpaper.png
        inroot readlink -f /usr/share/lubuntu/wallpapers/lubuntu-default-wallpaper.jpg
        inroot readlink -f /usr/share/sddm/themes/lubuntu/wall.png
        sed -n "/^\[fancymenu\]/,/^\[/p" $N/etc/xdg/xdg-Lubuntu/lxqt/panel.conf | head -5
        grep -q "^icon=/usr/share/jewbuntu/lubuntu/jewbuntu-start.svg" $N/etc/xdg/xdg-Lubuntu/lxqt/panel.conf
        test "$(inroot readlink -f /usr/share/lubuntu/wallpapers/lubuntu-default-wallpaper.png)" = /usr/share/backgrounds/jewbuntu/jewbuntu-star-blue.png
        echo "lubuntu checks: OK" ;;
      lubuntu18)
        inroot readlink -f /usr/share/lubuntu/wallpapers/lubuntu-default-wallpaper.png
        inroot readlink -f /usr/share/lubuntu/images/lubuntu-logo.png
        test "$(inroot readlink -f /usr/share/lubuntu/images/lubuntu-logo.png)" = /usr/share/jewbuntu/lubuntu/jewbuntu-start-48.png
        inroot python3 --version
        cp /tools/check-shulgo.py $N/tmp/check-shulgo.py; inroot python3 /tmp/check-shulgo.py; rm -f $N/tmp/check-shulgo.py
        echo "lubuntu18 checks: OK" ;;
      mint)
        for k in "org.cinnamon app-menu-icon-name" "org.cinnamon.desktop.background picture-uri" "org.cinnamon.sounds login-file" "org.cinnamon.sounds login-enabled" "x.dm.slick-greeter background"; do
          printf "%s = " "$k"; inroot env GSETTINGS_BACKEND=memory gsettings get $k
        done
        test "$(inroot env GSETTINGS_BACKEND=memory gsettings get org.cinnamon app-menu-icon-name)" = "'"'"'jewbuntu-start'"'"'"
        python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(\"menu applet default icon:\", d[\"menu-icon\"][\"default\"]); assert d[\"menu-icon\"][\"default\"]==\"jewbuntu-start\"" $N/usr/share/cinnamon/applets/menu@cinnamon.org/settings-override.json
        echo "mint checks: OK" ;;
    esac
  }

  squash() {  # squash DIR OUT
    mksquashfs "$1" "$2" -noappend $COMP -b 131072 -processors 4 -mem 2G -xattrs \
      -xattrs-exclude "^trusted\.overlay\.(origin|impure|redirect|metacopy|nlink|upper|uuid|protattr)$" -quiet
    ls -la "$2"
  }

  CAS=$W/iso/casper
  if [ $FLAVOR = lubuntu ]; then
    log "install over minimal + minimal.standard"
    install_into $CAS/minimal.squashfs $CAS/minimal.standard.squashfs
    log "minimal.standard: unpack, fold the changes in, squash"
    unsquashfs -q -no-progress -f -d $W/layer $CAS/minimal.standard.squashfs
    python3 /tools/overlay-merge.py $W/upper $W/layer layer
    squash $W/layer $W/new/casper/minimal.standard.squashfs
    du -sx --block-size=1 $W/layer | cut -f1 > $W/new/casper/minimal.standard.size
    rm -rf $W/layer
    log "install again over the live layer (its own package list)"
    install_into $CAS/minimal.squashfs $W/new/casper/minimal.standard.squashfs $CAS/minimal.standard.live.squashfs
    unsquashfs -q -no-progress -f -d $W/layer $CAS/minimal.standard.live.squashfs
    python3 /tools/overlay-merge.py $W/upper $W/layer layer
    squash $W/layer $W/new/casper/minimal.standard.live.squashfs
    du -sx --block-size=1 $W/layer | cut -f1 > $W/new/casper/minimal.standard.live.size
    rm -rf $W/layer
    CHANGED="casper/minimal.standard.squashfs casper/minimal.standard.size casper/minimal.standard.live.squashfs casper/minimal.standard.live.size"
  else
    log "install over filesystem.squashfs"
    install_into $CAS/filesystem.squashfs
    log "filesystem: unpack, fold the changes in, squash"
    unsquashfs -q -no-progress -f -d $W/layer $CAS/filesystem.squashfs
    python3 /tools/overlay-merge.py $W/upper $W/layer flat
    squash $W/layer $W/new/casper/filesystem.squashfs
    du -sx --block-size=1 $W/layer | cut -f1 > $W/new/casper/filesystem.size
    rm -rf $W/layer
    cp $W/manifest $W/new/casper/filesystem.manifest
    CHANGED="casper/filesystem.squashfs casper/filesystem.size casper/filesystem.manifest"
  fi
  rm -rf $W/upper $W/ovlwork

  log "checksums and ISO"
  cp $W/iso/md5sum.txt $W/new/md5sum.txt
  for f in $CHANGED; do
    sum=$(md5sum $W/new/$f | cut -d" " -f1)
    if grep -q " \./$f\$" $W/new/md5sum.txt; then sed -i "s|^[0-9a-f]*  \./$f\$|$sum  ./$f|" $W/new/md5sum.txt
    else echo "$sum  ./$f" >> $W/new/md5sum.txt; fi
  done
  RM=""
  if [ -e $CAS/filesystem.squashfs.gpg ]; then RM="-rm /casper/filesystem.squashfs.gpg --"; sed -i "/casper\/filesystem.squashfs.gpg/d" $W/new/md5sum.txt; fi
  MAP=""; for f in $CHANGED md5sum.txt; do MAP="$MAP -map $W/new/$f /$f"; done
  rm -f /out/$OUTNAME
  xorriso -indev /src.iso -outdev /out/$OUTNAME -boot_image any replay $RM $MAP 2>&1 | grep -vE "^xorriso : UPDATE" | tail -8
  umount $W/iso
  xorriso -indev /out/$OUTNAME -report_el_torito plain -report_system_area plain 2>&1 | grep -E "El Torito boot img|Partition|GPT|MBR" | head -12
  rm -rf $W
  ls -la /out/$OUTNAME'
(cd "$OUTDIR" && shasum -a 256 "$OUTNAME" > "$OUTNAME.sha256" && md5 -q "$OUTNAME" | sed "s/\$/  $OUTNAME/" > "$OUTNAME.md5" && cat "$OUTNAME.sha256")
