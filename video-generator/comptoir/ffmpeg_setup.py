"""Résolution automatique de ffmpeg / ffprobe.

Ordre de recherche :
1. variable d'environnement COMPTOIR_FFMPEG_DIR (dossier contenant les binaires) ;
2. ffmpeg/ffprobe déjà présents dans le PATH ;
3. binaires déjà téléchargés dans `video-generator/bin/` ;
4. téléchargement automatique de binaires statiques (via l'API ffbinaries).

Une fois trouvés/téléchargés, le dossier des binaires est ajouté en tête du
PATH du processus : les appels existants à « ffmpeg » / « ffprobe » les trouvent
sans modification.
"""
from __future__ import annotations

import json
import os
import platform
import shutil
import stat
import sys
import urllib.request
import zipfile
from pathlib import Path

from . import config

BIN_DIR = config.ROOT_DIR / "bin"

# Version volontairement ancienne : compatible depuis macOS 10.9 / High Sierra.
_MACOS_PINNED_VERSION = "4.4.1"
_API = "https://ffbinaries.com/api/v1/version/{version}"

_resolved = False


def _exe(path: Path) -> Path:
    return path.with_suffix(".exe") if os.name == "nt" else path


def _platform_code() -> str:
    system = platform.system()
    if system == "Darwin":
        return "osx-64"
    if system == "Windows":
        return "windows-64"
    machine = platform.machine().lower()
    return "linux-arm-64" if machine in {"aarch64", "arm64"} else "linux-64"


def _both_present(directory: Path) -> tuple[str, str] | None:
    ffmpeg = _exe(directory / "ffmpeg")
    ffprobe = _exe(directory / "ffprobe")
    if ffmpeg.exists() and ffprobe.exists():
        return str(ffmpeg), str(ffprobe)
    return None


def _api_version() -> str:
    if platform.system() == "Darwin":
        try:
            major, minor, *_ = (int(p) for p in platform.mac_ver()[0].split("."))
            if (major, minor) < (10, 15):
                return _MACOS_PINNED_VERSION
        except (ValueError, IndexError):
            return _MACOS_PINNED_VERSION
    return "latest"


def _fetch_json(url: str) -> dict:
    from .netfix import ssl_context

    req = urllib.request.Request(url, headers={"User-Agent": "comptoir-video/1.0"})
    with urllib.request.urlopen(req, timeout=60, context=ssl_context()) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _download_zip(url: str, dst_dir: Path) -> None:
    from .netfix import ssl_context

    tmp = dst_dir / "_dl.zip"
    req = urllib.request.Request(url, headers={"User-Agent": "comptoir-video/1.0"})
    with urllib.request.urlopen(req, timeout=180, context=ssl_context()) as resp, \
            open(tmp, "wb") as fh:
        shutil.copyfileobj(resp, fh)
    with zipfile.ZipFile(tmp) as zf:
        zf.extractall(dst_dir)
    tmp.unlink(missing_ok=True)


def _make_executable(path: Path) -> None:
    if path.exists():
        path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def _download() -> tuple[str, str]:
    plat = _platform_code()
    version = _api_version()
    print(f"• Téléchargement de ffmpeg ({version}, {plat})… "
          "(une seule fois, ~1 minute)", flush=True)
    BIN_DIR.mkdir(parents=True, exist_ok=True)

    data = _fetch_json(_API.format(version=version))
    binaries = data.get("bin", {}).get(plat)
    if not binaries:
        raise RuntimeError(f"Aucun binaire ffmpeg disponible pour {plat}.")

    for name in ("ffmpeg", "ffprobe"):
        url = binaries.get(name)
        if not url:
            raise RuntimeError(f"URL {name} introuvable pour {plat}.")
        _download_zip(url, BIN_DIR)
        _make_executable(_exe(BIN_DIR / name))

    found = _both_present(BIN_DIR)
    if not found:
        raise RuntimeError("Téléchargement de ffmpeg incomplet.")
    return found


def _prepend_path(directory: Path) -> None:
    directory = str(directory)
    parts = os.environ.get("PATH", "").split(os.pathsep)
    if directory not in parts:
        os.environ["PATH"] = directory + os.pathsep + os.environ.get("PATH", "")


def ensure() -> tuple[str, str]:
    """Garantit la présence de ffmpeg/ffprobe et renvoie leurs chemins.
    Ajoute leur dossier au PATH du processus. Idempotent."""
    global _resolved

    from .netfix import apply as apply_netfix
    apply_netfix()

    # 1. dossier explicite
    override = os.environ.get("COMPTOIR_FFMPEG_DIR")
    if override:
        found = _both_present(Path(override))
        if found:
            _prepend_path(Path(override))
            _resolved = True
            return found

    # 2. déjà dans le PATH
    ff, fp = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if ff and fp:
        _resolved = True
        return ff, fp

    # 3. déjà téléchargé localement
    found = _both_present(BIN_DIR)
    if found:
        _prepend_path(BIN_DIR)
        _resolved = True
        return found

    # 4. téléchargement automatique
    try:
        found = _download()
    except Exception as exc:  # message clair plutôt qu'une trace brute
        raise RuntimeError(
            "Impossible d'installer ffmpeg automatiquement "
            f"({exc}).\n"
            "Solution manuelle : téléchargez ffmpeg et ffprobe depuis "
            "https://ffbinaries.com/downloads , décompressez-les, et placez "
            f"les deux fichiers dans :\n    {BIN_DIR}\n"
            "puis relancez."
        ) from exc

    _prepend_path(BIN_DIR)
    _resolved = True
    return found
