"""Assemblage ffmpeg : clips de scène, piste voix, habillage, sous-titres."""
from __future__ import annotations

import subprocess
from pathlib import Path

from . import config
from .assets import SceneAsset


def _run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            "ffmpeg a échoué :\n" + " ".join(cmd) + "\n\n" + result.stderr[-4000:]
        )


def make_scene_clip(asset: SceneAsset, duration: float, index: int,
                    out_path: Path) -> Path:
    """Produit un clip muet 1080x1920 à la durée exacte de la scène."""
    fps = config.FPS
    if asset.media == "video":
        vf = (
            f"scale={config.WIDTH}:{config.HEIGHT}:force_original_aspect_ratio=increase,"
            f"crop={config.WIDTH}:{config.HEIGHT},setsar=1,fps={fps}"
        )
        cmd = ["ffmpeg", "-y", "-v", "error",
               "-stream_loop", "-1", "-i", str(asset.path),
               "-t", f"{duration:.3f}", "-vf", vf, "-an"]
    else:
        # Ken Burns : zoom avant sur les scènes paires, arrière sur les impaires
        if index % 2 == 0:
            zoom = "min(1.0+0.0011*on,1.30)"
        else:
            zoom = "max(1.30-0.0011*on,1.0)"
        vf = (
            "scale=1620:2880:force_original_aspect_ratio=increase,"
            "crop=1620:2880,"
            f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d=1:fps={fps}:s={config.WIDTH}x{config.HEIGHT},setsar=1"
        )
        cmd = ["ffmpeg", "-y", "-v", "error",
               "-loop", "1", "-framerate", str(fps), "-i", str(asset.path),
               "-t", f"{duration:.3f}", "-vf", vf, "-an"]

    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-pix_fmt", "yuv420p", str(out_path)]
    _run(cmd)
    return out_path


def concat_clips(clips: list[Path], out_path: Path) -> Path:
    list_file = out_path.with_suffix(".txt")
    list_file.write_text(
        "".join(f"file '{c.as_posix()}'\n" for c in clips), encoding="utf-8"
    )
    _run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
          "-i", str(list_file), "-c", "copy", str(out_path)])
    return out_path


def build_voiceover(scene_wavs: list[Path], scene_durations: list[float],
                    out_path: Path) -> Path:
    """Ajuste chaque wav à la durée exacte de sa scène, puis concatène."""
    padded: list[Path] = []
    for i, (wav, target) in enumerate(zip(scene_wavs, scene_durations)):
        dst = wav.with_name(f"vo_pad_{i:02d}.wav")
        _run(["ffmpeg", "-y", "-v", "error", "-i", str(wav),
              "-af", f"apad=whole_dur={target:.3f}", "-t", f"{target:.3f}",
              "-ar", "48000", "-ac", "2", str(dst)])
        padded.append(dst)
    list_file = out_path.with_suffix(".txt")
    list_file.write_text(
        "".join(f"file '{p.as_posix()}'\n" for p in padded), encoding="utf-8"
    )
    _run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
          "-i", str(list_file), "-c:a", "pcm_s16le", str(out_path)])
    return out_path


def render_final(video: Path, voiceover: Path, badge: Path, banner: Path,
                 ass_path: Path, total_duration: float, banner_seconds: float,
                 out_path: Path, music: Path | None = None,
                 music_volume: float = 0.10) -> Path:
    """Superpose l'habillage + sous-titres et mixe la bande-son."""
    inputs = ["-i", str(video), "-i", str(voiceover),
              "-i", str(badge), "-i", str(banner)]
    if music is not None:
        inputs += ["-stream_loop", "-1", "-i", str(music)]

    banner_end = min(banner_seconds, total_duration)
    fontsdir = config.FONTS_DIR.as_posix()
    filters = [
        f"[0:v][2:v]overlay=W-w-{config.BADGE_X_MARGIN}:{config.BADGE_Y}[v1]",
        f"[v1][3:v]overlay=(W-w)/2:{config.BANNER_Y}"
        f":enable='between(t,0,{banner_end:.2f})'[v2]",
        f"[v2]ass={ass_path.as_posix()}:fontsdir={fontsdir}[vout]",
    ]
    if music is not None:
        fade_start = max(0.0, total_duration - 2.5)
        filters += [
            f"[4:a]volume={music_volume},afade=t=out:st={fade_start:.2f}:d=2.5[mus]",
            "[1:a][mus]amix=inputs=2:duration=first:dropout_transition=3[mix]",
            "[mix]loudnorm=I=-16:TP=-1.5:LRA=11[aout]",
        ]
    else:
        filters += ["[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[aout]"]

    cmd = (["ffmpeg", "-y", "-v", "error"] + inputs +
           ["-filter_complex", ";".join(filters),
            "-map", "[vout]", "-map", "[aout]",
            "-t", f"{total_duration:.3f}",
            "-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            str(out_path)])
    _run(cmd)
    return out_path


def make_cover(video: Path, out_path: Path, at_seconds: float = 1.2) -> Path:
    """Couverture verticale 1080x1920 (miniature TikTok/Instagram) : image
    extraite pendant l'affichage du bandeau-titre, donc titre + badge inclus."""
    _run(["ffmpeg", "-y", "-v", "error", "-ss", f"{at_seconds:.2f}",
          "-i", str(video), "-frames:v", "1", "-q:v", "2", str(out_path)])
    return out_path
