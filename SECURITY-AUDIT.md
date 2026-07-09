# Audit de sécurité — La Financière de Rochechouart (LFDR)

**Date :** 2026-07-09
**Périmètre :** dépôt `hugoflpp-afk/lfdr` — site vitrine statique + espace conseiller
(CRM `admin.html`, cockpit patrimonial `cockpit.html`, book produits structurés
`structures.html`) adossé à Supabase.
**Objectif :** vérifier l'absence de secrets (clés API, identifiants) dans le code
et évaluer la posture de sécurité applicative.

---

## 1. Verdict global

**Aucun secret exploitable ni identifiant en clair n'a été trouvé dans le code
ni dans l'historique Git.**

- ❌ Aucune clé `service_role` Supabase (la clé qui contourne le RLS).
- ❌ Aucun mot de passe / login codé en dur.
- ❌ Aucune clé privée, token SMTP, `sk_live/sk_test`, secret Brevo.
- ✅ La clé Brevo (flux d'invitation par email) est restée **côté serveur** dans une
  fonction Supabase, via un fichier `supabase-invitations.sql` **exclu du dépôt**
  (`.gitignore`) et jamais committé (vérifié sur tout l'historique `git log --all`).
- ✅ L'authentification conseiller passe par **Supabase Auth** (email/mot de passe,
  `grant_type=password`) — pas d'authentification factice côté client.
- ✅ Les données rendues dans le dashboard sont **échappées** (`esc()` = HTML-encode),
  ce qui neutralise le XSS stocké.

La seule clé présente dans le code est la **clé `anon` Supabase**
(`assets/js/supabase-config.js`). **C'est normal et attendu** : cette clé est
*conçue pour être publique* et distribuée dans le navigateur. Sa sûreté ne dépend
**pas** de son secret mais **exclusivement de la configuration du Row Level
Security (RLS)** côté Supabase (voir §3).

> ⚠️ Point de vigilance principal : la sécurité réelle de l'application repose sur
> des politiques RLS définies dans le tableau de bord Supabase. Deux tables
> (`invitations` surtout) doivent être vérifiées manuellement — voir §3.1.

---

## 1 bis. Correctifs de durcissement appliqués dans ce commit

| Mesure | Fichiers | Effet |
|---|---|---|
| **Content-Security-Policy** sur les 4 pages privilégiées | `admin.html`, `cockpit.html`, `cockpit-preview.html`, `structures.html` | `connect-src` limite les destinations réseau à Supabase (+ cdnjs pour pdf.js) : même un script CDN compromis ne peut **pas exfiltrer** le jeton/les données vers un domaine attaquant. `object-src 'none'`, `base-uri 'self'`, `script-src` restreint aux origines connues. |
| **Flux d'invitation via RPC `SECURITY DEFINER`** | `assets/js/questionnaire.js` + `supabase-invitations-hardening.sql` | Le client public n'accède plus **jamais** directement à la table `invitations` (fin de la fuite potentielle noms/emails/tokens). ⚠️ Nécessite d'exécuter le script SQL fourni. |
| **Retrait du repli d'authentification « démo »** | `assets/js/cockpit.js` | La connexion échoue désormais en *fail-closed* si la configuration est absente (plus de jeton `demo` accordé). |
| **Déploiement Pages assaini** | `.github/workflows/pages.yml` | `build.py`, les `*.sql` et le rapport d'audit ne sont plus publiés (fin de la divulgation du code source / schéma). |

> Le correctif SRI de pdf.js n'a **pas** pu être appliqué : le CDN est bloqué par
> la politique réseau de cet environnement (impossible de récupérer le fichier ou
> le hachage). La CSP couvre l'essentiel du risque en attendant (voir §3.2).

---

## 2. Éléments vérifiés « sûrs »

| Contrôle | Résultat |
|---|---|
| Secrets dans le code (grep + historique) | ✅ Aucun (hors clé `anon` publique) |
| Clé `service_role` / secret serveur | ✅ Absente |
| Mots de passe / logins en dur | ✅ Absents |
| Authentification | ✅ Supabase Auth (jeton JWT réel) |
| RLS activé sur toutes les tables du dépôt | ✅ `clients`, `enveloppes`, `supports`, `documents`, `poles`, `activities`, `sp_products`, `sp_positions`, `sp_observations` |
| Lecture des données clients (PII) | ✅ Réservée à `authenticated` (le conseiller connecté) |
| XSS stocké (données affichées dans le CRM) | ✅ Neutralisé par `esc()` sur tous les champs libres |
| Sinks dangereux (`eval`, `new Function`, `document.write`) | ✅ Aucun |
| Injection dans le `mailto:` du formulaire de contact | ✅ `encodeURIComponent` sur sujet + corps |
| Ressources chargées en HTTP non chiffré | ✅ Aucune (tout en HTTPS) |

---

## 3. Recommandations de durcissement (par priorité)

### 3.1 — 🟠 MOYEN — Vérifier le RLS de la table `invitations`

Le questionnaire public (`assets/js/questionnaire.js`) accède à la table
`invitations` **avec la clé `anon`** en **lecture** (`GET …/invitations?select=…&token=eq.X`)
et en **écriture** (`PATCH …/invitations?token=eq.X`).

Le schéma de `invitations` et sa politique RLS sont dans `supabase-invitations.sql`,
volontairement exclu du dépôt — **je n'ai donc pas pu vérifier la politique effective.**

**Risque si la politique anon est permissive** (`USING (true)` / `WITH CHECK (true)`) :
- **Fuite de données** : `GET …/invitations?select=*` (avec la clé publique)
  renverrait **toutes** les invitations — noms, emails, et **tokens** — de tous les
  prospects invités.
- **Usurpation / altération** : un attaquant pourrait modifier (`PATCH`) n'importe
  quelle invitation.

**Remédiation recommandée (dans le tableau de bord Supabase) :**
- Ne **pas** exposer `invitations` en `SELECT`/`UPDATE` directs à `anon`.
- Remplacer par une **fonction `SECURITY DEFINER`** qui prend le token en paramètre
  et ne renvoie que la ligne correspondante (ex. `get_invitation(token text)`), et
  une fonction équivalente pour marquer l'invitation « complétée ».
- S'assurer que les tokens sont **longs et imprévisibles** (`gen_random_uuid()` ou
  32+ octets aléatoires), et idéalement à **usage unique / expirants**.

> Action : partager `supabase-invitations.sql` (sans la clé Brevo) pour audit, ou
> confirmer la politique en place. Je peux fournir la version `SECURITY DEFINER`.

### 3.2 — 🟠 MOYEN — Ajouter l'intégrité (SRI) sur pdf.js chargé depuis le CDN

`cockpit.html`, `cockpit-preview.html` et `structures.html` chargent **pdf.js**
depuis `cdnjs.cloudflare.com` **sans `integrity` (Subresource Integrity)** :

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
```

Ces pages sont **privilégiées** : elles détiennent le **jeton de session Supabase**
(`sessionStorage`) et affichent des **données clients**. Sans SRI, une compromission
du CDN (ou une attaque de type MITM) permettrait d'injecter du JavaScript arbitraire
dans ce contexte et d'exfiltrer le jeton + les données.

**Remédiation :** ajouter `integrity` + `crossorigin` sur les deux `<script>`
(`pdf.min.js` et `pdf.worker.min.js`), ou **auto-héberger** pdf.js dans `assets/`.
Les hachages SRI officiels sont disponibles sur la page cdnjs de pdf.js 3.11.174
(bouton « Copy SRI ») :

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        integrity="sha512-…"
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>
```

> Non appliqué automatiquement : le hachage doit être exact (un hachage erroné
> casserait l'import PDF) et n'a pas pu être récupéré depuis cet environnement.
> Je peux l'appliquer dès que le hachage est confirmé.

### 3.3 — 🟡 FAIBLE — Formulaire public : anti-spam et restriction des colonnes

La politique `INSERT` sur `clients` est ouverte à `anon` avec `WITH CHECK (true)`
(nécessaire pour le questionnaire public), mais :
- **Aucune protection anti-bot / anti-spam** → pollution possible de la base
  (soumissions massives). Recommandé : **Cloudflare Turnstile** / hCaptcha, ou un
  Edge Function avec limite de débit.
- `WITH CHECK (true)` autorise l'insertion de **n'importe quelle colonne**, y compris
  des champs internes (`type`, `stage`, `notes_internes`). Impact faible (non
  lisible par `anon`), mais idéalement restreindre les colonnes insérables via des
  privilèges `GRANT` au niveau colonne.

### 3.4 — 🟡 FAIBLE — Déploiement : ne pas publier les fichiers source

Le workflow GitHub Pages déploie `path: "."` (racine du dépôt). Sont donc servis
publiquement `build.py` et les fichiers `supabase-*.sql` (schéma complet de la base).
Aucun secret n'y figure, mais cela **divulgue la structure de la base et le code du
générateur**, ce qui facilite le ciblage d'un attaquant.

**Remédiation :** exclure les fichiers non-web de l'artefact publié (étape de copie
sélective, ou déplacer `build.py` / `*.sql` hors de la racine servie).

### 3.5 — ⚪ INFO — Repli d'authentification « démo »

`assets/js/cockpit.js` (et `questionnaire.js`) contiennent un repli : si
`SUPABASE_URL` est vide/placeholder, la connexion est simulée (jeton `demo`).
Non exploitable en production (l'URL est renseignée), mais à retirer pour éviter tout
risque si la configuration venait à être vidée.

### 3.6 — ⚪ INFO — Jeton JWT en `sessionStorage`

Le JWT de session est stocké en `sessionStorage` (accessible au JavaScript de la page,
donc à un éventuel XSS). C'est le fonctionnement standard des SPA Supabase et c'est
**acceptable ici** car le XSS est neutralisé (§2). À conserver à l'esprit : la rigueur
de l'échappement `esc()` reste la dernière ligne de défense.

---

## 4. Checklist d'action

- [x] Basculer le flux d'invitation sur des **RPC `SECURITY DEFINER`** (code client) — §3.1
- [ ] **➡️ À FAIRE CÔTÉ SUPABASE : exécuter `supabase-invitations-hardening.sql`** dans
      le SQL Editor (indispensable pour que le durcissement `invitations` soit effectif) — §3.1
- [ ] Vérifier que les **tokens d'invitation sont imprévisibles** (`gen_random_uuid()` / 32+ octets) — §3.1
- [x] **CSP** ajoutée sur les pages privilégiées (atténue le risque CDN) — §3.2
- [ ] **Ajouter SRI (`integrity`) sur pdf.js** ou l'auto-héberger (complément à la CSP) — §3.2
- [ ] Ajouter un **anti-spam** au questionnaire public — §3.3
- [x] **Exclure `build.py` / `*.sql`** de l'artefact GitHub Pages — §3.4
- [x] Retirer le **repli d'authentification « démo »** — §3.5
- [ ] Confirmer côté Supabase que le RLS est **activé** sur *toutes* les tables réellement
      présentes (celles du dépôt le sont ; vérifier `invitations` et toute table ajoutée hors dépôt)

---

## 5. Annexe — Pourquoi la clé `anon` dans le code n'est pas une faille

La clé `anon` (`assets/js/supabase-config.js`) est un JWT signé de rôle `anon`,
**destiné à être public** (elle est envoyée à chaque navigateur qui charge le site).
Elle n'accorde **aucun privilège par elle-même** : chaque requête qu'elle autorise est
filtrée par les **politiques RLS** de PostgreSQL. Tant que le RLS est correctement
configuré (lecture des PII réservée à `authenticated`, ce qui est le cas dans les
scripts du dépôt), l'exposition de cette clé est **sans conséquence**.

La clé à **ne jamais** exposer est la clé `service_role` — **elle est absente du code**,
ce qui est correct.
