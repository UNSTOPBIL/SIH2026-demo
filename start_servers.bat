@echo off
title Legal Metrology Compliance Scanner Launcher
echo ===================================================================
echo   SIH 2026 // LEGAL METROLOGY RULE 6 COMPLIANCE SCANNER
echo   Starting FastAPI Backend and Next.js 15 AgentFlow Frontend
echo ===================================================================

cd /d "%~dp0"
python start_servers.py
pause
