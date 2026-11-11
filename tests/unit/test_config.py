import json
import os

from tests.unit.helpers import IsolatedHome

from jewbuntu import config, paths, userdata


class ConfigTests(IsolatedHome):
    def test_defaults_without_file_and_no_write_on_load(self):
        doc = config.load()
        self.assertEqual(doc["schema_version"], config.SCHEMA_VERSION)
        self.assertEqual(doc["calendar"]["region"], "diaspora")
        self.assertFalse(paths.settings_file().exists(), "load() must not create files")

    def test_set_get_persists_only_explicit_values(self):
        config.set_key("location.timezone", "America/Toronto")
        raw = config.read_raw()
        self.assertEqual(raw["location"]["timezone"], "America/Toronto")
        self.assertNotIn("calendar", raw, "defaults must stay implicit")
        self.assertEqual(config.load()["calendar"]["candle_lighting_minutes"], 18)

    def test_validation_rejects_bad_values_and_keeps_file(self):
        config.set_key("location.latitude", "43.7")
        for key, value in (("location.latitude", "200"), ("location.timezone", "Mars/Olympus"),
                           ("calendar.region", "\"moon\""), ("sound.startup", "\"loud\"")):
            with self.assertRaises(config.ConfigError):
                config.set_key(key, value)
        self.assertEqual(config.read_raw()["location"]["latitude"], 43.7)

    def test_unknown_keys_survive_save(self):
        path = paths.settings_file()
        path.parent.mkdir(parents=True)
        path.write_text(json.dumps({"schema_version": 1, "future_feature": {"x": 1}}))
        config.set_key("sound.startup", "false")
        self.assertEqual(config.read_raw()["future_feature"], {"x": 1})

    def test_atomic_write_leaves_no_temp_files_and_private_mode(self):
        config.set_key("zmanim.preset", "\"magen-avraham\"")
        leftovers = [p.name for p in paths.config_dir().iterdir() if p.name.endswith(".tmp")]
        self.assertEqual(leftovers, [])
        self.assertEqual(os.stat(paths.settings_file()).st_mode & 0o777, 0o600)

    def test_newer_schema_is_never_modified(self):
        path = paths.settings_file()
        path.parent.mkdir(parents=True)
        original = json.dumps({"schema_version": 99, "x": 1})
        path.write_text(original)
        with self.assertRaises(config.NewerSchemaError):
            config.load()
        with self.assertRaises(config.NewerSchemaError):
            config.save({"x": 2})
        with self.assertRaises(config.NewerSchemaError):
            config.migrate()
        self.assertEqual(path.read_text(), original)

    def test_corrupt_file_reports_error_without_overwriting(self):
        path = paths.settings_file()
        path.parent.mkdir(parents=True)
        path.write_text("{not json")
        with self.assertRaises(config.ConfigError):
            config.load()
        self.assertEqual(path.read_text(), "{not json")

    def test_migration_machinery_backs_up_and_preserves_unknown_keys(self):
        """Exercise migrate() with a synthetic next schema so the mechanism is tested independently of real migrations."""
        path = paths.settings_file()
        path.parent.mkdir(parents=True)
        start = config.SCHEMA_VERSION
        path.write_text(json.dumps({"schema_version": start, "keep_me": True, "sound": {"startup": False}}))
        saved_version, saved_migrations = config.SCHEMA_VERSION, dict(config.MIGRATIONS)
        try:
            config.MIGRATIONS[start] = lambda d: {**d, "added_by_test": 1}
            config.SCHEMA_VERSION = start + 1
            result = config.migrate()
            self.assertEqual(result["status"], "migrated")
            raw = config.read_raw()
            self.assertEqual(raw["schema_version"], start + 1)
            self.assertTrue(raw["keep_me"])
            self.assertEqual(raw["added_by_test"], 1)
            backup = json.loads(open(result["backup"]).read())
            self.assertEqual(backup["schema_version"], start)
            self.assertEqual(config.migrate()["status"], "current", "migrate must be idempotent")
        finally:
            config.SCHEMA_VERSION = saved_version
            config.MIGRATIONS.clear()
            config.MIGRATIONS.update(saved_migrations)

    def test_migrate_without_settings(self):
        self.assertEqual(config.migrate()["status"], "no-settings")


class UserDataTests(IsolatedHome):
    def test_export_reset_import_roundtrip(self):
        config.set_key("location.timezone", "Asia/Jerusalem")
        config.set_key("calendar.region", "\"israel\"")
        bundle, manifest = userdata.export_bundle(self.tmp / "export.tar.gz")
        self.assertTrue(manifest["has_settings"])
        plan = userdata.reset_plan()
        self.assertTrue(any(p["kind"] == "config" for p in plan))
        result = userdata.reset(keep_backup=False)
        self.assertFalse(paths.settings_file().exists())
        self.assertIsNone(result["final_export"])
        dry = userdata.import_bundle(bundle, dry_run=True)
        self.assertEqual(dry["status"], "would-import")
        self.assertFalse(paths.settings_file().exists())
        userdata.import_bundle(bundle)
        self.assertEqual(config.load()["calendar"]["region"], "israel")

    def test_reset_makes_final_export_by_default(self):
        config.set_key("sound.startup", "false")
        result = userdata.reset()
        self.assertTrue(os.path.exists(result["final_export"]))

    def test_import_refuses_newer_schema_bundle(self):
        import io
        import tarfile
        bundle = self.tmp / "future.tar.gz"
        with tarfile.open(bundle, "w:gz") as tar:
            for name, obj in (("manifest.json", {"bundle_format": 1}), ("settings.json", {"schema_version": 50})):
                data = json.dumps(obj).encode()
                info = tarfile.TarInfo(name)
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
        with self.assertRaises(config.NewerSchemaError):
            userdata.import_bundle(bundle)

    def test_import_rejects_unexpected_entries(self):
        import io
        import tarfile
        bundle = self.tmp / "odd.tar.gz"
        with tarfile.open(bundle, "w:gz") as tar:
            data = b"x"
            info = tarfile.TarInfo("../../etc/passwd")
            info.size = 1
            tar.addfile(info, io.BytesIO(data))
        with self.assertRaises(config.ConfigError):
            userdata.import_bundle(bundle)
