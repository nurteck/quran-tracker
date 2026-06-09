@echo off
net session >nul 2>&1
if errorlevel 1 (
  echo Please right-click this file and choose "Run as administrator".
  pause
  exit /b 1
)

set HOSTS=%SystemRoot%\System32\drivers\etc\hosts
findstr /C:"quran-tracker.local" "%HOSTS%" >nul 2>&1
if errorlevel 1 (
  echo 127.0.0.1 quran-tracker.local>>"%HOSTS%"
  echo Added quran-tracker.local to Windows hosts.
) else (
  echo quran-tracker.local already exists in Windows hosts.
)

echo.
echo Official local link is ready:
echo http://quran-tracker.local
echo.
pause
