#!/usr/bin/env python3
"""Build the "Jewbuntu-Classic" icon theme for Ubuntu 7.10 (GNOME 2.20) from Jewbuntu Icons.

Jewbuntu Icons is ~80 MB of SVG in ~16,000 files, made for current desktops: far too big for a
700 MB CD that is already full, and slow to draw with 2007's librsvg on a Pentium II/III. So
this keeps only the icon names GNOME 2.20 and its applications ask for, rendered once, here, to
PNG at the sizes GNOME 2 uses, the way themes of the time shipped.

  names     icon names used on Ubuntu 7.10 (its own themes plus Icon= keys), one per line
  aliases   "legacy-name new-name context" lines read from 7.10's GNOME theme symlinks
            (gnome-fs-directory -> folder ...), so older programs find the new icons too
  base      Jewbuntu icon theme dir; overlay: Jewbuntu-light (its status icons win: dark
            symbols that stay readable on the light top bar)

Anything not found falls back to GNOME's own theme (Inherits=gnome,hicolor).
usage: make-icons.py NAMES ALIASES BASE OVERLAY OUT [EXTRA_NAME=SVG ...]
"""
import os
import subprocess
import sys

SIZES = (16, 22, 24, 32, 48)
CONTEXTS = {  # Jewbuntu dir -> (output dir, Context= for index.theme)
    'actions': ('actions', 'Actions'), 'apps': ('apps', 'Applications'),
    'categories': ('categories', 'Categories'), 'devices': ('devices', 'Devices'),
    'emblems': ('emblems', 'Emblems'), 'emotes': ('emotes', 'Emotes'),
    'mimes': ('mimetypes', 'MimeTypes'), 'places': ('places', 'Places'),
    'preferences': ('apps', 'Applications'), 'status': ('status', 'Status'),
}


def candidates(theme, ctx, name):
    """SVG sources for one icon, as {size or 'scalable': path}, symlinks resolved."""
    found = {}
    d = os.path.join(theme, ctx)
    if not os.path.isdir(d):
        return found
    for sub in os.listdir(d):
        p = os.path.join(d, sub, name + '.svg')
        if os.path.exists(p):  # follows symlinks; broken ones are skipped
            key = int(sub) if sub.isdigit() else sub
            if key == 'symbolic':
                continue
            found[key] = os.path.realpath(p)
    return found


def best_source(found, size):
    if size in found:
        return found[size]
    if 'scalable' in found:
        return found['scalable']
    sized = sorted(k for k in found if isinstance(k, int))
    bigger = [k for k in sized if k >= size]
    return found[(bigger or sized)[0]] if sized else None


# Path data of the Apple logo that the upstream icon set used for start-here (found by the Arch
# port, 2026-11-20). No Jewbuntu icon may be drawn from it.
APPLE_PATH = 'M10.062 3.2488c0.4829'


def render(svg, png, size):
    with open(svg, errors='ignore') as f:
        if APPLE_PATH in f.read():
            raise SystemExit('refusing to render the Apple logo: %s -> %s' % (svg, png))
    os.makedirs(os.path.dirname(png), exist_ok=True)
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), '-f', 'png', '-o', png, svg],
                   check=True)


def main():
    names_f, aliases_f, base, overlay, out = sys.argv[1:6]
    extras = dict(a.split('=', 1) for a in sys.argv[6:])
    names = {l.strip() for l in open(names_f) if l.strip()}
    aliases = {}
    for line in open(aliases_f):
        parts = line.split()
        if len(parts) >= 2 and parts[0] != parts[1]:
            aliases.setdefault(parts[1], set()).add(parts[0])
    wanted = names | set(aliases)
    rendered = {}  # (outdir, name) -> True
    used_dirs = set()
    cache = {}  # (svg, size) -> png path already written, to hard-link duplicates
    for ctx, (outdir, _) in CONTEXTS.items():
        for name in sorted(wanted):
            found = candidates(base, ctx, name)
            found.update(candidates(overlay, ctx, name))
            if not found:
                continue
            for size in SIZES:
                svg = best_source(found, size)
                if not svg:
                    continue
                png = os.path.join(out, '%dx%d' % (size, size), outdir, name + '.png')
                if os.path.exists(png):
                    continue
                key = (svg, size)
                if key in cache:
                    os.makedirs(os.path.dirname(png), exist_ok=True)
                    os.link(cache[key], png)
                else:
                    render(svg, png, size)
                    cache[key] = png
                used_dirs.add(('%dx%d' % (size, size), outdir))
            rendered[(outdir, name)] = True
    # Our own artwork (the Jewbuntu menu star as start-here / distributor-logo ...). The source
    # theme also has start-here under status/ and mimes/ (an Apple-style logo there), and GTK
    # takes the first directory that has the name, so the name is removed everywhere first.
    for name, svg in extras.items():
        for size in SIZES:
            for outdir, _ in set(CONTEXTS.values()):
                stale = os.path.join(out, '%dx%d' % (size, size), outdir, name + '.png')
                if os.path.lexists(stale):
                    os.remove(stale)
        for size in SIZES:
            png = os.path.join(out, '%dx%d' % (size, size), 'places', name + '.png')
            render(svg, png, size)
            used_dirs.add(('%dx%d' % (size, size), 'places'))
        rendered[('places', name)] = True
    # Legacy names as symlinks to the new ones, within the same size/context dir.
    links = 0
    for (outdir, name) in list(rendered):
        for old in aliases.get(name, ()):
            for size in SIZES:
                d = os.path.join(out, '%dx%d' % (size, size), outdir)
                src, dst = os.path.join(d, name + '.png'), os.path.join(d, old + '.png')
                if os.path.exists(src) and not os.path.lexists(dst):
                    os.symlink(name + '.png', dst)
                    links += 1
    ctx_of = {o: c for o, c in CONTEXTS.values()}
    dirs = sorted(used_dirs, key=lambda d: (int(d[0].split('x')[0]), d[1]))
    with open(os.path.join(out, 'index.theme'), 'w') as f:
        f.write('[Icon Theme]\nName=Jewbuntu-Classic\n'
                'Comment=Jewbuntu Icons for Ubuntu 7.10, as PNG (from MacTahoe icons, GPL-3.0)\n'
                'Inherits=gnome,hicolor\nExample=folder\n\nDirectories=%s\n'
                % ','.join('%s/%s' % d for d in dirs))
        for size, outdir in dirs:
            f.write('\n[%s/%s]\nSize=%s\nContext=%s\nType=Fixed\n'
                    % (size, outdir, size.split('x')[0], ctx_of[outdir]))
    print('icons: %d names, %d legacy links' % (len(rendered), links))


if __name__ == '__main__':
    main()
