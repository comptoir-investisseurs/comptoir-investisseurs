#!/bin/bash
# Double-cliquez sur ce fichier pour démarrer l'outil « Bilan patrimonial ».
# La première fois, macOS peut afficher un avertissement (« développeur non
# identifié ») : faites un clic droit sur ce fichier > Ouvrir > Ouvrir, une
# seule fois. Les fois suivantes, un simple double-clic suffit.
cd "$(dirname "$0")"
( sleep 1 && open "http://localhost:8000/bilan-patrimonial.html" ) &
echo "Démarrage de l'outil… laissez cette fenêtre ouverte tant que vous l'utilisez."
echo "Pour arrêter : fermez cette fenêtre, ou appuyez sur Ctrl+C."
python3 -m http.server 8000 || python -m http.server 8000
