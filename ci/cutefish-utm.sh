#!/bin/sh
# Test only: a UTM VM (Apple Silicon, arm64, hypervisor) that boots the test ISO from
# ci/cutefish-vm-iso.sh as a live system with no disk. 4 GB, 4 CPUs, virtio GPU, Intel HDA sound
# (so the jingle has an output), shared network, serial console on 127.0.0.1:${PORT}.
# usage: ci/cutefish-utm.sh TEST.iso      writes dist/Jewbuntu-Cutefish-test.utm and opens it in UTM
#   utmctl start "Jewbuntu Cutefish test"   /   utmctl stop "Jewbuntu Cutefish test"
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ISO="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
PORT="${PORT:-4556}"
NAME="Jewbuntu Cutefish test"
BUNDLE="$ROOT/dist/Jewbuntu-Cutefish-test.utm"
CD_ID="$(uuidgen)"
rm -rf "$BUNDLE"; mkdir -p "$BUNDLE/Data"
ln "$ISO" "$BUNDLE/Data/$CD_ID.iso" 2>/dev/null || cp "$ISO" "$BUNDLE/Data/$CD_ID.iso"
MAC="$(printf '52:54:00:%02x:%02x:%02x' $((RANDOM % 256)) $((RANDOM % 256)) $((RANDOM % 256)))"
python3 - "$BUNDLE/config.plist" "$NAME" "$(uuidgen)" "$CD_ID" "$PORT" "$MAC" <<'PY'
import plistlib, sys
path, name, vm_id, cd_id, port, mac = sys.argv[1:]
config = {
    "ConfigurationVersion": 4,
    "Backend": "QEMU",
    "Information": {"Name": name, "UUID": vm_id, "IconCustom": False},
    "System": {"Architecture": "aarch64", "Target": "virt", "CPU": "default", "CPUCount": 4,
               "ForceMulticore": False, "MemorySize": 4096, "CPUFlagsAdd": [], "CPUFlagsRemove": [],
               "JITCacheSize": 0},
    "QEMU": {"UEFIBoot": True, "Hypervisor": True, "PS2Controller": False, "RNGDevice": True,
             "BalloonDevice": False, "TPMDevice": False, "TSO": False, "DebugLog": False,
             "RTCLocalTime": False, "AdditionalArguments": []},
    "Drive": [{"Interface": "USB", "Identifier": cd_id, "ImageName": f"{cd_id}.iso",
               "ImageType": "CD", "ReadOnly": True, "InterfaceVersion": 1}],
    "Display": [{"Hardware": "virtio-gpu-pci", "DynamicResolution": True, "NativeResolution": False,
                 "UpscalingFilter": "Linear", "DownscalingFilter": "Linear"}],
    "Serial": [{"Mode": "TcpServer", "Target": "Auto", "TcpPort": int(port),
                "WaitForConnection": False, "RemoteConnectionAllowed": False}],
    "Network": [{"Mode": "Shared", "Hardware": "virtio-net-pci", "MacAddress": mac.upper(),
                 "PortForward": [], "IsolateFromHost": False}],
    "Sound": [{"Hardware": "intel-hda"}],
    "Input": {"UsbBusSupport": "3.0", "UsbSharing": False, "MaximumUsbShare": 3},
    "Sharing": {"DirectoryShareMode": "None", "ClipboardSharing": False, "DirectoryShareReadOnly": False},
}
with open(path, "wb") as f:
    plistlib.dump(config, f)
PY
echo "wrote $BUNDLE (MAC $MAC, serial on 127.0.0.1:$PORT)"
open -a UTM "$BUNDLE"
