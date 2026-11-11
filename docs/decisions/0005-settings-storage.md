# 0005 Settings storage: JSON in XDG, versioned, migrated as the user

**Decision.** One JSON document per user at `$XDG_CONFIG_HOME/jewbuntu/settings.json`
with an integer `schema_version`. Only explicitly set values are stored, and defaults
live in code. Writes are locked, atomic and fsynced. Migrations are pure
functions keyed by version. Persisted migration happens in `jewbuntu config migrate`,
run by the systemd *user* unit `jewbuntu-migrate.service` at login. A verified backup
goes to `$XDG_STATE_HOME/jewbuntu/backups/` first. Newer-schema files are never modified.

**Rejected.** dconf/GSettings for Jewish data (hard to export, version and migrate
as a unit); SQLite (unnecessary now; may be used for the Shulgo cache in M2).

**Evidence.** Unit tests cover the migration machinery, the v1→v2 migration and an
interrupted write. The container test covers 0.1.0~m1.1 → 0.1.0~m1.2 with real dpkg.
