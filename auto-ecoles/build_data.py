#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère les données du site « Permis Boussole ».

Sources (réelles, embarquées dans data/) :
  - data/villes_data.sql ....... TOUTES les communes de France métropolitaine
                                 (nom, département, coordonnées GPS, population).
                                 Source : ggouv/Villes-de-France (GitHub).
  - data/departements.geojson .. contours des départements (france-geojson,
                                 gregoiredavid), version simplifiée — pour la carte.

Sorties :
  - assets/js/departements.js .. window.FRANCE_DEPARTEMENTS_GEO + window.DEPARTEMENTS
  - assets/js/communes.js ...... window.COMMUNES (toutes les villes réelles)
  - assets/js/data.js .......... window.AUTO_ECOLES (annuaire des auto-écoles)

Données auto-écoles
-------------------
Le taux de réussite par établissement et le nombre de présentés au permis B
proviennent normalement du jeu ouvert officiel de la Sécurité routière
(DSR / Ministère de l'Intérieur), publié sur data.gouv.fr. Si le fichier
officiel est fourni dans data/auto-ecoles_officiel.csv (colonnes :
nom, ville, dep, adresse, presentes, taux), il est utilisé tel quel.
Sinon, un annuaire *représentatif* est généré de façon déterministe et ancré
sur les vraies communes (noms, coordonnées, population réels) ; les chiffres
de réussite sont alors estimés et clairement signalés comme tels dans le site.

Usage :  python3 build_data.py
"""
import csv
import io
import json
import os
import random
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SQL = os.path.join(HERE, "data", "villes_data.sql")
GEOJSON = os.path.join(HERE, "data", "departements.geojson")
OFFICIAL = os.path.join(HERE, "data", "auto-ecoles_officiel.csv")
OUT_GEO = os.path.join(HERE, "assets", "js", "departements.js")
OUT_COMMUNES = os.path.join(HERE, "assets", "js", "communes.js")
OUT_DATA = os.path.join(HERE, "assets", "js", "data.js")

random.seed(20260627)
POP_MIN_SCHOOL = 1500     # population mini d'une commune pour héberger une auto-école
SCHOOL_DIVISOR = 9000     # ~1 auto-école par tranche de population


# ---------------------------------------------------------------------------
def norm_dep(dep):
    """ '1' -> '01', '2A'/'2B' conservés, DOM (>96) écartés plus tard. """
    dep = dep.strip().upper()
    if dep in ("2A", "2B"):
        return dep
    if dep.isdigit():
        return dep.zfill(2)
    return dep


def load_communes():
    sql = open(SQL, encoding="utf-8", errors="replace").read()
    values = sql.split("VALUES", 1)[1]
    rows = re.findall(r"\(([^()]*)\)", values)
    out = []
    seen = set()
    for r in rows:
        try:
            p = next(csv.reader(io.StringIO(r), quotechar="'", skipinitialspace=True))
        except Exception:
            continue
        if len(p) < 11:
            continue
        cp, insee, article, ville, libelle, region, dep, lat, lon, hab, dens = p[:11]
        dep = norm_dep(dep)
        try:
            lat = float(lat); lon = float(lon); pop = int(hab or 0)
        except ValueError:
            continue
        ville = ville.strip()
        if not ville:
            continue
        # recompose le nom complet avec l'article (« La Rochelle », « Le Touquet-Paris-Plage »)
        article = article.strip()
        if article == "L'":
            ville = "L'" + ville
        elif article:
            ville = article + " " + ville
        key = insee.strip()
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "insee": insee.strip(),
            "ville": ville.strip(),
            "dep": dep,
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "pop": pop,
        })
    return out


# ---------------------------------------------------------------------------
NAME_TEMPLATES = [
    "Auto-École {city}", "{city} Conduite", "CER {city}", "ECF {city}",
    "Permis {city}", "Conduite {city}", "Auto-École du Centre",
    "Auto-École de la Gare", "Auto-École de la Mairie", "Auto-École de la Poste",
    "Élite Conduite", "Top Permis", "Première Conduite", "Avenir Conduite",
    "Cap Permis", "Conduite Académie", "Drive Académie", "Objectif Permis",
    "Auto-École Saint-Christophe", "Pilote Formation", "Volant d'Or",
    "Auto-École de l'Avenue", "Auto-École des Écoles", "Feu Vert Conduite",
    "Auto-École Liberté", "Auto-École Horizon", "Permis Express",
    "Auto-École Centrale", "Auto-École Moderne", "Conduite Plus",
]
STREETS = [
    "rue de la République", "avenue Jean Jaurès", "place du Marché",
    "boulevard Gambetta", "rue Victor Hugo", "avenue de la Gare",
    "cours Léon Blum", "rue Nationale", "place de la Liberté",
    "avenue du Général de Gaulle", "rue Pasteur", "boulevard Carnot",
    "rue de Verdun", "avenue de la Libération", "rue Voltaire",
    "place de l'Hôtel de Ville", "rue des Écoles", "avenue Foch",
    "rue Jean Moulin", "boulevard de la Marne", "rue du Commerce",
]


def n_schools(pop):
    n = round(pop / SCHOOL_DIVISOR)
    return max(1, min(int(n), 25))


def gen_school(sid, commune, idx, n, used):
    city = commune["ville"]
    tpl = NAME_TEMPLATES[(sid * 7 + idx * 13) % len(NAME_TEMPLATES)]
    name = tpl.format(city=city)
    if (name, city) in used:
        name = name + " " + str(idx + 1)
    used.add((name, city))
    rate = max(28, min(92, random.gauss(58, 11)))
    base = max(8, commune["pop"] / (n * 90.0))
    presented = int(max(10, random.gauss(base, base * 0.4)))
    num = random.randint(1, 180)
    street = random.choice(STREETS)
    return {
        "id": sid,
        "nom": name,
        "ville": city,
        "dep": commune["dep"],
        "adresse": str(num) + " " + street + ", " + city,
        "taux": round(rate, 1),
        "presentes": presented,
        "lat": round(commune["lat"] + random.uniform(-0.012, 0.012), 4),
        "lon": round(commune["lon"] + random.uniform(-0.016, 0.016), 4),
    }


def generate_schools(communes):
    schools = []
    used = set()
    sid = 0
    for c in communes:
        if c["pop"] < POP_MIN_SCHOOL:
            continue
        n = n_schools(c["pop"])
        for i in range(n):
            sid += 1
            schools.append(gen_school(sid, c, i, n, used))
    return schools, False  # estimated=True meaning "not official"


def load_official():
    """ Charge un CSV officiel s'il existe (colonnes nom,ville,dep,adresse,presentes,taux). """
    if not os.path.exists(OFFICIAL):
        return None
    out = []
    with open(OFFICIAL, encoding="utf-8") as fh:
        for sid, row in enumerate(csv.DictReader(fh), 1):
            out.append({
                "id": sid,
                "nom": row["nom"].strip(),
                "ville": row["ville"].strip(),
                "dep": norm_dep(row["dep"]),
                "adresse": row.get("adresse", "").strip(),
                "taux": round(float(row["taux"]), 1),
                "presentes": int(float(row["presentes"])),
                "lat": float(row["lat"]) if row.get("lat") else None,
                "lon": float(row["lon"]) if row.get("lon") else None,
            })
    return out


# ---------------------------------------------------------------------------
def write_js(path, header, assignments):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(header)
        for var, value in assignments:
            fh.write(var + " = ")
            json.dump(value, fh, ensure_ascii=False, separators=(",", ":"))
            fh.write(";\n")


def main():
    # ---- départements (carte) ----
    geo = json.load(open(GEOJSON, encoding="utf-8"))
    deps_meta = sorted(
        ({"code": f["properties"]["code"], "nom": f["properties"]["nom"]}
         for f in geo["features"]),
        key=lambda d: d["code"],
    )
    valid_deps = set(d["code"] for d in deps_meta)

    write_js(
        OUT_GEO,
        "// Carte des départements — source : france-geojson (gregoiredavid), simplifiée.\n",
        [("window.FRANCE_DEPARTEMENTS_GEO", geo), ("window.DEPARTEMENTS", deps_meta)],
    )

    # ---- communes (toutes les villes réelles, métropole) ----
    communes = [c for c in load_communes() if c["dep"] in valid_deps]
    communes.sort(key=lambda c: (-c["pop"], c["ville"]))
    # encodage compact en colonnes : [ville, dep, lat, lon, pop]
    communes_packed = [[c["ville"], c["dep"], c["lat"], c["lon"], c["pop"]] for c in communes]
    write_js(
        OUT_COMMUNES,
        "// Communes de France métropolitaine — source : ggouv/Villes-de-France (GitHub).\n"
        "// Format compact : window.COMMUNES = [[ville, dep, lat, lon, pop], ...]\n",
        [("window.COMMUNES", communes_packed)],
    )

    # ---- auto-écoles ----
    official = load_official()
    if official is not None:
        schools = official
        is_official = True
    else:
        schools, _ = generate_schools(communes)
        is_official = False

    # encodage compact : [nom, ville, dep, adresse, taux, presentes, lat, lon]
    schools_packed = [[s["nom"], s["ville"], s["dep"], s["adresse"],
                       s["taux"], s["presentes"], s["lat"], s["lon"]] for s in schools]
    write_js(
        OUT_DATA,
        "// Annuaire des auto-écoles. NE PAS éditer à la main (régénéré par build_data.py).\n"
        "// Format compact : window.AUTO_ECOLES = [[nom, ville, dep, adresse, taux, presentes, lat, lon], ...]\n",
        [("window.AUTO_ECOLES", schools_packed),
         ("window.AUTO_ECOLES_OFFICIEL", is_official)],
    )

    # ---- stats ----
    deps_used = sorted({s["dep"] for s in schools})
    avg = sum(s["taux"] for s in schools) / len(schools)
    tot = sum(s["presentes"] for s in schools)
    print("Départements (carte)     :", len(deps_meta))
    print("Communes (toutes villes) :", len(communes))
    print("Auto-écoles              :", len(schools), "(officiel)" if is_official else "(représentatif)")
    print("Départements couverts    :", len(deps_used))
    print("Taux moyen               : %.1f %%" % avg)
    print("Présentés (total)        :", tot)


if __name__ == "__main__":
    main()
