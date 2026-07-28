# Lecture automatique des documents (relevés & pièces)

La fonction `extract-doc` lit un PDF (relevé d'assureur/banque) ou une photo/PDF
d'une pièce justificative et renvoie des données structurées, en appelant Claude.
La clé API Anthropic reste **côté serveur** : elle n'apparaît jamais dans le
navigateur.

Tant que la fonction n'est pas déployée, le Cockpit continue de fonctionner :
il retombe automatiquement sur la lecture heuristique du PDF et la saisie manuelle.

## 1. Prérequis

- La CLI Supabase : https://supabase.com/docs/guides/cli
- Une clé API Anthropic : https://console.anthropic.com → **API Keys**
  (chaque document lu est facturé à l'usage par Anthropic).

## 2. Déploiement (une seule fois)

Depuis la racine du dépôt :

```bash
# se lier au projet (project-ref visible dans l'URL du dashboard Supabase)
supabase link --project-ref VOTRE_PROJECT_REF

# enregistrer la clé Anthropic comme secret serveur
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# (optionnel) choisir un autre modèle — défaut : claude-opus-5
# supabase secrets set ANTHROPIC_MODEL=claude-sonnet-5

# déployer la fonction
supabase functions deploy extract-doc
```

C'est tout. Rechargez le Cockpit : les boutons **⤓ Importer un relevé** et
**⤓ Lire une pièce** (ainsi que le glisser-déposer sur les deux cartes) passent
automatiquement par l'IA.

## 3. Utilisation

- **Relevé** : bouton « ⤓ Importer un relevé » ou glissez le PDF sur la carte
  « Encours par enveloppe ». L'IA détecte l'enveloppe (type, assureur, n°,
  valorisation) et la liste des supports (libellé, ISIN, classe, montants).
  Une fenêtre de vérification s'ouvre : corrigez si besoin, puis importez.
- **Pièce justificative** : bouton « ⤓ Lire une pièce » ou glissez le PDF/la
  photo sur la carte « Pièces justificatives ». L'IA identifie le type, le
  titulaire, le numéro et les dates (émission / expiration). Le formulaire est
  pré-rempli : vérifiez puis enregistrez.

Tout reste ajustable à la main, et l'ajout manuel d'un contrat ou d'un support
demeure possible.

## 4. Coût & confidentialité

- Le document est transmis à l'API Anthropic uniquement le temps de la lecture.
- Aucune donnée n'est stockée par la fonction ; seule la synthèse structurée
  revient au navigateur, puis dans votre base Supabase si vous enregistrez.
- Modèle par défaut : `claude-opus-5`. Pour réduire le coût, vous pouvez basculer
  sur `claude-sonnet-5` via le secret `ANTHROPIC_MODEL`.
