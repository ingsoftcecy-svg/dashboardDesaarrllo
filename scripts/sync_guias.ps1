# Sincronizador de Guias Tecnicas (Cocimientos) - Delta Sync & Clasificacion Competente/Mejorado
param (
    [string]$OneDrivePath = "",
    [string]$ProjectId = "preview-bbe71",
    [switch]$SoloLocal = $false
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SINCRONIZADOR DE GUIAS TECNICAS - AREA COCIMIENTOS    " -ForegroundColor Cyan
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
        $OneDrivePath = (Get-Item "$env:USERPROFILE\OneDrive - Anheuser-Busch InBev\Brewery Operations - *\5.0  Mantto\2026\04 ATO\03 ATO MEJORADO\Guias Tecnicas" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
    } catch {}
    if (-not $OneDrivePath) {
        try {
            $OneDrivePath = (Get-Item "$env:USERPROFILE\OneDrive - Anheuser-Busch InBev\Brewery Operations - *\5.0  Mantto\2026\04 ATO\*\Guias Tecnicas" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
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

    # 1. Filtro estricto: Omitir plantillas/anexos
    if ($fileNameRaw -like "*ANEXO*" -or $fileNameRaw -like "*Guías-Técnicas*" -or $fileNameRaw -like "*Guias-Tecnicas*" -or $fileNameRaw -like "*Plantilla*") {
        Write-Host "[OMITIDO - PLANTILLA/ANEXO] $($file.Name)" -ForegroundColor Gray
        continue
    }

    $sharpId = ""
    $operatorName = $fileNameRaw
    if ($fileNameRaw -match '^(\d{7,10})\s+(.+)$') {
        $sharpId = $matches[1]
        $operatorName = $matches[2]
    } else {
        Write-Host "[OMITIDO - NO ES OPERADOR] $($file.Name)" -ForegroundColor Gray
        continue
    }

    # Indicador de Formato Nuevo: Tener NUEVO, NUEVA o V2 en el nombre o ruta del archivo
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

# Seleccionar el MEJOR archivo V2 para cada SHARP ID
$pendingFiles = @()
foreach ($sharpId in $groupedCandidates.Keys) {
    $candidates = $groupedCandidates[$sharpId] | Sort-Object -Property @{Expression={$_.V2Score}; Descending=$true}, @{Expression={$_.LastWriteTime}; Descending=$true}
    
    $v2Candidates = $candidates | Where-Object { $_.V2Score -gt 0 }

    # Si ninguno tiene NUEVO/NUEVA/V2 en el nombre o ruta, tomamos el candidato más reciente para verificar si tiene hoja RESUMEN al abrirlo
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
    Write-Host "   TODOS LOS ARCHIVOS ESTAN AL DIA. NADA QUE PROCESAR.   " -ForegroundColor Green
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
Write-Host " FASE 1: LECTURA DINAMICA DE EXCEL (COCIMIENTOS Y FRIO)  " -ForegroundColor Yellow
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
        $relativePath = $file.FullName.Replace($OneDrivePath, "").TrimStart("\")
        $pathParts = $relativePath.Split("\")

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

        # Clasificación de tipoGuia
        $subPathLower  = $relativePath.ToLower()
        $fileNameLower = $file.Name.ToLower()
        $tipoGuia = "COMPETENTE"

        if ($subPathLower -like "*\mejorado\*" -or $subPathLower -like "*mejorado\*") {
            $tipoGuia = "MEJORADO"
        } elseif ($subPathLower -like "*\competente\*" -or $subPathLower -like "*competente\*") {
            $tipoGuia = "COMPETENTE"
        } elseif ($fileNameLower -like "*mejorado*") {
            $tipoGuia = "MEJORADO"
        } elseif ($fileNameLower -like "*competente*") {
            $tipoGuia = "COMPETENTE"
        }

        $cleanOperatorName = $operatorName -replace '\s+(COMPETENTE|MEJORADO)$', ''

        $wb = $excel.Workbooks.Open($file.FullName, 0, $true, 5, "", "", $true)
        $excel.Visible = $false
        $excel.DisplayAlerts = $false

        # FASE A: Leer primero la hoja "RESUMEN" para obtener porcentajes oficiales y categorías evaluadas
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

        # Mapeo de porcentajes y categorías evaluadas desde RESUMEN por nivel
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

        # Calcular avance por nivel directamente de RESUMEN
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

        # FASE B: Viajar a las hojas de detalle (L6, L7, L8) y extraer las categorías evaluadas
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

                            # 1. Validar LinkedCell de la casilla en Excel
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

                            # Evaluar única y estrictamente el valor de la Celda C y su casilla vinculada
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

# Cerrar Excel COM forzosamente sin dejar ventanas
try { $excel.Quit() } catch {}
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
[System.GC]::Collect()

# Guardar o actualizar siempre el archivo de cache local .sync_cache.json
try {
    $cacheJson = $syncCache | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText($CacheFile, $cacheJson, [System.Text.Encoding]::UTF8)
} catch {}

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
Write-Host ""
