"""XDG base-directory paths for per-user data, plus machine-wide locations.

Per-user files live under the user's own XDG directories. Root package
maintainer scripts never touch these paths.
"""

import os
from pathlib import Path

APP = "jewbuntu"

# Machine-wide, package-owned locations.
SYSTEM_CONFIG_DIR = Path(os.environ.get("JEWBUNTU_SYSTEM_CONFIG_DIR", "/etc/jewbuntu"))
SHARE_DIR = Path(os.environ.get("JEWBUNTU_SHARE_DIR", "/usr/share/jewbuntu"))


def _xdg(var, fallback):
    value = os.environ.get(var)
    if value and os.path.isabs(value):
        return Path(value)
    return Path.home() / fallback


def config_dir():
    return _xdg("XDG_CONFIG_HOME", ".config") / APP


def data_dir():
    return _xdg("XDG_DATA_HOME", ".local/share") / APP


def state_dir():
    return _xdg("XDG_STATE_HOME", ".local/state") / APP


def cache_dir():
    return _xdg("XDG_CACHE_HOME", ".cache") / APP


def settings_file():
    return config_dir() / "settings.json"


def backup_dir():
    return state_dir() / "backups"


def user_paths():
    """All per-user locations Jewbuntu may write, for reset/export listings."""
    return {
        "config": config_dir(),
        "data": data_dir(),
        "state": state_dir(),
        "cache": cache_dir(),
    }


def share_path(*parts):
    """Locate a shared data file; falls back to the source tree when run uninstalled."""
    installed = SHARE_DIR.joinpath(*parts)
    if installed.exists():
        return installed
    repo_root = Path(__file__).resolve().parents[3]
    for candidate in (repo_root.joinpath(*parts), repo_root / "profiles" / parts[-1]):
        if candidate.exists():
            return candidate
    return installed
