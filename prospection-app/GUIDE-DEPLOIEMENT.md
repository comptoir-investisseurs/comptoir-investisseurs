# Guide de mise en ligne (gratuit, sans rien installer)

Ce guide vous permet de mettre l'application **en ligne** depuis n'importe quel navigateur, **sans rien installer** sur votre ordinateur. Tout est gratuit pour démarrer.

Vous allez utiliser trois services gratuits :

1. **GitHub** — héberge le code (vous l'avez déjà : `hugoflpp-afk/lfdr`).
2. **Supabase** — la base de données.
3. **Vercel** — met l'application en ligne et vous donne une adresse web.

⏱️ Comptez **15 à 20 minutes**. Aucune carte bancaire n'est demandée.

---

## Étape 1 — Créer la base de données (Supabase)

1. Allez sur **https://supabase.com** et cliquez **« Start your project »**.
2. Connectez-vous **avec GitHub** (bouton « Continue with GitHub »). C'est le plus simple.
3. Cliquez **« New project »**.
   - **Name** : `prospection` (ce que vous voulez).
   - **Database Password** : cliquez « Generate a password » puis **copiez ce mot de passe** quelque part (vous en aurez besoin). ⚠️ Notez-le, il ne se réaffiche pas.
   - **Region** : choisissez « West EU (Paris) » ou la plus proche.
   - Cliquez **« Create new project »** et patientez ~1 minute (la base se prépare).
4. Une fois prête, cliquez le bouton **« Connect »** (en haut de la page).
5. Dans la fenêtre qui s'ouvre, choisissez l'onglet **« ORMs »** (ou « Prisma »).
6. Vous voyez deux lignes qui ressemblent à ceci :

   ```
   DATABASE_URL="postgresql://postgres.xxxx:[YOUR-PASSWORD]@...pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.xxxx:[YOUR-PASSWORD]@...supabase.com:5432/postgres"
   ```

7. **Copiez ces deux lignes** dans un bloc-notes. Remplacez `[YOUR-PASSWORD]` par le mot de passe copié à l'étape 3.

👉 Gardez ce bloc-notes ouvert, on s'en sert à l'étape 3.

---

## Étape 2 — Préparer un « secret » de sécurité

L'application a besoin d'une clé secrète pour sécuriser les connexions.

- Allez sur **https://generate-secret.vercel.app/32** (cette page affiche juste une suite de caractères aléatoires).
- **Copiez** la valeur affichée. Ce sera votre `AUTH_SECRET`.

(Si la page ne s'ouvre pas, inventez une longue suite d'au moins 32 caractères mélangés : lettres, chiffres.)

---

## Étape 3 — Mettre l'application en ligne (Vercel)

1. Allez sur **https://vercel.com** et cliquez **« Sign Up »**, puis connectez-vous **avec GitHub**.
2. Sur le tableau de bord, cliquez **« Add New… » → « Project »**.
3. Vercel liste vos dépôts GitHub. À côté de **`lfdr`**, cliquez **« Import »**.
   - Si `lfdr` n'apparaît pas, cliquez « Adjust GitHub App Permissions » et autorisez l'accès au dépôt.
4. Sur l'écran de configuration, réglez ces points **importants** :
   - **Root Directory** : cliquez « Edit » et sélectionnez le dossier **`prospection-app`**. ⚠️ Étape essentielle.
   - **Framework Preset** : « Next.js » (normalement détecté tout seul).
   - **Branch** : déroulez et choisissez **`claude/local-business-prospecting-app-qug0zl`**
     (ou faites d'abord fusionner cette branche ; voir la note en bas).
5. Ouvrez la section **« Environment Variables »** et ajoutez ces variables (Name = valeur) :

   | Name             | Value                                                        |
   | ---------------- | ------------------------------------------------------------ |
   | `DATABASE_URL`   | la ligne DATABASE_URL de l'étape 1 (avec le mot de passe)    |
   | `DIRECT_URL`     | la ligne DIRECT_URL de l'étape 1 (avec le mot de passe)      |
   | `AUTH_SECRET`    | la valeur de l'étape 2                                        |

   > Pour chaque ligne : tapez le nom à gauche, collez la valeur à droite, puis « Add ».
   > Collez **uniquement** la partie entre guillemets (sans `DATABASE_URL=` ni les guillemets).

6. Cliquez **« Deploy »**. Patientez 2 à 4 minutes (Vercel installe, prépare la base et met en ligne).
7. Quand c'est fini, vous voyez « Congratulations » et un bouton **« Continue to Dashboard »** / une adresse du type **`https://lfdr-xxxx.vercel.app`**.

---

## Étape 4 — Se connecter à votre application

1. Ouvrez l'adresse `https://…vercel.app` que Vercel vous a donnée.
2. Vous arrivez sur la page de connexion. Utilisez le compte de démonstration :
   - **E-mail** : `demo@prospection.local`
   - **Mot de passe** : `demo1234`
3. Vous êtes dans l'application 🎉 (avec déjà 23 prospects de démonstration).

Vous pouvez ouvrir cette adresse depuis **n'importe quel appareil**, y compris votre téléphone.

---

## Questions fréquentes

**C'est vraiment gratuit ?**
Oui pour démarrer et tester. Supabase et Vercel ont des offres gratuites suffisantes. Aucune carte bancaire requise. (Voir les limites d'usage si un jour le trafic devient important.)

**Comment changer le mot de passe / l'e-mail du compte ?**
Avant l'étape 3, ajoutez aussi les variables `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` avec les valeurs souhaitées. Elles seront utilisées à la création du compte.

**Si je modifie le code plus tard ?**
Chaque fois que la branche est mise à jour sur GitHub, Vercel redéploie automatiquement.

**⚠️ À savoir sur les données de démo :**
À chaque déploiement, un jeu de données de démonstration est (re)créé et le compte démo est réinitialisé. C'est pratique pour tester. Quand vous voudrez passer en usage réel, ouvrez le fichier `prospection-app/vercel.json` et retirez la partie `tsx prisma/seed.ts &&` de la commande : la base ne sera plus réinitialisée à chaque fois.

**Note sur la branche :**
Le projet est sur la branche `claude/local-business-prospecting-app-qug0zl`. Vous pouvez soit sélectionner cette branche dans Vercel (étape 3.4), soit la fusionner d'abord dans votre branche principale sur GitHub (« Pull request » → « Merge ») pour déployer depuis la branche par défaut.

---

## En cas de souci

- **Le déploiement échoue avec une erreur de base de données** → vérifiez que `DATABASE_URL` et `DIRECT_URL` contiennent bien votre vrai mot de passe (à la place de `[YOUR-PASSWORD]`), sans crochets.
- **« AUTH_SECRET manquant »** → vous avez oublié d'ajouter la variable `AUTH_SECRET` (étape 3.5).
- **La page affiche une erreur au premier chargement** → attendez la fin du déploiement (statut « Ready » dans Vercel), puis rechargez.

Besoin d'aide sur une étape précise ? Dites-moi laquelle et l'écran que vous voyez.
