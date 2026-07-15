"""Modèles de données du storyboard (sortie structurée de l'étape 2)."""
from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field


class Scene(BaseModel):
    """Une scène = un segment de narration + un visuel qui l'illustre."""
    narration: str = Field(
        description="Texte exact de la voix off pour cette scène, en français. "
                    "1 à 2 phrases courtes."
    )
    visual: str = Field(
        description="Description précise du visuel attendu, en français "
                    "(ex. : 'plan large de la façade de la Banque de France')."
    )
    media: Literal["video", "photo"] = Field(
        description="'video' pour une séquence en mouvement, 'photo' pour une image "
                    "fixe animée en Ken Burns."
    )
    search_keywords: str = Field(
        description="2 à 4 mots-clés EN ANGLAIS pour chercher la séquence libre de "
                    "droits (ex. : 'paris stock exchange building')."
    )
    emphasis: List[str] = Field(
        default_factory=list,
        description="Mots de la narration à mettre en évidence (couleur) dans les "
                    "sous-titres : chiffres, noms propres, mots-chocs. 0 à 3 mots.",
    )


class Storyboard(BaseModel):
    """Plan de montage complet, prêt à être rendu."""
    title_top: str = Field(
        description="Ligne 1 du bandeau-titre affiché en début de vidéo, en "
                    "MAJUSCULES, très courte (ex. : 'BANQUE DE FRANCE :')."
    )
    title_bottom: str = Field(
        description="Ligne 2 du bandeau-titre, en MAJUSCULES, l'angle choc "
                    "(ex. : 'LA NOMINATION POLÉMIQUE')."
    )
    scenes: List[Scene] = Field(description="6 à 12 scènes qui couvrent tout le narratif.")
    caption: str = Field(
        description="Légende du post TikTok/Instagram : accroche 1 ligne, 2-3 lignes "
                    "de contexte, question d'engagement, puis 5-8 hashtags finance FR. "
                    "Se termine par la signature de la chaîne."
    )


class GenerationResult(BaseModel):
    """Ce que le pipeline écrit sur disque."""
    video_path: str
    caption_path: str
    storyboard_path: str
    narrative_path: str
    duration_seconds: float
