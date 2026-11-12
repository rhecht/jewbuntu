"""Per-user migration of renamed GNOME extension UUIDs (ShulGo)."""
from tests.unit.helpers import IsolatedHome

from jewbuntu import renames

OLD, NEW = "shulgo@jewbuntu.org", "jewbuntu@shulgo.com"


class Fake:
    def __init__(self, enabled, disabled="@as []"):
        self.v = {"enabled-extensions": enabled, "disabled-extensions": disabled}

    def __call__(self, op, schema, key, value=None):
        if op == "get":
            return self.v[key]
        self.v[key] = value


class RenameTests(IsolatedHome):
    def test_new_uuid_takes_old_place(self):
        f = Fake(f"['user-theme@x', '{OLD}', 'jewbuntu-look@jewbuntu']")
        notes = renames.migrate_extensions(f, lambda u: True)
        self.assertEqual(f.v["enabled-extensions"], f"['user-theme@x', '{NEW}', 'jewbuntu-look@jewbuntu']")
        self.assertEqual(len(notes), 1)

    def test_left_alone_when_new_extension_not_installed(self):
        f = Fake(f"['{OLD}']")
        self.assertEqual(renames.migrate_extensions(f, lambda u: False), [])
        self.assertEqual(f.v["enabled-extensions"], f"['{OLD}']")

    def test_no_duplicate_when_both_listed_and_disabled_list_too(self):
        f = Fake(f"['{OLD}', '{NEW}']", f"['{OLD}']")
        renames.migrate_extensions(f, lambda u: True)
        self.assertEqual(f.v["enabled-extensions"], f"['{NEW}']")
        self.assertEqual(f.v["disabled-extensions"], f"['{NEW}']")

    def test_nothing_to_do_writes_nothing(self):
        f = Fake("['a@b']")
        calls = []
        def g(op, *a):
            calls.append(op)
            return f(op, *a)
        renames.migrate_extensions(g, lambda u: True)
        self.assertNotIn("set", calls)
