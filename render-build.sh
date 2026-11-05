#!/usr/bin/env sh
# =========================================================================
#  Construction du dossier publié sur Render (site statique).
#  Même périmètre d'exclusion que .github/workflows/pages.yml : le code
#  source, les secrets et les outils internes ne sont jamais publiés.
#  Volontairement sans rsync ni python : seuls sh, tar et rm sont requis.
# =========================================================================
set -eu

echo "→ Régénération du Comptoir des Structurés"
python3 build-observatoire.py || echo "  (python3 indisponible : les pages déjà versionnées sont publiées telles quelles)"

OUT=_site
rm -rf "$OUT"
mkdir -p "$OUT"

echo "→ Copie des fichiers"
tar -cf - \
  --exclude='./_site' \
  --exclude='./.git' \
  --exclude='./.github' \
  --exclude='./server' \
  --exclude='./prospection-app' \
  --exclude='./tools' \
  --exclude='./.sessions' \
  . | (cd "$OUT" && tar -xf -)

echo "→ Retrait du code source, des secrets et des outils internes"
for p in \
  build.py \
  build-observatoire.py \
  render-build.sh \
  render.yaml \
  SECURITY-AUDIT.md \
  contact.php \
  contact-secrets.php \
  bilan-patrimonial.html \
  Demarrer-bilan-patrimonial.bat \
  Demarrer-bilan-patrimonial.command \
  charte-graphique-LFDR.pdf \
  assets/js/bilan.js \
  assets/js/drive.js \
  assets/js/drive-config.js \
  assets/js/documents.js \
  assets/docs \
  assets/css/bilan.css \
  assets/css/fonts.css \
  assets/fonts \
  assets/vendor
do
  rm -rf "$OUT/$p"
done
rm -f "$OUT"/*.sql

# Images sources non référencées par le site (plusieurs dizaines de Mo).
rm -f "$OUT"/*.jpg

# Hôte secondaire : pas d'indexation (cohérent avec l'en-tête X-Robots-Tag
# de render.yaml). À retirer si un domaine propre pointe vers ce service.
printf 'User-agent: *\nDisallow: /\n' > "$OUT/robots.txt"

echo "→ Vérifications"
test -f "$OUT/observatoire/index.html" || { echo "ERREUR : observatoire/index.html absent"; exit 1; }
test -f "$OUT/observatoire/assets/obs.css" || { echo "ERREUR : obs.css absent"; exit 1; }
n=$(ls "$OUT/observatoire/assets/fonts"/*.woff2 2>/dev/null | wc -l)
test "$n" -ge 20 || { echo "ERREUR : polices du Comptoir absentes ($n trouvée(s))"; exit 1; }
test ! -f "$OUT/SECURITY-AUDIT.md" || { echo "ERREUR : audit de sécurité présent dans la publication"; exit 1; }
test -z "$(ls "$OUT"/*.sql 2>/dev/null)" || { echo "ERREUR : fichiers SQL présents dans la publication"; exit 1; }
test ! -f "$OUT/contact.php" || { echo "ERREUR : contact.php présent (non exécutable sur un hôte statique)"; exit 1; }
test ! -d "$OUT/tools" || { echo "ERREUR : outils internes présents dans la publication"; exit 1; }
test ! -d "$OUT/.sessions" || { echo "ERREUR : sessions authentifiées présentes dans la publication"; exit 1; }

echo "→ Publication prête : $(du -sh "$OUT" | cut -f1)"
