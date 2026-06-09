@echo off
cd /d "%~dp0"
echo Configure Google and Telegram login keys
echo.
set /p GOOGLE_CLIENT_ID=Paste GOOGLE_CLIENT_ID: 
set /p TELEGRAM_BOT_USERNAME=Paste TELEGRAM_BOT_USERNAME without @: 
set /p TELEGRAM_BOT_TOKEN=Paste TELEGRAM_BOT_TOKEN: 

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p='.env';" ^
  "$c=Get-Content $p -Raw;" ^
  "$c=$c -replace '(?m)^GOOGLE_CLIENT_ID=.*','GOOGLE_CLIENT_ID=%GOOGLE_CLIENT_ID%';" ^
  "$c=$c -replace '(?m)^TELEGRAM_BOT_USERNAME=.*','TELEGRAM_BOT_USERNAME=%TELEGRAM_BOT_USERNAME%';" ^
  "$c=$c -replace '(?m)^TELEGRAM_BOT_TOKEN=.*','TELEGRAM_BOT_TOKEN=%TELEGRAM_BOT_TOKEN%';" ^
  "Set-Content $p $c -NoNewline;"

echo.
echo Keys saved to .env. Restart the site after changing keys.
pause
