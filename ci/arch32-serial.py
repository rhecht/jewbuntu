"""Drive the Pentium III test VM through its serial console (UTM TCP server on 127.0.0.1).

TEST VM ONLY (image from ci/arch32-vm-image.sh: root has no password on ttyS0).
usage:
  python3 ci/arch32-serial.py wait               # until the guest answers (boot can take minutes)
  python3 ci/arch32-serial.py run 'free -m'      # prints output, exits with the command's status
  python3 ci/arch32-serial.py fetch /tmp/s.png dist/s.png
  PORT=4555 TIMEOUT=600 to change the port or the per-command timeout (seconds).
"""
import base64
import os
import re
import socket
import sys
import time
import uuid

PORT = int(os.environ.get("PORT", "4555"))
TIMEOUT = float(os.environ.get("TIMEOUT", "600"))


class Console:
    def __init__(self):
        self.sock = socket.create_connection(("127.0.0.1", PORT), timeout=5)
        self.buf = b""

    def send(self, text):
        self.sock.sendall(text.encode())

    def read_until(self, pattern, timeout):
        rx = re.compile(pattern.encode() if isinstance(pattern, str) else pattern)
        end = time.time() + timeout
        while time.time() < end:
            m = rx.search(self.buf)
            if m:
                out, self.buf = self.buf[:m.end()], self.buf[m.end():]
                return out
            try:
                chunk = self.sock.recv(65536)
                if not chunk:
                    raise ConnectionError("serial console closed")
                self.buf += chunk
            except socket.timeout:
                pass
        raise TimeoutError(f"no {pattern!r} within {timeout:.0f}s; last output: {self.buf[-300:]!r}")

    def shell(self):
        """Get to a root shell prompt with echo off and a plain, recognisable prompt."""
        tag = uuid.uuid4().hex[:8]
        for _ in range(3):
            self.send("\r")
            try:
                got = self.read_until(rb"(login: ?$|# ?$|\$ ?$)", 20)
            except TimeoutError:
                continue
            if got.rstrip().endswith(b"login:"):
                self.send("root\r")
                self.read_until(rb"# ?$", 60)
            self.send(f"stty -echo; export PS1='READY{tag}# ' TERM=dumb; echo SYNC{tag}\r")
            self.read_until(f"SYNC{tag}", 30)
            self.read_until(f"READY{tag}# ", 30)
            self.prompt = f"READY{tag}# "
            return
        raise TimeoutError("no shell on the serial console")

    def run(self, cmd, timeout=TIMEOUT):
        tag = uuid.uuid4().hex[:8]
        self.send(f"echo B{tag}; {{ {cmd} ; }} 2>&1; echo E{tag}=$?\r")
        out = self.read_until(rf"E{tag}=(\d+)", timeout).decode(errors="replace")
        body = out.split(f"B{tag}", 1)[-1]
        rc = int(re.search(rf"E{tag}=(\d+)", body).group(1))
        body = body[:body.rfind(f"E{tag}=")].replace("\r", "").strip("\n")
        self.read_until(re.escape(self.prompt), 30)
        return rc, body


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    action = sys.argv[1]
    if action == "wait":
        end = time.time() + TIMEOUT
        while True:
            try:
                c = Console()
                c.shell()
                rc, out = c.run("uname -m; uptime")
                print(out)
                return 0
            except (OSError, TimeoutError, ConnectionError) as e:
                if time.time() > end:
                    print(f"guest not answering: {e}", file=sys.stderr)
                    return 1
                time.sleep(10)
    c = Console()
    c.shell()
    if action == "run":
        rc, out = c.run(" ".join(sys.argv[2:]))
        print(out)
        return rc
    if action == "fetch":
        rc, out = c.run(f"base64 -w0 {sys.argv[2]}")
        if rc:
            print(out, file=sys.stderr)
            return rc
        data = base64.b64decode(re.sub(r"\s+", "", out))
        with open(sys.argv[3], "wb") as f:
            f.write(data)
        print(f"{sys.argv[3]}: {len(data)} bytes")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
