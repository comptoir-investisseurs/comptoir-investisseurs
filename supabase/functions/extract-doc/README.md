# Lecture IA des documents (reportings de contrats & pièces justificatives)

La fonction `extract-doc` lit un PDF (reporting d'assureur/banque) ou une
photo/PDF d'une pièce justificative et renvoie des données structurées, en
appelant une IA. La clé API reste **côté serveur** : elle n'apparaît jamais
dans le navigateur.

Tant que la fonction n'est pas déployée, le Cockpit fonctionne quand même :
il retombe automatiquement sur la lecture locale (pdf.js + OCR) et la saisie
manuelle.

## Choisir le moteur

| Moteur | Secret | Coût | Confidentialité |
|---|---|---|---|
| **Gemini** (défaut) | `GEMINI_API_KEY` | Gratuit (quota) | Documents traités par Google ; l'offre gratuite peut réutiliser les données |
| **Anthropic** | `ANTHROPIC_API_KEY` | Payant à l'usage | Pas de réutilisation des données |

Le moteur est sélectionné par le secret `EXTRACT_PROVIDER` (`gemini` ou
`anthropic`). Par défaut, le premier moteur dont la clé est présente.

## Déploiement (une seule fois)

Prérequis : la CLI Supabase (https://supabase.com/docs/guides/cli).

```bash
supabase link --project-ref VOTRE_PROJECT_REF

# --- Option gratuite : Google Gemini ---
# Clé gratuite : https://aistudio.google.com/apikey
supabase secrets set EXTRACT_PROVIDER=gemini GEMINI_API_KEY=AIza...

# --- Option payante, sans réutilisation des données : Anthropic ---
# Clé : https://console.anthropic.com
# supabase secrets set EXTRACT_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-...

supabase functions deploy extract-doc
```

Rechargez le Cockpit : les boutons **⤓ Importer un relevé** / **⤓ Lire une
pièce** et le glisser-déposer sur les deux cartes passent automatiquement par
l'IA. Pour changer de moteur : `supabase secrets set EXTRACT_PROVIDER=…` puis
`supabase functions deploy extract-doc`.

## Modèles (optionnel)

- `GEMINI_MODEL` (défaut `gemini-2.5-flash`)
- `ANTHROPIC_MODEL` (défaut `claude-opus-5`)

## Confidentialité

Le document est transmis au moteur choisi uniquement le temps de la lecture ;
la fonction ne stocke rien. Seule la synthèse structurée revient au navigateur,
puis dans votre base Supabase si vous enregistrez. Pour des données très
sensibles (pièces d'identité), privilégiez `EXTRACT_PROVIDER=anthropic` ou
laissez le repli local activé (ne pas déployer la fonction).
