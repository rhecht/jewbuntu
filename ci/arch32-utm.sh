#!/bin/sh
# Make a UTM VM that imitates the owner's 2001 laptop: Pentium III, 256 MB, i440FX PC, IDE
# disk, plain VGA. It boots the image from ci/arch32-vm-image.sh. The serial console is on
# 127.0.0.1:${PORT} (TCP), so ci/arch32-serial.py can drive the guest without the screen.
#
# usage: ci/arch32-utm.sh [IMAGE.qcow2]     (default dist/arch32-vm.qcow2)
#   writes dist/Jewbuntu-P3.utm and opens it in UTM (UTM asks before importing it).
#   Start/stop: utmctl start "Jewbuntu Pentium III"   /   utmctl stop "Jewbuntu Pentium III"
# Memory: UTM emulates i386 with QEMU's TCG (no hypervisor), a few hundred MB on the host.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="$(cd "$(dirname "${1:-$ROOT/dist/arch32-vm.qcow2}")" && pwd)/$(basename "${1:-$ROOT/dist/arch32-vm.qcow2}")"
PORT="${PORT:-4555}"
NAME="Jewbuntu Pentium III"
BUNDLE="$ROOT/dist/Jewbuntu-P3.utm"
DISK_ID="$(uuidgen)"
rm -rf "$BUNDLE"; mkdir -p "$BUNDLE/Data"
cp "$IMAGE" "$BUNDLE/Data/$DISK_ID.qcow2"
MAC="$(printf '52:54:00:%02x:%02x:%02x' $((RANDOM % 256)) $((RANDOM % 256)) $((RANDOM % 256)) 2>/dev/null || echo 52:54:00:12:34:56)"
python3 - "$BUNDLE/config.plist" "$NAME" "$(uuidgen)" "$DISK_ID" "$PORT" "$MAC" <<'PY'
import plistlib, sys
path, name, vm_id, disk_id, port, mac = sys.argv[1:]
config = {
    "ConfigurationVersion": 4,
    "Backend": "QEMU",
    "Information": {"Name": name, "UUID": vm_id, "IconCustom": False},
    "System": {"Architecture": "i386", "Target": "pc", "CPU": "pentium3", "CPUCount": 1,
               "ForceMulticore": False, "MemorySize": 256, "CPUFlagsAdd": [], "CPUFlagsRemove": [],
               "JITCacheSize": 0},
    "QEMU": {"UEFIBoot": False, "Hypervisor": False, "PS2Controller": True, "RNGDevice": False,
             "BalloonDevice": False, "TPMDevice": False, "TSO": False, "DebugLog": False,
             "RTCLocalTime": False, "AdditionalArguments": []},
    "Drive": [{"Interface": "IDE", "Identifier": disk_id, "ImageName": f"{disk_id}.qcow2",
               "ImageType": "Disk", "ReadOnly": False, "InterfaceVersion": 1}],
    "Display": [{"Hardware": "VGA", "DynamicResolution": False, "NativeResolution": False,
                 "UpscalingFilter": "Linear", "DownscalingFilter": "Linear"}],
    "Serial": [{"Mode": "TcpServer", "Target": "Auto", "TcpPort": int(port),
                "WaitForConnection": False, "RemoteConnectionAllowed": False}],
    "Network": [{"Mode": "Shared", "Hardware": "e1000", "MacAddress": mac.upper(),
                 "PortForward": [], "IsolateFromHost": False}],
    "Sound": [],
    "Input": {"UsbBusSupport": "2.0", "UsbSharing": False, "MaximumUsbShare": 3},
    "Sharing": {"DirectoryShareMode": "None", "ClipboardSharing": False, "DirectoryShareReadOnly": False},
}
with open(path, "wb") as f:
    plistlib.dump(config, f)
PY
echo "wrote $BUNDLE (serial console on 127.0.0.1:$PORT)"
open -a UTM "$BUNDLE"
