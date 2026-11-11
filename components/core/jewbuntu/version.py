"""Version information.

UPSTREAM_VERSION must match the upstream part of debian/changelog
(checked by tests/unit/test_doctor_upgrade.py).
"""

import shutil
import subprocess

__version__ = "0.1.0~m1.5"


def installed_package_versions(prefix="jewbuntu"):
    """Return {package: version} for installed Jewbuntu packages, or {} if dpkg is absent."""
    if not shutil.which("dpkg-query"):
        return {}
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
