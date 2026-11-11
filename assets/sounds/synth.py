#!/usr/bin/env python3
"""Render a note-sequence JSON file to a 16-bit mono WAV with simple chiptune voices.

Standard library only and deterministic (no randomness), so the same input
produces the same audio on the same platform. Band-limited additive synthesis
keeps the square/pulse timbre retro without harsh aliasing.

usage: synth.py SCORE.json OUT.wav
"""

import json
import math
import struct
import sys
import wave

NOTE_INDEX = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def note_freq(name):
    letter, rest = name[0], name[1:]
    semitone = NOTE_INDEX[letter]
    while rest and rest[0] in "#b":
        semitone += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    octave = int(rest)
    midi = 12 * (octave + 1) + semitone
    return 440.0 * 2 ** ((midi - 69) / 12)


def harmonics(wave_kind, freq, sample_rate, duty, max_harmonics):
    """Return [(n, amplitude)] for a band-limited waveform."""
    nyquist = sample_rate / 2
    out = []
    n = 1
    while n * freq < nyquist * 0.9 and n <= max_harmonics:
        if wave_kind == "pulse":
            amp = (2 / (n * math.pi)) * math.sin(n * math.pi * duty)
        elif wave_kind == "square":
            amp = (4 / (n * math.pi)) if n % 2 else 0.0
        elif wave_kind == "triangle":
            amp = (8 / (math.pi ** 2 * n * n)) * (1 if (n // 2) % 2 == 0 else -1) if n % 2 else 0.0
        else:
            raise ValueError(wave_kind)
        if amp:
            out.append((n, amp))
        n += 1
    return out


def render_voice(voice, beat_s, sample_rate, total_samples):
    buf = [0.0] * total_samples
    t0 = 0
    notes = voice["notes"]
    gain = voice.get("gain", 1.0)
    for i, note in enumerate(notes):
        name, beats = note[0], note[1]
        length = int(round(beats * beat_s * sample_rate))
        last = i == len(notes) - 1
        release = voice["final_release_ms" if last else "release_ms"] / 1000
        attack = voice["attack_ms"] / 1000
        if name != "rest":
            freq = note_freq(name)
            partials = harmonics(voice["wave"], freq, sample_rate, voice.get("duty", 0.5), voice.get("max_harmonics", 16))
            sustain_end = length if last else max(1, length - int(0.012 * sample_rate))  # tiny gap articulates repeats
            rel_n = int(release * sample_rate)
            for k in range(sustain_end + (rel_n if last else 0)):
                idx = t0 + k
                if idx >= total_samples:
                    break
                t = k / sample_rate
                env = min(1.0, t / attack) if attack else 1.0
                env *= 0.85 + 0.15 * math.exp(-t * 18)  # slight decay after attack
                if last:
                    if k >= sustain_end:
                        env *= max(0.0, 1 - (k - sustain_end) / rel_n)
                else:
                    tail = sustain_end - k
                    if tail < rel_n:
                        env *= tail / rel_n
                phase = 2 * math.pi * freq * t
                s = sum(a * math.sin(n * phase + (math.pi / 2 if voice["wave"] == "pulse" else 0)) for n, a in partials)
                buf[idx] += gain * env * s
        t0 += length
    return buf


def render(score):
    sr = score["sample_rate"]
    beat_s = 60.0 / score["tempo_bpm"]
    voices = [score["lead"]] + ([score["bass"]] if "bass" in score else [])
    beats = max(sum(n[1] for n in v["notes"]) for v in voices)
    tail = max(v["final_release_ms"] for v in voices) / 1000
    total = int((beats * beat_s + tail) * sr) + 1
    mix = [0.0] * total
    for v in voices:
        for i, s in enumerate(render_voice(v, beat_s, sr, total)):
            mix[i] += s
    peak = max(abs(s) for s in mix) or 1.0
    target = 10 ** (score["peak_dbfs"] / 20)
    scale = target / peak
    return [s * scale for s in mix], sr


def write_wav(samples, sr, path):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"".join(struct.pack("<h", int(round(max(-1.0, min(1.0, s)) * 32767))) for s in samples))


def main(argv):
    if len(argv) != 3:
        print(__doc__.strip().splitlines()[-1], file=sys.stderr)
        return 2
    with open(argv[1], encoding="utf-8") as handle:
        score = json.load(handle)
    samples, sr = render(score)
    write_wav(samples, sr, argv[2])
    print(f"wrote {argv[2]}: {len(samples) / sr:.2f}s at {sr} Hz")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
