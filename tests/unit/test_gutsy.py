"""Jewbuntu Classic (Ubuntu 7.10 remaster): panel layout generator, defaults and Lynx config."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from tests.unit.helpers import REPO

GUTSY = REPO / "packaging" / "gutsy"


def entry(key, kind=None, value=None):
    schema = "/schemas/apps/panel/" + key.split("/", 2)[-1]
    if kind is None:
        return f"<entry><key>{key}</key><schema_key>{schema}</schema_key></entry>"
    if kind == "list":
        items = "".join(f"<value><string>{v}</string></value>" for v in value)
        val = f'<list type="string">{items}</list>'
    else:
        val = f"<{kind}>{value}</{kind}>"
    return f"<entry><key>{key}</key><schema_key>{schema}</schema_key><value>{val}</value></entry>"


def ubuntu_like_entries():
    """A cut-down copy of the shape of Ubuntu 7.10's 05_panel-default-setup.entries."""
    e = [
        entry("general/toplevel_id_list", "list", ["top_panel", "bottom_panel"]),
        entry("general/object_id_list", "list",
              ["menu_bar", "browser_launcher", "email_launcher", "yelp_launcher", "session_dialog"]),
        entry("general/applet_id_list", "list",
              ["mixer", "clock", "notification_area", "show_desktop_button", "window_list",
               "workspace_switcher", "trashapplet", "deskbar", "fast_user_switch"]),
    ]
    for tl in ("top_panel", "bottom_panel"):
        p = f"toplevels/{tl}/"
        e += [entry(p + "expand", "bool", "true"), entry(p + "size", "int", "24"),
              entry(p + "x_centered"), entry(p + "y")]
    for oid in ("menu_bar", "browser_launcher", "email_launcher", "yelp_launcher", "session_dialog"):
        p = f"objects/{oid}/"
        e += [entry(p + "object_type", "string", "launcher-object"),
              entry(p + "toplevel_id", "string", "top_panel"), entry(p + "position", "int", "1"),
              entry(p + "panel_right_stick", "bool", "false"),
              entry(p + "launcher_location", "string", "x.desktop"), entry(p + "tooltip")]
    for aid in ("mixer", "clock", "notification_area", "show_desktop_button", "window_list",
                "workspace_switcher", "trashapplet", "deskbar", "fast_user_switch"):
        p = f"applets/{aid}/"
        e += [entry(p + "object_type", "string", "bonobo-applet"),
              entry(p + "toplevel_id", "string", "top_panel"), entry(p + "position", "int", "0"),
              entry(p + "panel_right_stick", "bool", "true"),
              entry(p + "bonobo_iid", "string", "OAFIID:" + aid)]
    return ('<gconfentryfile><entrylist base="/apps/panel/default_setup">'
            + "".join(e) + "</entrylist></gconfentryfile>")


def parse(path):
    out = {}
    for e in ET.parse(path).getroot().find("entrylist").findall("entry"):
        v = e.find("value")
        if v is None:
            continue
        c = v[0]
        out[e.findtext("key")] = [x[0].text for x in c] if c.tag == "list" else c.text
    return out


class PanelLayout(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        src = Path(cls.tmp.name) / "05.entries"
        src.write_text(ubuntu_like_entries())
        out = Path(cls.tmp.name) / "30.entries"
        subprocess.run([sys.executable, str(GUTSY / "make-panel.py"), str(src), str(out)],
                       check=True, capture_output=True)
        cls.v = parse(out)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_dock_is_a_centred_bottom_panel(self):
        self.assertEqual(self.v["toplevels/bottom_panel/expand"], "false")
        self.assertEqual(self.v["toplevels/bottom_panel/x_centered"], "true")
        # Placed from the bottom edge (Ubuntu's own file lacks this key, so the dock went to the top).
        self.assertEqual(self.v["toplevels/bottom_panel/y_bottom"], "0")

    def test_dock_launchers_in_order_including_lynx(self):
        objs = self.v["general/object_id_list"]
        self.assertEqual(objs[0], "menu_bar")
        dock = [o for o in objs[1:]]
        locations = [self.v[f"objects/{o}/launcher_location"] for o in dock]
        self.assertIn("jewbuntu-lynx.desktop", locations)
        self.assertIn("firefox.desktop", locations)
        for pos, o in enumerate(dock):
            self.assertEqual(self.v[f"objects/{o}/toplevel_id"], "bottom_panel")
            self.assertEqual(self.v[f"objects/{o}/position"], str(pos))

    def test_heavy_and_duplicate_items_dropped(self):
        applets = self.v["general/applet_id_list"]
        self.assertNotIn("deskbar", applets)
        self.assertNotIn("fast_user_switch", applets)
        self.assertNotIn("email_launcher", self.v["general/object_id_list"])
        self.assertNotIn("objects/email_launcher/object_type", self.v)

    def test_tray_and_keyboard_on_top_right(self):
        for aid in ("notification_area", "jb_keyboard", "clock"):
            self.assertEqual(self.v[f"applets/{aid}/toplevel_id"], "top_panel")
            self.assertEqual(self.v[f"applets/{aid}/panel_right_stick"], "true")
        self.assertEqual(self.v["applets/jb_keyboard/bonobo_iid"], "OAFIID:GNOME_KeyboardApplet")
        self.assertEqual(self.v["applets/window_list/toplevel_id"], "top_panel")


class DefaultsAndConfig(unittest.TestCase):
    def test_gconf_defaults_are_key_value_lines(self):
        keys = {}
        for line in (GUTSY / "gconf" / "20_jewbuntu-classic").read_text().splitlines():
            if not line or line.startswith("#"):
                continue
            key, value = line.split(None, 1)
            self.assertTrue(key.startswith("/"), line)
            keys[key] = value
        self.assertEqual(keys["/desktop/gnome/interface/icon_theme"], '"Jewbuntu-Classic"')
        self.assertEqual(keys["/desktop/gnome/peripherals/keyboard/kbd/layouts"], "[us,il]")
        # update-gconf-defaults splits list items on commas; the option keeps its tab.
        self.assertEqual(keys["/desktop/gnome/peripherals/keyboard/kbd/options"],
                         "[grp\tgrp:alt_shift_toggle]")

    def test_lynx_never_auto_accepts_bad_certificates(self):
        cfg = (GUTSY / "lynx" / "lynx-jewbuntu.cfg").read_text()
        active = [l for l in cfg.splitlines() if l and not l.startswith("#")]
        self.assertFalse([l for l in active if l.upper().startswith("FORCE_SSL_PROMPT")])
        self.assertIn("COLOR_STYLE:/opt/jewbuntu/etc/lynx.lss", active)

    def test_gdm_theme_is_valid_xml_with_required_ids(self):
        root = ET.parse(GUTSY / "gdm-theme" / "Jewbuntu.xml").getroot()
        ids = {i.get("id") for i in root.iter("item")}
        for required in ("user-pw-entry", "pam-prompt", "pam-message", "pam-error", "clock"):
            self.assertIn(required, ids)

    def test_make_icons_is_importable(self):
        spec = importlib.util.spec_from_file_location("make_icons", GUTSY / "make-icons.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.assertEqual(mod.best_source({16: "a", "scalable": "s"}, 16), "a")
        self.assertEqual(mod.best_source({16: "a", "scalable": "s"}, 48), "s")
        self.assertEqual(mod.best_source({16: "a", 32: "b"}, 24), "b")
        with tempfile.TemporaryDirectory() as d:
            svg = Path(d) / "start-here.svg"
            svg.write_text('<svg xmlns="http://www.w3.org/2000/svg"><path d="%s"/></svg>' % mod.APPLE_PATH)
            with self.assertRaises(SystemExit):
                mod.render(str(svg), str(Path(d) / "out.png"), 16)


if __name__ == "__main__":
    unittest.main()
