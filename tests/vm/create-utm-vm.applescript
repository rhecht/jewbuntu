-- Create the Jewbuntu arm64 development VM in UTM (QEMU backend, virtualized).
-- usage: osascript tests/vm/create-utm-vm.applescript /path/to/ubuntu-26.04.1-desktop-arm64.iso
on run argv
	set isoPath to item 1 of argv
	set isoFile to POSIX file isoPath
	tell application "UTM"
		set vm to make new virtual machine with properties {backend:qemu, configuration:{name:"jewbuntu-dev-arm64", architecture:"aarch64", memory:6144, cpu cores:4, hypervisor:true, uefi:true, drives:{{removable:true, source:isoFile}, {guest size:40960}}, network interfaces:{{hardware:"virtio-net-pci", mode:shared}}, displays:{{hardware:"virtio-gpu-gl-pci", dynamic resolution:true}}}}
		return id of vm
	end tell
end run
