"""Configuration et identité de marque — Le Comptoir des Investisseurs."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

PKG_DIR = Path(__file__).resolve().parent
ROOT_DIR = PKG_DIR.parent
FONTS_DIR = ROOT_DIR / "assets" / "fonts"


def load_env(path: Path | None = None) -> None:
    """Charge un fichier .env (KEY=valeur) dans os.environ, sans dépendance.
    Les variables déjà définies dans l'environnement ont la priorité."""
    env_path = path or (ROOT_DIR / ".env")
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)

# --- Identité de la chaîne ---------------------------------------------------
CHANNEL_NAME = "Le Comptoir des Investisseurs"
BADGE_LINE_1 = "LE COMPTOIR"
BADGE_LINE_2 = "DES INVESTISSEURS"

# Palette (sérieux mais punchy : encre + or + rouge signal)
COLOR_INK = "#101820"        # noir bleuté — blocs sombres
COLOR_PAPER = "#FFFFFF"      # blanc — blocs clairs / sous-titres
COLOR_GOLD = "#D4A643"       # or — accent de marque
COLOR_RED = "#C8102E"        # rouge — mots-chocs / banner
COLOR_BG_TOP = "#0B1220"     # fond de secours (dégradé haut)
COLOR_BG_BOTTOM = "#1B2C4A"  # fond de secours (dégradé bas)

FONT_DISPLAY = FONTS_DIR / "Anton-Regular.ttf"        # titres, badge, sous-titres
FONT_SUB = FONTS_DIR / "ArchivoBlack-Regular.ttf"     # secondaire
SUBTITLE_FONT_NAME = "Anton"                          # nom interne du TTF

# Musique de fond (générée, libre de droits). Utilisée par défaut, à bas volume.
DEFAULT_MUSIC = ROOT_DIR / "assets" / "music" / "bed.mp3"
DEFAULT_MUSIC_VOLUME = 0.09

# --- Format vidéo -------------------------------------------------------------
WIDTH = 1080
HEIGHT = 1920
FPS = 30
SCENE_PAD_S = 0.18          # respiration ajoutée après la narration de chaque scène
BANNER_SECONDS = 6.0        # durée d'affichage du bandeau-titre (début de vidéo)

# --- Sous-titres ---------------------------------------------------------------
SUB_MAX_WORDS = 3           # mots max par carton de sous-titre
SUB_MAX_CHARS = 20          # caractères max par carton
SUB_FONT_SIZE = 92          # sur une grille 1080x1920
SUB_MARGIN_V = 480          # distance du bas (zone sûre TikTok/Reels)

# --- LLM ------------------------------------------------------------------------
DEFAULT_MODEL = "claude-opus-4-8"

# --- TTS ------------------------------------------------------------------------
DEFAULT_TTS = "edge"
# Voix « Multilingual » de dernière génération : nettement plus naturelle/humaine
# que les voix neurales classiques.
DEFAULT_EDGE_VOICE = "fr-FR-RemyMultilingualNeural"
# Voix de secours si la voix principale est indisponible (toujours présentes) :
EDGE_FALLBACK_VOICES = ["fr-FR-HenriNeural", "fr-FR-DeniseNeural"]
DEFAULT_EDGE_RATE = "+6%"                   # léger boost, sans effet « robot pressé »
DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2"


@dataclass
class Settings:
    """Réglages d'une exécution du pipeline."""
    output_dir: Path
    model: str = DEFAULT_MODEL
    tts_backend: str = DEFAULT_TTS
    voice: str = DEFAULT_EDGE_VOICE
    rate: str = DEFAULT_EDGE_RATE
    music: Path | None = field(
        default_factory=lambda: DEFAULT_MUSIC if DEFAULT_MUSIC.exists() else None
    )
    music_volume: float = DEFAULT_MUSIC_VOLUME
    banner_seconds: float = BANNER_SECONDS
    keep_temp: bool = False
    pexels_api_key: str | None = field(default_factory=lambda: os.environ.get("PEXELS_API_KEY"))
    elevenlabs_api_key: str | None = field(default_factory=lambda: os.environ.get("ELEVENLABS_API_KEY"))
    elevenlabs_voice_id: str | None = field(default_factory=lambda: os.environ.get("ELEVENLABS_VOICE_ID"))

    @property
    def temp_dir(self) -> Path:
        return self.output_dir / "_tmp"
