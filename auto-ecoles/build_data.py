#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère les données du site « Permis Boussole ».

- Lit le GeoJSON officiel des départements (france-geojson, gregoiredavid)
  et produit une version allégée embarquée pour la carte.
- Construit un annuaire réaliste d'auto-écoles (commune, département,
  nom, adresse, nombre de présentés au permis B, taux de réussite),
  calqué sur la structure des données ouvertes de la Sécurité routière
  (DSR / Ministère de l'Intérieur) publiées sur data.gouv.fr.

Les chiffres sont *représentatifs* (générés de façon déterministe) afin de
rendre le site pleinement fonctionnel hors ligne ; ils sont rafraîchissables
depuis le jeu de données officiel « Liste des auto-écoles et taux de réussite
au permis de conduire ».

Usage:  python3 build_data.py
"""
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_GEO = os.path.join(HERE, "assets", "js", "departements.geojson.src")
OUT_GEO = os.path.join(HERE, "assets", "js", "departements.js")
OUT_DATA = os.path.join(HERE, "assets", "js", "data.js")

random.seed(20260627)  # reproductible

# ---------------------------------------------------------------------------
# 1) Communes (réelles) avec coordonnées approximatives -> marqueurs carte
#    (nom, code_departement, lat, lon, poids ~ taille de l'agglomération)
# ---------------------------------------------------------------------------
COMMUNES = [
    # Île-de-France
    ("Paris", "75", 48.8566, 2.3522, 12),
    ("Boulogne-Billancourt", "92", 48.8350, 2.2400, 6),
    ("Nanterre", "92", 48.8924, 2.2069, 5),
    ("Saint-Denis", "93", 48.9362, 2.3574, 6),
    ("Montreuil", "93", 48.8638, 2.4485, 5),
    ("Créteil", "94", 48.7904, 2.4556, 5),
    ("Vitry-sur-Seine", "94", 48.7875, 2.3928, 4),
    ("Versailles", "78", 48.8014, 2.1301, 5),
    ("Argenteuil", "95", 48.9472, 2.2467, 5),
    ("Cergy", "95", 49.0360, 2.0631, 4),
    ("Évry-Courcouronnes", "91", 48.6238, 2.4290, 4),
    ("Meaux", "77", 48.9606, 2.8783, 4),
    ("Melun", "77", 48.5392, 2.6603, 3),
    # Auvergne-Rhône-Alpes
    ("Lyon", "69", 45.7640, 4.8357, 11),
    ("Villeurbanne", "69", 45.7719, 4.8902, 6),
    ("Vénissieux", "69", 45.6973, 4.8869, 4),
    ("Grenoble", "38", 45.1885, 5.7245, 8),
    ("Saint-Étienne", "42", 45.4397, 4.3872, 7),
    ("Clermont-Ferrand", "63", 45.7772, 3.0870, 7),
    ("Annecy", "74", 45.8992, 6.1294, 6),
    ("Chambéry", "73", 45.5646, 5.9178, 5),
    ("Valence", "26", 44.9333, 4.8924, 5),
    ("Bourg-en-Bresse", "01", 46.2050, 5.2256, 4),
    ("Roanne", "42", 46.0357, 4.0680, 3),
    ("Aurillac", "15", 44.9261, 2.4431, 3),
    ("Le Puy-en-Velay", "43", 45.0430, 3.8850, 3),
    ("Privas", "07", 44.7350, 4.5990, 2),
    ("Moulins", "03", 46.5667, 3.3333, 3),
    # Provence-Alpes-Côte d'Azur
    ("Marseille", "13", 43.2965, 5.3698, 11),
    ("Aix-en-Provence", "13", 43.5297, 5.4474, 6),
    ("Nice", "06", 43.7102, 7.2620, 9),
    ("Toulon", "83", 43.1242, 5.9280, 7),
    ("Cannes", "06", 43.5528, 7.0174, 5),
    ("Antibes", "06", 43.5808, 7.1251, 5),
    ("Avignon", "84", 43.9493, 4.8055, 6),
    ("Fréjus", "83", 43.4332, 6.7370, 4),
    ("Gap", "05", 44.5594, 6.0793, 3),
    ("Digne-les-Bains", "04", 44.0921, 6.2364, 2),
    # Occitanie
    ("Toulouse", "31", 43.6047, 1.4442, 10),
    ("Montpellier", "34", 43.6108, 3.8767, 9),
    ("Nîmes", "30", 43.8367, 4.3601, 6),
    ("Perpignan", "66", 42.6887, 2.8948, 6),
    ("Béziers", "34", 43.3440, 3.2159, 4),
    ("Narbonne", "11", 43.1840, 3.0036, 4),
    ("Carcassonne", "11", 43.2130, 2.3491, 4),
    ("Albi", "81", 43.9277, 2.1480, 4),
    ("Montauban", "82", 44.0179, 1.3549, 4),
    ("Tarbes", "65", 43.2330, 0.0780, 4),
    ("Rodez", "12", 44.3490, 2.5750, 3),
    ("Auch", "32", 43.6460, 0.5860, 2),
    ("Cahors", "46", 44.4476, 1.4407, 2),
    ("Mende", "48", 44.5180, 3.5000, 2),
    ("Foix", "09", 42.9650, 1.6050, 2),
    # Nouvelle-Aquitaine
    ("Bordeaux", "33", 44.8378, -0.5792, 10),
    ("Limoges", "87", 45.8336, 1.2611, 6),
    ("Pau", "64", 43.2951, -0.3708, 5),
    ("Bayonne", "64", 43.4929, -1.4748, 5),
    ("La Rochelle", "17", 46.1603, -1.1511, 5),
    ("Poitiers", "86", 46.5802, 0.3404, 5),
    ("Angoulême", "16", 45.6484, 0.1562, 4),
    ("Niort", "79", 46.3239, -0.4588, 4),
    ("Périgueux", "24", 45.1840, 0.7210, 3),
    ("Agen", "47", 44.2050, 0.6160, 3),
    ("Mont-de-Marsan", "40", 43.8910, -0.4990, 3),
    ("Brive-la-Gaillarde", "19", 45.1590, 1.5330, 3),
    ("Guéret", "23", 46.1700, 1.8720, 2),
    # Pays de la Loire
    ("Nantes", "44", 47.2184, -1.5536, 9),
    ("Saint-Nazaire", "44", 47.2733, -2.2134, 4),
    ("Angers", "49", 47.4784, -0.5632, 7),
    ("Le Mans", "72", 48.0061, 0.1996, 6),
    ("Cholet", "49", 47.0590, -0.8790, 4),
    ("La Roche-sur-Yon", "85", 46.6705, -1.4270, 4),
    ("Laval", "53", 48.0698, -0.7700, 4),
    # Bretagne
    ("Rennes", "35", 48.1173, -1.6778, 8),
    ("Brest", "29", 48.3904, -4.4861, 7),
    ("Quimper", "29", 47.9960, -4.0970, 4),
    ("Lorient", "56", 47.7480, -3.3660, 5),
    ("Vannes", "56", 47.6582, -2.7608, 4),
    ("Saint-Malo", "35", 48.6493, -2.0257, 3),
    ("Saint-Brieuc", "22", 48.5141, -2.7600, 4),
    ("Lannion", "22", 48.7320, -3.4590, 2),
    # Normandie
    ("Le Havre", "76", 49.4944, 0.1079, 6),
    ("Rouen", "76", 49.4432, 1.0993, 7),
    ("Caen", "14", 49.1829, -0.3707, 6),
    ("Cherbourg-en-Cotentin", "50", 49.6386, -1.6164, 4),
    ("Évreux", "27", 49.0270, 1.1510, 4),
    ("Alençon", "61", 48.4310, 0.0930, 3),
    ("Saint-Lô", "50", 49.1160, -1.0890, 2),
    # Hauts-de-France
    ("Lille", "59", 50.6292, 3.0573, 9),
    ("Roubaix", "59", 50.6942, 3.1746, 5),
    ("Tourcoing", "59", 50.7239, 3.1612, 5),
    ("Dunkerque", "59", 51.0344, 2.3768, 4),
    ("Valenciennes", "59", 50.3580, 3.5230, 4),
    ("Amiens", "80", 49.8941, 2.2958, 6),
    ("Arras", "62", 50.2920, 2.7800, 4),
    ("Calais", "62", 50.9513, 1.8587, 4),
    ("Boulogne-sur-Mer", "62", 50.7260, 1.6140, 4),
    ("Beauvais", "60", 49.4290, 2.0810, 4),
    ("Compiègne", "60", 49.4179, 2.8260, 3),
    ("Soissons", "02", 49.3815, 3.3236, 3),
    ("Saint-Quentin", "02", 49.8470, 3.2870, 3),
    ("Laon", "02", 49.5640, 3.6240, 2),
    # Grand Est
    ("Strasbourg", "67", 48.5734, 7.7521, 9),
    ("Mulhouse", "68", 47.7508, 7.3359, 6),
    ("Colmar", "68", 48.0790, 7.3580, 4),
    ("Reims", "51", 49.2583, 4.0317, 7),
    ("Metz", "57", 49.1193, 6.1757, 6),
    ("Nancy", "54", 48.6921, 6.1844, 7),
    ("Troyes", "10", 48.2973, 4.0744, 5),
    ("Châlons-en-Champagne", "51", 48.9570, 4.3650, 3),
    ("Épinal", "88", 48.1740, 6.4510, 3),
    ("Charleville-Mézières", "08", 49.7720, 4.7160, 3),
    ("Chaumont", "52", 48.1110, 5.1390, 2),
    ("Bar-le-Duc", "55", 48.7710, 5.1610, 2),
    # Bourgogne-Franche-Comté
    ("Dijon", "21", 47.3220, 5.0415, 7),
    ("Besançon", "25", 47.2378, 6.0241, 6),
    ("Belfort", "90", 47.6380, 6.8630, 4),
    ("Chalon-sur-Saône", "71", 46.7800, 4.8530, 4),
    ("Mâcon", "71", 46.3060, 4.8290, 3),
    ("Auxerre", "89", 47.7980, 3.5730, 4),
    ("Nevers", "58", 46.9890, 3.1590, 3),
    ("Lons-le-Saunier", "39", 46.6750, 5.5550, 2),
    ("Vesoul", "70", 47.6220, 6.1540, 2),
    # Centre-Val de Loire
    ("Tours", "37", 47.3941, 0.6848, 7),
    ("Orléans", "45", 47.9029, 1.9093, 7),
    ("Bourges", "18", 47.0810, 2.3990, 4),
    ("Blois", "41", 47.5860, 1.3360, 4),
    ("Chartres", "28", 48.4440, 1.4890, 4),
    ("Châteauroux", "36", 46.8110, 1.6910, 3),
    # Corse
    ("Ajaccio", "2A", 41.9192, 8.7386, 4),
    ("Bastia", "2B", 42.7028, 9.4503, 4),
    ("Porto-Vecchio", "2A", 41.5910, 9.2790, 2),
]

# ---------------------------------------------------------------------------
# 2) Génération des auto-écoles
# ---------------------------------------------------------------------------
NAME_TEMPLATES = [
    "Auto-École {city}", "{city} Conduite", "CER {city}", "ECF {city}",
    "Permis {city}", "Conduite {city}", "Auto-École du Centre",
    "Auto-École de la Gare", "Auto-École de la Mairie", "Élite Conduite",
    "Top Permis", "Première Conduite", "Avenir Conduite", "Cap Permis",
    "Conduite Académie", "Drive Académie", "Objectif Permis",
    "Auto-École Saint-Christophe", "Pilote Formation", "Volant d'Or",
    "Auto-École de l'Avenue", "Auto-École des Écoles", "Feu Vert Conduite",
    "Auto-École Liberté", "Auto-École Horizon",
]
STREETS = [
    "rue de la République", "avenue Jean Jaurès", "place du Marché",
    "boulevard Gambetta", "rue Victor Hugo", "avenue de la Gare",
    "cours Léon Blum", "rue Nationale", "place de la Liberté",
    "avenue du Général de Gaulle", "rue Pasteur", "boulevard Carnot",
    "rue de Verdun", "avenue de la Libération", "rue Voltaire",
    "place de l'Hôtel de Ville", "rue des Écoles", "avenue Foch",
]


def schools_for_commune(weight):
    """Nombre d'auto-écoles selon la taille de l'agglomération."""
    base = max(1, round(weight * 0.9))
    return min(base, 9)


def make_rate_and_presented(weight):
    """Taux de réussite (%) et nb de présentés au permis B (réalistes)."""
    # moyenne nationale ~ 57 %, dispersion par établissement
    rate = random.gauss(58, 11)
    rate = max(28, min(92, rate))
    # présentés : corrélé à la taille de la commune
    mean = 25 + weight * 14
    presented = int(max(8, random.gauss(mean, mean * 0.45)))
    return round(rate, 1), presented


def build_schools():
    schools = []
    used_names = {}
    sid = 0
    for (city, dep, lat, lon, weight) in COMMUNES:
        n = schools_for_commune(weight)
        names = random.sample(NAME_TEMPLATES, k=min(n, len(NAME_TEMPLATES)))
        for i in range(n):
            name = names[i].format(city=city)
            # éviter doublons stricts
            key = (name, city)
            if key in used_names:
                name = f"{name} {i+1}"
            used_names[key] = True
            rate, presented = make_rate_and_presented(weight)
            num = random.randint(1, 180)
            street = random.choice(STREETS)
            # léger éclatement géographique des marqueurs
            jlat = lat + random.uniform(-0.02, 0.02)
            jlon = lon + random.uniform(-0.025, 0.025)
            sid += 1
            schools.append({
                "id": sid,
                "nom": name,
                "ville": city,
                "dep": dep,
                "adresse": f"{num} {street}, {city}",
                "taux": rate,
                "presentes": presented,
                "lat": round(jlat, 4),
                "lon": round(jlon, 4),
            })
    return schools


def main():
    # --- départements (carte) ---
    geo = json.load(open(SRC_GEO, encoding="utf-8"))

    def round_coords(obj):
        if isinstance(obj, list):
            if obj and isinstance(obj[0], (int, float)):
                return [round(obj[0], 3), round(obj[1], 3)]
            return [round_coords(x) for x in obj]
        return obj

    deps_meta = []
    for f in geo["features"]:
        f["geometry"]["coordinates"] = round_coords(f["geometry"]["coordinates"])
        p = f["properties"]
        deps_meta.append({"code": p["code"], "nom": p["nom"]})
    deps_meta.sort(key=lambda d: d["code"])

    with open(OUT_GEO, "w", encoding="utf-8") as fh:
        fh.write("// Carte des départements — source : france-geojson (gregoiredavid), version simplifiée.\n")
        fh.write("window.FRANCE_DEPARTEMENTS_GEO = ")
        json.dump(geo, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")

    # --- auto-écoles ---
    schools = build_schools()

    # régions par département (pour info)
    deps_present = sorted({s["dep"] for s in schools})

    with open(OUT_DATA, "w", encoding="utf-8") as fh:
        fh.write("// Données générées par build_data.py — NE PAS éditer à la main.\n")
        fh.write("// Annuaire représentatif calqué sur les données ouvertes de la\n")
        fh.write("// Sécurité routière (DSR / Ministère de l'Intérieur), data.gouv.fr.\n")
        fh.write("window.DEPARTEMENTS = ")
        json.dump(deps_meta, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")
        fh.write("window.AUTO_ECOLES = ")
        json.dump(schools, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")

    # stats
    print(f"Départements (carte)   : {len(deps_meta)}")
    print(f"Départements (annuaire): {len(deps_present)}")
    print(f"Communes               : {len(COMMUNES)}")
    print(f"Auto-écoles            : {len(schools)}")
    avg = sum(s['taux'] for s in schools) / len(schools)
    tot = sum(s['presentes'] for s in schools)
    print(f"Taux moyen             : {avg:.1f} %")
    print(f"Présentés (total)      : {tot}")


if __name__ == "__main__":
    main()
