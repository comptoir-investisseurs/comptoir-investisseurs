"""Sous-titres ASS : cartons de deux lignes en majuscules, à POSITION FIXE,
synchronisés sur les timings mot à mot de la voix off."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from . import config
from .tts import Word

_GOLD_ASS = "&H43A6D4&"   # #D4A643 en BGR (format ASS)
_WHITE_ASS = "&HFFFFFF&"


@dataclass
class SubCard:
    """Un carton : 1 à 2 lignes de mots, avec leur drapeau d'emphase."""
    start: float
    end: float
    lines: list[list[str]] = field(default_factory=list)
    highlighted: list[list[bool]] = field(default_factory=list)


def _normalize(token: str) -> str:
    return re.sub(r"[^\w€$%]", "", token, flags=re.UNICODE).lower()


def build_cards(words: list[Word], emphasis: set[str],
                offset: float) -> list[SubCard]:
    """Groupe les mots d'une scène en cartons de 2 lignes maximum.
    Un mot n'est JAMAIS coupé : il passe entier à la ligne ou au carton
    suivant si la ligne est pleine (apostrophes et traits d'union compris)."""
    cards: list[SubCard] = []
    lines: list[list[Word]] = [[]]

    def flush() -> None:
        nonlocal lines
        full = [ln for ln in lines if ln]
        if not full:
            lines = [[]]
            return
        flat = [w for ln in full for w in ln]
        cards.append(SubCard(
            start=offset + flat[0].start,
            end=offset + flat[-1].end + 0.05,
            lines=[[w.text for w in ln] for ln in full],
            highlighted=[[_normalize(w.text) in emphasis for w in ln]
                         for ln in full],
        ))
        lines = [[]]

    for word in words:
        current = lines[-1]
        width = sum(len(w.text) + 1 for w in current) + len(word.text)
        if current and width > config.SUB_MAX_CHARS:
            if len(lines) >= config.SUB_MAX_LINES:
                flush()
            else:
                lines.append([])
        lines[-1].append(word)
        # Ponctuation forte : fin de carton. Virgule : fin de ligne.
        if re.search(r"[.!?:;]$", word.text):
            flush()
        elif word.text.endswith(",") and len(lines) < config.SUB_MAX_LINES:
            lines.append([])
    flush()

    # Étire chaque carton jusqu'au début du suivant (pas de trou d'affichage)
    for a, b in zip(cards, cards[1:]):
        a.end = max(a.end, min(b.start, a.end + 0.35))
    return cards


def _ass_time(seconds: float) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int(seconds % 3600 // 60)
    s = int(seconds % 60)
    cs = int(round(seconds % 1 * 100))
    if cs == 100:
        s, cs = s + 1, 0
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _line_text(tokens: list[str], flags: list[bool]) -> str:
    parts = []
    for token, hot in zip(tokens, flags):
        text = token.upper().replace("{", "(").replace("}", ")")
        if hot:
            parts.append(rf"{{\1c{_GOLD_ASS}}}{text}{{\1c{_WHITE_ASS}}}")
        else:
            parts.append(text)
    return " ".join(parts)


def _card_text(card: SubCard) -> str:
    lines = [_line_text(tokens, flags)
             for tokens, flags in zip(card.lines, card.highlighted)]
    return r"{\fad(70,40)}" + r"\N".join(lines)


def write_ass(cards: list[SubCard], out_path: Path) -> Path:
    # Alignment 8 = ancré en HAUT-centre : la première ligne reste toujours à
    # la même hauteur (SUB_TOP_Y) ; une éventuelle 2e ligne pousse vers le bas.
    # Résultat : le bloc ne « saute » jamais pendant le défilement.
    header = f"""[Script Info]
Title: Le Comptoir des Investisseurs
ScriptType: v4.00+
PlayResX: {config.WIDTH}
PlayResY: {config.HEIGHT}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Punch,{config.SUBTITLE_FONT_NAME},{config.SUB_FONT_SIZE},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,8,3,8,50,50,{config.SUB_TOP_Y},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = [
        f"Dialogue: 0,{_ass_time(c.start)},{_ass_time(c.end)},"
        f"Punch,,0,0,0,,{_card_text(c)}\n"
        for c in cards
    ]
    out_path.write_text(header + "".join(events), encoding="utf-8")
    return out_path
