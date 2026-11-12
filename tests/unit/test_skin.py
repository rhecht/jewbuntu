from tests.unit.helpers import IsolatedHome

from jewbuntu import desktop_defaults as dd


class FakeGSettings:
    """In-memory gsettings: vendor defaults from the manifest, plus explicit user values."""

    def __init__(self, user_values=None, enabled_extensions="@as []"):
        self.defaults = {(k["schema"], k["key"]): k["value"] for k in dd.load_manifest()}
        self.defaults[("org.gnome.shell", "enabled-extensions")] = "@as []"
        self.user = dict(user_values or {})
        self.user.setdefault(("org.gnome.shell", "enabled-extensions"), enabled_extensions)

    def __call__(self, op, schema, key, value=None):
        k = (schema, key)
        if op == "get":
            return self.user.get(k, self.defaults.get(k))
        if op == "set":
            self.user[k] = value
        elif op == "reset":
            self.user.pop(k, None)
        return ""


class SkinTests(IsolatedHome):
    def setUp(self):
        super().setUp()
        self._saved_dd = (dd._gsettings, dd.extension_state)

    def tearDown(self):
        dd._gsettings, dd.extension_state = self._saved_dd
        super().tearDown()

    def _install(self, fake, ext="disabled"):
        dd._gsettings = fake
        def state(uuid=None):
            on = fake("get", "org.gnome.shell", "enabled-extensions")
            uuids = [uuid] if uuid else dd.SKIN_EXTENSIONS
            return "enabled" if all(u in on for u in uuids) else ext
        dd.extension_state = state

    def test_float_and_spacing_tolerant_compare(self):
        self.assertTrue(dd._same("0.34999999999999998", "0.35"))
        self.assertTrue(dd._same("[('xkb', 'us')]", "[('xkb','us')]"))
        self.assertFalse(dd._same("'TOP'", "'BOTTOM'"))
        self.assertFalse(dd._same(None, "1"))

    def test_sources_parsing(self):
        self.assertEqual(dd._parse_sources("@a(ss) []"), [])
        self.assertEqual(dd._parse_sources("[('xkb', 'us'), ('xkb', 'il')]"), [("xkb", "us"), ("xkb", "il")])

    def test_existing_user_gets_hebrew_appended_not_replaced(self):
        fake = FakeGSettings({dd.INPUT_SOURCES: "[('xkb', 'us'), ('xkb', 'de')]"})
        self._install(fake)
        dd.restore()
        self.assertEqual(fake.user[dd.INPUT_SOURCES], "[('xkb', 'us'), ('xkb', 'de'), ('xkb', 'il')]")

    def test_apply_then_undo_returns_previous_values(self):
        dock = ("org.gnome.shell.extensions.dash-to-dock", "dock-position")
        fake = FakeGSettings({dd.INPUT_SOURCES: "[('xkb', 'us')]", dock: "'LEFT'"})
        self._install(fake)
        self.assertTrue(dd.pending_changes())
        dd.apply_skin()
        self.assertNotIn(dock, fake.user, "reset to the Jewbuntu default")
        self.assertIn("('xkb', 'il')", fake.user[dd.INPUT_SOURCES])
        for u in dd.SKIN_EXTENSIONS:
            self.assertIn(u, fake.user[("org.gnome.shell", "enabled-extensions")])
        self.assertEqual(dd.pending_changes(), [])
        dd.apply_skin()  # re-apply must keep the ORIGINAL backup
        dd.undo_skin()
        self.assertEqual(fake.user[dock], "'LEFT'")
        self.assertEqual(fake.user[dd.INPUT_SOURCES], "[('xkb', 'us')]")
        for u in dd.SKIN_EXTENSIONS:
            self.assertNotIn(u, fake.user[("org.gnome.shell", "enabled-extensions")])

    def test_libadwaita_files_backed_up_and_restored(self):
        import os
        theme = self.tmp / "theme-gtk4"
        (theme / "assets").mkdir(parents=True)
        (theme / "gtk.css").write_text("/* jewbuntu */")
        (theme / "assets" / "a.svg").write_text("<svg/>")
        gtk4 = self.tmp / ".config" / "gtk-4.0"
        gtk4.mkdir(parents=True)
        (gtk4 / "gtk.css").write_text("/* mine */")
        saved = dd.SKIN_THEME_DIR
        dd.SKIN_THEME_DIR = theme
        try:
            self._install(FakeGSettings())
            dd.apply_skin()
            self.assertEqual((gtk4 / "gtk.css").read_text(), "/* jewbuntu */")
            self.assertTrue((gtk4 / "assets" / "a.svg").exists())
            self.assertTrue(dd.libadwaita_applied())
            self.assertTrue((gtk4 / "gtk.css").is_symlink(), "linked, so skin updates reach apps")
            (theme / "gtk.css").write_text("/* jewbuntu v2 */")  # skin package upgraded
            self.assertEqual((gtk4 / "gtk.css").read_text(), "/* jewbuntu v2 */")
            dd.undo_skin()
            self.assertEqual((gtk4 / "gtk.css").read_text(), "/* mine */")
            self.assertFalse((gtk4 / "assets").exists())
        finally:
            dd.SKIN_THEME_DIR = saved

    def test_refresh_converts_old_copies_to_links_and_keeps_backup(self):
        import shutil
        theme = self.tmp / "theme-gtk4"
        (theme / "assets").mkdir(parents=True)
        (theme / "gtk.css").write_text("/* jewbuntu v2 */")
        (theme / "assets" / "a.svg").write_text("<svg/>")
        gtk4 = self.tmp / ".config" / "gtk-4.0"
        gtk4.mkdir(parents=True)
        (gtk4 / "gtk.css").write_text("/* mine */")
        saved = dd.SKIN_THEME_DIR
        dd.SKIN_THEME_DIR = theme
        try:
            self._install(FakeGSettings())
            dd.apply_skin()
            # Simulate a 0.1.0~m1.24-era install: real copies of an older skin.
            for n in ("gtk.css", "assets"):
                (gtk4 / n).unlink()  # the symlinks apply_skin made
            (gtk4 / "gtk.css").write_text("/* jewbuntu v1 copy */")
            shutil.copytree(theme / "assets", gtk4 / "assets")
            self.assertFalse(dd.libadwaita_applied())
            self.assertIsNotNone(dd.refresh_libadwaita())
            self.assertTrue(dd.libadwaita_applied())
            self.assertEqual((gtk4 / "gtk.css").read_text(), "/* jewbuntu v2 */")
            self.assertIsNone(dd.refresh_libadwaita(), "nothing to do the second time")
            dd.undo_skin()
            self.assertEqual((gtk4 / "gtk.css").read_text(), "/* mine */", "original backup survives")
        finally:
            dd.SKIN_THEME_DIR = saved

    def test_refresh_does_nothing_if_look_never_applied(self):
        gtk4 = self.tmp / ".config" / "gtk-4.0"
        gtk4.mkdir(parents=True)
        (gtk4 / "gtk.css").write_text("/* mine */")
        self.assertIsNone(dd.refresh_libadwaita())
        self.assertEqual((gtk4 / "gtk.css").read_text(), "/* mine */")

    def test_prompt_asks_once_and_skips_when_nothing_to_do(self):
        fake = FakeGSettings()
        self._install(fake, ext="enabled")
        self.assertEqual(dd.prompt(), "nothing to change")
        self.assertEqual(dd.prompt(), "already asked")

    def test_prompt_without_display_defers(self):
        import os
        fake = FakeGSettings({dd.INPUT_SOURCES: "[('xkb', 'us')]"})
        self._install(fake)
        saved = {k: os.environ.pop(k, None) for k in ("DISPLAY", "WAYLAND_DISPLAY")}
        try:
            self.assertIn("next login", dd.prompt())
            self.assertFalse(dd.read_state().get("prompted"))
        finally:
            for k, v in saved.items():
                if v is not None:
                    os.environ[k] = v
