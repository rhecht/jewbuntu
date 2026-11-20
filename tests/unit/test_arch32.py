"""Arch Linux 32 (Xfce on old 32-bit laptops): defaults files, session script, xfconf backend."""
import configparser
import json
import os
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest import mock

from tests.unit.helpers import REPO, IsolatedHome

from jewbuntu import desktop_defaults as dd

ARCH32 = REPO / "packaging" / "arch32"
CHANNELS = ARCH32 / "xdg" / "xfce4" / "xfconf" / "xfce-perchannel-xml"
MANIFEST = json.loads((ARCH32 / "desktop-defaults.json").read_text())


def channel_values(path):
    """{property path: (type, value)} for the leaf properties of an xfconf channel file."""
    root = ET.parse(path).getroot()
    out = {}

    def walk(node, prefix):
        for prop in node.findall("property"):
            p = f"{prefix}/{prop.get('name')}"
            if prop.get("type") not in ("empty", "array"):
                out[p] = (prop.get("type"), prop.get("value"))
            walk(prop, p)
    walk(root, "")
    return root.get("name"), out


class FakeXfconf:
    """In-memory xfconf-query: system defaults from the channel files plus user values."""

    def __init__(self, user=None, with_defaults=True):
        self.system = {}
        if with_defaults:
            for f in CHANNELS.glob("*.xml"):
                name, values = channel_values(f)
                for p, (_, v) in values.items():
                    self.system[(name, p)] = v
        self.user = dict(user or {})
        self.calls = []

    def get(self, ch, p):
        return self.user.get((ch, p), self.system.get((ch, p)))

    def __call__(self, *args):
        self.calls.append(args)
        a = list(args)
        ch = a[a.index("-c") + 1]
        if "-l" in a:
            props = sorted({p for (c, p) in list(self.system) + list(self.user) if c == ch})
            return "\n".join(props)
        p = a[a.index("-p") + 1]
        if "-r" in a:
            self.user.pop((ch, p), None)
            return ""
        if "-s" in a:
            self.user[(ch, p)] = a[a.index("-s") + 1]
            return ""
        return self.get(ch, p)


class Arch32FilesTests(unittest.TestCase):
    def test_manifest_matches_channel_files(self):
        system = {}
        for f in CHANNELS.glob("*.xml"):
            name, values = channel_values(f)
            for p, tv in values.items():
                system[(name, p)] = tv
        for k in MANIFEST["keys"]:
            self.assertIn((k["schema"], k["key"]), system, f"{k['schema']} {k['key']} missing from the channel files")
            typ, value = system[(k["schema"], k["key"])]
            self.assertEqual(value, k["value"], k["key"])
            self.assertEqual(typ, k["type"], k["key"])
        self.assertEqual(MANIFEST["backend"], "xfconf")
        self.assertEqual(MANIFEST["extensions"], [])

    def test_terminal_colours_match_the_jewbuntu_palette(self):
        cp = configparser.RawConfigParser()
        cp.optionxform = str
        cp.read(REPO / "packaging" / "desktop" / "terminal" / "Jewbuntu.palette")
        light = cp["Light"]
        _, term = channel_values(CHANNELS / "xfce4-terminal.xml")
        self.assertEqual(term["/color-foreground"][1], light["Foreground"])
        self.assertEqual(term["/color-background"][1], light["Background"])
        self.assertEqual(term["/color-cursor"][1], light["Cursor"])
        self.assertEqual(term["/color-palette"][1].split(";"), [light[f"Color{i}"] for i in range(16)])
        self.assertEqual(term["/color-use-theme"][1], "false")

    def test_every_channel_file_is_listed_as_backup(self):
        text = (ARCH32 / "PKGBUILD").read_text()
        for f in CHANNELS.glob("*.xml"):
            self.assertIn(f"xfce-perchannel-xml/{f.name}'", text, f"{f.name} missing from backup=()")

    def test_light_icon_variant_on_light_bars(self):
        # The Jewbuntu icon theme draws status icons white (#f2f2f2) for GNOME's dark top bar; on
        # Xfce's light top bar and the light greeter bar they vanish. Jewbuntu-light draws them dark.
        icons = next(k["value"] for k in MANIFEST["keys"] if k["key"] == "/Net/IconThemeName")
        greeter = configparser.RawConfigParser()
        greeter.read(ARCH32 / "lightdm" / "50-jewbuntu-greeter.conf")
        self.assertEqual({icons, greeter.get("greeter", "icon-theme-name")}, {"Jewbuntu-light"})

    def test_dock_pins_only_installed_apps(self):
        rc = configparser.RawConfigParser()
        rc.read(ARCH32 / "xdg" / "xfce4" / "panel" / "docklike.rc")
        pinned = [p for p in rc.get("user", "pinned").split(";") if p]
        owners = {"thunar.desktop": "'thunar'", "xfce4-terminal.desktop": "'xfce4-terminal'", "xfce-settings-manager.desktop": "'xfce4-settings'",
                  "dillo.desktop": "'dillo'"}
        depends = (ARCH32 / "PKGBUILD").read_text().split("optdepends=")[0]
        for p in pinned:
            name = p.rsplit("/", 1)[1]
            self.assertIn(name, owners, f"{name}: pinned app from a package jewbuntu-xfce-desktop does not depend on")
            self.assertIn(owners[name], depends)

    def test_dillo_is_the_browser(self):
        mime = configparser.RawConfigParser()
        mime.read(ARCH32 / "xdg" / "mimeapps.list")
        for t in ("x-scheme-handler/http", "x-scheme-handler/https", "text/html"):
            self.assertEqual(mime.get("Default Applications", t), "dillo.desktop")
        self.assertIn("WebBrowser=dillo", (ARCH32 / "xdg" / "xfce4" / "helpers.rc").read_text())
        text = (ARCH32 / "PKGBUILD").read_text()
        self.assertIn("'dillo'", text.split("optdepends=")[0])
        self.assertNotIn("'firefox", text.lower(), "no Firefox dependency: it needs more than the 256 MB this targets")

    def test_dillo_colours_follow_the_skin(self):
        rc = dict(l.split("=", 1) for l in (ARCH32 / "dillo" / "dillorc").read_text().splitlines() if l and not l.startswith("#"))
        self.assertEqual(rc["ui_main_bg_color"], "0xf1f1f1", "same light grey as the top bar")
        self.assertEqual(rc["ui_fg_color"], "0x363636")
        self.assertEqual(rc["ui_selection_color"], "0x0088ff")
        self.assertEqual(rc["bg_color"], "0xffffff")

    def test_startjewbuntu_gives_dillo_colours_once(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "home"; home.mkdir()
            fake = Path(tmp) / "startxfce4"; fake.write_text("#!/bin/sh\nexit 0\n"); fake.chmod(0o755)
            script = (ARCH32 / "startjewbuntu").read_text().replace("/usr/share/jewbuntu/dillo/dillorc", str(ARCH32 / "dillo" / "dillorc"))
            (Path(tmp) / "s.sh").write_text(script)
            env = {"PATH": f"{tmp}:/usr/bin:/bin", "HOME": str(home)}
            subprocess.run(["sh", str(Path(tmp) / "s.sh")], env=env, check=True)
            rc = home / ".dillo" / "dillorc"
            self.assertEqual(rc.read_text(), (ARCH32 / "dillo" / "dillorc").read_text())
            rc.write_text("# mine\n")
            subprocess.run(["sh", str(Path(tmp) / "s.sh")], env=env, check=True)
            self.assertEqual(rc.read_text(), "# mine\n", "a user's own file is never replaced")

    def test_lynx_has_a_menu_entry(self):
        entry = configparser.RawConfigParser(interpolation=None)
        entry.optionxform = str
        entry.read(ARCH32 / "jewbuntu-lynx.desktop", encoding="utf-8")
        d = entry["Desktop Entry"]
        self.assertEqual(d["Terminal"], "true", "Lynx is a text browser: it needs a terminal window")
        self.assertIn("WebBrowser", d["Categories"].split(";"))
        self.assertNotIn("MimeType", d, "Dillo stays the browser for web links; Lynx is opened by hand")
        self.assertTrue(d["Exec"].startswith("lynx -cfg=/usr/share/jewbuntu/lynx/lynx.cfg"))
        self.assertIn("-lss=/usr/share/jewbuntu/lynx/jewbuntu.lss", d["Exec"], "COLOR_STYLE in lynx.cfg alone is ignored by Arch Linux 32's Lynx")
        text = (ARCH32 / "PKGBUILD").read_text()
        self.assertIn("'lynx'", text.split("optdepends=")[0])
        for src, dest in (("jewbuntu-lynx.desktop", "usr/share/applications/jewbuntu-lynx.desktop"),
                          ("lynx/lynx.cfg", "usr/share/jewbuntu/lynx/lynx.cfg"),
                          ("lynx/jewbuntu.lss", "usr/share/jewbuntu/lynx/jewbuntu.lss")):
            self.assertIn(f'$a/{src} "$pkgdir/{dest}"', text)

    def test_lynx_settings_build_on_lynx_own(self):
        lines = [l for l in (ARCH32 / "lynx" / "lynx.cfg").read_text().splitlines() if l and not l.startswith("#")]
        self.assertEqual(lines[0], "INCLUDE:/etc/lynx.cfg", "Lynx's own settings first, ours override them")
        cfg = dict(l.split(":", 1) for l in lines)
        self.assertEqual(cfg["COLOR_STYLE"], "/usr/share/jewbuntu/lynx/jewbuntu.lss")
        self.assertEqual(cfg["PERSISTENT_COOKIES"], "FALSE")
        self.assertTrue(cfg["STARTFILE"].startswith("https://"))
        for line in (ARCH32 / "lynx" / "jewbuntu.lss").read_text().splitlines():
            if line and not line.startswith("#"):
                self.assertEqual(len(line.split(":")), 4, f"colour-style line {line!r}")

    def test_shulgo_line_on_the_bar(self):
        root = ET.parse(CHANNELS / "xfce4-panel.xml").getroot()
        plugins = {p.get("name"): p for p in root.find("property[@name='plugins']").findall("property")}
        genmon = next(p for p in plugins.values() if p.get("value") == "genmon")
        props = {c.get("name"): c.get("value") for c in genmon.findall("property")}
        self.assertEqual(props["command"], "/usr/lib/jewbuntu/shulgo-bar")
        self.assertGreaterEqual(int(props["update-period"]), 10000, "cheap on a Pentium III")
        text = (ARCH32 / "PKGBUILD").read_text()
        self.assertIn("'xfce4-genmon-plugin'", text.split("optdepends=")[0])
        self.assertIn('/usr/lib/jewbuntu/shulgo-bar"', text)

    def test_shulgo_bar_reads_only_a_fresh_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache = Path(tmp) / "jewbuntu"; cache.mkdir()
            env = {"PATH": "/usr/bin:/bin", "HOME": tmp, "XDG_CACHE_HOME": tmp}
            run = lambda: subprocess.run(["sh", str(ARCH32 / "shulgo-bar")], env=env, capture_output=True, text=True).stdout.strip()
            self.assertEqual(run(), "<txt></txt>", "nothing when ShulGo has written nothing")
            line = cache / "shulgo-bar.txt"
            line.write_text("<txt>Mincha 4:32 · in 12 min</txt>\n")
            if subprocess.run(["sh", "-c", "stat -c %Y /"], capture_output=True).returncode != 0:
                self.skipTest("needs GNU stat (the target has it; macOS does not)")
            self.assertEqual(run(), "<txt>Mincha 4:32 · in 12 min</txt>")
            old = line.stat().st_mtime - 600
            os.utime(line, (old, old))
            self.assertEqual(run(), "<txt></txt>", "a stopped widget never leaves a wrong time")

    def test_lynx_and_shulgo_autostart(self):
        text = (ARCH32 / "PKGBUILD").read_text()
        self.assertIn("'lynx'", text.split("optdepends=")[0])
        auto = configparser.RawConfigParser(); auto.optionxform = str
        auto.read(ARCH32 / "xdg" / "autostart" / "shulgo-xfce.desktop")
        self.assertEqual(auto.get("Desktop Entry", "TryExec"), "/usr/bin/shulgo-xfce", "starts only when ShulGo is installed")
        self.assertIn("etc/xdg/jewbuntu/autostart/shulgo-xfce.desktop", text, "Jewbuntu session only")

    def test_memory_trims_only_in_the_jewbuntu_session(self):
        start = (ARCH32 / "startjewbuntu").read_text()
        self.assertIn("NO_AT_BRIDGE=1", start)
        # Not attempted: running panel plugins in-process. xfce4-panel reads plugin descriptions only
        # from /usr/share/xfce4/panel/plugins, so it would mean editing Xfce's own files.
        self.assertNotIn("X-XFCE-Internal", start)
        hidden = (ARCH32 / "xdg" / "autostart" / "at-spi-dbus-bus.desktop").read_text()
        self.assertIn("Hidden=true", hidden)
        self.assertIn("etc/xdg/jewbuntu/autostart/at-spi-dbus-bus.desktop", (ARCH32 / "PKGBUILD").read_text())

    def test_svg_loader_workaround_is_packaged(self):
        hook = (ARCH32 / "jewbuntu-pixbuf-loaders.hook").read_text()
        self.assertIn("Target = usr/lib/libxml2.so.2*", hook)
        self.assertIn("Target = usr/share/jewbuntu/desktop-defaults.json", hook, "runs when Jewbuntu itself is installed")
        text = (ARCH32 / "PKGBUILD").read_text()
        self.assertIn("'libxml2-legacy'", text)
        self.assertIn("usr/share/libalpm/hooks/jewbuntu-pixbuf-loaders.hook", text)

    def test_channel_file_names_match_channels(self):
        for f in CHANNELS.glob("*.xml"):
            self.assertEqual(ET.parse(f).getroot().get("name"), f.stem)

    def test_one_wallpaper_everywhere(self):
        wall = MANIFEST["wallpaper"]
        _, desktop = channel_values(CHANNELS / "xfce4-desktop.xml")
        images = {v for p, (_, v) in desktop.items() if p.endswith("/last-image")}
        self.assertEqual(images, {wall})
        greeter = configparser.RawConfigParser()
        greeter.read(ARCH32 / "lightdm" / "50-jewbuntu-greeter.conf")
        self.assertEqual(greeter.get("greeter", "background"), wall)
        self.assertTrue(wall.endswith(".jpg"), "scaled-down JPEG: cheap to decode on a Pentium III")

    def test_skin_names_agree(self):
        theme = next(k["value"] for k in MANIFEST["keys"] if k["key"] == "/Net/ThemeName")
        wm = next(k["value"] for k in MANIFEST["keys"] if k["key"] == "/general/theme")
        greeter = configparser.RawConfigParser()
        greeter.read(ARCH32 / "lightdm" / "50-jewbuntu-greeter.conf")
        self.assertEqual({theme, wm, greeter.get("greeter", "theme-name")}, {"Jewbuntu-Light-solid"})
        self.assertIn("-o solid", (ARCH32 / "PKGBUILD.skin").read_text(), "the skin package builds the solid variant")

    def test_panel_plugins_listed_and_menu_icon_shipped(self):
        root = ET.parse(CHANNELS / "xfce4-panel.xml").getroot()
        ids = {int(v.get("value")) for v in root.iter("value")}
        plugins = {int(p.get("name").split("-")[1]) for p in root.find("property[@name='plugins']").findall("property")}
        self.assertEqual(ids, plugins)
        self.assertTrue((ARCH32 / "jewbuntu-menu.svg").exists())
        dock_id = next(int(p.get("name").split("-")[1]) for p in root.find("property[@name='plugins']").findall("property") if p.get("value") == "docklike")
        self.assertTrue((ARCH32 / "xdg" / "xfce4" / "panel" / "docklike.rc").exists(), "Docklike copies the distribution default xfce4/panel/docklike.rc for new docks")

    def test_session_and_autostart(self):
        session = configparser.RawConfigParser()
        session.optionxform = str
        session.read(ARCH32 / "jewbuntu.desktop")
        self.assertEqual(session.get("Desktop Entry", "Exec"), "/usr/bin/startjewbuntu")
        lightdm = configparser.RawConfigParser()
        lightdm.read(ARCH32 / "lightdm" / "50-jewbuntu.conf")
        self.assertEqual(lightdm.get("Seat:*", "user-session"), "jewbuntu")
        prompt = (ARCH32 / "jewbuntu-skin-prompt.desktop").read_text()
        self.assertIn("OnlyShowIn=XFCE;", prompt)

    def test_startjewbuntu_prepends_overlay_once(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake = Path(tmp) / "startxfce4"
            fake.write_text('#!/bin/sh\necho "$XDG_CONFIG_DIRS"\n')
            fake.chmod(0o755)
            env = {"PATH": f"{tmp}:/usr/bin:/bin", "HOME": tmp}
            run = lambda e: subprocess.run(["sh", str(ARCH32 / "startjewbuntu")], env=e, capture_output=True, text=True).stdout.strip()
            self.assertEqual(run(env), "/etc/xdg/jewbuntu")
            self.assertEqual(run({**env, "XDG_CONFIG_DIRS": "/etc/xdg"}), "/etc/xdg/jewbuntu:/etc/xdg")
            self.assertEqual(run({**env, "XDG_CONFIG_DIRS": "/etc/xdg/jewbuntu:/etc/xdg"}), "/etc/xdg/jewbuntu:/etc/xdg")

    def test_pkgbuilds_are_arch_any_and_never_touch_homes(self):
        for f in ARCH32.glob("PKGBUILD*"):
            text = f.read_text()
            self.assertIn("arch=('any')", text, f.name)
            self.assertNotIn("/home", text, f.name)
            self.assertNotIn("install=", text, f"{f.name}: no install scripts (pacman hooks rebuild caches)")


class XfconfBackendTests(IsolatedHome):
    def setUp(self):
        super().setUp()
        self.patches = [mock.patch.object(dd, "_manifest", return_value=MANIFEST),
                        mock.patch.object(dd, "_xfconf_available", return_value=True)]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        super().tearDown()

    def use(self, fake):
        p = mock.patch.object(dd, "_xfconf", fake)
        p.start()
        self.patches.append(p)
        return fake

    def test_backend_and_no_extensions(self):
        self.assertEqual(dd.backend(), "xfconf")
        self.assertEqual(dd.skin_extensions(), [])
        self.assertEqual(dd.extension_state(), "enabled")

    def test_new_account_in_jewbuntu_session_needs_nothing(self):
        self.use(FakeXfconf())
        self.assertEqual(dd.pending_changes(), [])

    def test_apply_and_undo_existing_account(self):
        mon = "/backdrop/screen0/monitorLVDS-1/workspace0/last-image"
        user = {("xsettings", "/Net/ThemeName"): "Adwaita", ("keyboard-layout", "/Default/XkbLayout"): "de",
                ("keyboard-layout", "/Default/XkbVariant"): "nodeadkeys", ("xfce4-desktop", mon): "/usr/share/backgrounds/xfce/xfce-shapes.svg"}
        fake = self.use(FakeXfconf(user))
        pending = dd.pending_changes()
        self.assertTrue(any("Skin" in c for c in pending))
        self.assertTrue(any("wallpaper" in c for c in pending))
        dd.apply_skin()
        self.assertEqual(fake.get("xsettings", "/Net/ThemeName"), "Jewbuntu-Light-solid")
        self.assertEqual(fake.get("keyboard-layout", "/Default/XkbLayout"), "de,il", "Hebrew appended, German kept")
        self.assertEqual(fake.get("keyboard-layout", "/Default/XkbVariant"), "nodeadkeys,", "variants stay lined up")
        self.assertEqual(fake.get("xfce4-desktop", mon), MANIFEST["wallpaper"])
        self.assertEqual(dd.pending_changes(), [])
        dd.apply_skin()  # re-apply keeps the original backup
        dd.undo_skin()
        self.assertEqual(fake.get("xsettings", "/Net/ThemeName"), "Adwaita")
        self.assertEqual(fake.get("keyboard-layout", "/Default/XkbLayout"), "de")
        self.assertEqual(fake.get("keyboard-layout", "/Default/XkbVariant"), "nodeadkeys")
        self.assertEqual(fake.get("xfce4-desktop", mon), "/usr/share/backgrounds/xfce/xfce-shapes.svg")

    def test_stock_xfce_session_without_defaults_gets_explicit_values_and_clean_undo(self):
        # The plain "Xfce Session" does not read /etc/xdg/jewbuntu: apply must set values itself.
        fake = self.use(FakeXfconf(with_defaults=False))
        self.assertTrue(dd.pending_changes())
        dd.apply_skin()
        self.assertEqual(fake.get("xfwm4", "/general/button_layout"), "CHM|")
        self.assertEqual(fake.get("keyboard-layout", "/Default/XkbLayout"), "us,il")
        self.assertEqual(fake.get("xfwm4", "/general/use_compositing"), "false")
        typed = [c for c in fake.calls if "/general/use_compositing" in c and "-s" in c]
        self.assertIn("bool", typed[-1])
        dd.undo_skin()
        self.assertEqual(fake.user, {}, "everything unset again, as before apply")


if __name__ == "__main__":
    unittest.main()
