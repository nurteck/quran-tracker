@echo off
cd /d "%~dp0"
echo Starting Quran Progress Tracker...
echo.
echo Stopping old Quran Tracker containers if they are running...
docker stop qurantrecker-backend-1 qurantrecker-db-1 >nul 2>&1
docker rm qurantrecker-backend-1 qurantrecker-db-1 >nul 2>&1
echo.
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo Failed to start. Make sure Docker Desktop is open and running.
  pause
  exit /b 1
)
echo.
echo Site is starting. Opening http://quran-tracker.local ...
start http://quran-tracker.local
echo.
echo If the page does not open, run SETUP_OFFICIAL_LINK_ADMIN.bat as administrator once.
echo If the page is still loading, wait 10-20 seconds and refresh.
pause
