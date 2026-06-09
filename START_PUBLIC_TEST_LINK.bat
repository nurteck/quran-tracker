@echo off
cd /d "%~dp0"
echo Starting Quran Progress Tracker and public HTTPS tunnel...
echo.

echo Stopping old Quran Tracker containers if they are running...
docker stop qurantrecker-backend-1 qurantrecker-db-1 >nul 2>&1
docker rm qurantrecker-backend-1 qurantrecker-db-1 >nul 2>&1
echo.
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo Failed to start Docker services. Make sure Docker Desktop is open and running.
  pause
  exit /b 1
)

if not exist "tools" mkdir tools
if not exist "tools\cloudflared.exe" (
  echo Downloading Cloudflare Tunnel...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'tools\cloudflared.exe'"
  if errorlevel 1 (
    echo.
    echo Failed to download cloudflared. Check internet connection.
    pause
    exit /b 1
  )
)

echo.
echo Copy the HTTPS link shown below, for example:
echo https://something.trycloudflare.com
echo.
echo Use it in:
echo - Telegram BotFather Mini App URL
echo.
tools\cloudflared.exe tunnel --url http://localhost:80
pause
