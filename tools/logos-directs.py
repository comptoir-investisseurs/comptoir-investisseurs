#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Récupération ciblée des logos encore manquants.

Variante économe de tools/recuperer-logos.py : au lieu d'interroger le
moteur de recherche de Commons (plusieurs requêtes par émetteur, vite
bloquées par la limitation de débit), on vise un nom de fichier connu et
on ne fait que deux requêtes — la licence, puis la vignette.

    python3 tools/logos-directs.py

Comme l'autre script, ne télécharge que ce qui est en domaine public ou
sous licence Creative Commons, et passe son tour sinon.
"""
import json, os, re, sys, time, unicodedata
from urllib.request import urlopen, Request
from urllib.parse import urlencode, quote

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(RACINE, "observatoire", "assets", "logos")
API = "https://commons.wikimedia.org/w/api.php"
FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/"
UA = "LeComptoirDesStructures/1.0 (site institutionnel)"
PAUSE = 30

# Noms de fichiers visés sur Commons, pour les émetteurs encore sans logo.
CIBLES = {
    "BNP Paribas":         "BNP Paribas logo.svg",
    "Société Générale":    "Société Générale.svg",
    "Natixis":             "Natixis.svg",
    "Crédit Mutuel / CIC": "Crédit Mutuel logo.svg",
    "Morgan Stanley":      "Morgan Stanley Logo 1.svg",
    "Citigroup":           "Citibank.svg",
    "HSBC":                "HSBC logo (2018).svg",
    "UBS":                 "UBS Logo.svg",
    "UniCredit":           "UniCredit logo.svg",
    "Intesa Sanpaolo":     "Intesa Sanpaolo logo.svg",
    "Leonteq":             "Leonteq logo.svg",
    "Vontobel":            "Bank Vontobel logo.svg",
}

LIBRE = re.compile(r"public domain|^pd|^cc[ -]|creative commons|cc0", re.I)

def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return "-".join(re.findall(r"[a-z0-9]+", s))

def get(url, binaire=False, essais=3):
    attente = PAUSE
    for n in range(essais):
        try:
            with urlopen(Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return r.read() if binaire else json.load(r)
        except Exception as ex:
            if "429" not in str(ex) or n == essais - 1:
                raise
            print(f"      saturé, attente {attente} s", flush=True)
            time.sleep(attente); attente += 30
    raise RuntimeError("inatteignable")

def main():
    os.makedirs(DEST, exist_ok=True)
    pris, sans = [], []
    for nom, fichier in CIBLES.items():
        s = slug(nom)
        if any(os.path.exists(os.path.join(DEST, s + e)) for e in (".svg", ".png")):
            print(f"  {nom} — déjà présent", flush=True); continue
        print(f"  {nom}", flush=True)
        try:
            d = get(API + "?" + urlencode({
                "action": "query", "titles": "File:" + fichier,
                "prop": "imageinfo", "iiprop": "url|mime|extmetadata", "format": "json"}))
            pages = (d.get("query") or {}).get("pages") or {}
            info = None
            for v in pages.values():
                if "imageinfo" in v:
                    info = v["imageinfo"][0]
            if not info:
                print("      fichier introuvable sur Commons", flush=True)
                sans.append(nom); time.sleep(PAUSE); continue
            lic = info.get("extmetadata", {}).get("LicenseShortName", {}).get("value", "?")
            if not LIBRE.search(lic):
                print(f"      licence non libre ({lic}) — ignoré", flush=True)
                sans.append(nom); time.sleep(PAUSE); continue
            time.sleep(PAUSE)
            data = get(FILEPATH + quote(fichier) + "?width=400", binaire=True)
            if len(data) < 200:
                raise ValueError("fichier vide")
            ext = ".svg" if data.lstrip()[:5] in (b"<svg ", b"<?xml") else ".png"
            with open(os.path.join(DEST, s + ext), "wb") as f:
                f.write(data)
            print(f"      {s}{ext}  ({lic}, {len(data)//1024} Ko)", flush=True)
            pris.append((nom, s + ext, lic))
        except Exception as ex:
            print(f"      échec : {str(ex)[:70]}", flush=True)
            sans.append(nom)
        time.sleep(PAUSE)

    if pris:
        with open(os.path.join(DEST, "SOURCES.txt"), "a", encoding="utf-8") as f:
            f.write("\n\nSECONDE PASSE\n")
            for nom, fich, lic in pris:
                f.write(f"{nom}\n  fichier : {fich}\n  licence : {lic}\n")
    print(f"\n  {len(pris)} récupérés, {len(sans)} sans fichier libre : {', '.join(sans) or '—'}", flush=True)

if __name__ == "__main__":
    main()
