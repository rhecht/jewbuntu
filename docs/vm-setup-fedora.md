# Fedora VM for checking the Asahi look (UTM on the M1 iMac)

The Fedora container tests (`ci/fedora-test.sh`) can't show what the desktop looks like,
and they can't run SELinux or the password prompts. This VM covers those gaps.

It runs **Fedora 45 Workstation for ARM**, not Fedora Asahi Remix: the Remix only boots on
real Apple hardware. Workstation has the same GNOME 51 and takes the same Jewbuntu RPMs, so
it's enough to see and judge the look. Apple Silicon hardware support still needs a real
Asahi install (the owner's call). It takes about 45 minutes, mostly waiting.

## Before you start

- **Disk:** about 3 GB for the download plus about 13 GB for the VM. Leave at least 15 GB
  free for macOS, counting the Ubuntu dev VM (`jewbuntu-dev-arm64`, about 12 GB).
- **Memory:** don't run both VMs at once. Each gets 6 GB, and the iMac has 16 GB.

## 1. Download Fedora 45 Workstation for ARM

From [fedoraproject.org/workstation/download](https://fedoraproject.org/workstation/download),
get the **ARM aarch64 Live ISO** (`Fedora-Workstation-Live-45-1.4.aarch64.iso`, 2.8 GB on
2026-11-13) and its CHECKSUM file. Check the download:

```bash
shasum -a 256 ~/Downloads/Fedora-Workstation-Live-45-1.4.aarch64.iso
```

The result must match the line for that file in the CHECKSUM file.

## 2. Create the VM in UTM

1. **Create a New Virtual Machine → Virtualize → Linux.** Labels can differ slightly between
   UTM versions.
2. Choose the ISO as the boot image. Leave **Apple Virtualization off** (QEMU), so sound works.
3. **Memory 6144 MB, CPU cores 4.** Turn on hardware OpenGL acceleration if it's offered.
4. **Storage 30 GB.** It only takes up what's used, about 13 GB after the install.
5. Name it **`jewbuntu-fedora-arm64`**. Before the first boot, open its settings:
   - Network: **Shared**
   - Sound: on
   - Display: **virtio-gpu**, GPU-accelerated if offered

## 3. Install Fedora

1. Boot it, then choose **Install Fedora** from the live desktop. Erasing the disk only erases
   the *virtual* disk.
2. Create your own user and reboot.
3. Update, then reboot again:

   ```bash
   sudo dnf upgrade --refresh -y
   ```

4. Shut the VM down and **clone it in UTM** as `jewbuntu-fedora-01-clean`, a clean Fedora to
   go back to.

## 4. Copy the Jewbuntu packages over

Build them first if `dist/fedora` is empty or old (`WORKTREE=1 ci/fedora-build.sh`; ShulGo
with `ci/build-shulgo-rpm.sh`, see [asahi.md](asahi.md#building-and-testing-developers)).

Start the VM. On the Mac, serve the packages only on UTM's network, not the home network,
because the ShulGo package is private:

```bash
cd ~/Jewbuntu/jewbuntu/dist/fedora && python3 -m http.server 8000 --bind 192.168.64.1
```

If that address fails, run `ip route` in the VM: the address after `default via` is the
Mac's address on UTM's network. Then, in the VM:

```bash
mkdir ~/jb && cd ~/jb && wget -r -np -nd -A rpm http://192.168.64.1:8000/
```

Stop the server on the Mac afterwards with Ctrl+C.

## 5. Install and turn on the look

In the VM:

```bash
sudo dnf install ./jewbuntu-*.rpm
```

Log out and back in. Answer **yes** to Jewbuntu's one-time question, then log out and in
once more.

## 6. What to look at

The owner's rules for the skin apply throughout: one colour scheme, text always readable,
glass not too see-through. Check everything in both **light and dark** mode (quick settings
has a toggle).

- **Login screen:** "Jewbuntu for Asahi Linux" logo.
- **Desktop:** Star of David wallpaper (blue in light mode, purple in dark), clear top bar with
  readable text, floating glass dock.
- **App folders** (open one in the app grid): light glass with dark text in light mode, dark
  glass with light text in dark mode. The backdrop is lighter than plain GNOME's.
- **Quick settings** (top right): dark glass with white text, readable over the wallpaper.
- **Menus and pop-ups:** rounded, no dark corners.
- **Terminal:** Jewbuntu colours, readable menus and title bar.
- **Files and Settings:** window buttons on the left, glass look.
- **Hebrew:** Super+Space switches to Hebrew; type some in Text Editor.
- **Hub and ShulGo:** both open. ShulGo needs its API key and saved place entered again.
- **Startup jingle** at login, if sound works in the VM.
- **Web Server:** press **Set up** and check that the password prompt appears, then make a
  site and open it in Firefox. `getenforce` should say **Enforcing** (the SELinux test that
  containers can't do).

## 7. Record and keep a checkpoint

Record results in `docs/test-results/` with the template in [vm-setup.md](vm-setup.md#recording-template).
Never mark anything `pass` without that record.

To let Claude run the checks over SSH (as on the Ubuntu VM, with a dedicated key the owner
authorises):

```bash
sudo systemctl enable --now sshd
```

When you're done, clone the VM again as `jewbuntu-fedora-02-jewbuntu`.
