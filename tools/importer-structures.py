#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convertit un export de structures simulées vers le format plat du
comparateur (observatoire/data/structures-simulees.csv).

    python3 tools/importer-structures.py <fichier.csv>

Le fichier d'entrée est celui produit par l'outil de simulation : séparateur
point-virgule, une ligne par structure, statut « FICTIF – NON COTÉ –
SIMULATION ». Aucune de ces lignes ne porte d'ISIN : elles restent donc des
gabarits pédagogiques pour le site, jamais des offres réelles.

La note sur cinq n'est pas reprise du fichier — il n'en porte pas — ni
inventée : elle est calculée à partir de la grille publiée sur la page
Méthodologie du site. Le critère « transparence des coûts » (5 %) n'est pas
calculable faute de données de frais ; les cinq autres sont renormalisés.
"""
import csv
import os
import re
import sys
import unicodedata

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, "observatoire", "data", "structures-simulees.csv")

COLONNES = [
    "isin", "nom", "famille", "emetteur", "emetteur_rating", "format",
    "sous_jacent", "sous_jacent_detail", "sj_type", "devise",
    "coupon", "frequence", "b_coupon", "b_capital", "b_autocall", "decrement",
    "non_call", "maturite", "memoire", "sri", "frais", "enveloppes",
    "statut", "date_strike", "date_fin", "nominal_min",
    "doc_dic", "doc_termsheet",
    "mecanisme", "sc_fav", "sc_med", "sc_def", "attention", "tags", "note",
]

# --------------------------------------------------------------------------
#  Correspondances vers le vocabulaire du site
# --------------------------------------------------------------------------
# Les émetteurs sont désignés dans l'export sous des formes abrégées ; le site
# les nomme comme la fiche de l'onglet « Les acteurs ».
EMETTEURS = {
    "santander": "Banco Santander",
    "citi": "Citigroup",
    "jp morgan": "J.P. Morgan",
    "j.p. morgan": "J.P. Morgan",
    "credit agricole cib": "Crédit Agricole CIB",
    "societe generale": "Société Générale",
    "credit mutuel": "Crédit Mutuel / CIC",
    "cic": "Crédit Mutuel / CIC",
}

# sj_type du site : ce sont ces valeurs qui alimentent le filtre.
SJ_TYPE = {
    "action unique": "Action",
    "worst-of actions": "Panier Worst-of",
    "worst-of indices": "Panier Worst-of",
    "indice unique": "Indice actions",
    "indice à décrément fictif": "Indice actions",
}

ENVELOPPES = "Assurance-vie|Compte-titres"
FORMAT = "EMTN senior non garanti"
FRAIS = "Frais de structuration et de distribution non communiqués par la simulation"


def sans_accent(s):
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn").lower().strip()


def nombre(v):
    v = (v or "").strip().replace(" ", "").replace(" ", "").replace("%", "")
    v = v.replace(",", ".")
    if not v or v.upper() == "N/A":
        return None
    try:
        return float(v)
    except ValueError:
        return None


def entier(v):
    x = nombre(v)
    return int(x) if x is not None else None


def oui(v):
    return (v or "").strip().lower() in ("oui", "yes", "1", "true", "vrai", "x")


def emetteur_site(brut):
    cle = sans_accent(brut)
    return EMETTEURS.get(cle, brut.strip())


def famille_site(type_produit, memoire):
    t = sans_accent(type_produit)
    if t.startswith("athena"):
        return "Athéna"
    if t.startswith("phoenix"):
        return "Phoenix à coupon mémoire" if memoire else "Autocall Phoenix"
    return type_produit.strip()


def sj_type_site(brut):
    return SJ_TYPE.get(sans_accent(brut), "Indice actions")


# --------------------------------------------------------------------------
#  Notation — grille publiée sur la page Méthodologie
# --------------------------------------------------------------------------
# Poids officiels : sous-jacent 25, signature 20, protection 20,
# lisibilité 15, rendement/risque 15, transparence des coûts 5.
# La transparence des coûts n'est pas calculable ici ; les cinq autres
# critères sont renormalisés sur 95.
POIDS = {"sj": 25, "signature": 20, "protection": 20, "lisibilite": 15, "rr": 15}

# Notation senior de l'entité émettrice, telle qu'affichée dans l'onglet
# « Les acteurs ». Seule la première des trois agences est utilisée ici.
SIGNATURE = {
    "J.P. Morgan": 0.95, "Bank of America": 0.90, "Citigroup": 0.80,
    "Goldman Sachs": 0.85, "Morgan Stanley": 0.85, "HSBC": 0.90,
    "Barclays": 0.80, "BNP Paribas": 0.95, "Crédit Agricole CIB": 0.95,
    "Société Générale": 0.80, "Natixis": 0.85, "Deutsche Bank": 0.75,
    "UBS": 0.90, "Vontobel": 0.80, "Leonteq": 0.65, "Nomura": 0.75,
    "Banco Santander": 0.85, "BBVA": 0.85, "ING": 0.90,
    "UniCredit": 0.70, "Intesa Sanpaolo": 0.70, "Crédit Mutuel / CIC": 0.90,
}


def note_sous_jacent(sj_brut, decrement):
    t = sans_accent(sj_brut)
    if "decrement" in t:
        # Un décrément n'est pas disqualifiant : c'est son niveau qui décide.
        return max(0.30, 1.0 - min(0.60, (decrement or 0) / 5.0))
    if t == "indice unique":
        return 1.00
    if t == "action unique":
        return 0.75
    if t == "worst-of indices":
        return 0.55
    return 0.40                       # worst-of d'actions : le plus exigeant


def note_protection(b_capital):
    """Une barrière profonde vaut mieux qu'un coupon élevé : 50 % et en
    dessous obtient le maximum, 80 % et au-dessus le minimum."""
    if b_capital is None:
        return 1.00                   # capital protégé
    return max(0.0, min(1.0, (0.80 - b_capital) / 0.30))


def note_lisibilite(sj_brut, decrement, degressivite, devise):
    t = sans_accent(sj_brut)
    s = 1.0
    if "worst-of" in t:
        s -= 0.25
    if decrement:
        s -= 0.20
    if degressivite:
        s -= 0.15
    if (devise or "EUR").upper() != "EUR":
        s -= 0.10
    return max(0.0, s)


def notes_rendement_risque(lignes):
    """Coupon rapporté à ce que l'on obtient au même moment, à barrières et
    maturité comparables : rang du coupon au sein de son groupe."""
    groupes = {}
    for i, r in enumerate(lignes):
        cle = (r["_famille"], r["_maturite"], round((r["_b_capital"] or 1.0) * 10))
        groupes.setdefault(cle, []).append((r["_coupon"] or 0, i))
    scores = [0.5] * len(lignes)
    for membres in groupes.values():
        membres.sort()
        n = len(membres)
        for rang, (_, i) in enumerate(membres):
            scores[i] = 0.5 if n == 1 else rang / (n - 1)
    return scores


def note_finale(composantes):
    total = sum(POIDS[k] * composantes[k] for k in POIDS)
    return max(1, min(5, round(total / sum(POIDS.values()) * 5)))


# --------------------------------------------------------------------------
#  Rédaction des fiches
# --------------------------------------------------------------------------
def pct(x, suffixe=" %"):
    if x is None:
        return "—"
    s = f"{x:.2f}".rstrip("0").rstrip(".")
    return s.replace(".", ",") + suffixe


def mecanisme(r):
    bits = []
    bits.append(
        f"Constatation {r['_frequence'].lower()} sur {r['_sous_jacent']}"
        + (", indice à décrément" if r["_decrement"] else "") + ".")
    if r["_b_coupon"] is not None:
        bits.append(
            f"Coupon de {pct(r['_coupon'])} par an versé si le sous-jacent "
            f"clôture au-dessus de {pct(r['_b_coupon'] * 100)} de son niveau initial"
            + (", avec effet mémoire" if r["_memoire"] else "") + ".")
    else:
        bits.append(
            f"Gain de {pct(r['_coupon'])} par année écoulée, capitalisé et "
            "versé en une fois au rappel ou à l’échéance.")
    rappel = (f"Rappel automatique au-dessus de {pct(r['_b_autocall'] * 100)} "
              f"du niveau initial, à partir du {r['_non_call']}e mois")
    if r["_degressivite"]:
        rappel += (f", seuil abaissé de {pct(r['_degressivite'], ' point')} par an "
                   f"jusqu’à {pct(r['_plancher'])}")
    bits.append(rappel + ".")
    if r["_b_capital"] is None:
        bits.append("Capital remboursé intégralement à l’échéance.")
    else:
        bits.append(
            f"À l’échéance, capital remboursé intégralement si le sous-jacent "
            f"est au-dessus de {pct(r['_b_capital'] * 100)} ; en dessous, "
            "l’investisseur subit la totalité de la baisse.")
    return " ".join(bits)


def scenarios(r):
    c = r["_coupon"] or 0
    an = max(1, (r["_non_call"] or 12) // 12)
    fav = (f"Rappel dès le {r['_non_call']}e mois : {pct(c * an)} de gain, "
           "capital restitué, produit clôturé.")
    if r["_b_capital"] is None:
        med = ("Aucun rappel : capital remboursé à 100 % à l’échéance, "
               "gains perçus selon les constatations favorables.")
        defa = ("Sous-jacent durablement bas : capital remboursé à 100 %, "
                "mais aucun gain — le placement a immobilisé des fonds sans rendement.")
    else:
        bk = pct(r["_b_capital"] * 100)
        med = (f"Aucun rappel, sous-jacent légèrement au-dessus de {bk} à l’échéance : "
               "capital remboursé à 100 %, gains perçus sur la période.")
        perte = 100 - r["_b_capital"] * 100 + 10
        defa = (f"Sous-jacent à {pct(r['_b_capital'] * 100 - 10)} à l’échéance : "
                f"perte d’environ {pct(perte)} du capital, sans amortisseur.")
    return fav, med, defa


def attention(r):
    a = []
    if r["_b_capital"] is not None:
        a.append(f"La barrière de {pct(r['_b_capital'] * 100)} est constatée uniquement "
                 "à l’échéance : de longs passages sous ce seuil en cours de vie "
                 "n’ont pas de conséquence définitive, mais le niveau du dernier "
                 "jour décide de tout.")
    if "worst-of" in sans_accent(r["_sj_brut"]):
        a.append("La formule retient le sous-jacent le moins performant du panier : "
                 "la probabilité de toucher la barrière est nettement supérieure à "
                 "celle d’un sous-jacent unique, à barrière égale.")
    if r["_decrement"]:
        a.append(f"L’indice retranche {pct(r['_decrement'])} par an, prélèvement "
                 "forfaitaire indépendant des dividendes réellement versés : "
                 "l’écart avec l’indice de référence se creuse si le prélèvement "
                 "excède le dividende réel du panier.")
    if r["_degressivite"]:
        a.append(f"Le seuil de rappel baisse de {pct(r['_degressivite'], ' point')} "
                 "par an : le produit est rappelé plus facilement avec le temps, "
                 "ce qui écourte la période de versement des coupons.")
    if (r["_devise"] or "EUR").upper() != "EUR":
        a.append(f"Le produit est libellé en {r['_devise']} sans couverture de change : "
                 "le résultat dépend aussi du cours de cette devise contre l’euro.")
    a.append("Structure simulée à titre pédagogique : ni offre, ni recommandation, "
             "ni engagement d’un émetteur.")
    return a


# --------------------------------------------------------------------------
def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    source = sys.argv[1]
    if not os.path.exists(source):
        sys.exit(f"Fichier introuvable : {source}")

    with open(source, encoding="utf-8-sig", newline="") as f:
        brut = list(csv.DictReader(f, delimiter=";"))
    if not brut:
        sys.exit("Fichier vide.")

    lignes, ignorees = [], 0
    for r in brut:
        nom_sj = (r.get("Sous-jacent(s)") or "").strip()
        coupon = nombre(r.get("Coupon annuel (%)"))
        maturite = entier(r.get("Maturité (années)"))
        emetteur = emetteur_site(r.get("Émetteur (simulation)") or "")
        if not (nom_sj and coupon and maturite and emetteur):
            ignorees += 1
            continue
        memoire = oui(r.get("Effet mémoire"))
        decrement = nombre(r.get("Décrément annuel (%)")) or 0
        lignes.append({
            "_id": (r.get("ID") or "").strip(),
            "_sous_jacent": nom_sj,
            "_sj_brut": (r.get("Type de sous-jacent") or "").strip(),
            "_secteur": (r.get("Secteur / thématique") or "").strip(),
            "_emetteur": emetteur,
            "_famille": famille_site(r.get("Type de produit") or "", memoire),
            "_devise": (r.get("Devise") or "EUR").strip(),
            "_coupon": coupon,
            "_frequence": (r.get("Fréquence de constatation") or "").strip(),
            "_memoire": memoire,
            "_maturite": maturite,
            "_non_call": entier(r.get("Premier rappel (mois)")) or 12,
            "_b_autocall": (nombre(r.get("Barrière de rappel initiale (%)")) or 100) / 100,
            "_degressivite": nombre(r.get("Dégressivité annuelle (points de %)")) or 0,
            "_plancher": nombre(r.get("Plancher de rappel (%)")),
            "_b_coupon": (nombre(r.get("Barrière de coupon (%)")) or 0) / 100
                         if nombre(r.get("Barrière de coupon (%)")) else None,
            "_b_capital": (nombre(r.get("Barrière de protection du capital (%)")) or 0) / 100
                          if nombre(r.get("Barrière de protection du capital (%)")) else None,
            "_decrement": decrement,
            "_strike": (r.get("Date de strike simulée") or "").strip(),
            "_fin": (r.get("Date de maturité simulée") or "").strip(),
            "_nominal": (r.get("Nominal minimum") or "").strip(),
        })

    rr = notes_rendement_risque(lignes)

    sorties = []
    for i, r in enumerate(lignes):
        note = note_finale({
            "sj": note_sous_jacent(r["_sj_brut"], r["_decrement"]),
            "signature": SIGNATURE.get(r["_emetteur"], 0.70),
            "protection": note_protection(r["_b_capital"]),
            "lisibilite": note_lisibilite(r["_sj_brut"], r["_decrement"],
                                          r["_degressivite"], r["_devise"]),
            "rr": rr[i],
        })
        fav, med, defa = scenarios(r)
        nominal = r["_nominal"]
        if nominal.isdigit():
            nominal = f"{int(nominal):,}".replace(",", " ") + " " + r["_devise"]

        sorties.append({
            "isin": "",                       # aucune souche réelle : pas d'ISIN
            "nom": f"{r['_famille']} {r['_maturite']} ans — {r['_sous_jacent']}",
            "famille": r["_famille"],
            "emetteur": r["_emetteur"],
            "emetteur_rating": "",
            "format": FORMAT,
            "sous_jacent": r["_sous_jacent"],
            "sous_jacent_detail": r["_sous_jacent"]
                + (f" — indice à décrément de {pct(r['_decrement'])} par an"
                   if r["_decrement"] else "")
                + (f" · {r['_secteur']}" if r["_secteur"] else ""),
            "sj_type": sj_type_site(r["_sj_brut"]),
            "devise": r["_devise"],
            "coupon": f"{r['_coupon'] / 100:.5f}",
            "frequence": r["_frequence"],
            "b_coupon": f"{r['_b_coupon']:.4f}" if r["_b_coupon"] is not None else "",
            "b_capital": f"{r['_b_capital']:.4f}" if r["_b_capital"] is not None else "",
            "b_autocall": f"{r['_b_autocall']:.4f}",
            "decrement": f"{r['_degressivite'] / 100:.4f}" if r["_degressivite"] else "",
            "non_call": str(r["_non_call"]),
            "maturite": str(r["_maturite"]),
            "memoire": "oui" if r["_memoire"] else "",
            "sri": "6",
            "frais": FRAIS,
            "enveloppes": ENVELOPPES,
            "statut": "Indice décrément" if r["_decrement"] else "Indice public",
            "date_strike": r["_strike"],
            "date_fin": r["_fin"],
            "nominal_min": nominal,
            "doc_dic": "",
            "doc_termsheet": "",
            "mecanisme": mecanisme(r),
            "sc_fav": fav,
            "sc_med": med,
            "sc_def": defa,
            "attention": "|".join(attention(r)),
            "tags": "Simulation",
            "note": str(note),
        })

    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with open(SORTIE, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLONNES)
        w.writeheader()
        w.writerows(sorties)

    import collections
    notes = collections.Counter(int(s["note"]) for s in sorties)
    print(f"{len(sorties)} structures → {os.path.relpath(SORTIE, RACINE)}")
    if ignorees:
        print(f"  {ignorees} ligne(s) ignorée(s) : colonnes obligatoires vides")
    print("  familles   :", dict(collections.Counter(s["famille"] for s in sorties)))
    print("  notes      :", {k: notes[k] for k in sorted(notes)})
    print("  décréments :", sum(1 for s in sorties if s["statut"] == "Indice décrément"))
    print("\nRelancez ensuite : python3 build-observatoire.py")


if __name__ == "__main__":
    main()
