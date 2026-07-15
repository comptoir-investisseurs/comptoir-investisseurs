"""Sourcing des visuels : Pexels (libre de droits) avec fond de secours généré."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import requests

from .branding import make_fallback_background
from .config import Settings
from .models import Scene

PEXELS_VIDEO_URL = "https://api.pexels.com/videos/search"
PEXELS_PHOTO_URL = "https://api.pexels.com/v1/search"


@dataclass
class SceneAsset:
    path: Path
    media: str  # "video" | "photo"


def _download(url: str, dst: Path) -> Path:
    with requests.get(url, stream=True, timeout=180) as resp:
        resp.raise_for_status()
        with open(dst, "wb") as fh:
            for chunk in resp.iter_content(chunk_size=1 << 16):
                fh.write(chunk)
    return dst


def _pick_video_file(video: dict) -> str | None:
    """Choisit le fichier vertical le plus adapté (proche de 1080x1920)."""
    candidates = [
        f for f in video.get("video_files", [])
        if f.get("width") and f.get("height") and f["height"] > f["width"]
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda f: abs(f["height"] - 1920))
    return candidates[0]["link"]


def _search_pexels_video(query: str, api_key: str, exclude: set[int]) -> tuple[str, int] | None:
    resp = requests.get(
        PEXELS_VIDEO_URL,
        headers={"Authorization": api_key},
        params={"query": query, "orientation": "portrait", "per_page": 8},
        timeout=60,
    )
    resp.raise_for_status()
    for video in resp.json().get("videos", []):
        if video["id"] in exclude:
            continue
        link = _pick_video_file(video)
        if link:
            return link, video["id"]
    return None


def _search_pexels_photo(query: str, api_key: str, exclude: set[int]) -> tuple[str, int] | None:
    resp = requests.get(
        PEXELS_PHOTO_URL,
        headers={"Authorization": api_key},
        params={"query": query, "orientation": "portrait", "per_page": 8},
        timeout=60,
    )
    resp.raise_for_status()
    for photo in resp.json().get("photos", []):
        if photo["id"] in exclude:
            continue
        src = photo.get("src", {})
        link = src.get("large2x") or src.get("large") or src.get("original")
        if link:
            return link, photo["id"]
    return None


def fetch_scene_asset(scene: Scene, index: int, settings: Settings,
                      used_ids: set[int]) -> SceneAsset:
    """Récupère le visuel d'une scène. Sans clé Pexels (ou sans résultat),
    génère un fond à la charte pour ne jamais bloquer le rendu."""
    tmp = settings.temp_dir
    if settings.pexels_api_key:
        try:
            if scene.media == "video":
                found = _search_pexels_video(scene.search_keywords,
                                             settings.pexels_api_key, used_ids)
                if found:
                    link, vid = found
                    used_ids.add(vid)
                    path = _download(link, tmp / f"asset_{index:02d}.mp4")
                    return SceneAsset(path=path, media="video")
            found = _search_pexels_photo(scene.search_keywords,
                                         settings.pexels_api_key, used_ids)
            if found:
                link, pid = found
                used_ids.add(pid)
                suffix = ".jpg" if ".png" not in link.lower() else ".png"
                path = _download(link, tmp / f"asset_{index:02d}{suffix}")
                return SceneAsset(path=path, media="photo")
        except requests.RequestException as exc:
            print(f"  ! Pexels indisponible pour la scène {index + 1} ({exc}) — fond de secours.")

    path = make_fallback_background(scene.search_keywords,
                                    tmp / f"asset_{index:02d}_fallback.png")
    return SceneAsset(path=path, media="photo")
