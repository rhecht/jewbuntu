#!/usr/bin/env python3
"""Make the Jewbuntu Skin's GTK 2 theme parse on Ubuntu 7.10 (GTK 2.12, murrine 0.53).

GTK stops reading an rc file at its first syntax error, so a single option that 2007's GTK
doesn't know silently drops every style after it (on 7.10 that was ~1,400 lines of main.rc,
buttons included). This rewrites the theme copy that goes into the 7.10 package:

  - murrine options added in murrine 0.90 (textstyle, glowstyle, highlight_shade,
    gradient_shades, border_shades) are removed; murrine 0.53 rejects them
  - the pixmap engine's `direction` key (GTK 2.14+) is removed: `direction = LTR` lines are
    dropped and `direction = RTL` image blocks are deleted, so left-to-right images apply
  - engine "adwaita" (not on 7.10) is left alone: an unknown engine is a warning, not an error

usage: gtk2-compat.py THEME_GTK2_DIR   (edits *.rc and gtkrc in place, prints what changed)
"""
import os
import re
import sys

MURRINE_NEW = ('textstyle', 'glowstyle', 'highlight_shade', 'gradient_shades', 'border_shades')


def drop_rtl_images(text):
    """Remove `image { ... direction = RTL ... }` blocks (no nested braces inside image blocks
    except option values like border = { 1, 2, 3, 4 })."""
    out, i, removed = [], 0, 0
    pattern = re.compile(r'(?m)^[ \t]*image[ \t]*\{')
    while True:
        m = pattern.search(text, i)
        if not m:
            out.append(text[i:])
            break
        depth, j = 0, m.end() - 1
        while True:
            if text[j] == '{':
                depth += 1
            elif text[j] == '}':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        block = text[m.start():j + 1]
        end = j + 1
        if end < len(text) and text[end] == '\n':
            end += 1
        if re.search(r'(?m)^\s*direction\s*=\s*RTL\s*$', block):
            out.append(text[i:m.start()])
            removed += 1
        else:
            out.append(text[i:end])
        i = end
    return ''.join(out), removed


def fix(text):
    notes = []
    text, n = drop_rtl_images(text)
    if n:
        notes.append('%d RTL image blocks' % n)
    text, n = re.subn(r'(?m)^[ \t]*direction[ \t]*=[ \t]*LTR[ \t]*\n', '', text)
    if n:
        notes.append('%d direction=LTR' % n)
    for opt in MURRINE_NEW:
        # one-line form: engine "murrine" { textstyle = 0 }
        text, n1 = re.subn(r'\b%s\s*=\s*(\{[^}]*\}|[^\s}]+)' % opt, '', text)
        if n1:
            notes.append('%d %s' % (n1, opt))
    return text, notes


def main():
    d = sys.argv[1]
    for name in sorted(os.listdir(d)):
        if not (name.endswith('.rc') or name == 'gtkrc'):
            continue
        p = os.path.join(d, name)
        if os.path.islink(p):
            continue
        old = open(p, encoding='utf-8').read()
        new, notes = fix(old)
        if new != old:
            open(p, 'w', encoding='utf-8').write(new)
            print('%s: %s' % (name, ', '.join(notes)))


if __name__ == '__main__':
    main()
