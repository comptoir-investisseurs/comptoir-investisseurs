"""Sous-titres ASS : cartons courts en majuscules, synchronisés mot à mot."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from . import config
from .tts import Word

_GOLD_ASS = "&H43A6D4&"   # #D4A643 en BGR (format ASS)
_WHITE_ASS = "&HFFFFFF&"


@dataclass
class SubCard:
    start: float
    end: float
    words: list[str]
    highlighted: list[bool]


def _normalize(token: str) -> str:
    return re.sub(r"[^\w€$%]", "", token, flags=re.UNICODE).lower()


def build_cards(words: list[Word], emphasis: set[str],
                offset: float) -> list[SubCard]:
    """Groupe les mots d'une scène en cartons de 2-3 mots max."""
    cards: list[SubCard] = []
    current: list[Word] = []

    def flush() -> None:
        if not current:
            return
        cards.append(SubCard(
            start=offset + current[0].start,
            end=offset + current[-1].end + 0.05,
            words=[w.text for w in current],
            highlighted=[_normalize(w.text) in emphasis for w in current],
        ))
        current.clear()

    for word in words:
        candidate_len = sum(len(w.text) + 1 for w in current) + len(word.text)
        if current and (len(current) >= config.SUB_MAX_WORDS
                        or candidate_len > config.SUB_MAX_CHARS):
            flush()
        current.append(word)
        # Coupe naturelle sur la ponctuation forte
        if re.search(r"[.!?:;,]$", word.text):
            flush()
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


def _card_text(card: SubCard) -> str:
    parts = []
    for token, hot in zip(card.words, card.highlighted):
        text = token.upper().replace("{", "(").replace("}", ")")
        if hot:
            parts.append(rf"{{\1c{_GOLD_ASS}}}{text}{{\1c{_WHITE_ASS}}}")
        else:
            parts.append(text)
    return r"{\fad(70,40)}" + " ".join(parts)


def write_ass(cards: list[SubCard], out_path: Path) -> Path:
    header = f"""[Script Info]
Title: Le Comptoir des Investisseurs
ScriptType: v4.00+
PlayResX: {config.WIDTH}
PlayResY: {config.HEIGHT}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Punch,{config.SUBTITLE_FONT_NAME},{config.SUB_FONT_SIZE},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,8,3,2,60,60,{config.SUB_MARGIN_V},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for card in cards:
        lines.append(
            f"Dialogue: 0,{_ass_time(card.start)},{_ass_time(card.end)},"
            f"Punch,,0,0,0,,{_card_text(card)}\n"
        )
    out_path.write_text("".join(lines), encoding="utf-8")
    return out_path
