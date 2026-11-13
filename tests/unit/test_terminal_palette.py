"""Per-user link to the Jewbuntu Terminal (Ptyxis) palette."""
import configparser
import os
from pathlib import Path

from tests.unit.helpers import IsolatedHome, REPO

from jewbuntu import terminal_palette

PALETTE = REPO / "packaging" / "desktop" / "terminal" / "Jewbuntu.palette"


class PaletteFileTests(IsolatedHome):
    def test_palette_has_light_and_dark_with_all_colours(self):
        p = configparser.ConfigParser(interpolation=None)
        p.optionxform = str
        p.read(PALETTE)
        self.assertEqual(p["Palette"]["Name"], "Jewbuntu")
        for variant in ("Light", "Dark"):
            keys = set(p[variant])
            for k in ["Foreground", "Background", "TitlebarBackground", "TitlebarForeground", "Cursor"] + [f"Color{i}" for i in range(16)]:
                self.assertIn(k, keys, f"{variant} is missing {k}")
            for v in p[variant].values():
                self.assertRegex(v, r"^#[0-9a-fA-F]{6}$")

    def test_override_selects_the_palette(self):
        text = (REPO / "packaging" / "desktop" / "90_jewbuntu-desktop.gschema.override").read_text()
        self.assertIn("[org.gnome.Ptyxis.Profile]", text)
        self.assertIn("palette='Jewbuntu'", text)


class EnsurePaletteTests(IsolatedHome):
    def setUp(self):
        super().setUp()
        self.system = self.tmp / "share" / "Jewbuntu.palette"
        self.system.parent.mkdir(parents=True)
        self.system.write_text(PALETTE.read_text())
        self.dst = Path(os.environ["XDG_DATA_HOME"]) / "org.gnome.Ptyxis" / "palettes" / "Jewbuntu.palette"

    def test_links_palette_once(self):
        self.assertIsNotNone(terminal_palette.ensure_palette(self.system))
        self.assertTrue(self.dst.is_symlink())
        self.assertEqual(self.dst.resolve(), self.system.resolve())
        self.assertIsNone(terminal_palette.ensure_palette(self.system))

    def test_never_replaces_users_own_file(self):
        self.dst.parent.mkdir(parents=True)
        self.dst.write_text("[Palette]\nName=Mine\n")
        self.assertIsNone(terminal_palette.ensure_palette(self.system))
        self.assertFalse(self.dst.is_symlink())
        self.assertIn("Mine", self.dst.read_text())

    def test_fixes_dangling_link(self):
        self.dst.parent.mkdir(parents=True)
        self.dst.symlink_to(self.tmp / "gone.palette")
        self.assertIsNotNone(terminal_palette.ensure_palette(self.system))
        self.assertEqual(self.dst.resolve(), self.system.resolve())

    def test_nothing_without_system_palette(self):
        self.assertIsNone(terminal_palette.ensure_palette(self.tmp / "missing.palette"))
        self.assertFalse(self.dst.exists())
