import datetime
import importlib.util
import json
import struct
import wave

from tests.unit.helpers import REPO, IsolatedHome

from jewbuntu import config, startup_sound


class FakeEnv:
    """Patch audio/boot probes so no real audio is touched."""

    def __init__(self, state="ok", bid="boot-1"):
        self.state, self.bid, self.played = state, bid, []

    def __enter__(self):
        self._saved = (startup_sound.output_state, startup_sound.play, startup_sound.boot_id, startup_sound.SINK_WAIT_S)
        startup_sound.output_state = lambda: self.state
        startup_sound.play = lambda path, volume=startup_sound.STREAM_VOLUME: (self.played.append((path, volume)) or (True, "fake"))
        startup_sound.boot_id = lambda: self.bid
        startup_sound.SINK_WAIT_S = 0
        return self

    def __exit__(self, *exc):
        startup_sound.output_state, startup_sound.play, startup_sound.boot_id, startup_sound.SINK_WAIT_S = self._saved


class StartupSoundTests(IsolatedHome):
    def setUp(self):
        super().setUp()
        self.wav = self.tmp / "s.wav"
        self.wav.write_bytes(b"RIFF")

    def test_plays_once_per_boot(self):
        with FakeEnv() as env:
            self.assertTrue(startup_sound.run(sound_file=self.wav).startswith("played"))
            self.assertEqual(startup_sound.run(sound_file=self.wav), "skipped: already played this boot")
            env.bid = "boot-2"
            self.assertTrue(startup_sound.run(sound_file=self.wav).startswith("played"))
            self.assertEqual(len(env.played), 2)

    def test_volume_is_stream_relative_and_restrained(self):
        with FakeEnv() as env:
            startup_sound.run(sound_file=self.wav)
            self.assertLessEqual(env.played[0][1], 1.0)

    def test_respects_off_setting(self):
        config.set_key("sound.startup", "false")
        with FakeEnv() as env:
            self.assertEqual(startup_sound.run(sound_file=self.wav), "skipped: startup sound is off")
            self.assertEqual(env.played, [])

    def test_muted_output_skips_for_whole_boot(self):
        with FakeEnv(state="muted") as env:
            self.assertEqual(startup_sound.run(sound_file=self.wav), "skipped: output muted")
            env.state = "ok"
            self.assertEqual(startup_sound.run(sound_file=self.wav), "skipped: already played this boot")
            self.assertEqual(env.played, [])

    def test_no_audio_is_harmless(self):
        with FakeEnv(state="none") as env:
            self.assertEqual(startup_sound.run(sound_file=self.wav), "skipped: no audio output available")
            self.assertEqual(env.played, [])

    def test_missing_file_is_harmless(self):
        with FakeEnv():
            self.assertIn("missing", startup_sound.run(sound_file=self.tmp / "nope.wav"))

    def test_node_profile_is_silent(self):
        import os
        os.environ["JEWBUNTU_PROFILE"] = "node"
        try:
            with FakeEnv() as env:
                self.assertIn("node profile", startup_sound.run(sound_file=self.wav))
                self.assertEqual(env.played, [])
        finally:
            del os.environ["JEWBUNTU_PROFILE"]

    def test_preview_ignores_setting_and_marker_but_not_mute(self):
        config.set_key("sound.startup", "false")
        with FakeEnv() as env:
            self.assertTrue(startup_sound.run(preview=True, sound_file=self.wav).startswith("played"))
            self.assertTrue(startup_sound.run(preview=True, sound_file=self.wav).startswith("played"))
            env.state = "muted"
            self.assertEqual(startup_sound.run(preview=True, sound_file=self.wav), "skipped: output muted")

    def test_quiet_window_fallback(self):
        on = {"quiet_schedule": {"enabled": True}}
        friday_morning = datetime.datetime(2026, 11, 13, 9, 0)
        friday_afternoon = datetime.datetime(2026, 11, 13, 15, 0)
        saturday = datetime.datetime(2026, 11, 14, 20, 0)
        sunday = datetime.datetime(2026, 11, 15, 9, 0)
        self.assertFalse(startup_sound.in_quiet_window(on, friday_morning))
        self.assertTrue(startup_sound.in_quiet_window(on, friday_afternoon))
        self.assertTrue(startup_sound.in_quiet_window(on, saturday))
        self.assertFalse(startup_sound.in_quiet_window(on, sunday))
        self.assertFalse(startup_sound.in_quiet_window({"quiet_schedule": {"enabled": False}}, saturday))


class JingleTests(IsolatedHome):
    def _synth(self):
        spec = importlib.util.spec_from_file_location("synth", REPO / "assets/sounds/synth.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_render_is_brief_restrained_and_deterministic(self):
        synth = self._synth()
        score = json.loads((REPO / "assets/sounds/hava-nagila-8bit.json").read_text())
        samples, sr = synth.render(score)
        duration = len(samples) / sr
        self.assertGreaterEqual(duration, 3.0)
        self.assertLessEqual(duration, 5.0)
        peak = max(abs(s) for s in samples)
        self.assertAlmostEqual(peak, 10 ** (score["peak_dbfs"] / 20), places=3)
        self.assertLess(max(abs(s) for s in samples[: int(sr * 0.002)]), peak * 0.5, "gentle attack")
        self.assertLess(max(abs(s) for s in samples[-int(sr * 0.01):]), peak * 0.05, "clean ending")
        again, _ = synth.render(score)
        self.assertEqual(samples, again)

    def test_wav_output(self):
        synth = self._synth()
        score = json.loads((REPO / "assets/sounds/hava-nagila-8bit.json").read_text())
        samples, sr = synth.render(score)
        out = self.tmp / "j.wav"
        synth.write_wav(samples, sr, str(out))
        with wave.open(str(out)) as w:
            self.assertEqual((w.getnchannels(), w.getsampwidth(), w.getframerate()), (1, 2, sr))

    def test_note_frequencies(self):
        synth = self._synth()
        self.assertAlmostEqual(synth.note_freq("A4"), 440.0)
        self.assertAlmostEqual(synth.note_freq("Bb4"), synth.note_freq("A#4"))
        self.assertAlmostEqual(synth.note_freq("D4"), 293.665, places=2)
