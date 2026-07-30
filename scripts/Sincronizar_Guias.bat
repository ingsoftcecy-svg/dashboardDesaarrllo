@echo off
title Sincronizador de Guías Técnicas - Dashboard CCZ
color 0A
cls
echo ======================================================================
echo             DASHBOARD CCZ - SINCRONIZADOR DE GUIAS TECNICAS
echo ======================================================================
echo.
echo  Iniciando lectura nativa de archivos OneDrive...
echo  (No requiere Node.js ni permisos de administrador)
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_guias.ps1"

echo.
echo ======================================================================
echo  Proceso finalizado. Puedes cerrar esta ventana.
echo ======================================================================
pause > nul
