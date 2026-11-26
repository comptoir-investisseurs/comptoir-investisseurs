#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Récupère les articles publiés depuis Supabase et les dépose dans
`observatoire/data/articles.json`, que build-observatoire.py lit pour
générer les pages statiques.

    python3 tools/articles-sync.py

Aucun identifiant n'est nécessaire : la lecture des articles publiés est
ouverte (politique RLS « lecture publique des articles publies »). La clé
anonyme est relue depuis assets/js/supabase-config.js, pour qu'il n'y ait
qu'un seul endroit à modifier si le projet Supabase change.
"""
import json
import os
import re
import sys
import urllib.request

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(RACINE, "assets", "js", "supabase-config.js")
SORTIE = os.path.join(RACINE, "observatoire", "data", "articles.json")

CHAMPS = ("slug,titre,chapo,corps,meta_title,meta_description,categorie,"
          "auteur,temps_lecture,publie_le,updated_at")


def config():
    """Relit l'URL du projet et la clé anonyme dans la configuration du site."""
    with open(CONFIG, encoding="utf-8") as f:
        texte = f.read()
    def lire(nom):
        m = re.search(nom + r"\s*=\s*'([^']+)'", texte)
        if not m:
            sys.exit(f"{nom} introuvable dans {CONFIG}")
        return m.group(1)
    return lire("SUPABASE_URL"), lire("SUPABASE_ANON_KEY")


def main():
    url, cle = config()
    requete = (f"{url}/rest/v1/lfps_articles?select={CHAMPS}"
               "&statut=eq.publie&order=publie_le.desc")
    req = urllib.request.Request(requete, headers={
        "apikey": cle,
        "Authorization": "Bearer " + cle,
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            articles = json.load(r)
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace")[:400]
        sys.exit(f"Supabase a répondu {err.code} : {detail}\n"
                 "Si le message parle d'une relation absente, exécutez d'abord "
                 "supabase-articles.sql dans le SQL Editor.")
    except OSError as err:
        sys.exit(f"Connexion à Supabase impossible : {err}")

    if not isinstance(articles, list):
        sys.exit(f"Réponse inattendue : {str(articles)[:200]}")

    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with open(SORTIE, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=1)
        f.write("\n")

    print(f"{len(articles)} article(s) publié(s) → "
          f"{os.path.relpath(SORTIE, RACINE)}")
    for a in articles:
        print(f"  · {a.get('publie_le') or '(sans date)'}  {a['slug']}")
    if articles:
        print("\nRelancez ensuite : python3 build-observatoire.py")


if __name__ == "__main__":
    main()
