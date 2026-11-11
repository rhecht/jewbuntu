"""List and restore the desktop settings Jewbuntu changes.

Jewbuntu sets its look through a GSettings vendor override
(90_jewbuntu*.gschema.override), which changes *defaults* only. Anything
the user changed stays theirs. "Restore" resets just the keys listed in the
manifest back to the Jewbuntu default, leaving every other setting alone.
"""

import json
import shutil
import subprocess

from . import paths


def load_manifest():
    with open(paths.share_path("desktop-defaults.json"), encoding="utf-8") as handle:
        return json.load(handle)["keys"]


def _gsettings(*args):
    if not shutil.which("gsettings"):
        return None
    res = subprocess.run(["gsettings", *args], capture_output=True, text=True, timeout=5)
    return res.stdout.strip() if res.returncode == 0 else None


def status():
    rows = []
    for item in load_manifest():
        schema, key = item["schema"], item["key"]
        current = _gsettings("get", schema, key)
        rows.append({
            **item,
            "current": current,
            "schema_installed": current is not None,
            "matches_jewbuntu": current is not None and current == item["value"],
        })
    return rows


def restore(dry_run=False):
    changed = []
    for row in status():
        if row["schema_installed"] and not row["matches_jewbuntu"]:
            if not dry_run:
                _gsettings("reset", row["schema"], row["key"])
            changed.append(f"{row['schema']} {row['key']}: {row['current']} -> {row['value']}")
    return changed
