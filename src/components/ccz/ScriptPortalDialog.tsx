import { useState, useEffect } from "react";
import { Copy, Check, Terminal, FileCode, X, Upload, CheckCircle2, Database, Download } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/lib/auth";

interface ScriptPortalDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const POWERSHELL_CODE = `# Sincronizador de Guias Tecnicas (Cocimientos y Bloque Frio) - Delta Sync & Clasificacion Competente/Mejorado
param (
    [string]$OneDrivePath = "",
    [string]$ProjectId = "preview-bbe71",
    [switch]$SoloLocal = $false
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SINCRONIZADOR DE GUIAS TECNICAS - AREA COCIMIENTOS & FRIO " -ForegroundColor Cyan
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
        $OneDrivePath = (Get-Item "$env:USERPROFILE\\OneDrive - Anheuser-Busch InBev\\Brewery Operations - *\\5.0  Mantto\\2026\\04 ATO\\03 ATO MEJORADO\\Guias Tecnicas" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
    } catch {}
    if (-not $OneDrivePath) {
        try {
            $OneDrivePath = (Get-Item "$env:USERPROFILE\\OneDrive - Anheuser-Busch InBev\\Brewery Operations - *\\5.0  Mantto\\2026\\04 ATO\\*\\Guias Tecnicas" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
        } catch {}
    }
}

if (-not $OneDrivePath -or -not (Test-Path -Path $OneDrivePath)) {
    Write-Host "[ERROR] No se encontro la carpeta de Guias Tecnicas 2026 en OneDrive." -ForegroundColor Red
    Write-Host "[AYUDA] Verifica si la carpeta 'Guias Tecnicas' existe en tu OneDrive corporativo." -ForegroundColor Yellow
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

# Group candidate files by SHARP ID to pick V2 (Formato Nuevo) and newest date
$groupedCandidates = @{}

foreach ($file in $excelFiles) {
    $fileNameRaw = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)

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
        Write-Host "[OMITIDO - NO ES OPERADOR] $($file.Name)" -ForegroundColor Gray
        continue
    }

    $fileNameUpper = $file.Name.ToUpper()
    $pathUpper = $file.FullName.ToUpper()

    $v2Score = 0
    if ($fileNameUpper -like "*NUEVO*" -or $fileNameUpper -like "*NUEVA*" -or $fileNameUpper -like "*V2*") { $v2Score += 200 }
    if ($pathUpper -like "*NUEVO*" -or $pathUpper -like "*NUEVA*" -or $pathUpper -like "*V2*") { $v2Score += 100 }

    $candidateObj = [pscustomobject]@{
        File = $file
        DocId = $sharpId
        SharpId = $sharpId
        OperatorName = $operatorName
        LocalLastMod = $file.LastWriteTimeUtc.ToString("o")
        V2Score = $v2Score
        LastWriteTime = $file.LastWriteTime
    }

    if (-not $groupedCandidates.ContainsKey($sharpId)) {
        $groupedCandidates[$sharpId] = @()
    }
    $groupedCandidates[$sharpId] += $candidateObj
}

$pendingFiles = @()
foreach ($sharpId in $groupedCandidates.Keys) {
    $candidates = $groupedCandidates[$sharpId] | Sort-Object -Property @{Expression={$_.V2Score}; Descending=$true}, @{Expression={$_.LastWriteTime}; Descending=$true}
    
    $v2Candidates = $candidates | Where-Object { $_.V2Score -gt 0 }

    $best = if ($v2Candidates.Count -gt 0) { $v2Candidates[0] } else { $candidates[0] }

    if ($candidates.Count -gt 1) {
        Write-Host "[CANDIDATO SELECCIONADO] SHARP: $sharpId -> $($best.File.Name) (Score V2: $($best.V2Score))" -ForegroundColor Yellow
    }

    $docId = $best.DocId
    $localLastMod = $best.LocalLastMod
    $prevTimeStr = if ($syncCache.ContainsKey($docId)) { "$($syncCache[$docId])" } elseif ($syncCache.ContainsKey($best.File.Name)) { "$($syncCache[$best.File.Name])" } else { $null }

    if (-not $SoloLocal -and $prevTimeStr) {
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
            Write-Host "[SIN CAMBIOS - OMITIDO] $($best.File.Name) (SHARP: $docId)" -ForegroundColor Gray
            continue
        }
    }

    $pendingFiles += $best
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
try { $excel.AutomationSecurity = 3 } catch {}
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.ScreenUpdating = $false
$excel.EnableEvents = $false
try { $excel.AskToUpdateLinks = $false } catch {}

$processedOperators = [ordered]@{}
$processedCount = 0

Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host " FASE 1: LECTURA DINAMICA DE EXCEL (COCIMIENTOS & FRIO)   " -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor Gray

foreach ($item in $pendingFiles) {
    $file = $item.File
    $docId = $item.DocId
    $sharpId = $item.SharpId
    $operatorName = $item.OperatorName
    $wb = $null

    try {
        if ($processedOperators.Contains($docId)) {
            $syncCache[$docId] = $item.LocalLastMod
            $syncCache[$file.Name] = $item.LocalLastMod
            continue
        }

        # Extraer ruta relativa dentro de Guias Tecnicas
        $relativePath = $file.FullName.Replace($OneDrivePath, "").TrimStart("\\")
        $pathParts = $relativePath.Split("\\")

        $area = "Cocimientos"
        $equipo = "Cocimientos"
        $subcarpeta = "General"

        if ($pathParts.Count -gt 0 -and ($pathParts[0] -like "*BLOQUE*FRIO*" -or $pathParts[0] -like "*BLOQUE*FRÍO*")) {
            $area = "Bloque Frío"
            if ($pathParts.Count -gt 1) { $equipo = $pathParts[1] } else { $equipo = "Bloque Frío" }
            if ($pathParts.Count -gt 2) { $subcarpeta = $pathParts[2] }
        } else {
            $area = "Cocimientos"
            if ($pathParts.Count -gt 0) { $equipo = $pathParts[0] }
            if ($pathParts.Count -gt 1) { $subcarpeta = $pathParts[1] }
        }

        # Normalizar nombres de equipos
        $eqUpper = $equipo.ToUpper().Trim()
        if ($eqUpper -eq "BRAVOS") { $equipo = "BRAVOS DEL FRIO" }
        elseif ($eqUpper -eq "BRONCOS") { $equipo = "LOS BRONCOS" }
        elseif ($eqUpper -eq "FUERTES") { $equipo = "LOS FUERTES DEL FRIO" }
        elseif ($eqUpper -eq "REYES") { $equipo = "REYES DE LA MEZCLA" }
        elseif ($eqUpper -like "*CAZADORES*") { $equipo = "LOS CAZADORES DEL AMARGOR" }
        elseif ($eqUpper -like "*MOSTO*") { $equipo = "MOSTO-BOYS" }
        elseif ($eqUpper -like "*PANCHITOS*") { $equipo = "LOS PANCHITOS" }
        elseif ($eqUpper -like "*CUCHILLAS*") { $equipo = "CUCHILLAS" }
        elseif ($eqUpper -like "*MASH*") { $equipo = "MASH-RAINBOW" }

        # Clasificación de tipoGuia evaluando la subcarpeta relativa y nombre de archivo
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
        Write-Host "[$processedCount/$($pendingFiles.Count)] Leido: $($file.Name) ($area - $equipo - $tipoGuia)" -ForegroundColor White

        $wb = $excel.Workbooks.Open($file.FullName, 0, $true, 5, "", "", $true)

        $resumenSheet = $null
        foreach ($checkWs in $wb.Sheets) {
            if ($checkWs.Name.ToUpper() -like "*RESUMEN*") {
                $resumenSheet = $checkWs
                break
            }
        }

        if (-not $resumenSheet) {
            Write-Host "[OMITIDO - NO TIENE HOJA RESUMEN] $($file.Name) (SHARP: $docId)" -ForegroundColor Gray
            $wb.Close($false)
            continue
        }

        $processedCount++
        Write-Host "[$processedCount/$($pendingFiles.Count)] PROCESANDO GUÍA V2 (RESUMEN ENCONTRADO): $($file.Name) ($area - $equipo)" -ForegroundColor Green

        $resumenEvalMap = @{
            "L6" = [ordered]@{}
            "L7" = [ordered]@{}
            "L8" = [ordered]@{}
        }

        function Helper-ParsePct ($rawVal) {
            if (-not $rawVal) { return 0 }
            $s = "$rawVal".Replace("%", "").Trim()
            if ($s -as [double]) {
                $n = [double]$s
                if ($n -gt 0 -and $n -le 1.0) { return [math]::Round($n * 100, 1) }
                return [math]::Round($n, 1)
            }
            return 0
        }

        for ($r = 4; $r -le 25; $r++) {
            $catName = "$($resumenSheet.Cells.Item($r, 2).Value2)".Trim()
            $vL6 = "$($resumenSheet.Cells.Item($r, 3).Value2)".Trim()
            $vL7 = "$($resumenSheet.Cells.Item($r, 4).Value2)".Trim()
            $vL8 = "$($resumenSheet.Cells.Item($r, 5).Value2)".Trim()

            if ($catName.Length -gt 2) {
                $pL6 = Helper-ParsePct $vL6
                $pL7 = Helper-ParsePct $vL7
                $pL8 = Helper-ParsePct $vL8

                if ($pL6 -gt 0) { $resumenEvalMap["L6"][$catName.ToUpper()] = "$pL6%" }
                if ($pL7 -gt 0) { $resumenEvalMap["L7"][$catName.ToUpper()] = "$pL7%" }
                if ($pL8 -gt 0) { $resumenEvalMap["L8"][$catName.ToUpper()] = "$pL8%" }
            }
        }

        $calcL6 = 0; if ($resumenEvalMap["L6"].Count -gt 0) { $sum = 0; foreach ($v in $resumenEvalMap["L6"].Values) { $sum += (Helper-ParsePct $v) }; $calcL6 = [math]::Round($sum / $resumenEvalMap["L6"].Count, 1) }
        $calcL7 = 0; if ($resumenEvalMap["L7"].Count -gt 0) { $sum = 0; foreach ($v in $resumenEvalMap["L7"].Values) { $sum += (Helper-ParsePct $v) }; $calcL7 = [math]::Round($sum / $resumenEvalMap["L7"].Count, 1) }
        $calcL8 = 0; if ($resumenEvalMap["L8"].Count -gt 0) { $sum = 0; foreach ($v in $resumenEvalMap["L8"].Values) { $sum += (Helper-ParsePct $v) }; $calcL8 = [math]::Round($sum / $resumenEvalMap["L8"].Count, 1) }

        $detectedTipoGuia = "COMPETENTE"
        if ($calcL7 -gt 0 -or $calcL8 -gt 0) { $detectedTipoGuia = "MEJORADO" }

        $operatorRecord = [ordered]@{
            docId = $docId
            sharpId = $sharpId
            nombre = "$cleanOperatorName".Trim()
            equipo = $equipo
            area = $area
            subcarpeta = $subcarpeta
            tipoGuia = $detectedTipoGuia
            fileLastModified = $item.LocalLastMod
            archivo = $file.Name
            l6Pct = $calcL6
            l7Pct = $calcL7
            l8Pct = $calcL8
            niveles = [ordered]@{}
        }

        foreach ($ws in $wb.Sheets) {
            $sheetName = $ws.Name

            if ($sheetName -like "*RESUMEN*" -or $sheetName -like "*PORTADA*" -or $sheetName -like "*INSTRUCCIONES*") {
                continue
            }

            $detectedLevel = ""
            if ($sheetName -like "*L6*" -or $sheetName -like "*N6*" -or $sheetName -like "*NIVEL 6*") { $detectedLevel = "L6" }
            elseif ($sheetName -like "*L7*" -or $sheetName -like "*N7*" -or $sheetName -like "*NIVEL 7*") { $detectedLevel = "L7" }
            elseif ($sheetName -like "*L8*" -or $sheetName -like "*N8*" -or $sheetName -like "*NIVEL 8*") { $detectedLevel = "L8" }
            elseif ($sheetName -like "*GUIA*" -or $sheetName -like "*MATRIZ*") { $detectedLevel = "L6" }

            if ($detectedLevel -and -not $operatorRecord.niveles[$detectedLevel]) {
                $targetMap = $resumenEvalMap[$detectedLevel]

                $categoriasList = @()
                $currentCategory = $null
                $isCurrentCatEvaluated = $false

                $checkedRows = @{}
                try {
                    if ($ws.CheckBoxes.Count -gt 0) {
                        foreach ($cb in $ws.CheckBoxes) {
                            $cbRow = $cb.TopLeftCell.Row
                            $isCbChecked = $false

                            if ($cb.LinkedCell -and $cb.LinkedCell.Length -gt 0) {
                                try {
                                    $linkedVal = "$($ws.Range($cb.LinkedCell).Value2)".Trim().ToUpper()
                                    if ($linkedVal -eq "TRUE" -or $linkedVal -eq "1" -or $linkedVal -eq "VERDADERO") {
                                        $isCbChecked = $true
                                    }
                                } catch {}
                            }

                            if ($isCbChecked) {
                                $checkedRows[$cbRow] = $true
                            }
                        }
                    }
                } catch {}

                for ($row = 2; $row -le 180; $row++) {
                    $textA = "$($ws.Cells.Item($row, 1).Value2)".Trim()
                    $textB = "$($ws.Cells.Item($row, 2).Value2)".Trim()
                    $textC = "$($ws.Cells.Item($row, 3).Value2)".Trim()

                    $skillText = if ($textB.Length -gt 4) { $textB } elseif ($textA.Length -gt 4) { $textA } elseif ($textC.Length -gt 4) { $textC } else { "" }

                    if ($skillText.Length -gt 0 -and $skillText -notlike "*INSTRUCCIONES*" -notlike "*COMPETENCIAS*" -notlike "*NOMBRE*" -notlike "*FECHA*") {

                        $isHeader = $false
                        $isFontBold = $false
                        try { $isFontBold = [bool]($ws.Cells.Item($row, 2).Font.Bold) } catch {}
                        if (-not $isFontBold) { try { $isFontBold = [bool]($ws.Cells.Item($row, 1).Font.Bold) } catch {} }

                        if ($textC -like "*%" -or ($isFontBold -and $skillText -eq $skillText.ToUpper() -and $skillText.Length -gt 3 -and $skillText.Length -lt 80)) {
                            $isHeader = $true
                        }

                        if ($isHeader) {
                            $normCatName = $skillText.ToUpper().Trim()
                            $matchedPct = $null

                            foreach ($k in $targetMap.Keys) {
                                if ($normCatName.Contains($k) -or $k.Contains($normCatName)) {
                                    $matchedPct = $targetMap[$k]
                                    break
                                }
                            }

                            if ($matchedPct -or ($targetMap.Count -eq 0 -and $textC -like "*%" -and $textC -ne "0%")) {
                                $isCurrentCatEvaluated = $true
                                $currentCategory = [ordered]@{
                                    categoria = $skillText
                                    porcentajeOficial = if ($matchedPct) { $matchedPct } else { $textC }
                                    habilidades = @()
                                }
                                $categoriasList += $currentCategory
                            } else {
                                $isCurrentCatEvaluated = $false
                                $currentCategory = $null
                            }
                        }
                        elseif ($isCurrentCatEvaluated -and $currentCategory -and $skillText.Length -gt 6) {
                            $isChecked = $false

                            if ($checkedRows.ContainsKey($row) -and $checkedRows[$row] -eq $true) {
                                $isChecked = $true
                            } else {
                                $valC = $textC.ToUpper()
                                if ($valC -eq "VERDADERO" -or $valC -eq "TRUE" -or $valC -eq "1" -or $valC -eq "SI" -or $valC -eq "SÍ" -or $valC -eq "X" -or $valC.Contains([char]0x2611) -or $valC.Contains([char]0x2714) -or $valC.Contains([char]0x2713)) {
                                    $isChecked = $true
                                }
                            }

                            $habilidadItem = [ordered]@{
                                fila = $row
                                habilidad = $skillText
                                marcado = $isChecked
                            }

                            $currentCategory.habilidades += $habilidadItem
                        }
                    }
                }

                $levelPctVal = 0
                if ($detectedLevel -eq "L6") { $levelPctVal = $calcL6 }
                elseif ($detectedLevel -eq "L7") { $levelPctVal = $calcL7 }
                elseif ($detectedLevel -eq "L8") { $levelPctVal = $calcL8 }

                $totalHabs = ($categoriasList | ForEach-Object { $_.habilidades.Count } | Measure-Object -Sum).Sum
                $aprobHabs = ($categoriasList | ForEach-Object { ($_.habilidades | Where-Object { $_.marcado -eq $true }).Count } | Measure-Object -Sum).Sum

                $operatorRecord.niveles[$detectedLevel] = [ordered]@{
                    pestana = $sheetName
                    formato = "V2_NUEVO"
                    porcentajeAvanceGlobal = "$levelPctVal%"
                    totalHabilidades = $totalHabs
                    habilidadesAprobadas = $aprobHabs
                    categorias = $categoriasList
                }
            }
        }

        $wb.Close($false)
        $wb = $null
        $processedOperators[$docId] = $operatorRecord
        $syncCache[$docId] = $item.LocalLastMod
        $syncCache[$file.Name] = $item.LocalLastMod
    }
    catch {
        Write-Host "[ERROR] En $($file.Name): $_" -ForegroundColor Red
        if ($wb) { try { $wb.Close($false) } catch {} }
    }
}

try { $excel.Quit() } catch {}
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
[System.GC]::Collect()

try {
    $cacheJson = $syncCache | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText($CacheFile, $cacheJson, [System.Text.Encoding]::UTF8)
} catch {}

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
                    area = @{ stringValue = "$($op.area)" }
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
            Write-Host "[OK Firebase] SHARP: $($op.sharpId) | $($op.nombre) | Area: $($op.area) | Team: $($op.equipo) | Type: $($op.tipoGuia) | L6: $($op.l6Pct)%" -ForegroundColor Green
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

  const [activeTab, setActiveTab] = useState<"ps1" | "bat" | "json" | "skap" | "prueba" | "brechas">("ps1");
  const [copiedPs1, setCopiedPs1] = useState(false);
  const [copiedBat, setCopiedBat] = useState(false);
  const [copiedSkap, setCopiedSkap] = useState(false);
  const [copiedBrechas, setCopiedBrechas] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [brechasScriptContent, setBrechasScriptContent] = useState<string>("Cargando script...");

  useEffect(() => {
    if (activeTab === "brechas" && brechasScriptContent === "Cargando script...") {
      fetch(`/scripts/office_script_brechas.ts?t=${Date.now()}`)
        .then(r => r.text())
        .then(setBrechasScriptContent)
        .catch(() => setBrechasScriptContent("Error al cargar el script."));
    }
  }, [activeTab]);

  if (!isOpen || !isSuperAdmin) return null;

  const handleDownloadFile = async (filename: string, fallbackContent: string) => {
    try {
      const res = await fetch(`/scripts/${filename}?t=${Date.now()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {}

    const blob = new Blob([fallbackContent], { type: "text/plain;charset=utf-8" });
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

  const handleCopyBrechas = () => {
    navigator.clipboard.writeText(brechasScriptContent);
    setCopiedBrechas(true);
    setTimeout(() => setCopiedBrechas(false), 3000);
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

      setUploadStatus(`¡Éxito! Se subieron ${count} operadores a la base de datos central.`);
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

          <button
            onClick={() => setActiveTab("brechas")}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-t border-x transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "brechas"
                ? "bg-slate-950 border-slate-700 text-pink-400 shadow-md"
                : "bg-slate-800/80 border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileCode className="w-4 h-4 text-pink-400" />
            6. Brechas (Office Script)
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
          ) : activeTab === "brechas" ? (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">office_script_brechas.ts</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile("office_script_brechas.ts", brechasScriptContent)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-pink-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-pink-400" />
                    Descargar .ts
                  </button>
                  <button
                    onClick={handleCopyBrechas}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    {copiedBrechas ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copiedBrechas ? "¡Código Copiado!" : "Copiar Código"}
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-slate-200 text-xs font-mono custom-scrollbar leading-relaxed">
                {brechasScriptContent}
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
                {uploading ? "Subiendo datos..." : "Seleccionar resultado_extraccion.json"}
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
