import { useState } from "react";
import { Copy, Check, Terminal, FileCode, X, Upload, CheckCircle2, Database, Download } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/lib/auth";

interface ScriptPortalDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const POWERSHELL_CODE = `# Sincronizador de Guias Tecnicas (Cocimientos) - Delta Sync & Clasificacion Competente/Mejorado
param (
    [string]$OneDrivePath = "",
    [string]$ProjectId = "preview-bbe71",
    [switch]$SoloLocal = $false
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SINCRONIZADOR DE GUIAS TECNICAS - AREA COCIMIENTOS    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
if ($SoloLocal) {
    Write-Host "   [MODO PRUEBA SEGURA LOCAL - LECTURA FIRESTORE HABILITADA] " -ForegroundColor Yellow
}
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Configurar Proxy de Red Corporativa y TLS 1.2 de Windows
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
try {
    [System.Net.WebRequest]::DefaultWebProxy = [System.Net.WebRequest]::GetSystemWebProxy()
    [System.Net.WebRequest]::DefaultWebProxy.Credentials = [System.Net.CredentialCache]::DefaultNetworkCredentials
} catch {}

if (-not $OneDrivePath) {
    try {
        $OneDrivePath = (Get-Item "$env:USERPROFILE\\OneDrive - Anheuser-Busch InBev\\Brewery Operations - *\\5.0  Mantto\\2026\\04 ATO\\03 ATO MEJORADO\\Guias Tecnicas" -ErrorAction SilentlyContinue).FullName
    } catch {}
    if (-not $OneDrivePath) {
        try {
            $OneDrivePath = (Get-Item "$env:USERPROFILE\\OneDrive - Anheuser-Busch InBev\\Brewery Operations - *\\5.0  Mantto\\2026\\04 ATO\\*\\Guias Tecnicas" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
        } catch {}
    }
}

if (-not $OneDrivePath -or -not (Test-Path -Path $OneDrivePath)) {
    Write-Host "[ERROR] No se encontro la carpeta de Guias Tecnicas 2026." -ForegroundColor Red
    exit 1
}

$OutputFile = Join-Path -Path $PSScriptRoot -ChildPath "resultado_extraccion.json"
$CacheFile = Join-Path -Path $PSScriptRoot -ChildPath ".sync_cache.json"

Write-Host "[INFO] Carpeta Encontrada: $OneDrivePath" -ForegroundColor Green
Write-Host ""

# ----------------------------------------------------------
# FASE 0: CACHE LOCAL Y CONSULTA DE ESTADO EN FIRESTORE (READ-ONLY)
# ----------------------------------------------------------
$syncCache = @{}
if (Test-Path -Path $CacheFile) {
    try {
        $cacheRaw = Get-Content -Path $CacheFile -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($prop in $cacheRaw.PSObject.Properties) {
            $syncCache[$prop.Name] = $prop.Value
        }
        Write-Host "[INFO] Cache local cargada con $($syncCache.Count) registros previos." -ForegroundColor Gray
    } catch {}
}

# Siempre consultar Firestore (Lectura) para saber si la versión remota ya está al día
Write-Host "[INFO] Consultando marcas de tiempo en Firestore (Batch Check)..." -ForegroundColor Yellow
try {
    $listUrl = "https://firestore.googleapis.com/v1/projects/" + $ProjectId + "/databases/(default)/documents/evaluaciones_guias_tecnicas?pageSize=300"
    $fsResponse = Invoke-RestMethod -Uri $listUrl -Method Get -TimeoutSec 10 -UseBasicParsing
    if ($fsResponse.documents) {
        foreach ($doc in $fsResponse.documents) {
            $docName = [System.IO.Path]::GetFileName($doc.name)
            $lastMod = ""
            if ($doc.fields.fileLastModified -and $doc.fields.fileLastModified.stringValue) {
                $lastMod = $doc.fields.fileLastModified.stringValue
            } elseif ($doc.fields.updatedAt -and $doc.fields.updatedAt.stringValue) {
                $lastMod = $doc.fields.updatedAt.stringValue
            }
            if ($lastMod) {
                $syncCache[$docName] = $lastMod
            }
        }
        Write-Host "[OK] Metadatos remotos cargados de Firestore: $($syncCache.Count) documentos." -ForegroundColor Green
    }
} catch {
    Write-Host "[WARN] No se pudo consultar Firestore en linea. Se procesaran los archivos según cache local." -ForegroundColor Yellow
}

Write-Host ""

$excelFiles = Get-ChildItem -Path $OneDrivePath -Recurse -Filter "*.xlsx" -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "~$*" }
Write-Host "[INFO] Archivos encontrados en OneDrive: $($excelFiles.Count)" -ForegroundColor Green
Write-Host ""

# Filtrar archivos que requieren procesamiento (Delta Filter)
$pendingFiles = @()
foreach ($file in $excelFiles) {
    $fileNameRaw = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)

    # 1. Filtro estricto: Omitir archivos maestros/anexos/plantillas que no son de un operador
    if ($fileNameRaw -like "*ANEXO*" -or $fileNameRaw -like "*Guías-Técnicas*" -or $fileNameRaw -like "*Guias-Tecnicas*" -or $fileNameRaw -like "*Plantilla*") {
        Write-Host "[OMITIDO - PLANTILLA/ANEXO] $($file.Name)" -ForegroundColor Gray
        continue
    }

    $sharpId = ""
    $operatorName = $fileNameRaw
    if ($fileNameRaw -match '^(\\d{7,10})\\s+(.+)$') {
        $sharpId = $matches[1]
        $operatorName = $matches[2]
    } else {
        # Si el archivo no empieza con ID SHARP (7-10 dígitos), no es guía de operador
        Write-Host "[OMITIDO - NO ES OPERADOR] $($file.Name)" -ForegroundColor Gray
        continue
    }

    $docId = $sharpId
    $localLastMod = $file.LastWriteTimeUtc.ToString("o")

    # Comparar timestamp local vs cache inteligente (con tolerancia DateTime)
    $cacheKey = $docId
    $fileKey = $file.Name
    $prevTimeStr = if ($syncCache.ContainsKey($cacheKey)) { "$($syncCache[$cacheKey])" } elseif ($syncCache.ContainsKey($fileKey)) { "$($syncCache[$fileKey])" } else { $null }

    if ($prevTimeStr) {
        $skipFile = $false
        try {
            $dtLocal = [DateTime]::Parse($localLastMod)
            $dtPrev  = [DateTime]::Parse($prevTimeStr)
            if ($dtLocal -le $dtPrev.AddSeconds(3)) {
                $skipFile = $true
            }
        } catch {
            if ($localLastMod -le $prevTimeStr) {
                $skipFile = $true
            }
        }
        if ($skipFile) {
            Write-Host "[SIN CAMBIOS - OMITIDO] $($file.Name) (SHARP: $docId)" -ForegroundColor Gray
            continue
        }
    }

    $pendingFiles += [pscustomobject]@{
        File = $file
        DocId = $docId
        SharpId = $sharpId
        OperatorName = $operatorName
        LocalLastMod = $localLastMod
    }
}

Write-Host ""
Write-Host "[INFO] Archivos pendientes de lectura y sync: $($pendingFiles.Count)" -ForegroundColor Cyan
Write-Host ""

if ($pendingFiles.Count -eq 0) {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "   TODOS LOS ARCHIVOS ESTAN AL DIA. NADA QUE SUBIR.      " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
    exit 0
}

# Configuracion Anti-Bloqueos de Excel COM (Disable All Macros & Forced Background Mode)
$excel = New-Object -ComObject Excel.Application
try { $excel.AutomationSecurity = 3 } catch {} # 3 = msoAutomationSecurityForceDisable
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.ScreenUpdating = $false
$excel.EnableEvents = $false
try { $excel.AskToUpdateLinks = $false } catch {}

$processedOperators = [ordered]@{}
$processedCount = 0

Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host " FASE 1: LECTURA DINAMICA DE EXCEL (COCIMIENTOS)          " -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor Gray

foreach ($item in $pendingFiles) {
    $file = $item.File
    $docId = $item.DocId
    $sharpId = $item.SharpId
    $operatorName = $item.OperatorName
    $wb = $null
    
    try {
        if ($processedOperators.Contains($docId)) {
            continue
        }
        
        $relativePath = $file.FullName.Replace($OneDrivePath, "").TrimStart("\\")
        $pathParts = $relativePath.Split("\\")
        $equipo = if ($pathParts.Count -gt 1) { $pathParts[0] } else { "Cocimientos" }
        $subcarpeta = if ($pathParts.Count -gt 2) { $pathParts[1] } else { "General" }
        
        # Clasificación de tipoGuia evaluando SOLAMENTE la subcarpeta relativa (MASH-RAMPA\COMPETENTE)
        $subPathLower  = $relativePath.ToLower()
        $fileNameLower = $file.Name.ToLower()
        $tipoGuia = "COMPETENTE"

        if ($subPathLower -like "*\\mejorado\\*" -or $subPathLower -like "*mejorado\\*") {
            $tipoGuia = "MEJORADO"
        } elseif ($subPathLower -like "*\\competente\\*" -or $subPathLower -like "*competente\\*") {
            $tipoGuia = "COMPETENTE"
        } elseif ($fileNameLower -like "*mejorado*") {
            $tipoGuia = "MEJORADO"
        } elseif ($fileNameLower -like "*competente*") {
            $tipoGuia = "COMPETENTE"
        }
        
        $cleanOperatorName = $operatorName -replace '\\s+(COMPETENTE|MEJORADO)$', ''
        
        $processedCount++
        Write-Host "[$processedCount/$($pendingFiles.Count)] Leido: $($file.Name) ($tipoGuia)" -ForegroundColor White
        
        $wb = $excel.Workbooks.Open($file.FullName, 0, $true, 5, "", "", $true)
        
        $operatorRecord = [ordered]@{
            docId = $docId
            sharpId = $sharpId
            nombre = "$cleanOperatorName".Trim()
            equipo = $equipo
            area = "Cocimientos"
            subcarpeta = $subcarpeta
            tipoGuia = $tipoGuia
            fileLastModified = $item.LocalLastMod
            archivo = $file.Name
            l6Pct = 0
            l7Pct = 0
            l8Pct = 0
            niveles = [ordered]@{}
        }
        
        foreach ($ws in $wb.Sheets) {
            $sheetName = $ws.Name
            
            $detectedLevel = ""
            if ($sheetName -like "*L6*" -or $sheetName -like "*N6*" -or $sheetName -like "*6*") { $detectedLevel = "L6" }
            elseif ($sheetName -like "*L7*" -or $sheetName -like "*N7*" -or $sheetName -like "*7*") { $detectedLevel = "L7" }
            elseif ($sheetName -like "*L8*" -or $sheetName -like "*N8*" -or $sheetName -like "*8*") { $detectedLevel = "L8" }
            
            if ($tipoGuia -eq "COMPETENTE" -and ($detectedLevel -eq "L7" -or $detectedLevel -eq "L8")) {
                continue
            }
            
            if ($detectedLevel -and -not $operatorRecord.niveles[$detectedLevel]) {
                $totalPreguntas = 0
                $marcadasSI = 0
                $categoriasList = @()
                $currentCategory = $null
                
                $checkedRows = @{}
                try {
                    if ($ws.CheckBoxes.Count -gt 0) {
                        foreach ($cb in $ws.CheckBoxes) {
                            $cbRow = $cb.TopLeftCell.Row
                            if ($cb.Value -eq 1) {
                                $checkedRows[$cbRow] = $true
                            }
                        }
                    }
                } catch {}
                
                for ($row = 3; $row -le 150; $row++) {
                    $textB = "$($ws.Cells.Item($row, 2).Value2)".Trim()
                    $cellC = "$($ws.Cells.Item($row, 3).Value2)".Trim()
                    
                    if ($textB.Length -gt 0 -and $textB -notlike "*INSTRUCCIONES*" -notlike "*COMPETENCIAS*") {
                        
                        $isHeader = $false
                        $isFontBold = $false
                        try { $isFontBold = [bool]($ws.Cells.Item($row, 2).Font.Bold) } catch {}
                        
                        if ($cellC -like "*%" -or ($isFontBold -and $textB -eq $textB.ToUpper() -and $textB.Length -gt 3)) {
                            $isHeader = $true
                        }
                        
                        if ($isHeader) {
                            $pctText = $cellC
                            if ($cellC -as [double] -or $cellC -as [single]) {
                                $pctVal = [math]::Round([double]$cellC * 100)
                                $pctText = "$pctVal%"
                            }
                            
                            $currentCategory = [ordered]@{
                                categoria = $textB
                                porcentajeOficial = $pctText
                                habilidades = @()
                            }
                            $categoriasList += $currentCategory
                        }
                        elseif ($textB.Length -gt 6) {
                            $totalPreguntas++
                            $isChecked = $false
                            
                            if ($checkedRows.ContainsKey($row) -and $checkedRows[$row] -eq $true) {
                                $isChecked = $true
                            } else {
                                $valC = $cellC.ToLower()
                                $valD = "$($ws.Cells.Item($row, 4).Value2)".Trim().ToLower()
                                
                                if ($valC -match '1|x|si|certified|true|ok|cumple|competente' -or $valD -match '1|x|si|certified|true|ok|cumple|competente') {
                                    $isChecked = $true
                                }
                            }
                            
                            if ($isChecked) {
                                $marcadasSI++
                            }
                            
                            $habilidadItem = [ordered]@{
                                fila = $row
                                habilidad = $textB
                                marcado = $isChecked
                            }
                            
                            if ($currentCategory) {
                                $currentCategory.habilidades += $habilidadItem
                            }
                        }
                    }
                }
                
                $filteredCategories = @()
                foreach ($cat in $categoriasList) {
                    if ($cat.habilidades.Count -gt 0 -or ($cat.porcentajeOficial -and $cat.porcentajeOficial -ne "0%")) {
                        $filteredCategories += $cat
                    }
                }
                
                $porcentajeCalculado = 0
                if ($totalPreguntas -gt 0) {
                    $porcentajeCalculado = [math]::Round(($marcadasSI / $totalPreguntas) * 100, 1)
                }
                
                if ($detectedLevel -eq "L6") { $operatorRecord.l6Pct = $porcentajeCalculado }
                elseif ($detectedLevel -eq "L7") { $operatorRecord.l7Pct = $porcentajeCalculado }
                elseif ($detectedLevel -eq "L8") { $operatorRecord.l8Pct = $porcentajeCalculado }
                
                $operatorRecord.niveles[$detectedLevel] = [ordered]@{
                    pestana = $sheetName
                    porcentajeAvanceGlobal = "$porcentajeCalculado%"
                    totalHabilidades = $totalPreguntas
                    habilidadesAprobadas = $marcadasSI
                    categorias = $filteredCategories
                }
            }
        }
        
        $wb.Close($false)
        $wb = $null
        $processedOperators[$docId] = $operatorRecord
    }
    catch {
        Write-Host "[ERROR] En $($file.Name): $_" -ForegroundColor Red
        if ($wb) { try { $wb.Close($false) } catch {} }
    }
}

# Cerrar Excel COM
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
[System.GC]::Collect()

# Guardar resultado_extraccion.json localmente
$allDataList = @($processedOperators.Values)
$jsonResult = $allDataList | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($OutputFile, $jsonResult, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host " FASE 2: ENVIANDO DATOS MODIFICADOS A FIREBASE            " -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor Gray

$uploadCount = 0
if (-not $SoloLocal) {
    foreach ($docId in $processedOperators.Keys) {
        $op = $processedOperators[$docId]
        try {
            $evalJson = $op | ConvertTo-Json -Depth 8 -Compress
            $firestoreUrl = "https://firestore.googleapis.com/v1/projects/" + $ProjectId + "/databases/(default)/documents/evaluaciones_guias_tecnicas/" + $docId + "?updateMask.fieldPaths=sharpId&updateMask.fieldPaths=nombre&updateMask.fieldPaths=equipo&updateMask.fieldPaths=area&updateMask.fieldPaths=tipoGuia&updateMask.fieldPaths=fileLastModified&updateMask.fieldPaths=evaluationsJson&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=l6Progress&updateMask.fieldPaths=l7Progress&updateMask.fieldPaths=l8Progress"
            
            $bodyObj = @{
                fields = @{
                    sharpId = @{ stringValue = "$($op.sharpId)" }
                    nombre = @{ stringValue = "$($op.nombre)" }
                    equipo = @{ stringValue = "$($op.equipo)" }
                    area = @{ stringValue = "Cocimientos" }
                    tipoGuia = @{ stringValue = "$($op.tipoGuia)" }
                    fileLastModified = @{ stringValue = "$($op.fileLastModified)" }
                    l6Progress = @{ doubleValue = [double]$op.l6Pct }
                    l7Progress = @{ doubleValue = [double]$op.l7Pct }
                    l8Progress = @{ doubleValue = [double]$op.l8Pct }
                    evaluationsJson = @{ stringValue = "$evalJson" }
                    updatedAt = @{ stringValue = (Get-Date -Format "o") }
                }
            } | ConvertTo-Json -Depth 10 -Compress
            
            $response = Invoke-RestMethod -Uri $firestoreUrl -Method Patch -ContentType "application/json; charset=utf-8" -Body $bodyObj -TimeoutSec 10 -UseBasicParsing
            $uploadCount++
            Write-Host "[OK Firebase] SHARP: $($op.sharpId) | $($op.nombre) | Type: $($op.tipoGuia) | L6: $($op.l6Pct)%" -ForegroundColor Green
        } catch {
            Write-Host "[WARN] Red diferida para SHARP $($op.sharpId) -> $_" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[MODO PRUEBA SEGURA] Escritura a Firebase omitida. Datos guardados en $OutputFile" -ForegroundColor Yellow
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   EXTRACCION Y SINCRONIZACION COMPLETADAS               " -ForegroundColor Cyan
Write-Host "   Nuevos / Modificados : $processedCount" -ForegroundColor Green
Write-Host "   Subidos Directos     : $uploadCount" -ForegroundColor Green
Write-Host "   Archivo JSON         : $OutputFile" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""`;

const BAT_CODE = `@echo off
title Sincronizador de Guías Técnicas 2026
color 0A
cls

echo ==========================================================
echo    INICIANDO SINCRONIZADOR DE GUIAS TECNICAS (2026)
echo ==========================================================
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0sync_guias.ps1"

echo.
echo ==========================================================
echo   Proceso finalizado. Puedes cerrar esta ventana.
echo ==========================================================
pause
`;

const PRUEBA_SEGURA_BAT_CODE = `@echo off
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
`;

const SKAP_POWERSHELL_CODE = `# ==============================================================================
# SINCRONIZADOR SKAP CON MODO DEBUG Y DEPURACION COMPLETA EN ARCHIVO LOG
# ==============================================================================

$logPath = "$env:USERPROFILE\\Downloads\\log_skap_debug.txt"
"==========================================================" | Out-File $logPath -Encoding utf8
" INICIO DE DEPURACION SKAP: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $logPath -Append -Encoding utf8
"==========================================================" | Out-File $logPath -Append -Encoding utf8

function Log-Msg {
    param([string]$Message, [string]$Color = "White")
    $str = "[$(Get-Date -Format 'HH:mm:ss')] $Message"
    Write-Host $str -ForegroundColor $Color
    $str | Out-File -FilePath $logPath -Append -Encoding utf8
}

Log-Msg "Iniciando script de sincronizacion SKAP..." "Cyan"

# 1. Configurar Proxy Nativo de Windows y TLS 1.2 en el EV
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
try {
    [System.Net.WebRequest]::DefaultWebProxy = [System.Net.WebRequest]::GetSystemWebProxy()
    [System.Net.WebRequest]::DefaultWebProxy.Credentials = [System.Net.CredentialCache]::DefaultNetworkCredentials
    Log-Msg "Proxy de red corporativo y TLS 1.2 configurados correctamente." "Green"
} catch {
    Log-Msg "Advertencia al configurar Proxy: $_" "Yellow"
}

# 2. Rutas inteligentes de descargas (Multi-Carpeta)
$carpetasABuscar = [System.Collections.Generic.List[string]]::new()
try {
    $regFolder = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders').'{374DE290-123F-4565-9164-39C4925E467B}'
    if ($regFolder -and (Test-Path $regFolder)) { $carpetasABuscar.Add($regFolder) }
} catch {}
$carpetasABuscar.Add("$env:USERPROFILE\\Downloads")
$carpetasABuscar.Add("$env:USERPROFILE\\Desktop")

Log-Msg "Buscando archivo en carpetas: $($carpetasABuscar -join ', ')" "Gray"
Start-Sleep -Seconds 3

# 3. Buscar el .xlsx de 14 digitos mas reciente (soporta nombres con (1), (2) por descargas repetidas)
$archivoExcel = Get-ChildItem -Path $carpetasABuscar -Filter "*.xlsx" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match '\d{14}' -or $_.Name -like "*DATOS*" } | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1

if (-not $archivoExcel) {
    Log-Msg "ERROR CRITICO: No se encontro ningun archivo .xlsx con 14 digitos o DATOS en Downloads ni Desktop." "Red"
    Log-Msg "Por favor verifica si el archivo se guardo con otro formato o nombre." "Yellow"
    exit 1
}

Log-Msg "Archivo SKAP mas reciente detectado: $($archivoExcel.Name)" "Green"
Log-Msg "Ruta completa: $($archivoExcel.FullName)" "Gray"
Log-Msg "Ultima modificacion: $($archivoExcel.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))" "Gray"
Log-Msg "Tamaño del archivo: $($archivoExcel.Length) bytes" "Gray"

# 4. Sobrescribir DATOS.xlsx oficial sin duplicar nombres tipo (1)
try {
    $respaldo = Join-Path -Path "$env:USERPROFILE\\Downloads" -ChildPath "DATOS.xlsx"
    if (Test-Path $respaldo) {
        Remove-Item -Path $respaldo -Force -ErrorAction SilentlyContinue
    }
    Copy-Item -Path $archivoExcel.FullName -Destination $respaldo -Force
    Log-Msg "Copia oficial sobrescrita con exito como DATOS.xlsx" "Green"
} catch {
    Log-Msg "Advertencia al actualizar DATOS.xlsx (archivo posible bloqueo): $_" "Yellow"
}"
}

# 5. Notificar y subir estado a Firebase Firestore directamente con traza de errores
$projectId = "preview-bbe71"
$docId = "matriz_autonomias_skap"
$firestoreUrl = "https://firestore.googleapis.com/v1/projects/" + $projectId + "/databases/(default)/documents/datos_semanales/" + $docId + "?updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=nombreArchivo&updateMask.fieldPaths=estado"

$bodyObj = @{
    fields = @{
        nombreArchivo = @{ stringValue = "$($archivoExcel.Name)" }
        estado = @{ stringValue = "PROCESADO_AUTOMATICO_PAD" }
        updatedAt = @{ stringValue = (Get-Date -Format "o") }
    }
} | ConvertTo-Json -Depth 10 -Compress

try {
    Log-Msg "Conectando con Firebase Firestore REST API..." "Yellow"
    $response = Invoke-RestMethod -Uri $firestoreUrl -Method Patch -ContentType "application/json; charset=utf-8" -Body $bodyObj -TimeoutSec 15 -UseBasicParsing
    Log-Msg "¡EXITO TOTAL! Autonomias SKAP sincronizadas correctamente con Firebase." "Green"
} catch {
    Log-Msg "ERROR AL CONECTAR CON FIREBASE: $_" "Red"
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errBody = $reader.ReadToEnd()
            Log-Msg "Detalle de respuesta del servidor Firebase: $errBody" "Red"
        } catch {}
    }
}

Log-Msg "==========================================================" "Cyan"
Log-Msg " EXTRACCION DE DATOS SKAP FINALIZADA " "Cyan"
Log-Msg " Revisa el archivo log generado: $logPath" "Yellow"
Log-Msg "==========================================================" "Cyan"
`;

export function ScriptPortalDialog({ isOpen, onClose }: ScriptPortalDialogProps) {
  const usuario = useAuth();
  const isSuperAdmin = usuario?.email?.toLowerCase() === "ingsoftcecy@gmail.com" || usuario?.uid === "fDd4YkfBWYbji8fT8vKZs1LzimH3";

  const [activeTab, setActiveTab] = useState<"ps1" | "bat" | "json" | "skap" | "prueba">("ps1");
  const [copiedPs1, setCopiedPs1] = useState(false);
  const [copiedBat, setCopiedBat] = useState(false);
  const [copiedSkap, setCopiedSkap] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  if (!isOpen || !isSuperAdmin) return null;

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPs1 = () => {
    navigator.clipboard.writeText(POWERSHELL_CODE);
    setCopiedPs1(true);
    setTimeout(() => setCopiedPs1(false), 3000);
  };

  const handleCopyBat = () => {
    navigator.clipboard.writeText(BAT_CODE);
    setCopiedBat(true);
    setTimeout(() => setCopiedBat(false), 3000);
  };

  const handleCopySkap = () => {
    navigator.clipboard.writeText(SKAP_POWERSHELL_CODE);
    setCopiedSkap(true);
    setTimeout(() => setCopiedSkap(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("Procesando archivo JSON...");

    try {
      const text = await file.text();
      const records = JSON.parse(text);

      if (!Array.isArray(records)) {
        throw new Error("El archivo JSON debe contener un arreglo de registros.");
      }

      let count = 0;
      for (const op of records) {
        const docId = op.docId || op.sharpId || (op.nombre ? op.nombre.replace(/[^a-zA-Z0-9_-]/g, '_') : String(Math.random()));
        
        await setDoc(doc(db, "evaluaciones_guias_tecnicas", String(docId)), {
          sharpId: op.sharpId || "",
          nombre: op.nombre || "",
          equipo: op.equipo || "Cocimientos",
          area: "Cocimientos",
          l6Progress: Number(op.l6Pct || 0),
          l7Progress: Number(op.l7Pct || 0),
          l8Progress: Number(op.l8Pct || 0),
          evaluationsJson: JSON.stringify(op),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        count++;
      }

      setUploadStatus(`¡Éxito! Se subieron ${count} operadores a Firebase Firestore.`);
    } catch (err: any) {
      setUploadStatus(`Error al subir: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Dialog Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl text-yellow-400">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                Portal de Scripts EV — Sincronizador Local
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Copia estos scripts directamente a tu Escritorio Virtual o Power Automate Desktop.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Instruction Bar */}
        <div className="bg-slate-850 px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap gap-4 text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
            Selecciona la pestaña del script que necesitas.
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">2</span>
            Presiona <strong>Copiar Código</strong> y agrégalo a tu EV o Power Automate Desktop.
          </div>
        </div>

        {/* Tab Buttons Bar (Garantizada Visible con shrink-0) */}
        <div className="flex border-b border-slate-800 bg-slate-900 px-6 pt-3 gap-2 overflow-x-auto shrink-0 z-10 custom-scrollbar">
          <button
            onClick={() => setActiveTab("ps1")}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-t border-x transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "ps1"
                ? "bg-slate-950 border-slate-700 text-yellow-400 shadow-md"
                : "bg-slate-800/80 border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileCode className="w-4 h-4 text-blue-400" />
            1. Guías Técnicas (`sync_guias.ps1`)
          </button>

          <button
            onClick={() => setActiveTab("skap")}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-t border-x transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "skap"
                ? "bg-slate-950 border-slate-700 text-cyan-400 shadow-md"
                : "bg-slate-800/80 border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Database className="w-4 h-4 text-cyan-400" />
            2. Autonomías SKAP (`sync_datos_skap.ps1`)
          </button>

          <button
            onClick={() => setActiveTab("bat")}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-t border-x transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "bat"
                ? "bg-slate-950 border-slate-700 text-emerald-400 shadow-md"
                : "bg-slate-800/80 border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            3. Lanzador BAT (`Sincronizar_Guías.bat`)
          </button>

          <button
            onClick={() => setActiveTab("prueba")}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-t border-x transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "prueba"
                ? "bg-slate-950 border-slate-700 text-amber-400 shadow-md"
                : "bg-slate-800/80 border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Terminal className="w-4 h-4 text-amber-400" />
            4. Prueba Segura (`Prueba_Segura_Local.bat`)
          </button>

          <button
            onClick={() => setActiveTab("json")}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-t border-x transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "json"
                ? "bg-slate-950 border-slate-700 text-purple-400 shadow-md"
                : "bg-slate-800/80 border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Upload className="w-4 h-4 text-purple-400" />
            5. Cargar JSON (Web)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-950">
          {activeTab === "ps1" ? (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">sync_guias.ps1</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile("sync_guias.ps1", POWERSHELL_CODE)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                    Descargar .ps1
                  </button>
                  <button
                    onClick={handleCopyPs1}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    {copiedPs1 ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copiedPs1 ? "¡Código Copiado!" : "Copiar Código"}
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-slate-200 text-xs font-mono custom-scrollbar leading-relaxed">
                {POWERSHELL_CODE}
              </pre>
            </div>
          ) : activeTab === "skap" ? (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">sync_datos_skap.ps1</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile("sync_datos_skap.ps1", SKAP_POWERSHELL_CODE)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    Descargar .ps1
                  </button>
                  <button
                    onClick={handleCopySkap}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    {copiedSkap ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copiedSkap ? "¡Código Copiado!" : "Copiar Código"}
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-slate-200 text-xs font-mono custom-scrollbar leading-relaxed">
                {SKAP_POWERSHELL_CODE}
              </pre>
            </div>
          ) : activeTab === "bat" ? (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">Sincronizar_Guías.bat</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile("Sincronizar_Guías.bat", BAT_CODE)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    Descargar .bat
                  </button>
                  <button
                    onClick={handleCopyBat}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    {copiedBat ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copiedBat ? "¡Código Copiado!" : "Copiar Código"}
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-slate-200 text-xs font-mono custom-scrollbar leading-relaxed">
                {BAT_CODE}
              </pre>
            </div>
          ) : activeTab === "prueba" ? (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">Prueba_Segura_Local.bat (Sin subir a Firebase)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile("Prueba_Segura_Local.bat", PRUEBA_SEGURA_BAT_CODE)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-white" />
                    Descargar .bat de Prueba
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-slate-200 text-xs font-mono custom-scrollbar leading-relaxed">
                {PRUEBA_SEGURA_BAT_CODE}
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400">
                <Upload className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Cargar `resultado_extraccion.json` directamente al Dashboard</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Si la red corporativa bloquea el script de PowerShell, selecciona el archivo <strong>`resultado_extraccion.json`</strong> generado en la misma carpeta del script para sincronizar los 30 colaboradores instantáneamente vía navegador.
                </p>
              </div>

              <label className="mt-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                {uploading ? "Subiendo a Firebase..." : "Seleccionar resultado_extraccion.json"}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {uploadStatus && (
                <div className={`text-xs px-4 py-2 rounded-xl flex items-center gap-2 ${
                  uploadStatus.includes("Error") ? "bg-red-500/20 border border-red-500/40 text-red-300" : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  {uploadStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
