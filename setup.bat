@echo off
color 0A
title Setup QR Access Control

echo.
echo ╔══════════════════════════════════════════════╗
echo ║   QR Access Control - One-Time Setup         ║
echo ╚══════════════════════════════════════════════╝
echo.

echo [1/3] Installing PM2...
call npm install -g pm2 pm2-windows-startup

echo.
echo [2/3] Setting up auto-start...
call pm2-startup install

echo.
echo [3/3] Starting service...
call pm2 start server.js --name "QR-Access-Control"
call pm2 save

echo.
echo ╔══════════════════════════════════════════════╗
echo ║              ✅ SETUP COMPLETE!              ║
echo ║                                              ║
echo ║  - Service will auto-start on boot           ║
echo ║  - Desktop shortcut created automatically    ║
echo ║  - Browser will open when service starts     ║
echo ╚══════════════════════════════════════════════╝
echo.
echo Press any key to exit...
pause >nul