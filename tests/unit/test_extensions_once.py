"""Companion extensions (ShulGo) are enabled once per user, then left to the user."""
from tests.unit.helpers import IsolatedHome

from jewbuntu import extensions_once

SHULGO = "jewbuntu@shulgo.com"


class Fake:
    def __init__(self, enabled="@as []", disabled="@as []"):
        self.v = {"enabled-extensions": enabled, "disabled-extensions": disabled}
        self.sets = 0

    def __call__(self, op, schema, key, value=None):
        if op == "get":
            return self.v[key]
        self.v[key] = value
        self.sets += 1


class EnableOnceTests(IsolatedHome):
    def test_enables_installed_extension_once(self):
        f = Fake("['jewbuntu-look@jewbuntu']")
        notes = extensions_once.enable_once(f, lambda u: True)
        self.assertEqual(f.v["enabled-extensions"], f"['jewbuntu-look@jewbuntu', '{SHULGO}']")
        self.assertEqual(len(notes), 1)

    def test_user_turning_it_off_is_respected(self):
        f = Fake()
        extensions_once.enable_once(f, lambda u: True)
        f.v["enabled-extensions"] = "@as []"  # user switched it off
        self.assertEqual(extensions_once.enable_once(f, lambda u: True), [])
        self.assertEqual(f.v["enabled-extensions"], "@as []")

    def test_not_installed_waits_until_installed(self):
        f = Fake()
        self.assertEqual(extensions_once.enable_once(f, lambda u: False), [])
        self.assertEqual(f.sets, 0)
        self.assertEqual(len(extensions_once.enable_once(f, lambda u: True)), 1)

    def test_disabled_list_counts_as_a_choice(self):
        f = Fake(disabled=f"['{SHULGO}']")
        self.assertEqual(extensions_once.enable_once(f, lambda u: True), [])
        self.assertEqual(f.sets, 0)

    def test_already_enabled_writes_nothing(self):
        f = Fake(f"['{SHULGO}']")
        self.assertEqual(extensions_once.enable_once(f, lambda u: True), [])
        self.assertEqual(f.sets, 0)
