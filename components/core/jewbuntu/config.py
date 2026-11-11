"""Versioned per-user settings with safe migrations.

Storage: one JSON document at $XDG_CONFIG_HOME/jewbuntu/settings.json.

Guarantees implemented here:
  * Writes are atomic (temp file + fsync + rename) and serialised by a lock.
  * Before any migration or import, the current file is copied to
    $XDG_STATE_HOME/jewbuntu/backups/ and the backup is verified.
  * Unknown keys are preserved through load/save/migrate.
  * A file written by a *newer* schema is never downgraded or overwritten.
  * Missing keys are filled from defaults at read time without rewriting the file.

Migrations always run as the user who owns the settings (systemd user unit or
CLI), never from a root maintainer script.
"""

import copy
import fcntl
import json
import os
import shutil
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path

from . import paths

SCHEMA_VERSION = 2

DEFAULTS = {
    "schema_version": SCHEMA_VERSION,
    "profile": "desktop",
    "location": {
        # Manual location; nothing is looked up unless the user asks.
        "name": None,
        "latitude": None,
        "longitude": None,
        "elevation_m": 0,
        "timezone": None,  # IANA name, e.g. "America/Toronto"; edited separately from coordinates
    },
    "calendar": {
        "region": "diaspora",  # "diaspora" | "israel" - independent of coordinates/timezone
        "display": "transliterated",  # "transliterated" | "hebrew"
        "transliteration": "ashkenazi",  # "ashkenazi" | "sephardi"
        "candle_lighting_minutes": 18,
        "havdalah": "tzeit-8.5deg",
    },
    "zmanim": {"preset": "standard"},
    "shulgo": {"enabled": False, "share_location": False, "favorites": []},
    "sound": {"startup": {"enabled": True, "volume": 0.6}},
    # mode "weekly-fallback" until the calendar service exists; "calendar" afterwards.
    "quiet_schedule": {"enabled": False, "mode": "weekly-fallback"},
    "onboarding": {"completed": False, "completed_steps": []},
}


class ConfigError(Exception):
    pass


class NewerSchemaError(ConfigError):
    """The file was written by a newer Jewbuntu; we must not modify it."""


# --- migrations -------------------------------------------------------------
# Each migration takes a document at version N and returns version N+1.
# They must preserve unknown keys and never raise on optional data.



def _v1_to_v2(doc):
    """Schema 2: sound.startup becomes {enabled, volume}; quiet_schedule gains a mode."""
    sound = doc.get("sound")
    if isinstance(sound, dict) and "startup" in sound and not isinstance(sound["startup"], dict):
        sound["startup"] = {"enabled": bool(sound["startup"])}
    quiet = doc.get("quiet_schedule")
    if isinstance(quiet, dict) and "mode" not in quiet:
        quiet["mode"] = "weekly-fallback"
    return doc


MIGRATIONS = {1: _v1_to_v2}


def deep_merge_defaults(doc, defaults):
    """Return doc with missing keys filled from defaults. Existing values (and unknown keys) win."""
    result = copy.deepcopy(doc)
    for key, value in defaults.items():
        if key not in result:
            result[key] = copy.deepcopy(value)
        elif isinstance(value, dict) and isinstance(result[key], dict):
            result[key] = deep_merge_defaults(result[key], value)
    return result


def migrate_document(doc, target=None):
    """Pure function: return (migrated_doc, [applied versions])."""
    if target is None:
        target = SCHEMA_VERSION
    version = doc.get("schema_version", 1)
    if not isinstance(version, int) or version < 1:
        raise ConfigError(f"invalid schema_version: {version!r}")
    if version > target:
        raise NewerSchemaError(
            f"settings use schema {version}, this Jewbuntu understands up to {target}; refusing to modify"
        )
    applied = []
    doc = copy.deepcopy(doc)
    while version < target:
        step = MIGRATIONS.get(version)
        if step is None:
            raise ConfigError(f"no migration from schema {version}")
        doc = step(doc)
        version += 1
        doc["schema_version"] = version
        applied.append(version)
    return doc, applied


# --- storage ----------------------------------------------------------------

@contextmanager
def _locked(path):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock_path = path.with_name(path.name + ".lock")
    with open(lock_path, "a") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def atomic_write_json(path, doc):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(doc, handle, indent=2, ensure_ascii=False, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
        dir_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def read_raw(path=None):
    """Return the stored document, or None if no settings file exists yet."""
    path = Path(path or paths.settings_file())
    if not path.exists():
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            doc = json.load(handle)
    except (OSError, ValueError) as exc:
        raise ConfigError(f"cannot read {path}: {exc}") from exc
    if not isinstance(doc, dict):
        raise ConfigError(f"{path} does not contain a JSON object")
    return doc


def backup(path=None, reason="manual"):
    """Copy the settings file into the backup directory and verify the copy. Returns the backup path."""
    path = Path(path or paths.settings_file())
    if not path.exists():
        return None
    dest_dir = paths.backup_dir()
    dest_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    stamp = time.strftime("%Y%m%dT%H%M%S")
    dest = dest_dir / f"settings.{stamp}.{reason}.json"
    n = 1
    while dest.exists():
        dest = dest_dir / f"settings.{stamp}.{reason}.{n}.json"
        n += 1
    shutil.copy2(path, dest)
    with open(path, "rb") as a, open(dest, "rb") as b:
        if a.read() != b.read():
            raise ConfigError(f"backup verification failed for {dest}")
    return dest


def load(path=None):
    """Return effective settings (stored values + defaults). Does not write.

    An older stored schema is migrated in memory only; call migrate() to persist.
    """
    raw = read_raw(path)
    if raw is None:
        return copy.deepcopy(DEFAULTS)
    doc, _ = migrate_document(raw)
    return deep_merge_defaults(doc, DEFAULTS)


def save(doc, path=None):
    path = Path(path or paths.settings_file())
    with _locked(path):
        current = read_raw(path)
        if current is not None and current.get("schema_version", 1) > SCHEMA_VERSION:
            raise NewerSchemaError("refusing to overwrite settings written by a newer Jewbuntu")
        doc = dict(doc)
        doc["schema_version"] = SCHEMA_VERSION
        atomic_write_json(path, doc)


def migrate(path=None):
    """Persist any pending migration. Returns a dict describing what happened."""
    path = Path(path or paths.settings_file())
    with _locked(path):
        raw = read_raw(path)
        if raw is None:
            return {"status": "no-settings", "schema_version": SCHEMA_VERSION}
        doc, applied = migrate_document(raw)
        if not applied:
            return {"status": "current", "schema_version": SCHEMA_VERSION}
        saved = backup(path, reason=f"pre-migrate-v{raw.get('schema_version', 1)}")
        atomic_write_json(path, doc)
        return {"status": "migrated", "applied": applied, "backup": str(saved), "schema_version": SCHEMA_VERSION}


def get_key(doc, dotted):
    node = doc
    for part in dotted.split("."):
        if not isinstance(node, dict) or part not in node:
            raise KeyError(dotted)
        node = node[part]
    return node


def set_key(dotted, value, path=None):
    """Set one dotted key and save. Value is parsed as JSON when possible.

    Only explicitly set values are stored; defaults stay implicit so improved
    defaults in later releases still reach keys the user never changed.
    """
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            pass
    raw = read_raw(path)
    doc, _ = migrate_document(raw) if raw is not None else ({"schema_version": SCHEMA_VERSION}, [])
    parts = dotted.split(".")
    node = doc
    for part in parts[:-1]:
        node = node.setdefault(part, {})
        if not isinstance(node, dict):
            raise ConfigError(f"{dotted}: parent is not an object")
    node[parts[-1]] = value
    problems = validate(deep_merge_defaults(doc, DEFAULTS))
    if problems:
        raise ConfigError("; ".join(problems))
    save(doc, path)
    return doc


_CHOICES = {
    "profile": {"desktop", "node", "lite"},
    "calendar.region": {"diaspora", "israel"},
    "calendar.display": {"transliterated", "hebrew"},
    "calendar.transliteration": {"ashkenazi", "sephardi"},
    "calendar.havdalah": {"tzeit-8.5deg", "tzeit-7.083deg", "fixed-42min", "fixed-50min", "fixed-72min"},
    "zmanim.preset": {"standard", "magen-avraham", "custom"},
}


def validate(doc):
    """Return a list of human-readable problems (empty if valid)."""
    problems = []
    for key, allowed in _CHOICES.items():
        try:
            value = get_key(doc, key)
        except KeyError:
            continue
        if value not in allowed:
            problems.append(f"{key} must be one of {sorted(allowed)}, got {value!r}")
    loc = doc.get("location", {})
    lat, lon = loc.get("latitude"), loc.get("longitude")
    if lat is not None and not (isinstance(lat, (int, float)) and -90 <= lat <= 90):
        problems.append("location.latitude must be a number between -90 and 90")
    if lon is not None and not (isinstance(lon, (int, float)) and -180 <= lon <= 180):
        problems.append("location.longitude must be a number between -180 and 180")
    tz = loc.get("timezone")
    if tz is not None:
        try:
            from zoneinfo import ZoneInfo
            ZoneInfo(tz)
        except Exception:  # noqa: BLE001 - any failure means unusable
            problems.append(f"location.timezone {tz!r} is not a known IANA timezone")
    minutes = doc.get("calendar", {}).get("candle_lighting_minutes")
    if not (isinstance(minutes, int) and 0 <= minutes <= 60):
        problems.append("calendar.candle_lighting_minutes must be an integer from 0 to 60")
    startup = doc.get("sound", {}).get("startup", {})
    if not isinstance(startup, dict) or not isinstance(startup.get("enabled"), bool):
        problems.append("sound.startup.enabled must be true or false")
    elif not (isinstance(startup.get("volume"), (int, float)) and 0.05 <= startup["volume"] <= 1.0):
        problems.append("sound.startup.volume must be between 0.05 and 1.0 (relative to system volume)")
    if doc.get("quiet_schedule", {}).get("mode") not in ("weekly-fallback", "calendar"):
        problems.append("quiet_schedule.mode must be 'weekly-fallback' or 'calendar'")
    return problems
