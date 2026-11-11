"""Hardware inventory and suitability report ("Jewbuntu Doctor").

Reads facts from /proc, /sys and standard tools. Anything that cannot be
determined is reported as None / "unknown" - never guessed.

Privacy: serial numbers, MAC addresses, UUIDs and the hostname are not
collected. The report is safe to paste into an issue.
"""

import json
import os
import platform
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(os.environ.get("JEWBUNTU_SYSROOT", "/"))

# x86-64 micro-architecture levels (psABI). Flag names as they appear in /proc/cpuinfo.
X86_LEVELS = {
    "x86-64-v2": {"cx16", "lahf_lm", "popcnt", "sse4_1", "sse4_2", "ssse3"},
    "x86-64-v3": {"avx", "avx2", "bmi1", "bmi2", "f16c", "fma", "abm", "movbe", "xsave"},
    "x86-64-v4": {"avx512f", "avx512bw", "avx512cd", "avx512dq", "avx512vl"},
}
# Flags relevant to local inference runtimes.
AI_FLAGS = ["sse4_2", "avx", "avx2", "fma", "f16c", "avx512f", "avx_vnni", "avx512_vnni", "amx_tile"]

DESKTOP_RECOMMENDED_RAM_GB = 8  # brief: start full-desktop validation at 8 GB
UBUNTU_2604_DESKTOP_MIN_RAM_GB = 6  # Ubuntu 26.04 published desktop guidance
UBUNTU_MIN_FREE_STORAGE_GB = 25


def _read(rel):
    try:
        return (ROOT / rel).read_text(errors="replace").strip()
    except OSError:
        return None


def _run(cmd, timeout=10):
    if not shutil.which(cmd[0]):
        return None
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.SubprocessError):
        return None
    return res.stdout if res.returncode == 0 else None


# --- CPU --------------------------------------------------------------------

def parse_cpuinfo(text):
    info = {"model": None, "vendor": None, "flags": set(), "logical_cpus": 0, "physical_cores": None}
    cores = {}
    current_phys = None
    for line in (text or "").splitlines():
        if ":" not in line:
            continue
        key, _, value = (s.strip() for s in line.partition(":"))
        if key == "processor":
            info["logical_cpus"] += 1
        elif key == "model name" and not info["model"]:
            info["model"] = value
        elif key == "vendor_id" and not info["vendor"]:
            info["vendor"] = value
        elif key == "flags" and not info["flags"]:
            info["flags"] = set(value.split())
        elif key == "physical id":
            current_phys = value
        elif key == "cpu cores" and current_phys is not None:
            cores[current_phys] = int(value)
    if cores:
        info["physical_cores"] = sum(cores.values())
    return info


def x86_level(flags):
    """Highest x86-64 psABI level supported by a set of cpuinfo flags (None if not x86-64 or unknown)."""
    if not flags or "lm" not in flags:
        return None
    level = "x86-64-v1"
    for name, required in X86_LEVELS.items():
        if required <= flags:
            level = name
        else:
            break
    return level


def cpu_report():
    machine = platform.machine()
    info = parse_cpuinfo(_read("proc/cpuinfo"))
    flags = info.pop("flags")
    max_mhz = _read("sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq")
    level = x86_level(flags) if machine in ("x86_64", "amd64") else None
    return {
        "architecture": machine,
        "model": info["model"],
        "vendor": info["vendor"],
        "logical_cpus": info["logical_cpus"] or os.cpu_count(),
        "physical_cores": info["physical_cores"],
        "max_mhz": int(max_mhz) // 1000 if max_mhz and max_mhz.isdigit() else None,
        "x86_64_level": level,
        "ai_relevant_flags": {f: (f in flags) for f in AI_FLAGS} if flags else None,
        "virtualization_flag": ("vmx" in flags or "svm" in flags) if flags else None,
    }


# --- memory -------------------------------------------------------------------

def parse_meminfo(text):
    values = {}
    for line in (text or "").splitlines():
        m = re.match(r"(\w+):\s+(\d+)\s*kB", line)
        if m:
            values[m.group(1)] = int(m.group(2)) * 1024
    return values


def parse_psi(text):
    """Parse /proc/pressure/memory 'some' avg10/avg60."""
    for line in (text or "").splitlines():
        if line.startswith("some"):
            fields = dict(part.split("=") for part in line.split()[1:])
            return {"some_avg10": float(fields["avg10"]), "some_avg60": float(fields["avg60"])}
    return None


def memory_report():
    mem = parse_meminfo(_read("proc/meminfo"))
    gb = lambda b: round(b / 1024**3, 2) if b is not None else None  # noqa: E731
    return {
        "total_gb": gb(mem.get("MemTotal")),
        "available_gb": gb(mem.get("MemAvailable")),
        "swap_total_gb": gb(mem.get("SwapTotal")),
        "swap_free_gb": gb(mem.get("SwapFree")),
        "pressure": parse_psi(_read("proc/pressure/memory")),
    }


# --- GPU, storage, platform -------------------------------------------------------

def gpu_report():
    gpus = []
    out = _run(["lspci", "-nn"])
    if out:
        for line in out.splitlines():
            if re.search(r"VGA compatible|3D controller|Display controller", line):
                gpus.append(line.split(": ", 1)[-1])
    else:
        drm = ROOT / "sys/class/drm"
        for card in sorted(drm.glob("card[0-9]")) if drm.exists() else []:
            vendor = _read(f"sys/class/drm/{card.name}/device/vendor")
            device = _read(f"sys/class/drm/{card.name}/device/device")
            driver = Path(os.path.realpath(card / "device/driver")).name if (card / "device/driver").exists() else None
            gpus.append(f"vendor={vendor} device={device} driver={driver}")
    return {"devices": gpus or None, "vram": "unknown (not measured in milestone 1)"}


def storage_report():
    disks = None
    out = _run(["lsblk", "-J", "-d", "-o", "NAME,SIZE,TYPE,ROTA,TRAN,MODEL"])
    if out:
        try:
            disks = [
                {k: d.get(k) for k in ("name", "size", "type", "rota", "tran", "model")}
                for d in json.loads(out).get("blockdevices", [])
                if d.get("type") == "disk"
            ]
        except ValueError:
            disks = None
    try:
        st = os.statvfs(str(ROOT))
        root_free = round(st.f_bavail * st.f_frsize / 1024**3, 1)
        root_total = round(st.f_blocks * st.f_frsize / 1024**3, 1)
    except OSError:
        root_free = root_total = None
    return {"disks": disks, "root_free_gb": root_free, "root_total_gb": root_total}


def platform_report():
    dmi = {k: _read(f"sys/class/dmi/id/{k}") for k in ("sys_vendor", "product_name", "product_version", "board_name", "bios_version")}
    os_release = {}
    for line in (_read("etc/os-release") or "").splitlines():
        if "=" in line:
            k, _, v = line.partition("=")
            os_release[k] = v.strip('"')
    virt = (_run(["systemd-detect-virt"]) or "").strip() or None
    gnome = (_run(["gnome-shell", "--version"]) or "").strip() or None
    firmware = "uefi" if (ROOT / "sys/firmware/efi").exists() else ("bios" if (ROOT / "sys/firmware").exists() else None)
    secure_boot = None
    sb = _run(["mokutil", "--sb-state"])
    if sb:
        secure_boot = "enabled" in sb.lower()
    batteries = [p.name for p in (ROOT / "sys/class/power_supply").glob("BAT*")] if (ROOT / "sys/class/power_supply").exists() else []
    sound_cards = _read("proc/asound/cards")
    return {
        "dmi": dmi,  # e.g. product_name "MacBookPro14,1"; serial numbers deliberately excluded
        "os": {k: os_release.get(k) for k in ("PRETTY_NAME", "VERSION_ID", "VERSION_CODENAME")},
        "kernel": platform.release(),
        "virtualization": virt if virt != "none" else None,
        "is_virtual_machine": (virt not in (None, "none")) if virt is not None else None,
        "firmware": firmware,
        "secure_boot": secure_boot,
        "gnome_shell": gnome,
        "session_type": os.environ.get("XDG_SESSION_TYPE"),
        "batteries": batteries,
        "sound_cards_present": bool(sound_cards and "no soundcards" not in sound_cards) if sound_cards is not None else None,
    }


# --- assessment -----------------------------------------------------------------

def assess(report):
    """Turn facts into recommendations. Each note states its basis; unknowns stay unknown."""
    notes = []
    cpu, mem, storage = report["cpu"], report["memory"], report["storage"]
    total = mem.get("total_gb")
    if total is None:
        profile = "unknown"
        notes.append("RAM could not be read; cannot recommend a profile.")
    elif total >= DESKTOP_RECOMMENDED_RAM_GB - 0.5:
        profile = "desktop"
        notes.append(f"{total} GB RAM: meets the 8 GB starting point for full-desktop validation.")
    elif total >= UBUNTU_2604_DESKTOP_MIN_RAM_GB - 0.5:
        profile = "desktop (constrained)"
        notes.append(f"{total} GB RAM: meets Ubuntu 26.04's 6 GB desktop guidance but below 8 GB; avoid local AI on this machine.")
    else:
        profile = "node"
        notes.append(f"{total} GB RAM: below Ubuntu 26.04 desktop guidance; use the headless node profile (Lite is a later investigation).")

    arch = cpu.get("architecture")
    if arch not in ("x86_64", "amd64"):
        notes.append(f"Architecture {arch}: the first Jewbuntu image targets amd64 only; this run tests architecture-independent parts.")
    level = cpu.get("x86_64_level")
    if level:
        if level in ("x86-64-v1", "x86-64-v2"):
            notes.append(f"CPU is {level}: use standard amd64 packages. AVX2-optimised (amd64v3) builds and many prebuilt AI binaries will not run.")
        else:
            notes.append(f"CPU is {level}: AVX2-class optimised builds can run.")
    if cpu.get("max_mhz") is not None and cpu["max_mhz"] < 2000:
        notes.append(f"CPU max clock {cpu['max_mhz']} MHz is below the 2 GHz desktop guideline.")
    elif cpu.get("max_mhz") is None:
        notes.append("CPU max clock not exposed (common in VMs); check the CPU model string instead.")

    free = storage.get("root_free_gb")
    if free is not None and free < UBUNTU_MIN_FREE_STORAGE_GB:
        notes.append(f"Only {free} GB free on the root filesystem; Ubuntu guidance is at least 25 GB.")
    disks = storage.get("disks") or []
    if any(str(d.get("rota")) in ("1", "True", "true") for d in disks):
        notes.append("A rotational (spinning) disk is present; an SSD makes the largest difference on older PCs.")
    if report["platform"].get("is_virtual_machine"):
        notes.append("Running in a VM: GPU, audio, Wi-Fi, suspend and thermal results here do not certify physical hardware.")
    pressure = mem.get("pressure")
    if pressure and pressure["some_avg10"] > 10:
        notes.append(f"Memory pressure is high right now (some avg10={pressure['some_avg10']}%).")
    return {"suggested_profile": profile, "notes": notes}


def full_report():
    report = {
        "report_format": 1,
        "cpu": cpu_report(),
        "memory": memory_report(),
        "gpu": gpu_report(),
        "storage": storage_report(),
        "platform": platform_report(),
    }
    report["assessment"] = assess(report)
    return report


def format_text(report):
    c, m, s, p, a = report["cpu"], report["memory"], report["storage"], report["platform"], report["assessment"]
    u = lambda v: "unknown" if v in (None, "", []) else v  # noqa: E731
    lines = [
        "Jewbuntu Doctor - hardware report",
        "",
        f"Machine     : {u(p['dmi'].get('sys_vendor'))} {u(p['dmi'].get('product_name'))} ({u(p['dmi'].get('product_version'))})",
        f"OS          : {u(p['os'].get('PRETTY_NAME'))}  kernel {p['kernel']}",
        f"Desktop     : {u(p['gnome_shell'])}  session {u(p['session_type'])}",
        f"Firmware    : {u(p['firmware'])}  Secure Boot {u(p['secure_boot'])}",
        f"Virtual     : {u(p['virtualization']) if p['is_virtual_machine'] else ('no' if p['is_virtual_machine'] is False else 'unknown')}",
        f"CPU         : {u(c['model'])}",
        f"              {c['logical_cpus']} threads, {u(c['physical_cores'])} cores, max {u(c['max_mhz'])} MHz, arch {c['architecture']}, level {u(c['x86_64_level'])}",
    ]
    if c["ai_relevant_flags"]:
        lines.append("CPU flags   : " + " ".join(f"{k}{'+' if v else '-'}" for k, v in c["ai_relevant_flags"].items()))
    lines += [
        f"Memory      : {u(m['total_gb'])} GB total, {u(m['available_gb'])} GB available, swap {u(m['swap_total_gb'])} GB",
        f"GPU         : {'; '.join(report['gpu']['devices']) if report['gpu']['devices'] else 'unknown'}",
        f"Storage     : root {u(s['root_free_gb'])} GB free of {u(s['root_total_gb'])} GB",
    ]
    for d in s["disks"] or []:
        kind = "HDD" if str(d.get("rota")) in ("1", "True", "true") else "SSD/flash"
        lines.append(f"              {d['name']} {d['size']} {kind} {u(d.get('tran'))} {u(d.get('model'))}")
    lines += [f"Audio       : {'sound card present' if p['sound_cards_present'] else u(p['sound_cards_present'])}",
              f"Battery     : {', '.join(p['batteries']) or 'none detected'}",
              "", f"Suggested profile: {a['suggested_profile']}"]
    lines += [f"  - {n}" for n in a["notes"]]
    return "\n".join(lines)
