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

# Wikimedia impose un User-Agent identifiable.
_WIKI_HEADERS = {"User-Agent": "comptoir-video/1.0 (outil editorial video)"}


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


# ---------------------------------------------------------------------------
# Portrait du sujet (personne / entreprise) via Wikipédia
# ---------------------------------------------------------------------------
def _wiki_summary(title: str, lang: str) -> dict | None:
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/" + \
        requests.utils.quote(title, safe="")
    resp = requests.get(url, headers=_WIKI_HEADERS, timeout=30)
    if resp.status_code != 200:
        return None
    return resp.json()


def _wiki_search_title(query: str, lang: str) -> str | None:
    resp = requests.get(
        f"https://{lang}.wikipedia.org/w/api.php",
        params={"action": "query", "list": "search", "srsearch": query,
                "srlimit": 1, "format": "json"},
        headers=_WIKI_HEADERS, timeout=30,
    )
    if resp.status_code != 200:
        return None
    hits = resp.json().get("query", {}).get("search", [])
    return hits[0]["title"] if hits else None


def _wiki_image_url(summary: dict) -> str | None:
    """URL d'image exploitable (jamais de SVG brut : on prend le rendu PNG)."""
    original = (summary.get("originalimage") or {}).get("source")
    thumb = (summary.get("thumbnail") or {}).get("source")
    if original and not original.lower().endswith(".svg"):
        return original
    if thumb:
        # Agrandit le rendu (les vignettes sont servies en /XXXpx-)
        import re
        return re.sub(r"/(\d+)px-", "/1200px-", thumb)
    return None


def _commons_credit(image_url: str) -> str | None:
    """Auteur + licence du fichier Commons, pour créditer le portrait."""
    try:
        filename = image_url.rsplit("/", 1)[-1]
        # Les rendus de vignettes gardent le nom original après 'px-'
        if "px-" in filename:
            filename = filename.split("px-", 1)[1]
        resp = requests.get(
            "https://commons.wikimedia.org/w/api.php",
            params={"action": "query", "titles": f"File:{filename}",
                    "prop": "imageinfo", "iiprop": "extmetadata",
                    "format": "json"},
            headers=_WIKI_HEADERS, timeout=30,
        )
        pages = resp.json().get("query", {}).get("pages", {})
        for page in pages.values():
            info = (page.get("imageinfo") or [{}])[0].get("extmetadata", {})
            import re as _re
            artist = _re.sub(r"<[^>]+>", "",
                             info.get("Artist", {}).get("value", "")).strip()
            licence = info.get("LicenseShortName", {}).get("value", "").strip()
            if artist or licence:
                parts = [p for p in (artist, licence) if p]
                return " — ".join(parts) + " (Wikimedia Commons)"
    except Exception:
        pass
    return None


def fetch_subject_portrait(subject: str, settings: Settings) -> tuple[SceneAsset, str | None] | None:
    """Portrait libre de droits de la personne/entreprise via Wikipédia.
    Renvoie (asset, crédit photo) ou None si introuvable."""
    if not subject.strip():
        return None
    tmp = settings.temp_dir
    try:
        summary = None
        for lang in ("fr", "en"):
            summary = _wiki_summary(subject, lang)
            if summary and _wiki_image_url(summary):
                break
            resolved = _wiki_search_title(subject, lang)
            if resolved and resolved != subject:
                summary = _wiki_summary(resolved, lang)
                if summary and _wiki_image_url(summary):
                    break
            summary = None
        if not summary:
            return None
        image_url = _wiki_image_url(summary)
        if not image_url:
            return None
        suffix = ".png" if ".png" in image_url.lower() else ".jpg"
        path = tmp / f"asset_00_portrait{suffix}"
        with requests.get(image_url, headers=_WIKI_HEADERS, stream=True,
                          timeout=120) as resp:
            resp.raise_for_status()
            with open(path, "wb") as fh:
                for chunk in resp.iter_content(chunk_size=1 << 16):
                    fh.write(chunk)
        credit = _commons_credit(image_url)
        return SceneAsset(path=path, media="photo"), credit
    except requests.RequestException as exc:
        print(f"  ! Portrait Wikipédia indisponible ({exc}).")
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
                                    tmp / f"asset_{index:02d}_fallback.png",
                                    variant=index)
    return SceneAsset(path=path, media="photo")
