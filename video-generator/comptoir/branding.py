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


# Palettes sombres à la charte (haut, bas) — variées mais cohérentes.
_FALLBACK_PALETTES = [
    ("#0B1220", "#1B2C4A"),   # bleu nuit
    ("#0A1512", "#123028"),   # vert profond
    ("#160B12", "#3A1626"),   # bordeaux
    ("#0E0E12", "#242433"),   # charbon
    ("#0B1524", "#123A4A"),   # sarcelle
]


def make_fallback_background(keywords: str, out_path: Path, variant: int = 0) -> Path:
    """Fond de secours quand aucune séquence libre de droits n'est trouvée :
    dégradé sombre + trame façon graphique boursier. La palette et l'angle
    varient selon `variant` pour éviter la monotonie d'une scène à l'autre.
    `keywords` est conservé pour la signature (non affiché)."""
    w, h = config.WIDTH, config.HEIGHT
    pal_top, pal_bottom = _FALLBACK_PALETTES[variant % len(_FALLBACK_PALETTES)]
    top = _hex_to_rgb(pal_top)
    bottom = _hex_to_rgb(pal_bottom)

    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        f = y / (h - 1)
        color = tuple(int(a + (b - a) * f) for a, b in zip(top, bottom))
        for x in range(w):
            px[x, y] = color

    draw = ImageDraw.Draw(img, "RGBA")
    gold = _hex_to_rgb(config.COLOR_GOLD)

    # Trame façon chandeliers/courbe de marché (pente alternée selon la scène).
    up = variant % 2 == 0
    base_y = h * (0.66 if up else 0.40)
    step_y = -h * 0.020 if up else h * 0.020
    x = -40
    col = 0
    while x < w + 40:
        bar_h = 26 + (col * 37) % 150
        cy = int(base_y + step_y * col)
        # mèche
        draw.line([(x, cy - bar_h), (x, cy + bar_h)], fill=(*gold, 40), width=2)
        # corps
        draw.rectangle([x - 9, cy - bar_h // 2, x + 9, cy + bar_h // 2],
                       fill=(*gold, 26))
        x += 58
        col += 1

    # Deux filets diagonaux nets par-dessus.
    y1 = int(h * (0.74 if up else 0.30))
    y2 = int(h * (0.36 if up else 0.68))
    draw.line([(0, y1), (w, y2)], fill=(*gold, 70), width=6)
    draw.line([(0, y1 + 70), (w, y2 + 70)], fill=(*gold, 30), width=3)

    img.save(out_path)
    return out_path
