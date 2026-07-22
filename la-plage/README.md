# 🏖️ La Plage — Site vitrine pour restaurant (modèle « marque blanche »)

Site vitrine de démonstration réalisé pour un restaurant de bord de mer fictif à
Cavalaire-sur-Mer. Il est conçu pour être **revendu et personnalisé en moins d'une
heure** pour n'importe quel restaurant.

## Ce que le client voit

- **Page d'accueil immersive** : ambiance bord de mer, animations douces, design premium.
- **La carte** : entrées / plats / desserts en onglets, badges (« Végé », « Pêche locale »), note allergènes et formule déjeuner.
- **Carte des boissons** : vins & rosés, cocktails, rafraîchissements.
- **Réservation en ligne** : formulaire complet (date, heure, couverts, emplacement) avec confirmation immédiate.
- **Contact & accès** : adresse, téléphone, e-mail, infos pratiques.
- **100 % responsive** : impeccable sur mobile, tablette et ordinateur.
- **Aucune dépendance technique** : un seul fichier HTML, aucun serveur, aucune base de données, aucun abonnement. Hébergeable gratuitement (GitHub Pages, Netlify, OVH mutualisé…).

## Argumentaire de vente (pitch)

> « Votre restaurant mérite mieux qu'une page Facebook. En 48 h, vos clients
> consultent votre carte à jour, votre carte des vins et réservent leur table
> depuis leur téléphone — sans commission, sans abonnement à une plateforme. »

Points forts à mettre en avant :
1. **Zéro commission** contrairement aux plateformes de réservation.
2. **Carte modifiable en 5 minutes** (un simple fichier texte).
3. **Coût d'hébergement quasi nul** — pas de mensualité technique imposée.
4. **Design haut de gamme** qui valorise l'établissement et donne faim.

## Personnaliser pour un nouveau client (~1 h)

Tout est dans `index.html` :

1. **Couleurs** : bloc `:root` en haut du `<style>` (`--sea`, `--sand`, `--accent`…).
   Changez 3 variables et le site change d'ambiance (ex. tons olive/terracotta pour
   un bistrot provençal, bleu marine/blanc pour une brasserie de port).
2. **Nom & textes** : cherchez « La Plage », l'adresse et le téléphone, remplacez.
3. **La carte** : chaque plat est un bloc `<div class="dish">` — dupliquez, modifiez, supprimez.
4. **Les boissons** : mêmes principes, blocs `<div class="drink">`.
5. **Horaires** : section `#reservation`, liste `resa-info`.
6. **Photos** : dans `assets/photos/` (recadrées et compressées pour le web,
   sources Unsplash libres de droits). Pour un nouveau client, remplacez
   simplement les fichiers en gardant les mêmes noms : `hero.jpg` (1920×1280),
   `terrasse.jpg` (900×1125), et 4 visuels 1000×750 pour la galerie.

## Le module de réservation (type Zenchef)

Le site embarque un planning de réservation en 3 étapes, comme les solutions
professionnelles : nombre de couverts → calendrier avec jours complets →
créneaux horaires (déjeuner/dîner) avec liste d'attente, récapitulatif et
confirmation.

**Démonstration** : les disponibilités sont simulées de façon déterministe
(fonction `availabilityFor` / `slotStatus` dans le script) et aucune donnée
n'est envoyée. Pour la production, remplacez ces fonctions par un appel à
votre système de réservation. Trois options selon le budget du client :

| Option | Coût | Mise en place |
|---|---|---|
| Envoi par e-mail (Formspree, Web3Forms…) | Gratuit | 10 min : remplacer le `submit` par un POST vers le service |
| Google Forms / Sheets | Gratuit | 15 min |
| Module pro (Zenchef, TheFork Manager, sur devis) | Payant | Intégration du widget du prestataire |

---

*Établissement fictif — démonstration commerciale. Aucun lien avec un restaurant existant.*
