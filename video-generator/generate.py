#!/usr/bin/env python3
"""Le Comptoir des Investisseurs — article économique -> vidéo TikTok/Instagram.

Usage :
    export ANTHROPIC_API_KEY=sk-ant-...
    export PEXELS_API_KEY=...            # optionnel mais recommandé
    python generate.py examples/article-banque-de-france.txt -o out/

Sorties dans le dossier -o :
    video.mp4        vidéo verticale 1080x1920 prête à publier
    caption.txt      légende du post (hook + hashtags)
    narrative.txt    voix off générée (étape 1)
    storyboard.json  plan de montage généré (étape 2)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from comptoir import config
from comptoir.config import Settings
from comptoir.models import Storyboard
from comptoir.pipeline import run


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Génère une vidéo TikTok/Instagram à partir d'un article "
                    "économique (Le Comptoir des Investisseurs).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("article", nargs="?", type=Path,
                        help="Fichier texte de l'article source (ou '-' pour stdin).")
    parser.add_argument("-o", "--output", type=Path, default=Path("out"),
                        help="Dossier de sortie.")
    parser.add_argument("--model", default=config.DEFAULT_MODEL,
                        help="Modèle Claude pour les étapes 1 et 2.")
    parser.add_argument("--tts", default=config.DEFAULT_TTS,
                        choices=["edge", "elevenlabs", "espeak"],
                        help="Backend de synthèse vocale.")
    parser.add_argument("--voice", default=config.DEFAULT_EDGE_VOICE,
                        help="Voix edge-tts (ex. fr-FR-HenriNeural, fr-FR-DeniseNeural).")
    parser.add_argument("--rate", default=config.DEFAULT_EDGE_RATE,
                        help="Vitesse edge-tts (ex. +12%%).")
    parser.add_argument("--music", type=Path, default=None,
                        help="Musique de fond (mp3/wav). Par défaut : la nappe "
                             "fournie. Mixée à bas volume.")
    parser.add_argument("--no-music", action="store_true",
                        help="Désactive la musique de fond.")
    parser.add_argument("--music-volume", type=float,
                        default=config.DEFAULT_MUSIC_VOLUME,
                        help="Volume de la musique (0.0-1.0).")
    parser.add_argument("--banner-seconds", type=float, default=config.BANNER_SECONDS,
                        help="Durée d'affichage du bandeau-titre.")
    parser.add_argument("--from-storyboard", type=Path, default=None,
                        help="Rendre directement depuis un storyboard.json existant "
                             "(saute les étapes LLM — pratique pour itérer sur le montage).")
    parser.add_argument("--keep-temp", action="store_true",
                        help="Conserver les fichiers intermédiaires (_tmp/).")
    args = parser.parse_args()

    storyboard = None
    article_text = None
    if args.from_storyboard:
        storyboard = Storyboard.model_validate(
            json.loads(args.from_storyboard.read_text(encoding="utf-8"))
        )
    else:
        if args.article is None:
            parser.error("fournissez un fichier article, ou --from-storyboard.")
        if str(args.article) == "-":
            article_text = sys.stdin.read()
        else:
            article_text = args.article.read_text(encoding="utf-8")

    settings = Settings(
        output_dir=args.output,
        model=args.model,
        tts_backend=args.tts,
        voice=args.voice,
        rate=args.rate,
        music_volume=args.music_volume,
        banner_seconds=args.banner_seconds,
        keep_temp=args.keep_temp,
    )
    # Musique : --no-music désactive ; --music xxx force un fichier ; sinon défaut.
    if args.no_music:
        settings.music = None
    elif args.music is not None:
        settings.music = args.music
    result = run(article_text, settings, storyboard=storyboard)
    print(f"\nDurée : {result.duration_seconds}s — bonne publication !")
    return 0


if __name__ == "__main__":
    sys.exit(main())
