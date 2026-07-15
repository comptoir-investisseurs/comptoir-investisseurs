"""Génération des éléments graphiques (badge de chaîne, bandeau-titre, fonds)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from . import config


def _font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def _text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    return right - left, bottom - top, left, top


def make_badge(out_path: Path) -> Path:
    """Badge de chaîne (coin haut droit) : deux blocs empilés, noir puis or."""
    font1 = _font(config.FONT_DISPLAY, 54)
    font2 = _font(config.FONT_DISPLAY, 34)
    pad_x, pad_y, gap = 22, 12, 0

    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    w1, h1, l1, t1 = _text_size(probe, config.BADGE_LINE_1, font1)
    w2, h2, l2, t2 = _text_size(probe, config.BADGE_LINE_2, font2)

    block1 = (w1 + 2 * pad_x, h1 + 2 * pad_y)
    block2 = (w2 + 2 * pad_x, h2 + 2 * pad_y)
    width = max(block1[0], block2[0])
    height = block1[1] + gap + block2[1]

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Bloc 1 : LE COMPTOIR — blanc sur encre
    draw.rectangle([0, 0, width, block1[1]], fill=config.COLOR_INK)
    draw.text(((width - w1) / 2 - l1, pad_y - t1), config.BADGE_LINE_1,
              font=font1, fill=config.COLOR_PAPER)
    # Bloc 2 : DES INVESTISSEURS — encre sur or
    y2 = block1[1] + gap
    draw.rectangle([0, y2, width, y2 + block2[1]], fill=config.COLOR_GOLD)
    draw.text(((width - w2) / 2 - l2, y2 + pad_y - t2), config.BADGE_LINE_2,
              font=font2, fill=config.COLOR_INK)

    img.save(out_path)
    return out_path


def make_title_banner(top: str, bottom: str, out_path: Path) -> Path:
    """Bandeau-titre d'ouverture : deux lignes décalées, rouge puis blanc."""
    canvas_w = config.WIDTH
    font_top = _font(config.FONT_DISPLAY, 64)
    font_bottom = _font(config.FONT_DISPLAY, 72)
    pad_x, pad_y, overlap = 34, 18, 6

    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    w1, h1, l1, t1 = _text_size(probe, top.upper(), font_top)
    w2, h2, l2, t2 = _text_size(probe, bottom.upper(), font_bottom)

    b1 = (min(w1 + 2 * pad_x, canvas_w - 20), h1 + 2 * pad_y)
    b2 = (min(w2 + 2 * pad_x, canvas_w - 20), h2 + 2 * pad_y)
    height = b1[1] + b2[1] - overlap

    img = Image.new("RGBA", (canvas_w, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Ligne 1 : blanc sur rouge, centrée
    x1 = (canvas_w - b1[0]) // 2
    draw.rectangle([x1, 0, x1 + b1[0], b1[1]], fill=config.COLOR_RED)
    draw.text((x1 + (b1[0] - w1) / 2 - l1, pad_y - t1), top.upper(),
              font=font_top, fill=config.COLOR_PAPER)

    # Ligne 2 : encre sur blanc, centrée, chevauche légèrement la ligne 1
    y2 = b1[1] - overlap
    x2 = (canvas_w - b2[0]) // 2
    draw.rectangle([x2, y2, x2 + b2[0], y2 + b2[1]], fill=config.COLOR_PAPER)
    draw.text((x2 + (b2[0] - w2) / 2 - l2, y2 + pad_y - t2), bottom.upper(),
              font=font_bottom, fill=config.COLOR_INK)

    img.save(out_path)
    return out_path


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def make_fallback_background(keywords: str, out_path: Path) -> Path:
    """Fond de secours quand aucune séquence libre de droits n'est trouvée :
    dégradé sombre + filets or, sobre et à la charte. `keywords` est ignoré
    (conservé pour la signature)."""
    w, h = config.WIDTH, config.HEIGHT
    top = _hex_to_rgb(config.COLOR_BG_TOP)
    bottom = _hex_to_rgb(config.COLOR_BG_BOTTOM)

    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        f = y / (h - 1)
        color = tuple(int(a + (b - a) * f) for a, b in zip(top, bottom))
        for x in range(w):
            px[x, y] = color

    draw = ImageDraw.Draw(img, "RGBA")
    gold = _hex_to_rgb(config.COLOR_GOLD)
    # Filets diagonaux discrets, façon courbe de marché
    draw.line([(0, int(h * 0.72)), (w, int(h * 0.38))], fill=(*gold, 60), width=6)
    draw.line([(0, int(h * 0.80)), (w, int(h * 0.46))], fill=(*gold, 28), width=3)

    img.save(out_path)
    return out_path
