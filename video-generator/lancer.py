#!/usr/bin/env python3
"""Lanceur tout-en-un du Comptoir des Investisseurs.

Objectif : zéro ligne de commande à retenir. On double-clique (ou on lance
`python3 lancer.py`), on colle sa clé une seule fois, on donne son article,
la vidéo se fabrique et le dossier s'ouvre.

Ce script :
  1. crée automatiquement un environnement Python isolé (.venv) et installe
     les dépendances la première fois,
  2. vérifie ffmpeg et donne la commande d'installation si besoin,
  3. lit (ou crée) le fichier .env avec vos clés d'API,
  4. demande l'article (fichier glissé, chemin, ou texte collé),
  5. lance la génération et ouvre le dossier de sortie.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV = ROOT / ".venv"
ENV_FILE = ROOT / ".env"
SENTINEL = "COMPTOIR_IN_VENV"


# ---------------------------------------------------------------------------
# 1. Environnement isolé + dépendances (auto, une seule fois)
# ---------------------------------------------------------------------------
def _venv_python() -> Path:
    return VENV / ("Scripts" if os.name == "nt" else "bin") / (
        "python.exe" if os.name == "nt" else "python3"
    )


def ensure_venv_and_reexec() -> None:
    """Crée le venv, installe les deps, puis relance ce script dedans."""
    if os.environ.get(SENTINEL) == "1":
        return  # déjà dans le venv : rien à faire

    py = _venv_python()
    first_time = not py.exists()
    if first_time:
        print("• Première utilisation : préparation de l'environnement "
              "(1 à 2 minutes)…", flush=True)
        import venv
        venv.EnvBuilder(with_pip=True).create(VENV)

    # Installe / met à jour les dépendances (rapide si déjà présentes)
    if first_time:
        print("• Installation des composants…", flush=True)
        subprocess.run([str(py), "-m", "pip", "install", "--quiet",
                        "--upgrade", "pip"], check=False)
        rc = subprocess.run([str(py), "-m", "pip", "install", "--quiet",
                             "-r", str(ROOT / "requirements.txt")])
        if rc.returncode != 0:
            print("  ! L'installation a échoué. Vérifiez votre connexion "
                  "internet et relancez.", file=sys.stderr)
            sys.exit(1)

    # Relance ce même script à l'intérieur du venv
    env = dict(os.environ, **{SENTINEL: "1"})
    sys.exit(subprocess.run([str(py), str(Path(__file__).resolve()),
                             *sys.argv[1:]], env=env).returncode)


# ---------------------------------------------------------------------------
# 2. Vérification ffmpeg
# ---------------------------------------------------------------------------
def check_ffmpeg() -> None:
    """ffmpeg est installé automatiquement s'il manque (voir ffmpeg_setup)."""
    if shutil.which("ffmpeg") and shutil.which("ffprobe"):
        return
    from comptoir.ffmpeg_setup import ensure
    try:
        ensure()  # télécharge des binaires statiques si nécessaire
    except Exception as exc:
        print(f"\n⚠  {exc}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# 3. Clés d'API (.env), demandées une seule fois
# ---------------------------------------------------------------------------
def ensure_keys() -> None:
    from comptoir import config
    config.load_env(ENV_FILE)

    lines: list[str] = []
    if ENV_FILE.exists():
        lines = ENV_FILE.read_text(encoding="utf-8").splitlines()

    def has(key: str) -> bool:
        return bool(os.environ.get(key))

    def save(key: str, value: str) -> None:
        nonlocal lines
        lines = [ln for ln in lines if not ln.startswith(f"{key}=")]
        lines.append(f"{key}={value}")
        ENV_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
        os.environ[key] = value

    if not has("ANTHROPIC_API_KEY"):
        print("\n🔑 Clé API Anthropic (obligatoire).")
        print("   À créer sur https://console.anthropic.com/ → API Keys.")
        value = input("   Collez votre clé (sk-ant-...) : ").strip()
        if not value:
            print("   Sans clé, impossible de générer. Arrêt.", file=sys.stderr)
            sys.exit(1)
        save("ANTHROPIC_API_KEY", value)

    if not has("PEXELS_API_KEY"):
        print("\n🎬 Clé Pexels (gratuite, recommandée pour les vraies images).")
        print("   À créer sur https://www.pexels.com/api/  —  ou laissez vide "
              "pour des fonds neutres.")
        value = input("   Collez votre clé Pexels (ou Entrée pour passer) : ").strip()
        if value:
            save("PEXELS_API_KEY", value)


# ---------------------------------------------------------------------------
# 4. Récupération de l'article
# ---------------------------------------------------------------------------
def get_article_path() -> Path:
    from comptoir import config

    # a) fichier passé en argument (glisser-déposer sur l'icône)
    if len(sys.argv) > 1 and Path(sys.argv[1]).is_file():
        return Path(sys.argv[1])

    print("\n📝 Votre article :")
    print("   • glissez un fichier .txt ici puis Entrée,")
    print("   • ou collez directement le texte (terminez par une ligne vide).")
    first = input("   > ").strip().strip('"').strip("'")

    candidate = Path(first)
    if first and candidate.is_file():
        return candidate

    # b) texte collé : on lit jusqu'à une ligne vide
    collected = [first] if first else []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line.strip() == "":
            break
        collected.append(line)
    text = "\n".join(collected).strip()
    if not text:
        print("   Aucun article fourni. Arrêt.", file=sys.stderr)
        sys.exit(1)
    tmp = config.ROOT_DIR / "_article_colle.txt"
    tmp.write_text(text, encoding="utf-8")
    return tmp


# ---------------------------------------------------------------------------
# 5. Ouverture du dossier de sortie
# ---------------------------------------------------------------------------
def open_folder(path: Path) -> None:
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", str(path)], check=False)
        elif os.name == "nt":
            os.startfile(str(path))  # type: ignore[attr-defined]
        else:
            subprocess.run(["xdg-open", str(path)], check=False)
    except Exception:
        pass


def main() -> int:
    ensure_venv_and_reexec()  # ne revient ici que dans le venv

    print("=" * 56)
    print("  Le Comptoir des Investisseurs — fabrique de vidéos")
    print("=" * 56)

    from comptoir.netfix import apply as apply_netfix
    apply_netfix()  # évite les erreurs de certificats HTTPS

    check_ffmpeg()
    ensure_keys()
    article = get_article_path()

    from comptoir import config
    from comptoir.config import Settings
    from comptoir.pipeline import run

    config.load_env(ENV_FILE)
    out_dir = ROOT / "videos" / article.stem
    settings = Settings(output_dir=out_dir)

    print(f"\n▶ Génération à partir de : {article.name}")
    print("  (compter 1 à 3 minutes selon la longueur)\n")
    try:
        result = run(article.read_text(encoding="utf-8"), settings)
    except Exception as exc:  # message clair plutôt qu'une trace brute
        print(f"\n✗ Une erreur est survenue : {exc}", file=sys.stderr)
        print("  Vérifiez votre clé API et votre connexion, puis relancez.",
              file=sys.stderr)
        return 1

    print("\n" + "=" * 56)
    print("  ✔ Terminé !")
    print(f"  Vidéo   : {result.video_path}")
    print(f"  Légende : {result.caption_path}")
    print(f"  Durée   : {result.duration_seconds}s")
    print("=" * 56)
    open_folder(out_dir)
    if os.name != "nt":
        input("\nAppuyez sur Entrée pour fermer.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
