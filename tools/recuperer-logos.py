#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Récupère les logos des émetteurs depuis Wikimedia Commons.

    python3 tools/recuperer-logos.py

NE TÉLÉCHARGE QUE CE QUI EST LIBRE DE DROITS. Chaque fichier candidat est
interrogé pour sa licence ; seuls le domaine public et les licences Creative
Commons sont retenus. Un logo sous licence non libre est ignoré : la fiche
émetteur garde alors sa plaque typographique.

Un rapport est écrit dans observatoire/assets/logos/SOURCES.txt, avec pour
chaque logo sa licence, son auteur et sa page d'origine — nécessaire pour
les licences qui imposent l'attribution.

⚠️ Un logo reste une marque déposée, même quand l'œuvre graphique est libre.
Son usage ici est nominatif : il désigne l'émetteur dont il est question.
C'est généralement admis, mais la décision de publier vous appartient.
"""
import json, os, re, sys, time, unicodedata
from urllib.request import urlopen, Request
from urllib.parse import urlencode

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(RACINE, "observatoire", "assets", "logos")
API = "https://commons.wikimedia.org/w/api.php"
UA = "LeComptoirDesStructures/1.0 (site institutionnel; https://commons.wikimedia.org/)"

# Nom affiché -> requêtes de recherche, de la plus précise à la plus large.
EMETTEURS = {
    "BNP Paribas":        ["BNP Paribas logo.svg", "BNP Paribas logo"],
    "Société Générale":   ["Societe Generale logo.svg", "Societe Generale logo"],
    "Crédit Agricole CIB":["Credit Agricole logo.svg", "Credit Agricole CIB logo"],
    "Natixis":            ["Natixis logo.svg", "Natixis logo"],
    "Crédit Mutuel / CIC":["Credit Mutuel logo.svg", "Credit Mutuel logo"],
    "Goldman Sachs":      ["Goldman Sachs.svg", "Goldman Sachs logo"],
    "J.P. Morgan":        ["J P Morgan Logo 2008.svg", "JPMorgan Chase logo"],
    "Morgan Stanley":     ["Morgan Stanley Logo 1.svg", "Morgan Stanley logo"],
    "Citigroup":          ["Citi.svg", "Citigroup logo"],
    "Bank of America":    ["Bank of America logo.svg", "Bank of America logo"],
    "Barclays":           ["Barclays logo.svg", "Barclays logo"],
    "HSBC":               ["HSBC logo (2018).svg", "HSBC logo"],
    "UBS":                ["UBS Logo.svg", "UBS logo"],
    "Deutsche Bank":      ["Deutsche Bank logo without wordmark.svg", "Deutsche Bank logo"],
    "UniCredit":          ["UniCredit logo.svg", "UniCredit logo"],
    "Intesa Sanpaolo":    ["Intesa Sanpaolo logo.svg", "Intesa Sanpaolo logo"],
    "Banco Santander":    ["Banco Santander Logotipo.svg", "Banco Santander logo"],
    "BBVA":               ["BBVA 2019.svg", "BBVA logo"],
    "ING":                ["ING Group N.V. Logo.svg", "ING Group logo"],
    "Leonteq":            ["Leonteq logo.svg", "Leonteq"],
    "Vontobel":           ["Vontobel logo.svg", "Vontobel"],
    "Nomura":             ["Nomura Holdings logo.svg", "Nomura Holdings"],
}

LIBRE = re.compile(r"public domain|^pd|^cc[ -]|creative commons|cc0", re.I)

def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return "-".join(re.findall(r"[a-z0-9]+", s))

PAUSE = 8          # secondes entre deux requêtes
ESSAIS = 4         # réessais sur 429, avec attente croissante

def _get(url, binaire=False):
    """Requête avec réessais : Wikimedia limite fortement les IP partagées."""
    attente = PAUSE
    for n in range(ESSAIS):
        try:
            req = Request(url, headers={"User-Agent": UA})
            with urlopen(req, timeout=35) as r:
                return r.read() if binaire else json.load(r)
        except Exception as ex:
            if "429" not in str(ex) or n == ESSAIS - 1:
                raise
            print(f"      (saturé, nouvelle tentative dans {attente} s)")
            time.sleep(attente)
            attente *= 2
    raise RuntimeError("inatteignable")

def api(params):
    return _get(API + "?" + urlencode({**params, "format": "json"}))

def candidats(requete):
    """Fichiers correspondants, les plus pertinents d'abord."""
    try:
        d = api({"action": "query", "generator": "search", "gsrsearch": requete,
                 "gsrnamespace": 6, "gsrlimit": 6,
                 "prop": "imageinfo", "iiprop": "url|mime|size|extmetadata"})
    except Exception as e:
        print(f"      (recherche impossible : {e})")
        return []
    pages = (d.get("query") or {}).get("pages") or {}
    out = []
    for v in pages.values():
        ii = (v.get("imageinfo") or [{}])[0]
        if not ii.get("url"):
            continue
        em = ii.get("extmetadata", {})
        out.append({
            "titre": v.get("title", ""),
            "url": ii["url"].split("?")[0],
            "mime": ii.get("mime", ""),
            "licence": em.get("LicenseShortName", {}).get("value", "?"),
            "auteur": re.sub(r"<[^>]+>", "", em.get("Artist", {}).get("value", "") or "").strip()[:60],
            "page": em.get("Credit", {}).get("value", ""),
        })
    out.sort(key=lambda c: (c["mime"] != "image/svg+xml",))
    return out

def main():
    os.makedirs(DEST, exist_ok=True)
    pris, refuses, absents, rapport = [], [], [], []
    for nom, requetes in EMETTEURS.items():
        s = slug(nom)
        deja = [e for e in (".svg", ".png") if os.path.exists(os.path.join(DEST, s + e))]
        if deja:
            print(f"  {nom} — déjà présent ({s}{deja[0]})")
            pris.append(nom)
            continue
        print(f"  {nom}")
        choisi = None
        for req in requetes:
            for c in candidats(req):
                if not LIBRE.search(c["licence"]):
                    refuses.append((nom, c["titre"], c["licence"]))
                    continue
                if c["mime"] not in ("image/svg+xml", "image/png"):
                    continue
                choisi = c
                break
            if choisi:
                break
            time.sleep(PAUSE)
        if not choisi:
            print("      aucun fichier librement réutilisable — plaque typographique conservée")
            absents.append(nom)
            time.sleep(PAUSE)
            continue
        ext = ".svg" if choisi["mime"] == "image/svg+xml" else ".png"
        dest = os.path.join(DEST, s + ext)
        try:
            data = _get(choisi["url"], binaire=True)
            if len(data) < 200:
                raise ValueError("fichier vide")
            with open(dest, "wb") as f:
                f.write(data)
        except Exception as e:
            print(f"      téléchargement impossible : {e}")
            absents.append(nom)
            time.sleep(PAUSE)
            continue
        print(f"      {s}{ext}  ({choisi['licence']}, {len(data)//1024} Ko)")
        pris.append(nom)
        rapport.append(f"{nom}\n  fichier : {s}{ext}\n  source  : {choisi['titre']}\n"
                       f"  licence : {choisi['licence']}\n  auteur  : {choisi['auteur'] or 'non précisé'}\n")
        time.sleep(PAUSE)

    with open(os.path.join(DEST, "SOURCES.txt"), "w", encoding="utf-8") as f:
        f.write("LOGOS DES ÉMETTEURS — ORIGINE ET LICENCES\n")
        f.write("=========================================\n\n")
        f.write("Téléchargés depuis Wikimedia Commons, en ne retenant que les fichiers\n"
                "en domaine public ou sous licence Creative Commons.\n\n")
        f.write("⚠️ Un logo reste une marque déposée même quand l'œuvre graphique est\n"
                "libre. L'usage fait ici est nominatif : il désigne l'émetteur dont il\n"
                "est question. C'est généralement admis, mais la décision de publier\n"
                "relève de l'éditeur.\n\n")
        f.write("".join(rapport))
        if absents:
            f.write("\nSANS LOGO (plaque typographique conservée)\n")
            for n in absents:
                f.write(f"  · {n}\n")
    print(f"\n  {len(pris)} logos récupérés, {len(absents)} sans fichier libre.")
    print(f"  Licences non libres écartées : {len(refuses)}")
    print(f"  Rapport : observatoire/assets/logos/SOURCES.txt")

if __name__ == "__main__":
    main()
