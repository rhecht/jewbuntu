#!/usr/bin/env python3
"""Turn an RGB image into the 8-bit palette PNG usplash needs, with fixed palette slots.

usplash themes name colours by palette index, so the first slots are fixed here and the
theme (jewbuntu-theme.c) refers to them: 0 background, 1 progress-bar track, 2 progress,
3 text, 4 success, 5 failure. The image's own colours follow (at most 250).
usage: make-usplash-png.py WIDTH HEIGHT IN.rgb OUT.png   (IN.rgb: raw 8-bit RGB, <=250 colours)
"""
import struct
import sys
import zlib

FIXED = [(0x16, 0x39, 0x7a), (0x2a, 0x55, 0x9e), (0x00, 0x88, 0xff),
         (0xff, 0xff, 0xff), (0x7f, 0xd1, 0x7f), (0xff, 0x7a, 0x7a)]


def chunk(kind, data):
    c = kind + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)


def main():
    w, h, src, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4]
    raw = open(src, 'rb').read()
    assert len(raw) == w * h * 3, 'size mismatch'
    palette = list(FIXED)
    index = {c: i for i, c in enumerate(palette)}
    rows = []
    for y in range(h):
        row = bytearray([0])
        for x in range(w):
            o = (y * w + x) * 3
            c = (raw[o], raw[o + 1], raw[o + 2])
            i = index.get(c)
            if i is None:
                if len(palette) >= 256:
                    raise SystemExit('more than 250 colours: quantise first')
                i = index[c] = len(palette)
                palette.append(c)
            row.append(i)
        rows.append(bytes(row))
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 3, 0, 0, 0))
    png += chunk(b'PLTE', b''.join(bytes(c) for c in palette))
    png += chunk(b'IDAT', zlib.compress(b''.join(rows), 9))
    png += chunk(b'IEND', b'')
    open(out, 'wb').write(png)
    print('%s: %dx%d, %d colours' % (out, w, h, len(palette)))


if __name__ == '__main__':
    main()
