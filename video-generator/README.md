# Le Comptoir des Investisseurs — Générateur de vidéos

Transforme un **article économique / boursier** en **vidéo verticale prête à
publier** sur TikTok et Instagram (Reels), avec voix off, sous-titres
synchronisés « punchy », habillage de chaîne et légende de post.

Le rendu s'inspire des codes des médias financiers verticaux : bandeau-titre
« une de journal » en ouverture, badge de chaîne permanent, images d'archives
libres de droits, sous-titres majuscules avec mots-clés colorés.

```
Article ──► [Étape 1 · Claude] Narratif voix off engageant (hook, déroulé, chute)
        ──► [Étape 2 · Claude] Storyboard horodaté (scènes, visuels, emphase) + légende
        ──► [TTS] Voix off scène par scène + timings mot à mot
        ──► [Pexels] Séquences/photos libres de droits par mots-clés
        ──► [ffmpeg] Montage 1080x1920 : Ken Burns, habillage, sous-titres, mixage
        ──► video.mp4 + caption.txt
```

## Le plus simple : le lanceur en un clic

Pas besoin de connaître le terminal. Une seule fois, installez **Python**
(https://www.python.org/downloads/) et **ffmpeg** (`brew install ffmpeg` sur
Mac, `winget install Gyan.FFmpeg` sur Windows). Ensuite :

1. **Mac** : double-cliquez `Lancer-Mac.command`
   **Windows** : double-cliquez `Lancer-Windows.bat`
2. La première fois, collez votre **clé API Anthropic** quand elle est
   demandée (elle est mémorisée dans un fichier `.env` — jamais publiée).
   La clé Pexels est optionnelle.
3. Glissez votre article `.txt` ou collez votre texte.
4. La vidéo se fabrique et le dossier `videos/` s'ouvre tout seul, avec le
   `video.mp4` et la légende `caption.txt`.

Le lanceur installe automatiquement tout le reste la première fois.

> Astuce : vous pouvez aussi glisser directement un fichier `.txt` sur
> l'icône du lanceur.

---

## Installation manuelle (pour les utilisateurs à l'aise avec le terminal)

```bash
cd video-generator
pip install -r requirements.txt
# ffmpeg requis :
sudo apt install ffmpeg        # (macOS : brew install ffmpeg)
```

## Clés d'API

| Variable | Rôle | Obligatoire |
|---|---|---|
| `ANTHROPIC_API_KEY` | Étapes 1 & 2 (narratif + storyboard) | Oui |
| `PEXELS_API_KEY` | Séquences vidéo/photos libres de droits ([clé gratuite](https://www.pexels.com/api/)) | Recommandé — sans clé, fonds neutres à la charte |
| `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` | Voix premium (backend `elevenlabs`) | Non |

La voix par défaut (backend `edge`, gratuit) est `fr-FR-HenriNeural` avec
timings mot à mot exacts pour les sous-titres.

## Utilisation

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export PEXELS_API_KEY=...

python generate.py examples/article-banque-de-france.txt -o out/
```

Sorties dans `out/` :

| Fichier | Contenu |
|---|---|
| `video.mp4` | Vidéo 1080×1920, 30 i/s, H.264 + AAC, prête à publier |
| `caption.txt` | Légende du post (accroche, contexte, question, hashtags) |
| `narrative.txt` | Voix off générée (étape 1) — relisible/éditable |
| `storyboard.json` | Plan de montage (étape 2) — rejouable |

### Options utiles

```bash
# Changer de voix ou de rythme
python generate.py article.txt --voice fr-FR-DeniseNeural --rate +8%

# Musique de fond discrète (mixée à 10 %, fade-out final)
python generate.py article.txt --music assets/bed.mp3

# Itérer sur le montage sans repayer les étapes LLM :
# éditez out/storyboard.json puis
python generate.py --from-storyboard out/storyboard.json -o out/

# Voix locale hors-ligne (qualité robotique — tests uniquement)
python generate.py article.txt --tts espeak
```

### Workflow recommandé

1. Lancez le pipeline complet sur l'article.
2. Relisez `narrative.txt` et `storyboard.json` (faits, chiffres, mots en
   emphase). Corrigez si besoin.
3. Relancez avec `--from-storyboard` pour un rendu instantané (sans LLM).
4. Publiez `video.mp4` avec le texte de `caption.txt`.

## Identité éditoriale (encodée dans les prompts)

- **Audience** : investisseurs particuliers avisés — punchy mais sérieux.
- **Structure** : hook ≤ 2 phrases → faits hiérarchisés → enjeu concret →
  chute qui ouvre le débat. Relance d'attention toutes les ~3 phrases.
- **Interdits** : conseil d'investissement, sensationnalisme non sourcé,
  jargon non expliqué.
- **Habillage** : badge « LE COMPTOIR / DES INVESTISSEURS » (encre + or),
  bandeau-titre rouge/blanc, sous-titres Anton majuscules, mots-clés dorés.

Réglables dans `comptoir/config.py` : couleurs, polices, tailles de
sous-titres, durée du bandeau, modèle Claude, voix.

## Architecture du code

```
video-generator/
├── generate.py            CLI
├── comptoir/
│   ├── config.py          charte graphique + réglages
│   ├── llm.py             étape 1 (narratif) & étape 2 (storyboard) — Claude
│   ├── models.py          schéma pydantic du storyboard (sortie structurée)
│   ├── tts.py             voix off (edge-tts / ElevenLabs / espeak) + timings
│   ├── assets.py          recherche Pexels + fond de secours
│   ├── branding.py        badge, bandeau-titre, fonds (Pillow)
│   ├── subtitles.py       sous-titres ASS synchronisés, emphase colorée
│   ├── render.py          montage ffmpeg (Ken Burns, concat, mixage)
│   └── pipeline.py        orchestration
├── assets/fonts/          Anton & Archivo Black (licence SIL OFL incluse)
└── examples/              article d'exemple
```

## Notes

- **Droits** : les médias proviennent de Pexels (licence libre, usage
  commercial autorisé). Les polices sont sous licence SIL OFL.
- **Coût par vidéo** : 2 appels Claude (≈ 1 500 tokens de sortie) + TTS
  gratuit (edge) + Pexels gratuit.
- **Conformité** : le prompt interdit tout conseil d'achat/vente ; relisez
  néanmoins chaque narratif avant publication (responsabilité éditoriale).
