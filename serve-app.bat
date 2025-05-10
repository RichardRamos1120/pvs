@echo off
echo Starting Fire Department Daily Log App
cd %~dp0
echo Serving application with client-side routing support...
npx serve -s build -l 3000 --single