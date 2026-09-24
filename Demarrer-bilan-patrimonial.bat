@echo off
REM Double-cliquez sur ce fichier pour demarrer l'outil "Bilan patrimonial".
cd /d "%~dp0"
start "" "http://localhost:8000/bilan-patrimonial.html"
echo Demarrage de l'outil... laissez cette fenetre ouverte tant que vous l'utilisez.
echo Pour arreter : fermez cette fenetre.
python -m http.server 8000
pause
