import json
import os
import tempfile
import unittest
from pathlib import Path

from tests.unit.helpers import FIXTURES, REPO

from jewbuntu import doctor, repo, upgrade


class CpuTests(unittest.TestCase):
    def test_sandy_bridge_is_v2_with_avx_but_no_avx2(self):
        info = doctor.parse_cpuinfo((FIXTURES / "cpuinfo-sandybridge-i5-2400.txt").read_text())
        self.assertEqual(info["logical_cpus"], 2)
        self.assertEqual(info["physical_cores"], 4)
        self.assertIn("avx", info["flags"])
        self.assertNotIn("avx2", info["flags"])
        self.assertEqual(doctor.x86_level(info["flags"]), "x86-64-v2")

    def test_kaby_lake_is_v3(self):
        info = doctor.parse_cpuinfo((FIXTURES / "cpuinfo-kabylake-i5-7360u.txt").read_text())
        self.assertEqual(doctor.x86_level(info["flags"]), "x86-64-v3")

    def test_unknown_flags_give_no_level(self):
        self.assertIsNone(doctor.x86_level(set()))
        self.assertEqual(doctor.x86_level({"lm"}), "x86-64-v1")

    def test_meminfo_and_psi(self):
        mem = doctor.parse_meminfo("MemTotal:       16303428 kB\nMemAvailable:   12000000 kB\n")
        self.assertEqual(mem["MemTotal"], 16303428 * 1024)
        psi = doctor.parse_psi("some avg10=1.50 avg60=0.20 avg300=0.00 total=1\nfull avg10=0.00 avg60=0.00 avg300=0.00 total=0")
        self.assertEqual(psi["some_avg10"], 1.5)


def _report(total_gb, arch="x86_64", level="x86-64-v2", virt=False, free=100, mhz=3100):
    return {
        "cpu": {"architecture": arch, "x86_64_level": level, "max_mhz": mhz},
        "memory": {"total_gb": total_gb, "pressure": None},
        "storage": {"root_free_gb": free, "disks": []},
        "platform": {"is_virtual_machine": virt},
    }


class AssessTests(unittest.TestCase):
    def test_profiles_by_ram(self):
        self.assertEqual(doctor.assess(_report(15.6))["suggested_profile"], "desktop")
        self.assertEqual(doctor.assess(_report(7.7))["suggested_profile"], "desktop")
        self.assertEqual(doctor.assess(_report(6.0))["suggested_profile"], "desktop (constrained)")
        self.assertEqual(doctor.assess(_report(3.8))["suggested_profile"], "node")
        self.assertEqual(doctor.assess(_report(None))["suggested_profile"], "unknown")

    def test_notes_are_honest(self):
        notes = " ".join(doctor.assess(_report(16, level="x86-64-v2", virt=True, free=10, mhz=None))["notes"])
        self.assertIn("amd64v3", notes)
        self.assertIn("do not certify physical hardware", notes)
        self.assertIn("25 GB", notes)
        self.assertIn("not exposed", notes)
        arm = " ".join(doctor.assess(_report(16, arch="aarch64", level=None))["notes"])
        self.assertIn("architecture-independent", arm)


class UpgradeTests(unittest.TestCase):
    def test_matrix_shape(self):
        matrix = json.loads((REPO / "support-matrix.json").read_text())
        entry = upgrade.matrix_entry(matrix, "resolute")
        for field in ("ubuntu", "architectures", "gnome_shell_majors", "status", "channels", "tests", "known_limitations", "ubuntu_standard_support_end"):
            self.assertIn(field, entry)
        self.assertIsNone(upgrade.matrix_entry(matrix, "nonexistent"))
        for value in entry["tests"].values():
            self.assertNotEqual(value, "pass", "a 'pass' must reference recorded evidence; update this test when adding one")

    def test_gnome_major(self):
        self.assertEqual(upgrade.gnome_major("GNOME Shell 50.1"), "50")
        self.assertIsNone(upgrade.gnome_major(None))

    def test_sources_summary(self):
        with tempfile.TemporaryDirectory() as root:
            d = Path(root, "etc/apt/sources.list.d")
            d.mkdir(parents=True)
            (d / "jewbuntu.sources").write_text("Types: deb\nURIs: https://x\nSuites: resolute\nEnabled: no\n")
            (d / "other.list").write_text("# deb http://x resolute main\n")
            saved = upgrade.ROOT
            try:
                upgrade.ROOT = Path(root)
                items = {i["file"]: i for i in upgrade.apt_sources_summary()}
            finally:
                upgrade.ROOT = saved
            self.assertFalse(items["jewbuntu.sources"]["enabled"])
            self.assertEqual(items["jewbuntu.sources"]["suites"], ["resolute"])
            self.assertFalse(items["other.list"]["enabled"])

    def test_render_sources_scopes_trust(self):
        text = repo.render_sources("https://repo.example", "resolute", "testing")
        self.assertIn("Suites: resolute-testing", text)
        self.assertIn("Signed-By: /usr/share/keyrings/jewbuntu-archive-keyring.gpg", text)
        self.assertIn("Pin-Priority: -1", repo.PREFS)

    def test_enroll_refuses_without_url_or_unknown_release(self):
        saved = repo.status
        try:
            repo.status = lambda: {"codename": "futurecodename", "supported_entry": None, "keyring_present": True}
            with self.assertRaises(SystemExit) as ctx:
                repo.enroll(url="https://repo.example", dry_run=True)
            self.assertIn("not in the support matrix", str(ctx.exception))
            with self.assertRaises(SystemExit) as ctx:
                repo.enroll(url="", dry_run=True)
            self.assertIn("No repository URL", str(ctx.exception))
        finally:
            repo.status = saved


class PackagingConsistencyTests(unittest.TestCase):
    def test_version_matches_changelog(self):
        from jewbuntu.version import __version__
        first = (REPO / "debian/changelog").read_text().splitlines()[0]
        deb_version = first.split("(")[1].split(")")[0]
        self.assertTrue(deb_version.startswith(__version__ + "+"), f"{deb_version} vs {__version__}")

    def test_defaults_manifest_matches_overrides(self):
        manifest = json.loads((REPO / "packaging/desktop/desktop-defaults.json").read_text())["keys"]
        overrides = {}
        for f in list((REPO / "packaging").rglob("*.gschema.override")):
            schema = None
            for line in f.read_text().splitlines():
                line = line.strip()
                if line.startswith("[") and line.endswith("]"):
                    schema = line[1:-1].split(":")[0]
                elif "=" in line and not line.startswith("#") and schema:
                    k, _, v = line.partition("=")
                    overrides[(schema, k.strip())] = v.strip()
        manifest_keys = {(m["schema"], m["key"]): m["value"] for m in manifest}
        self.assertEqual(set(manifest_keys), set(overrides), "every overridden key must be in the manifest and vice versa")
        for key, value in manifest_keys.items():
            self.assertEqual(value.replace(" ", ""), overrides[key].replace(" ", ""), key)

    def test_install_files_reference_existing_sources(self):
        for f in (REPO / "debian").glob("*.install"):
            for line in f.read_text().splitlines():
                src = line.split()[0]
                if src.startswith("build/"):
                    continue
                matches = list(REPO.glob(src))
                self.assertTrue(matches, f"{f.name}: {src} not found")
