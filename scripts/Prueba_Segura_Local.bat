@echo off
title PRUEBA SEGURA (Sin Firebase) - Guías Técnicas CCZ
color 0B
cls
echo ======================================================================
echo           PRUEBA SEGURA - EXTRACCION LOCAL DE GUIAS TECNICAS
echo ======================================================================
echo.
echo  [AUTO-UPDATE] Comprobando la ultima version del script en la web...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri 'https://preview-bbe71.web.app/scripts/sync_guias.ps1' -OutFile '%~dp0sync_guias.ps1' -TimeoutSec 5; echo  [OK] Script sync_guias.ps1 actualizado automaticamente desde la web. } catch { echo  [INFO] Usando version local de sync_guias.ps1. }"
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
