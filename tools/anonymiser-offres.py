#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Transforme les offres relevées chez un structureur partenaire en GABARITS
PÉDAGOGIQUES anonymisés, destinés au comparateur du Comptoir.

    python3 tools/anonymiser-offres.py

Entrée  : tools/collecte/irbis-produits.json  (relevé brut)
Sortie  : observatoire/data/produits-reels.csv  (catalogue du site)

CE QUE L'ANONYMISATION FAIT, ET POURQUOI
  · Les intitulés commerciaux sont remplacés par une description du
    mécanisme. Les marques d'un structureur ne nous appartiennent pas, et
    un gabarit n'est pas l'offre dont il s'inspire.
  · Les sous-jacents nommément cités (actions, indices propriétaires) sont
    ramenés à leur catégorie.
  · Les coupons sont décalés de quelques dixièmes de point, de façon
    déterministe : un gabarit ne doit pas pouvoir être rapproché d'une
    souche précise.
  · Aucun code ISIN n'est repris.
  · Aucune date de commercialisation n'est reprise : ces gabarits n'ont
    pas de disponibilité, donc rien à afficher d'ancien ou de récent.

CONSÉQUENCE, ASSUMÉE
  Un produit anonymisé et au coupon décalé ne correspond plus à aucune
  souche souscriptible. Il entre donc au catalogue comme « Gabarit de
  référence », jamais comme offre disponible. Pour publier de vraies
  offres, il faut leur ISIN et leur documentation : c'est le rôle des
  colonnes isin / doc_dic / date_fin du même CSV, qui font alors basculer
  la fiche en « Offre réelle ».
"""
import json, re, csv, os, hashlib, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTREE = os.path.join(RACINE, "tools", "collecte", "irbis-produits.json")
SORTIE = os.path.join(RACINE, "observatoire", "data", "produits-reels.csv")

# --- Familles : repérées sur le mécanisme, jamais sur la marque ----------
def famille(nom, dec):
    n = nom.upper()
    if "CLN" in n or "CORPORATE" in n or "CREDIT LINKED" in n:
        return "Credit Linked Note (CLN)"
    if any(k in n for k in ("RANGE ACCRUAL", "EURIBOR", "CMS", "CALLABLE", "TAUX FIXE")):
        return "Produits de taux"
    if "REVERSE" in n:
        return "Reverse Convertible"
    if "GARANTI" in n or "PROTEGE" in n:
        return "Capital protégé ou garanti"
    if "PARTICIPATION" in n or "TRACKER" in n:
        return "Produit de participation"
    if "PHOENIX" in n:
        return "Phoenix à coupon mémoire" if "MEMOIRE" in n else "Autocall Phoenix"
    if "ATHENA" in n or "DEGRESSIF" in n:
        return "Athéna"
    return "Autocall Phoenix"

# --- Sous-jacents : ramenés à leur catégorie -----------------------------
ACTIONS = ("TOTALENERGIES", "SANOFI", "BNP", "CREDIT AGRICOLE", "BBVA", "ASML",
           "AIRBUS", "ENGIE", "AXA", "ORANGE", "VINCI", "STELLANTIS", "SOCIETE GENERALE")

def sous_jacent(nom, dec):
    n = nom.upper()
    nb_actions = sum(1 for a in ACTIONS if a in n)
    if nb_actions >= 2:
        return "Worst-of actions européennes", "Panier Worst-of"
    if nb_actions == 1:
        return "Action européenne de premier rang", "Action"
    for cle, (lib, typ) in {
        "DATACENTER":   ("Indice thématique centres de données", "Indice thématique"),
        "SEMI-CONDUCT": ("Indice thématique semi-conducteurs", "Indice thématique"),
        "IA TECH":      ("Indice thématique technologie", "Indice thématique"),
        "TECH":         ("Indice thématique technologie", "Indice thématique"),
        "PHARMA":       ("Indice sectoriel santé", "Indice sectoriel"),
        "SANTE":        ("Indice sectoriel santé", "Indice sectoriel"),
        "LUXE":         ("Indice sectoriel luxe", "Indice sectoriel"),
        "REAL ESTATE":  ("Indice immobilier coté européen", "Indice sectoriel"),
        "IMMOBILIER":   ("Indice immobilier coté européen", "Indice sectoriel"),
        "BANK":         ("Indice sectoriel bancaire européen", "Indice sectoriel"),
        "GOLD":         ("Or", "Matière première"),
        "OR ":          ("Or", "Matière première"),
        "ENERGI":       ("Indice sectoriel énergie", "Indice sectoriel"),
        "TRANSATLANT":  ("Indice mondial actions", "Indice actions"),
        "MONDE":        ("Indice mondial actions", "Indice actions"),
        "USA":          ("Indice américain", "Indice géographique"),
        "US ":          ("Indice américain", "Indice géographique"),
        "EMERGENT":     ("Indice marchés émergents", "Indice géographique"),
        "FTSE":         ("Indice britannique", "Indice géographique"),
        "FRANCE":       ("Indice français", "Indice actions"),
        "CAC":          ("Indice français", "Indice actions"),
        "EUROZONE":     ("Indice zone euro", "Indice actions"),
        "EUROPE":       ("Indice européen", "Indice actions"),
        "TEC5":         ("Indice thématique technologie", "Indice thématique"),
    }.items():
        if cle in n:
            return lib, typ
    if any(k in n for k in ("CMS", "EURIBOR", "TAUX", "RANGE ACCRUAL", "CALLABLE")):
        return "Taux de référence", "Taux"
    if "CORPORATE" in n or "CLN" in n:
        return "Signature corporate européenne", "Crédit"
    return "Indice européen", "Indice actions"

FREQ = [("QUOTIDIEN", "Quotidienne"), ("MENSUEL", "Mensuelle"),
        ("TRIMESTRIEL", "Trimestrielle"), ("SEMESTRIEL", "Semestrielle"),
        ("ANNUEL", "Annuelle")]

def frequence(nom, fam):
    n = nom.upper()
    for cle, lib in FREQ:
        if cle in n:
            return lib + (" (capitalisé)" if fam == "Athéna" else "")
    if fam == "Athéna":
        return "Annuelle (capitalisé)"
    if fam in ("Produits de taux", "Credit Linked Note (CLN)"):
        return "Annuelle"
    if fam in ("Capital protégé ou garanti", "Produit de participation"):
        return "Aucun coupon"
    return "Trimestrielle"

def decale(valeur, graine):
    """Décalage déterministe de ±0,10 à ±0,45 point : le gabarit ne doit pas
    pouvoir être rapproché d'une souche précise, mais rester réaliste."""
    h = int(hashlib.sha256(graine.encode()).hexdigest()[:8], 16)
    delta = ((h % 36) + 10) / 10000.0          # 0,0010 à 0,0045
    return round(valeur + (delta if h % 2 else -delta), 5)

def main():
    if not os.path.exists(ENTREE):
        sys.exit(f"relevé absent : {ENTREE}")
    brut = json.load(open(ENTREE, encoding="utf-8"))

    lignes, ignores = [], []
    for p in brut:
        nom_src = p.get("nom", "")
        dec = bool(p.get("decrement"))
        fam = famille(nom_src, dec)
        sj, sj_type = sous_jacent(nom_src, dec)

        # durée
        m = re.search(r"(\d+)", p.get("duree", "") or "")
        if not m:
            ignores.append((nom_src, "durée absente")); continue
        maturite = int(m.group(1))

        # coupon
        m = re.search(r"([\d,.]+)\s*%", p.get("rdt", "") or "")
        coupon = None
        if m:
            try:
                coupon = float(m.group(1).replace(",", ".")) / 100
            except ValueError:
                coupon = None
        if coupon is not None and not (0.01 <= coupon <= 0.30):
            ignores.append((nom_src, f"coupon hors plage ({coupon*100:.1f} %)")); continue
        if coupon is not None:
            coupon = decale(coupon, p["ref"])

        # barrière de capital
        b_capital = ""
        m = re.search(r"-(\d+)\s*%", p.get("seuil", "") or "")
        if m:
            b_capital = f"{100 - int(m.group(1))}%"
        elif fam not in ("Produits de taux", "Credit Linked Note (CLN)",
                         "Capital protégé ou garanti"):
            ignores.append((nom_src, "seuil de protection non publié")); continue

        sans_coupon = fam in ("Capital protégé ou garanti", "Produit de participation")
        freq = frequence(nom_src, fam)
        nature = "Indice décrément" if dec else "Indice public"

        lignes.append({
            "isin": "",                       # jamais repris
            "nom": f"{fam} {maturite} ans — {sj}",
            "famille": fam,
            "emetteur": "Émetteur à désigner",
            "emetteur_rating": "",
            "format": "EMTN senior",
            "sous_jacent": sj,
            "sous_jacent_detail": f"{sj} — {nature.lower()}",
            "sj_type": sj_type,
            "devise": "USD" if "USD" in nom_src.upper() else "EUR",
            "coupon": "" if (sans_coupon or coupon is None) else f"{coupon*100:.3f}".rstrip("0").rstrip(".") + "%",
            "frequence": freq,
            "b_coupon": b_capital if (b_capital and not sans_coupon) else "",
            "b_capital": b_capital,
            "b_autocall": "" if fam in ("Produits de taux", "Credit Linked Note (CLN)",
                                        "Capital protégé ou garanti") else "100%",
            "decrement": "", "non_call": "12" if "Autocall" in fam or fam == "Athéna" else "",
            "maturite": str(maturite),
            "memoire": "oui" if "MEMOIRE" in nom_src.upper() else "non",
            "sri": "6", "frais": "",
            "enveloppes": "Assurance-vie|Compte-titres",
            "statut": nature,                 # sert de filtre « Nature du sous-jacent »
            "date_strike": "", "date_fin": "", "nominal_min": "",
            "doc_dic": "", "doc_termsheet": "",
            "mecanisme": "", "sc_fav": "", "sc_med": "", "sc_def": "",
            "attention": "", "tags": nature, "note": "",
        })

    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    cols = list(lignes[0].keys()) if lignes else []
    with open(SORTIE, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(lignes)

    dec = sum(1 for l in lignes if l["statut"] == "Indice décrément")
    print(f"  {len(lignes)} gabarits écrits dans {os.path.relpath(SORTIE, RACINE)}")
    print(f"    indice décrément : {dec}   indice public : {len(lignes) - dec}")
    print(f"  {len(ignores)} écartés :")
    for nom, why in ignores[:8]:
        print(f"    · {nom[:46]:48} {why}")
    if len(ignores) > 8:
        print(f"    … et {len(ignores) - 8} autres")

if __name__ == "__main__":
    main()
