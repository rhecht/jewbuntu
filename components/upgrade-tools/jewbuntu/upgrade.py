"""Compatibility and Ubuntu-upgrade readiness report.

This module only *inspects*. It never starts a release upgrade, never edits
APT sources, and never installs anything. The optional upstream check runs
`do-release-upgrade -c`, which only asks Ubuntu whether a new release exists.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

from . import config, paths
from .doctor import ROOT, platform_report
from .version import installed_package_versions

# Conservative heuristics, labelled as such in the report.
MIN_ROOT_FREE_GB_FOR_RELEASE_UPGRADE = 5.0
MIN_BOOT_FREE_MB = 300


def load_matrix():
    with open(paths.share_path("support-matrix.json"), encoding="utf-8") as handle:
        return json.load(handle)


def matrix_entry(matrix, codename):
    for entry in matrix.get("releases", []):
        if entry.get("codename") == codename:
            return entry
    return None


def _run(cmd, timeout=20):
    if not shutil.which(cmd[0]):
        return None, None
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return res.returncode, (res.stdout + res.stderr).strip()
    except (OSError, subprocess.SubprocessError) as exc:
        return None, str(exc)


def _free_gb(path):
    import os
    try:
        st = os.statvfs(path)
        return round(st.f_bavail * st.f_frsize / 1024**3, 2)
    except OSError:
        return None


def apt_sources_summary():
    """Names and enabled-state of third-party APT sources (file names only, no URLs with tokens)."""
    sources_dir = ROOT / "etc/apt/sources.list.d"
    items = []
    if not sources_dir.exists():
        return items
    for f in sorted(sources_dir.iterdir()):
        if f.suffix not in (".list", ".sources"):
            continue
        text = f.read_text(errors="replace")
        if f.suffix == ".sources":
            enabled = not re.search(r"^Enabled:\s*no", text, re.M | re.I)
            suites = re.findall(r"^Suites:\s*(.+)$", text, re.M)
        else:
            active = [l for l in text.splitlines() if l.strip() and not l.lstrip().startswith("#")]
            enabled = bool(active)
            suites = [l.split()[2] for l in active if len(l.split()) > 2]
        items.append({"file": f.name, "enabled": enabled, "suites": " ".join(suites).split()})
    return items


def gnome_major(version_string):
    m = re.search(r"(\d+)(?:\.\d+)*", version_string or "")
    return m.group(1) if m else None


def readiness_report(check_upstream=False):
    plat = platform_report()
    codename = plat["os"].get("VERSION_CODENAME")
    matrix = load_matrix()
    entry = matrix_entry(matrix, codename)
    findings = []  # (level, message) where level in ok|attention|blocker|info

    if entry is None:
        findings.append(("blocker", f"Ubuntu '{codename}' is not in the Jewbuntu support matrix. Keep Jewbuntu packages as they are and do not install builds for another release."))
    else:
        findings.append(("ok" if entry["status"] == "supported" else "info",
                         f"Ubuntu {entry['ubuntu']} ({codename}) is listed with status '{entry['status']}'."))
        major = gnome_major(plat.get("gnome_shell"))
        if major and major not in entry.get("gnome_shell_majors", []):
            findings.append(("attention", f"GNOME Shell {major} is not a tested version for this release; panel integration may be disabled, the Hub still works."))

    packages = installed_package_versions()
    if not packages:
        findings.append(("info", "No Jewbuntu packages detected by dpkg (or dpkg unavailable)."))

    root_free = _free_gb(str(ROOT))
    if root_free is not None and root_free < MIN_ROOT_FREE_GB_FOR_RELEASE_UPGRADE:
        findings.append(("blocker", f"Only {root_free} GB free on /. Free at least {MIN_ROOT_FREE_GB_FOR_RELEASE_UPGRADE} GB before a release upgrade (heuristic; the upgrader computes its own requirement)."))
    boot = ROOT / "boot"
    if boot.exists() and boot.is_mount():
        boot_free = _free_gb(str(boot))
        if boot_free is not None and boot_free * 1024 < MIN_BOOT_FREE_MB:
            findings.append(("attention", f"/boot has only {int(boot_free * 1024)} MB free; remove old kernels with 'sudo apt autoremove'."))

    rc, out = _run(["dpkg", "--audit"])
    if rc is not None and out:
        findings.append(("blocker", "dpkg reports partially installed packages; run 'sudo dpkg --configure -a' first."))
    rc, out = _run(["apt-mark", "showhold"])
    if out:
        findings.append(("attention", f"Held packages: {', '.join(out.split())}. Holds can block a release upgrade."))
    if (ROOT / "run/reboot-required").exists():
        findings.append(("attention", "A reboot is pending from earlier updates; reboot before upgrading."))

    sources = apt_sources_summary()
    third_party = [s for s in sources if s["file"] not in ("ubuntu.sources",)]
    if third_party:
        findings.append(("info", "Ubuntu's upgrader disables third-party sources during a release upgrade. After upgrading, run 'jewbuntu repo status' to re-enable the matching Jewbuntu suite; other sources need individual checks."))

    try:
        raw = config.read_raw()
        schema = (raw or {}).get("schema_version")
        if raw is None:
            findings.append(("info", "No personal Jewbuntu settings saved yet."))
        elif schema > config.SCHEMA_VERSION:
            findings.append(("attention", f"Settings schema {schema} is newer than this Jewbuntu ({config.SCHEMA_VERSION}); they will be left untouched."))
        else:
            findings.append(("ok", f"Settings readable (schema {schema}). Export them before any release upgrade: 'jewbuntu export'."))
    except config.ConfigError as exc:
        findings.append(("attention", f"Settings unreadable: {exc}"))

    upstream = None
    if check_upstream:
        rc, out = _run(["do-release-upgrade", "-c"], timeout=60)
        upstream = {"exit_code": rc, "output": out}
        findings.append(("info", "Upstream check output included. This report never starts an upgrade."))

    levels = [lvl for lvl, _ in findings]
    overall = "blocked" if "blocker" in levels else ("needs-attention" if "attention" in levels else "ready-to-plan")
    return {
        "report_format": 1,
        "overall": overall,
        "ubuntu": plat["os"],
        "gnome_shell": plat.get("gnome_shell"),
        "matrix_entry": entry,
        "jewbuntu_packages": packages,
        "root_free_gb": root_free,
        "apt_sources": sources,
        "findings": [{"level": l, "message": m} for l, m in findings],
        "upstream_check": upstream,
    }


def format_text(report):
    icon = {"ok": "OK  ", "info": "INFO", "attention": "WARN", "blocker": "STOP"}
    lines = [
        "Jewbuntu upgrade readiness report (inspection only - nothing was changed)",
        "",
        f"Ubuntu       : {report['ubuntu'].get('PRETTY_NAME')} ({report['ubuntu'].get('VERSION_CODENAME')})",
        f"GNOME Shell  : {report['gnome_shell'] or 'not detected'}",
        f"Jewbuntu     : " + (", ".join(f"{k} {v}" for k, v in report["jewbuntu_packages"].items()) or "no packages detected"),
        f"Overall      : {report['overall']}",
        "",
    ]
    lines += [f"[{icon[f['level']]}] {f['message']}" for f in report["findings"]]
    lines += [
        "",
        "Before a release upgrade: back up your files, run 'jewbuntu export', then use",
        "Ubuntu's own upgrader (Software & Updates / 'sudo do-release-upgrade').",
        "Afterwards: 'jewbuntu repo status' and 'jewbuntu upgrade-check' again.",
    ]
    if report["upstream_check"]:
        lines += ["", "Upstream check:", report["upstream_check"]["output"] or "(no output)"]
    return "\n".join(lines)
