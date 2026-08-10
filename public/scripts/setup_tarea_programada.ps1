# =============================================================
#  CONFIGURADOR DE TAREA PROGRAMADA - Sincronizador Guías CCZ
#  Sin necesidad de permisos de administrador
#  Uso: .\setup_tarea_programada.ps1 [-Accion instalar|eliminar|estado]
# =============================================================
param(
    [ValidateSet("instalar","eliminar","estado")]
    [string]$Accion = "instalar",
    
    # Hora de inicio del primer sync del dia (formato HH:mm)
    [string]$HoraInicio = "07:00",
    
    # Cada cuantas horas repetir durante el dia
    [int]$CadaHoras = 4,
    
    # Hora limite del dia para dejar de sincronizar
    [string]$HoraFin = "19:00"
)

$NombreTarea  = "DashboardCCZ_SincronizadorGuias"
$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScriptPS1    = Join-Path $ScriptDir "sync_guias.ps1"

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   TAREA PROGRAMADA - Dashboard CCZ / Guias Tecnicas        " -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------
# ESTADO
# ------------------------------------------------------------------
if ($Accion -eq "estado") {
    $tarea = Get-ScheduledTask -TaskName $NombreTarea -ErrorAction SilentlyContinue
    if ($tarea) {
        $info = Get-ScheduledTaskInfo -TaskName $NombreTarea
        Write-Host "[OK] La tarea '$NombreTarea' ESTA REGISTRADA." -ForegroundColor Green
        Write-Host "     Estado           : $($tarea.State)"
        Write-Host "     Ultimo inicio    : $($info.LastRunTime)"
        Write-Host "     Ultimo resultado : $($info.LastTaskResult)  (0 = exito)"
        Write-Host "     Proxima ejecucion: $($info.NextRunTime)"
    } else {
        Write-Host "[INFO] La tarea '$NombreTarea' NO esta registrada." -ForegroundColor Yellow
        Write-Host "       Ejecuta el script con -Accion instalar para crearla."
    }
    Write-Host ""
    exit 0
}

# ------------------------------------------------------------------
# ELIMINAR
# ------------------------------------------------------------------
if ($Accion -eq "eliminar") {
    $tarea = Get-ScheduledTask -TaskName $NombreTarea -ErrorAction SilentlyContinue
    if ($tarea) {
        Unregister-ScheduledTask -TaskName $NombreTarea -Confirm:$false
        Write-Host "[OK] Tarea '$NombreTarea' eliminada correctamente." -ForegroundColor Green
    } else {
        Write-Host "[INFO] La tarea no existia. Nada que eliminar." -ForegroundColor Yellow
    }
    Write-Host ""
    exit 0
}

# ------------------------------------------------------------------
# INSTALAR
# ------------------------------------------------------------------
if (-not (Test-Path $ScriptPS1)) {
    Write-Host "[ERROR] No se encontro sync_guias.ps1 en: $ScriptPS1" -ForegroundColor Red
    Write-Host "        Asegurate de ejecutar este script desde la carpeta 'scripts\'" -ForegroundColor Red
    exit 1
}

# Eliminar tarea previa si ya existia
$tareaExistente = Get-ScheduledTask -TaskName $NombreTarea -ErrorAction SilentlyContinue
if ($tareaExistente) {
    Unregister-ScheduledTask -TaskName $NombreTarea -Confirm:$false
    Write-Host "[INFO] Tarea previa eliminada para recrearla limpia." -ForegroundColor Yellow
}

# Accion: ejecutar PowerShell con el script de sync en ventana oculta
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPS1`"" `
    -WorkingDirectory $ScriptDir

# Triggers: al iniciar sesion + repetir cada N horas en horario laboral
$triggerLogin = New-ScheduledTaskTrigger -AtLogOn

$horaInicioInt = [int]$HoraInicio.Split(":")[0]
$horaFinInt    = [int]$HoraFin.Split(":")[0]
$duracionHoras = $horaFinInt - $horaInicioInt

$triggerDiario = New-ScheduledTaskTrigger `
    -Daily `
    -At $HoraInicio

# Agregar repeticion al trigger diario
$triggerDiario.Repetition.Interval = "PT${CadaHoras}H"
$triggerDiario.Repetition.Duration = "PT${duracionHoras}H"

# Configuracion de la tarea
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew `
    -WakeToRun:$false

# Principal: correr como el usuario actual sin elevar permisos
$principal = New-ScheduledTaskPrincipal `
    -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

# Registrar la tarea
Register-ScheduledTask `
    -TaskName $NombreTarea `
    -Action $action `
    -Trigger @($triggerLogin, $triggerDiario) `
    -Settings $settings `
    -Principal $principal `
    -Description "Sincroniza las Guias Tecnicas de OneDrive a Firebase (Dashboard CCZ). Se ejecuta al iniciar sesion y cada $CadaHoras horas entre $HoraInicio y $HoraFin." `
    -Force | Out-Null

# Verificar que quedo registrada
$tareaVerif = Get-ScheduledTask -TaskName $NombreTarea -ErrorAction SilentlyContinue
if ($tareaVerif) {
    Write-Host "[OK] Tarea registrada exitosamente." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Nombre     : $NombreTarea"
    Write-Host "  Script     : $ScriptPS1"
    Write-Host "  Disparo 1  : Al iniciar sesion de Windows"
    Write-Host "  Disparo 2  : Todos los dias a las $HoraInicio, repite cada $CadaHoras hrs hasta $HoraFin"
    Write-Host "  Modo       : Ventana oculta (silencioso, sin interrumpir al usuario)"
    Write-Host "  Red        : Solo corre si hay conexion a internet"
    Write-Host "  Duracion   : Maximo 1 hora por ejecucion"
    Write-Host ""
    Write-Host "  Comandos utiles:"
    Write-Host "  Ver estado   -> .\setup_tarea_programada.ps1 -Accion estado"
    Write-Host "  Eliminar     -> .\setup_tarea_programada.ps1 -Accion eliminar"
    Write-Host "  Personalizar -> .\setup_tarea_programada.ps1 -Accion instalar -HoraInicio 08:00 -CadaHoras 2 -HoraFin 18:00"
} else {
    Write-Host "[ERROR] La tarea no pudo registrarse. Verifica permisos de usuario." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
