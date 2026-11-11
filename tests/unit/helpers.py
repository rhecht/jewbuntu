"""Shared test setup: import the source tree and isolate XDG dirs per test."""
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "components" / "core"))
FIXTURES = REPO / "tests" / "fixtures"


class IsolatedHome(unittest.TestCase):
    """Points HOME and every XDG dir at a fresh temp directory."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="jewbuntu-test-"))
        self._saved = {k: os.environ.get(k) for k in ("HOME", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_STATE_HOME", "XDG_CACHE_HOME")}
        os.environ["HOME"] = str(self.tmp)
        for var, sub in (("XDG_CONFIG_HOME", ".config"), ("XDG_DATA_HOME", ".local/share"), ("XDG_STATE_HOME", ".local/state"), ("XDG_CACHE_HOME", ".cache")):
            os.environ[var] = str(self.tmp / sub)

    def tearDown(self):
        for k, v in self._saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        shutil.rmtree(self.tmp, ignore_errors=True)
