"""Convert an X window dump (xwd -root) to PNG with the standard library only.

Arch Linux 32's ImageMagick is broken (built against an older libxml2), so the arch32 test
cannot use it. Handles the TrueColor 16/24/32-bit dumps Xvfb produces.
usage: python3 xwd2png.py in.xwd out.png
"""
import struct
import sys
import zlib


def channel(pixel, mask):
    if not mask:
        return 0
    shift = (mask & -mask).bit_length() - 1
    top = mask >> shift
    return ((pixel & mask) >> shift) * 255 // top


def main(src, dst):
    data = open(src, "rb").read()
    h = struct.unpack(">25I", data[:100])
    header_size, width, height, byte_order, bpp, bpl, ncolors = h[0], h[4], h[5], h[7], h[11], h[12], h[19]
    rmask, gmask, bmask = h[14], h[15], h[16]
    offset = header_size + ncolors * 12
    step = bpp // 8
    endian = "little" if byte_order == 0 else "big"
    rows = []
    for y in range(height):
        line = data[offset + y * bpl: offset + y * bpl + width * step]
        out = bytearray(b"\0")
        for x in range(0, width * step, step):
            px = int.from_bytes(line[x:x + step], endian)
            out += bytes((channel(px, rmask), channel(px, gmask), channel(px, bmask)))
        rows.append(bytes(out))

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(b"".join(rows), 6)) + chunk(b"IEND", b"")
    open(dst, "wb").write(png)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
