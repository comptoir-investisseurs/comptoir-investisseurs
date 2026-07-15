@echo off
REM Double-cliquez ce fichier sur Windows pour lancer la fabrique de videos.
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
    python lancer.py
) else (
    echo Python n'est pas installe. Installez-le depuis https://www.python.org/downloads/
    echo Pensez a cocher "Add Python to PATH" pendant l'installation, puis relancez.
    pause
)
