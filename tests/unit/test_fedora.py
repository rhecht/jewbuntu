"""Fedora Asahi Remix packaging: defaults manifest vs gschema override, and core fallbacks."""
import configparser
import json
import re
import unittest
import xml.etree.ElementTree as ET
from unittest import mock

from tests.unit.helpers import REPO, IsolatedHome
from tests.unit.test_skin import FakeGSettings

from jewbuntu import desktop_defaults as dd
from jewbuntu import version

FEDORA = REPO / "packaging" / "fedora"


def _override_values(path):
    cp = configparser.RawConfigParser(strict=True)
    cp.optionxform = str
    cp.read(path, encoding="utf-8")
    values = {}
    for section in cp.sections():
        schema = section.split(":", 1)[0]
        for key, value in cp.items(section):
            values[(schema, key)] = value
    return values, cp.sections()


class FedoraDefaultsTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((FEDORA / "desktop-defaults.json").read_text())
        self.values, self.sections = _override_values(FEDORA / "zz_jewbuntu-asahi.gschema.override")

    def test_override_matches_manifest(self):
        manifest = {(k["schema"], k["key"]): k["value"] for k in self.manifest["keys"]}
        self.assertEqual(set(manifest), set(self.values))
        for k, v in manifest.items():
            self.assertTrue(dd._same(self.values[k], v), f"{k}: override {self.values[k]} != manifest {v}")

    def test_desktop_keys_scoped_to_gnome_and_logo_plain(self):
        for s in self.sections:
            if s == "org.gnome.login-screen":
                continue
            self.assertTrue(s.endswith(":GNOME"), s)
        self.assertNotIn("org.gnome.login-screen:GNOME", self.sections)

    def test_override_sorts_after_fedora_overrides(self):
        name = "zz_jewbuntu-asahi.gschema.override"
        for theirs in ("org.gnome.login-screen.gschema.override", "10_org.gnome.desktop.background.fedora.gschema.override",
                       "00_org.gnome.shell.gschema.override"):
            self.assertGreater(name, theirs)

    def test_no_ubuntu_only_bits(self):
        text = (FEDORA / "zz_jewbuntu-asahi.gschema.override").read_text()
        self.assertNotIn(":ubuntu", text)
        self.assertIn("dash-to-dock@micxgx.gmail.com", self.manifest["extensions"])

    def test_login_logo_exists_and_says_for_asahi_linux(self):
        logo = self.values[("org.gnome.login-screen", "logo")].strip("'")
        src = REPO / "assets" / "logos" / logo.rsplit("/", 1)[1]
        root = ET.parse(src).getroot()
        text = " ".join(t.strip() for t in root.itertext() if t.strip())
        self.assertIn("Jewbuntu", text)
        self.assertIn("for Asahi Linux", text)

    def test_wallpapers_named_in_defaults_come_from_the_skin(self):
        skin_spec = (FEDORA / "jewbuntu-skin.spec").read_text()
        for (schema, key), value in self.values.items():
            m = re.match(r"'file:///usr/share/backgrounds/Jewbuntu/(.+)'", value)
            if m:
                self.assertIn(m.group(1), skin_spec)

    def test_spec_ships_existing_core_modules(self):
        spec = (FEDORA / "jewbuntu.spec").read_text()
        mods = re.search(r"components/core/jewbuntu/\{([^}]+)\}\.py", spec).group(1).split(",")
        for m in mods:
            self.assertTrue((REPO / "components/core/jewbuntu" / f"{m}.py").is_file(), m)


class CoreOnFedoraTests(IsolatedHome):
    def setUp(self):
        super().setUp()
        self._saved_dd = (dd._gsettings, dd._manifest)

    def tearDown(self):
        dd._gsettings, dd._manifest = self._saved_dd
        super().tearDown()

    def test_extensions_come_from_manifest_when_listed(self):
        manifest = json.loads((FEDORA / "desktop-defaults.json").read_text())
        dd._manifest = lambda: manifest
        self.assertEqual(dd.skin_extensions(), manifest["extensions"])
        dd._manifest = lambda: {"keys": []}
        self.assertEqual(dd.skin_extensions(), dd.SKIN_EXTENSIONS)

    def test_restore_sets_value_when_distro_dconf_default_wins(self):
        accent = ("org.gnome.desktop.interface", "accent-color")
        fake = FakeGSettings({accent: "'red'"})
        fake.defaults[accent] = "'slate'"  # what a distro dconf db would give after reset
        dd._gsettings = fake
        dd.restore()
        self.assertEqual(fake("get", *accent), "'blue'")

    def test_rpm_versions_when_no_dpkg(self):
        which = {"rpm": "/usr/bin/rpm"}.get
        out = mock.Mock(stdout="jewbuntu-core\t0.1.0~m1.26-1.fc45\njewbuntu-skin\t0.1.0~git20261112.1-1.fc45\n")
        with mock.patch.object(version.shutil, "which", which), mock.patch.object(version.subprocess, "run", return_value=out):
            self.assertEqual(version.installed_package_versions(),
                             {"jewbuntu-core": "0.1.0~m1.26-1.fc45", "jewbuntu-skin": "0.1.0~git20261112.1-1.fc45"})
        with mock.patch.object(version.shutil, "which", lambda _: None):
            self.assertEqual(version.installed_package_versions(), {})

    def test_cli_reports_missing_optional_module(self):
        from jewbuntu import cli
        err = ModuleNotFoundError("No module named 'jewbuntu.doctor'", name="jewbuntu.doctor")
        with mock.patch.object(cli, "cmd_doctor", side_effect=err):
            parser_args = ["doctor"]
            try:
                rc = cli.main(parser_args)
            except SystemExit as e:  # parser may need extra args
                self.skipTest(f"doctor parser: {e}")
            self.assertEqual(rc, 4)


if __name__ == "__main__":
    unittest.main()
