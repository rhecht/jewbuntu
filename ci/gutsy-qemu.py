#!/usr/bin/env python3
"""Drive a headless QEMU through its human monitor (unix socket): screenshots and typing.

Used by ci/gutsy-vm-test.sh inside its container. Nothing touches the host's screen.
usage:
  gutsy-qemu.py SOCK shot OUT.png        screendump -> PNG (via ImageMagick)
  gutsy-qemu.py SOCK keys KEY [KEY ...]  e.g. ret, alt-f2, ctrl-alt-t, tab
  gutsy-qemu.py SOCK type TEXT           types TEXT (US layout)
  gutsy-qemu.py SOCK cmd 'MONITOR CMD'   raw monitor command, prints the reply
"""
import os
import socket
import subprocess
import sys
import time

SHIFTED = {'~': 'grave_accent', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6',
           '&': '7', '*': '8', '(': '9', ')': '0', '_': 'minus', '+': 'equal', '{': 'bracket_left',
           '}': 'bracket_right', '|': 'backslash', ':': 'semicolon', '"': 'apostrophe',
           '<': 'comma', '>': 'dot', '?': 'slash'}
PLAIN = {' ': 'spc', '-': 'minus', '=': 'equal', '[': 'bracket_left', ']': 'bracket_right',
         '\\': 'backslash', ';': 'semicolon', "'": 'apostrophe', ',': 'comma', '.': 'dot',
         '/': 'slash', '`': 'grave_accent', '\n': 'ret', '\t': 'tab'}


def monitor(sock_path, command):
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect(sock_path)
    s.settimeout(5)
    buf = b''
    try:
        while not buf.endswith(b'(qemu) '):
            buf += s.recv(4096)
    except socket.timeout:
        pass
    s.sendall(command.encode() + b'\n')
    out = b''
    time.sleep(0.3)
    try:
        while not out.endswith(b'(qemu) '):
            chunk = s.recv(65536)
            if not chunk:
                break
            out += chunk
    except socket.timeout:
        pass
    s.close()
    return out.decode(errors='replace')


def key_for(ch):
    if ch.isalpha():
        return ('shift-' + ch.lower()) if ch.isupper() else ch
    if ch.isdigit():
        return ch
    if ch in SHIFTED:
        return 'shift-' + SHIFTED[ch]
    return PLAIN[ch]


def main():
    sock, action, *args = sys.argv[1:]
    if action == 'shot':
        ppm = args[0] + '.ppm'
        monitor(sock, 'screendump ' + ppm)
        for _ in range(20):
            if os.path.exists(ppm) and os.path.getsize(ppm) > 0:
                break
            time.sleep(0.2)
        time.sleep(0.5)
        subprocess.run(['convert', ppm, args[0]], check=True)
        os.remove(ppm)
    elif action == 'keys':
        for k in args:
            monitor(sock, 'sendkey ' + k)
            time.sleep(0.15)
    elif action == 'type':
        for ch in ' '.join(args):
            monitor(sock, 'sendkey ' + key_for(ch))
            time.sleep(0.06)
    elif action == 'cmd':
        print(monitor(sock, ' '.join(args)))


if __name__ == '__main__':
    main()
