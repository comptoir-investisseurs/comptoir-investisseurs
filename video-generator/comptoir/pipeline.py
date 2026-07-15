"""Orchestration complète : article -> narratif -> storyboard -> vidéo + légende."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from . import config
from .assets import fetch_scene_asset
from .branding import make_badge, make_title_banner
from .config import Settings
from .models import GenerationResult, Storyboard
from .render import build_voiceover, concat_clips, make_scene_clip, render_final
from .subtitles import _normalize, build_cards, write_ass
from .tts import synthesize_scene


def _log(msg: str) -> None:
    print(msg, flush=True)


def run(article_text: str | None, settings: Settings,
        storyboard: Storyboard | None = None,
        narrative: str | None = None) -> GenerationResult:
    """Exécute le pipeline. Fournir soit `article_text` (pipeline complet),
    soit un `storyboard` déjà généré (rendu seul)."""
    out = settings.output_dir
    tmp = settings.temp_dir
    out.mkdir(parents=True, exist_ok=True)
    tmp.mkdir(parents=True, exist_ok=True)

    # --- Étapes LLM ---------------------------------------------------------
    if storyboard is None:
        import anthropic

        from .llm import write_narrative, write_storyboard

        if not article_text or not article_text.strip():
            raise ValueError("Article vide.")
        client = anthropic.Anthropic()

        _log("• Étape 1/5 — Rédaction du narratif…")
        narrative = write_narrative(client, article_text, settings.model)
        _log(f"  Narratif : {len(narrative.split())} mots.")

        _log("• Étape 2/5 — Storyboard + légende…")
        storyboard = write_storyboard(client, narrative, settings.model)
        _log(f"  {len(storyboard.scenes)} scènes.")
    else:
        _log("• Étapes LLM sautées (storyboard fourni).")
        narrative = narrative or " ".join(s.narration for s in storyboard.scenes)

    narrative_path = out / "narrative.txt"
    narrative_path.write_text(narrative, encoding="utf-8")
    storyboard_path = out / "storyboard.json"
    storyboard_path.write_text(
        json.dumps(storyboard.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    caption_path = out / "caption.txt"
    caption_path.write_text(storyboard.caption, encoding="utf-8")

    # --- Voix off + visuels, scène par scène ---------------------------------
    _log(f"• Étape 3/5 — Voix off ({settings.tts_backend}) et visuels…")
    clips: list[Path] = []
    scene_wavs: list[Path] = []
    scene_durations: list[float] = []
    all_cards = []
    used_asset_ids: set[int] = set()
    cursor = 0.0

    for i, scene in enumerate(storyboard.scenes):
        _log(f"  Scène {i + 1}/{len(storyboard.scenes)} : {scene.visual[:70]}")
        audio = synthesize_scene(scene.narration, tmp / f"vo_{i:02d}.wav", settings)
        duration = audio.duration + config.SCENE_PAD_S

        asset = fetch_scene_asset(scene, i, settings, used_asset_ids)
        clip = make_scene_clip(asset, duration, i, tmp / f"clip_{i:02d}.mp4")

        emphasis = {_normalize(word)
                    for entry in scene.emphasis for word in entry.split()}
        all_cards.extend(build_cards(audio.words, emphasis, offset=cursor))

        clips.append(clip)
        scene_wavs.append(audio.wav_path)
        scene_durations.append(duration)
        cursor += duration

    total_duration = cursor

    # --- Habillage + sous-titres ---------------------------------------------
    _log("• Étape 4/5 — Habillage et sous-titres…")
    badge = make_badge(tmp / "badge.png")
    banner = make_title_banner(storyboard.title_top, storyboard.title_bottom,
                               tmp / "banner.png")
    ass_path = write_ass(all_cards, tmp / "subs.ass")

    # --- Rendu final -----------------------------------------------------------
    _log("• Étape 5/5 — Rendu final…")
    video_concat = concat_clips(clips, tmp / "video_concat.mp4")
    voiceover = build_voiceover(scene_wavs, scene_durations, tmp / "voiceover.wav")
    video_path = out / "video.mp4"
    render_final(
        video=video_concat, voiceover=voiceover, badge=badge, banner=banner,
        ass_path=ass_path, total_duration=total_duration,
        banner_seconds=settings.banner_seconds, out_path=video_path,
        music=settings.music, music_volume=settings.music_volume,
    )

    if not settings.keep_temp:
        shutil.rmtree(tmp, ignore_errors=True)

    _log(f"✔ Vidéo   : {video_path}")
    _log(f"✔ Légende : {caption_path}")
    return GenerationResult(
        video_path=str(video_path),
        caption_path=str(caption_path),
        storyboard_path=str(storyboard_path),
        narrative_path=str(narrative_path),
        duration_seconds=round(total_duration, 2),
    )
