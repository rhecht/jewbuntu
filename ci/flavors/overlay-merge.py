#!/usr/bin/env python3
"""Fold an overlayfs upper directory (the changes made through an overlay mount) into an unpacked
root filesystem tree, ready for mksquashfs.

usage: overlay-merge.py UPPER DEST layer|flat

  layer  DEST is a stacked casper layer (Lubuntu's minimal.standard): whiteouts and opaque
         directories are kept as overlayfs markers, because the layer sits on top of others.
  flat   DEST is a whole root filesystem (one filesystem.squashfs): a whiteout deletes the path,
         an opaque directory replaces the directory's contents.

overlayfs' own bookkeeping attributes (trusted.overlay.origin, .impure, ...) are dropped; only
trusted.overlay.opaque survives, and only in layer mode.
"""
import os
import shutil
import stat
import subprocess
import sys

KEEP_OVERLAY_XATTR = {"trusted.overlay.opaque"}


def is_whiteout(st):
    return stat.S_ISCHR(st.st_mode) and st.st_rdev == 0


def remove(path):
    try:
        st = os.lstat(path)
    except FileNotFoundError:
        return
    if stat.S_ISDIR(st.st_mode):
        shutil.rmtree(path)
    else:
        os.unlink(path)


def copy_xattrs(src, dst, mode):
    try:
        names = os.listxattr(src, follow_symlinks=False)
    except OSError:
        return
    for name in names:
        if name.startswith("trusted.overlay."):
            if mode == "flat" or name not in KEEP_OVERLAY_XATTR:
                continue
        try:
            os.setxattr(dst, name, os.getxattr(src, name, follow_symlinks=False), follow_symlinks=False)
        except OSError:
            pass


def strip_overlay_xattrs(path):
    try:
        names = os.listxattr(path, follow_symlinks=False)
    except OSError:
        return
    for name in names:
        if name.startswith("trusted.overlay."):
            try:
                os.removexattr(path, name, follow_symlinks=False)
            except OSError:
                pass


def merge(src_dir, dst_dir, mode, counts):
    for name in sorted(os.listdir(src_dir)):
        s = os.path.join(src_dir, name)
        d = os.path.join(dst_dir, name)
        st = os.lstat(s)
        if is_whiteout(st):
            remove(d)
            if mode == "layer":
                os.mknod(d, stat.S_IFCHR | 0o000, 0)
                os.chown(d, 0, 0)
            counts["whiteout"] += 1
            continue
        if stat.S_ISDIR(st.st_mode):
            try:
                opaque = os.getxattr(s, "trusted.overlay.opaque", follow_symlinks=False) == b"y"
            except OSError:
                opaque = False
            if os.path.lexists(d) and (not os.path.isdir(d) or os.path.islink(d) or opaque):
                remove(d)
            if not os.path.lexists(d):
                os.mkdir(d)
            os.chown(d, st.st_uid, st.st_gid, follow_symlinks=False)
            os.chmod(d, stat.S_IMODE(st.st_mode))
            strip_overlay_xattrs(d)
            copy_xattrs(s, d, mode)
            merge(s, d, mode, counts)
            os.utime(d, ns=(st.st_atime_ns, st.st_mtime_ns), follow_symlinks=False)
            counts["dir"] += 1
            continue
        remove(d)
        subprocess.run(["cp", "-a", "--no-preserve=xattr", s, d], check=True)
        copy_xattrs(s, d, mode)
        counts["file"] += 1


def main():
    upper, dest, mode = sys.argv[1:4]
    assert mode in ("layer", "flat"), mode
    counts = {"file": 0, "dir": 0, "whiteout": 0}
    merge(upper, dest, mode, counts)
    print("merged %(file)d files, %(dir)d directories, %(whiteout)d deletions" % counts)


if __name__ == "__main__":
    main()
