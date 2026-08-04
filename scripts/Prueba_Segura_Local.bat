@echo off
title PRUEBA SEGURA (Sin Firebase) - Guías Técnicas CCZ
color 0B
cls
echo ======================================================================
echo           PRUEBA SEGURA - EXTRACCION LOCAL DE GUIAS TECNICAS
echo ======================================================================
echo.
echo  Modo: SOLO LOCAL (NO sube nada a Firebase, NO altera la nube)
echo  Resultado: Generara 'resultado_extraccion.json' para verificar
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_guias.ps1" -SoloLocal

echo.
echo ======================================================================
echo  Proceso finalizado. Revisa el archivo 'resultado_extraccion.json'.
echo ======================================================================
pause
