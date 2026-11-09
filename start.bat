@echo off
title Dolphin Flow Launcher
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================================
echo 🐬 Dolphin Flow - اجرای خودکار سامانه
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
pause
