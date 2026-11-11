"""Jewbuntu shared Python library (core configuration, diagnostics, tooling).

Installed privately under /usr/lib/jewbuntu/python by the jewbuntu-core
package. Standard library only, so it runs on any supported Ubuntu release
without extra Python dependencies.

Several binary packages contribute modules to this one package directory
(doctor.py from the hardware doctor, upgrade.py/repo.py from
jewbuntu-upgrade-tools, startup_sound.py from jewbuntu-branding). When run
from a source checkout, the sibling component directories are added to the
package path so the same imports work uninstalled.
"""

import os as _os

from .version import __version__  # noqa: F401

_components = _os.path.dirname(_os.path.dirname(_os.path.dirname(__file__)))
for _name in ("hardware-doctor", "upgrade-tools", "branding"):
    _candidate = _os.path.join(_components, _name, "jewbuntu")
    if _os.path.isdir(_candidate) and _candidate not in __path__:
        __path__.append(_candidate)
