"""Correctif SSL pour Python fraîchement installé (surtout macOS python.org).

Sans certificats liés, urllib/aiohttp échouent en HTTPS avec
« CERTIFICATE_VERIFY_FAILED ». On pointe OpenSSL vers le paquet de
certificats fourni par `certifi` (déjà présent comme dépendance), ce qui
règle le problème pour urllib (téléchargement ffmpeg), aiohttp (edge-tts),
requests (Pexels) et httpx (SDK Anthropic)."""
from __future__ import annotations

import os

_applied = False


def apply() -> None:
    """Définit SSL_CERT_FILE / SSL_CERT_DIR sur le bundle certifi si besoin.
    Idempotent ; ne remplace pas une valeur déjà fournie par l'utilisateur."""
    global _applied
    if _applied:
        return
    _applied = True
    try:
        import certifi
    except Exception:
        return
    bundle = certifi.where()
    os.environ.setdefault("SSL_CERT_FILE", bundle)
    os.environ.setdefault("REQUESTS_CA_BUNDLE", bundle)


def ssl_context():
    """Contexte SSL explicite basé sur certifi (None si indisponible)."""
    try:
        import ssl

        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return None
