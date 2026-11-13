"""Version information.

UPSTREAM_VERSION must match the upstream part of debian/changelog
(checked by tests/unit/test_doctor_upgrade.py).
"""

import shutil
import subprocess

__version__ = "0.1.0~m1.28"


def installed_package_versions(prefix="jewbuntu"):
    """Return {package: version} for installed Jewbuntu packages (dpkg, else rpm), or {}."""
    if not shutil.which("dpkg-query"):
        return _rpm_versions(prefix)
    try:
        out = subprocess.run(
            ["dpkg-query", "-W", "-f", "${Package}\t${Version}\t${db:Status-Abbrev}\n", prefix + "*"],
            capture_output=True, text=True, timeout=10,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return {}
    versions = {}
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) == 3 and parts[2].startswith("ii"):
            versions[parts[0]] = parts[1]
    return versions


def _rpm_versions(prefix):
    """Fedora (Asahi Remix): same answer from the RPM database."""
    if not shutil.which("rpm"):
        return {}
    try:
        out = subprocess.run(
            ["rpm", "-qa", "--qf", "%{NAME}\t%{VERSION}-%{RELEASE}\n", prefix + "*"],
            capture_output=True, text=True, timeout=10,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return {}
    return dict(line.split("\t", 1) for line in out.splitlines() if "\t" in line)
