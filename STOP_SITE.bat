@echo off
cd /d "%~dp0"
echo Stopping Quran Progress Tracker...
docker compose down
echo.
echo Site stopped.
pause
