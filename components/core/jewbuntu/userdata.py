"""Export, import and explicit reset of a user's Jewbuntu data.

Export bundles settings plus a manifest into a .tar.gz the user owns.
Caches are never exported. Import validates, backs up the current settings,
migrates older bundles forward, and refuses bundles from a newer schema.
Reset only removes data after listing exactly what will be removed.
"""

import io
import json
import platform
import shutil
import tarfile
import time
from pathlib import Path

from . import config, paths
from .version import __version__, installed_package_versions

BUNDLE_FORMAT = 1


def export_bundle(dest=None):
    raw = config.read_raw()
    stamp = time.strftime("%Y%m%d-%H%M%S")
    dest = Path(dest) if dest else Path.home() / f"jewbuntu-settings-{stamp}.tar.gz"
    manifest = {
        "bundle_format": BUNDLE_FORMAT,
        "created": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "jewbuntu_version": __version__,
        "packages": installed_package_versions(),
        "settings_schema": (raw or {}).get("schema_version", config.SCHEMA_VERSION),
        "has_settings": raw is not None,
        "python": platform.python_version(),
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".partial")
    with tarfile.open(tmp, "w:gz") as tar:
        _add_bytes(tar, "manifest.json", json.dumps(manifest, indent=2).encode())
        if raw is not None:
            _add_bytes(tar, "settings.json", json.dumps(raw, indent=2, ensure_ascii=False).encode())
    tmp.chmod(0o600)
    tmp.replace(dest)
    return dest, manifest


def _add_bytes(tar, name, data):
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mode = 0o600
    info.mtime = int(time.time())
    tar.addfile(info, io.BytesIO(data))


def read_bundle(src):
    with tarfile.open(src, "r:gz") as tar:
        names = set(tar.getnames())
        unexpected = names - {"manifest.json", "settings.json"}
        if unexpected:
            raise config.ConfigError(f"unexpected entries in bundle: {sorted(unexpected)}")
        manifest = json.load(tar.extractfile("manifest.json"))
        settings = json.load(tar.extractfile("settings.json")) if "settings.json" in names else None
    if manifest.get("bundle_format") != BUNDLE_FORMAT:
        raise config.ConfigError(f"unsupported bundle format {manifest.get('bundle_format')!r}")
    return manifest, settings


def import_bundle(src, dry_run=False):
    manifest, settings = read_bundle(src)
    if settings is None:
        return {"status": "empty-bundle", "manifest": manifest}
    migrated, applied = config.migrate_document(settings)  # raises NewerSchemaError if too new
    problems = config.validate(config.deep_merge_defaults(migrated, config.DEFAULTS))
    if problems:
        raise config.ConfigError("bundle settings invalid: " + "; ".join(problems))
    result = {"status": "would-import" if dry_run else "imported", "migrations_applied": applied, "manifest": manifest}
    if dry_run:
        return result
    saved = config.backup(reason="pre-import")
    config.save(migrated)
    result["backup"] = str(saved) if saved else None
    return result


def reset_plan():
    """List the per-user paths that a reset would remove (only those that exist)."""
    plan = []
    for kind, path in paths.user_paths().items():
        if path.exists():
            size = sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
            plan.append({"kind": kind, "path": str(path), "bytes": size})
    return plan


def reset(keep_backup=True):
    """Remove per-user Jewbuntu data. Saves a final export first unless keep_backup is False."""
    final_export = None
    if keep_backup and config.read_raw() is not None:
        final_export, _ = export_bundle(Path.home() / f"jewbuntu-settings-before-reset-{time.strftime('%Y%m%d-%H%M%S')}.tar.gz")
    removed = []
    for item in reset_plan():
        shutil.rmtree(item["path"])
        removed.append(item["path"])
    return {"removed": removed, "final_export": str(final_export) if final_export else None}
