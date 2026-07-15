#!/bin/bash
# Double-cliquez ce fichier sur Mac pour lancer la fabrique de vidéos.
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
    python3 lancer.py
else
    echo "Python 3 n'est pas installé. Installez-le depuis https://www.python.org/downloads/ puis relancez."
    read -r -p "Appuyez sur Entrée pour fermer."
fi
