# VM setup advice

Written 11 November 2026 after inspecting the intended host. Re-check versions
before following it.

## The host that was inspected

| Fact | Value | How it was found |
| --- | --- | --- |
| Machine | iMac, Apple M1, 8 cores | `sysctl machdep.cpu.brand_string`, `hw.ncpu` |
| Architecture | **arm64** (Apple Silicon) | `uname -m` |
| macOS | 26.6.2 (25G83) | `sw_vers` |
| RAM | 16 GB unified memory | `hw.memsize` |
| Free disk | about 94 GB (disk is 90% full) | `df -h ~` |
| VMware Fusion | **12.2.0, an x86_64-only build**: cannot run VMs on Apple Silicon | app `Info.plist`, `file` on the binary |
| VirtualBox, UTM, Parallels | not installed | `/Applications` |
| Docker Desktop | installed (old 20.10 engine), working | used for package builds and container tests |

## What each option can and cannot test

| Option on this M1 | Guest arch | Speed | Tests the amd64 release image? | Good for |
| --- | --- | --- | --- | --- |
| **UTM, "Virtualize", Ubuntu 26.04.1 desktop arm64 ISO** | arm64 | Near-native | **No** | Daily development: packages, GNOME 50 session, Hebrew, Hub, extension, settings, upgrade/remove behaviour |
| UTM, "Emulate", x86_64, Ubuntu 26.04.1 desktop amd64 ISO | amd64 (emulated with QEMU TCG) | Very slow (expect minutes per step) | Yes, functionally only | Live-boot and installer smoke test of the real amd64 image. Never use its timings as performance results. |
| VMware Fusion 13 or later (Apple Silicon build) | arm64 only | Near-native | No | Same as UTM Virtualize. Needs a Broadcom download. |
| VirtualBox on this M1 | arm64 only | n/a | No | Oracle documents that x86 guests are not supported on Arm hosts |
| Your existing Fusion 12.2.0 | n/a | n/a | n/a | Will not run guests on the M1 |
| **VirtualBox on the 2012 HP (16 GB, Intel)** | amd64 (hardware virtualization) | Native-class | **Yes** | The real amd64 VM validation gate, if the HP has an OS to host it |
| VirtualBox on the 2017 MacBook Pro (8 GB) | amd64 | Native-class but starved | Yes | Not recommended: host plus guest in 8 GB leaves too little for either |

**Virtualization vs emulation:** virtualization runs the guest's instructions
directly on the CPU, so the guest must match the host's architecture (arm64 on the
M1). Emulation translates every instruction in software, so an x86_64 guest can run
on the M1, but many times slower.

## Recommendation

1. **Now, on the iMac:** install **UTM** (free from mac.getutm.app; the App Store
   copy is the same app, paid). Create an **arm64** Ubuntu 26.04.1 Desktop VM for the
   development loop. Almost all of Jewbuntu is `Architecture: all`, so the same
   `.deb` files install there. Results are recorded as "arm64 VM: architecture-independent
   checks". They do not count as amd64 validation.
2. **For the amd64 VM gate:** use the **HP as a VirtualBox host** if it currently runs
   an OS you can keep (please tell me which OS it runs). Otherwise run a UTM x86_64
   *emulated* live-boot smoke test on the iMac, then go straight to a live USB on the HP.
3. Keep the M1 on macOS. Its later role is an optional remote AI endpoint.

## Exact steps: UTM arm64 VM on the iMac

Allocations leave macOS at least 10 GB, given the earlier freeze on this machine.

1. Download `ubuntu-26.04.1-desktop-arm64.iso` plus `SHA256SUMS` (and `SHA256SUMS.gpg`)
   from releases.ubuntu.com, or a mirror when it is down. Verify:
   `shasum -a 256 ubuntu-26.04.1-desktop-arm64.iso` and compare with `SHA256SUMS`.
2. UTM → **Create a New Virtual Machine** → **Virtualize** → **Linux**.
   Labels can differ slightly between UTM versions.
3. Boot ISO image: select the arm64 ISO. Leave Apple Virtualization off (QEMU backend)
   for broader device support, including audio.
4. Hardware: **Memory 6144 MB**, **CPU cores 4**. Turn on hardware OpenGL acceleration if offered.
5. Storage: **40 GB** (allocated on demand). Your Mac has about 94 GB free, so avoid more.
6. Shared directory: optional. Simpler: serve the packages over HTTP (step 10).
7. Name it `jewbuntu-dev-arm64`, then open its settings before first boot:
   Sound: enabled (virtio or Intel HDA). Network: Shared (NAT). Display: virtio-gpu (GPU-accelerated if offered).
8. Boot → **Try or Install Ubuntu** → install with **Erase disk** (this only erases the
   *virtual* disk). Create your own user. No third-party drivers needed.
9. After reboot, in the VM: `sudo apt update && sudo apt full-upgrade`, then reboot.
   Optional VM-only integration: `sudo apt install spice-vdagent`. It is a VM convenience,
   never a Jewbuntu dependency.
10. On the Mac: `cd dist/worktree && python3 -m http.server 8000`. In the VM:
    `wget -r -np -nd -A deb http://<mac-ip>:8000/` (get the Mac IP from System Settings → Network).

### Checkpoint plan (UTM: clone the VM, or stop and copy the `.utm` bundle)

| Checkpoint | When |
| --- | --- |
| `01-clean-26.04.1-updated` | after step 9 |
| `02-jewbuntu-m1.1` | after installing the 0.1.0~m1.1 packages and setting a few settings |
| `03-jewbuntu-m1.2-upgraded` | after upgrading to 0.1.0~m1.2 and logging in again |
| Before each risky test | e.g. before deliberately breaking the GNOME extension (milestone 2) |

Restore to `01` whenever you need a clean install test.

### What to check in the VM (milestone 1)

- `jewbuntu doctor`: should report `aarch64`, the VM type, 6 GB, and the "VM results do not certify hardware" note.
- After installing `jewbuntu-desktop` and logging out and in: bottom centred dock, window buttons on the left, Jewbuntu wallpaper in light and dark mode, Hebrew in the keyboard menu (Super+Space switches).
- Type Hebrew with nikud in Text Editor and LibreOffice Writer (if installed), then mixed Hebrew/English copy/paste.
- Startup jingle once at login; not again on lock/unlock; not after `jewbuntu startup-sound off`; not when muted.
- `jewbuntu defaults status`, change the dock position yourself, `jewbuntu defaults restore` puts back only Jewbuntu's keys.
- Upgrade m1.1 → m1.2, log out and in, `jewbuntu config show` keeps your values (schema 2).

Record results in `docs/test-results/` using the template below.

## Recording template

```text
Date:
Host: model / macOS version / arch / RAM / free disk
Hypervisor + version:
Mode: virtualized | emulated
Guest: Ubuntu version, ISO filename, ISO SHA-256, guest arch
Allocated: RAM / vCPUs / disk / graphics / audio device
Jewbuntu packages + versions:
Checks (Pass / Fail / Not tested) with notes:
```
