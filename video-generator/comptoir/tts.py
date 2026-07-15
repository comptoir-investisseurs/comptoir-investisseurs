"""Synthèse vocale par scène, avec timings mot à mot pour les sous-titres.

Backends :
- edge        : Microsoft Edge TTS (gratuit, voix FR neurales, timings exacts).
- elevenlabs  : ElevenLabs (premium, timings exacts via l'API with-timestamps).
- espeak      : local/hors-ligne (qualité robotique — tests uniquement),
                timings estimés.
"""
from __future__ import annotations

import asyncio
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from .config import Settings


@dataclass
class Word:
    """Un mot prononcé, avec ses bornes en secondes (relatives à la scène)."""
    text: str
    start: float
    end: float


@dataclass
class SceneAudio:
    wav_path: Path
    duration: float          # durée réelle de l'audio (sans respiration)
    words: list[Word]


def _probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(out.stdout)["format"]["duration"])


def _to_wav(src: Path, dst: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(src),
         "-ar", "48000", "-ac", "2", str(dst)],
        check=True,
    )


def _estimate_words(text: str, duration: float) -> list[Word]:
    """Répartit la durée totale au prorata de la longueur des mots."""
    tokens = [t for t in re.split(r"\s+", text.strip()) if t]
    if not tokens:
        return []
    weights = [len(t) + 2 for t in tokens]
    total = sum(weights)
    words, cursor = [], 0.0
    for token, weight in zip(tokens, weights):
        span = duration * weight / total
        words.append(Word(text=token, start=cursor, end=cursor + span))
        cursor += span
    return words


# ---------------------------------------------------------------------------
# Backend : edge-tts
# ---------------------------------------------------------------------------
def _synth_edge(text: str, out_wav: Path, settings: Settings) -> SceneAudio:
    import edge_tts

    mp3_path = out_wav.with_suffix(".mp3")

    async def run() -> list[Word]:
        communicate = edge_tts.Communicate(text, settings.voice, rate=settings.rate)
        words: list[Word] = []
        with open(mp3_path, "wb") as fh:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    fh.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    start = chunk["offset"] / 1e7
                    end = start + chunk["duration"] / 1e7
                    words.append(Word(text=chunk["text"], start=start, end=end))
        return words

    words = asyncio.run(run())
    _to_wav(mp3_path, out_wav)
    mp3_path.unlink(missing_ok=True)
    duration = _probe_duration(out_wav)
    if not words:
        words = _estimate_words(text, duration)
    return SceneAudio(wav_path=out_wav, duration=duration, words=words)


# ---------------------------------------------------------------------------
# Backend : ElevenLabs
# ---------------------------------------------------------------------------
def _synth_elevenlabs(text: str, out_wav: Path, settings: Settings) -> SceneAudio:
    import base64

    import requests

    from .config import DEFAULT_ELEVENLABS_MODEL

    if not settings.elevenlabs_api_key or not settings.elevenlabs_voice_id:
        raise RuntimeError(
            "Backend elevenlabs : définissez ELEVENLABS_API_KEY et ELEVENLABS_VOICE_ID."
        )
    url = (
        "https://api.elevenlabs.io/v1/text-to-speech/"
        f"{settings.elevenlabs_voice_id}/with-timestamps"
    )
    resp = requests.post(
        url,
        headers={"xi-api-key": settings.elevenlabs_api_key},
        json={"text": text, "model_id": DEFAULT_ELEVENLABS_MODEL},
        timeout=120,
    )
    resp.raise_for_status()
    payload = resp.json()

    mp3_path = out_wav.with_suffix(".mp3")
    mp3_path.write_bytes(base64.b64decode(payload["audio_base64"]))
    _to_wav(mp3_path, out_wav)
    mp3_path.unlink(missing_ok=True)
    duration = _probe_duration(out_wav)

    # Regroupe l'alignement caractère par caractère en mots.
    align = payload.get("alignment") or {}
    chars = align.get("characters", [])
    starts = align.get("character_start_times_seconds", [])
    ends = align.get("character_end_times_seconds", [])
    words: list[Word] = []
    current, w_start, w_end = "", None, 0.0
    for ch, s, e in zip(chars, starts, ends):
        if ch.isspace():
            if current:
                words.append(Word(text=current, start=w_start or 0.0, end=w_end))
                current, w_start = "", None
        else:
            if w_start is None:
                w_start = s
            current += ch
            w_end = e
    if current:
        words.append(Word(text=current, start=w_start or 0.0, end=w_end))
    if not words:
        words = _estimate_words(text, duration)
    return SceneAudio(wav_path=out_wav, duration=duration, words=words)


# ---------------------------------------------------------------------------
# Backend : espeak-ng (hors-ligne, tests)
# ---------------------------------------------------------------------------
def _synth_espeak(text: str, out_wav: Path, settings: Settings) -> SceneAudio:
    raw = out_wav.with_name(out_wav.stem + "_raw.wav")
    subprocess.run(
        ["espeak-ng", "-v", "fr", "-s", "165", "-w", str(raw), text],
        check=True,
    )
    _to_wav(raw, out_wav)
    raw.unlink(missing_ok=True)
    duration = _probe_duration(out_wav)
    return SceneAudio(wav_path=out_wav, duration=duration,
                      words=_estimate_words(text, duration))


_BACKENDS = {
    "edge": _synth_edge,
    "elevenlabs": _synth_elevenlabs,
    "espeak": _synth_espeak,
}


def synthesize_scene(text: str, out_wav: Path, settings: Settings) -> SceneAudio:
    """Synthétise la narration d'une scène et renvoie audio + timings mots."""
    try:
        backend = _BACKENDS[settings.tts_backend]
    except KeyError:
        raise ValueError(
            f"Backend TTS inconnu : {settings.tts_backend!r} "
            f"(choix : {', '.join(_BACKENDS)})"
        ) from None
    return backend(text, out_wav, settings)
