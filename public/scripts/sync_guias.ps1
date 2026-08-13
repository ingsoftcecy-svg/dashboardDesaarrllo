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
    if (-not $OneDrivePath) {
        try {
            $OneDrivePath = (Get-Item "$env:USERPROFILE\Anheuser-Busch InBev\Brewery Operations - *\5.0  Mantto*\Guias Tecnicas" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
        } catch {}
    }
    if (-not $OneDrivePath) {
        try {
            $OneDrivePath = (Get-Item "$env:USERPROFILE\Anheuser-Busch InBev\Brewery Operations - *\*\5.0  Mantto*\Guias Tecnicas" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
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
    if ($fileNameRaw -match '^(\d{7,10})\s+(.+)$') {
        $sharpId = $matches[1]
        $operatorName = $matches[2]
    } else {
        # Si el archivo no empieza con ID SHARP (7-10 dígitos), no es guía de operador
        Write-Host "[OMITIDO - NO ES OPERADOR] $($file.Name)" -ForegroundColor Gray
        continue
    }

    $docId = $sharpId
    $localLastMod = $file.LastWriteTimeUtc.ToString("o")

    # Comparar timestamp local vs marca remota (Firestore o local previa)
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

        # Clasificación de tipoGuia evaluando la subcarpeta relativa y nombre de archivo
        $subPathLower  = $relativePath.ToLower()
        $fileNameLower = $file.Name.ToLower()
        $tipoGuia = "COMPETENTE"

        if ($subPathLower -like "*\mejorado\*" -or $subPathLower -like "*mejorado\*") {
            $tipoGuia = "MEJORADO"
        } elseif ($subPathLower -like "*\tecnico\*" -or $subPathLower -like "*tecnico\*" -or $subPathLower -like "*\técnico\*" -or $subPathLower -like "*técnico\*" -or $subPathLower -like "*\tecnicos\*" -or $subPathLower -like "*tecnicos\*" -or $subPathLower -like "*\técnicos\*" -or $subPathLower -like "*técnicos\*") {
            $tipoGuia = "TECNICO"
        } elseif ($subPathLower -like "*\competente\*" -or $subPathLower -like "*competente\*") {
            $tipoGuia = "COMPETENTE"
        } elseif ($fileNameLower -like "*mejorado*") {
            $tipoGuia = "MEJORADO"
        } elseif ($fileNameLower -like "*tecnico*" -or $fileNameLower -like "*técnico*") {
            $tipoGuia = "TECNICO"
        } elseif ($fileNameLower -like "*competente*") {
            $tipoGuia = "COMPETENTE"
        }

        $cleanOperatorName = $operatorName -replace '\s+(COMPETENTE|MEJORADO|TECNICO|TÉCNICO|TECNICOS|TÉCNICOS)$', ''

        $processedCount++
        Write-Host "[$processedCount/$($pendingFiles.Count)] Leido: $($file.Name) ($area - $equipo - $tipoGuia)" -ForegroundColor White

        $wb = $excel.Workbooks.Open($file.FullName, 0, $true, 5, "", "", $true)

        $operatorRecord = [ordered]@{
            docId = $docId
            sharpId = $sharpId
            nombre = "$cleanOperatorName".Trim()
            equipo = $equipo
            area = $area
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
            if ($sheetName -like "*L6*" -or $sheetName -like "*N6*" -or $sheetName -like "*NIVEL 6*" -or $sheetName -like "*6*") { $detectedLevel = "L6" }
            elseif ($sheetName -like "*L7*" -or $sheetName -like "*N7*" -or $sheetName -like "*NIVEL 7*" -or $sheetName -like "*7*") { $detectedLevel = "L7" }
            elseif ($sheetName -like "*L8*" -or $sheetName -like "*N8*" -or $sheetName -like "*NIVEL 8*" -or $sheetName -like "*8*") { $detectedLevel = "L8" }
            elseif ($sheetName -like "*GUIA*" -or $sheetName -like "*FORMATO*" -or $sheetName -like "*MATRIZ*" -or $ws.Index -eq 1) { $detectedLevel = "L6" }

            # Para COMPETENTE, omitir L7 y L8
            if ($tipoGuia -eq "COMPETENTE" -and ($detectedLevel -eq "L7" -or $detectedLevel -eq "L8")) {
                continue
            }

            if ($detectedLevel -and -not $operatorRecord.niveles[$detectedLevel]) {
                $totalPreguntas = 0
                $marcadasSI = 0
                $categoriasList = @()
                $currentCategory = $null
                $formatoDetectado = "V1_VIEJO"

                $checkedRows = @{}
                try {
                    if ($ws.CheckBoxes.Count -gt 0) {
                        $formatoDetectado = "V2_NUEVO"
                        foreach ($cb in $ws.CheckBoxes) {
                            $cbRow = $cb.TopLeftCell.Row
                            if ($cb.Value -eq 1) {
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

                        # Detección Inteligente de Categorías
                        $isHeader = $false
                        $isFontBold = $false
                        try { $isFontBold = [bool]($ws.Cells.Item($row, 2).Font.Bold) } catch {}
                        if (-not $isFontBold) { try { $isFontBold = [bool]($ws.Cells.Item($row, 1).Font.Bold) } catch {} }

                        if ($textC -like "*%" -or ($isFontBold -and $skillText -eq $skillText.ToUpper() -and $skillText.Length -gt 3 -and $skillText.Length -lt 80)) {
                            $isHeader = $true
                        }

                        if ($isHeader) {
                            $pctText = $textC
                            if ($textC -as [double] -or $textC -as [single]) {
                                $pctVal = [math]::Round([double]$textC * 100)
                                $pctText = "$pctVal%"
                            }

                            $currentCategory = [ordered]@{
                                categoria = $skillText
                                porcentajeOficial = $pctText
                                habilidades = @()
                            }
                            $categoriasList += $currentCategory
                        }
                        elseif ($skillText.Length -gt 6) {
                            $totalPreguntas++
                            $isChecked = $false

                            if ($checkedRows.ContainsKey($row) -and $checkedRows[$row] -eq $true) {
                                $isChecked = $true
                            } else {
                                $valC = $textC.ToLower()
                                $valD = "$($ws.Cells.Item($row, 4).Value2)".Trim().ToLower()
                                $valE = "$($ws.Cells.Item($row, 5).Value2)".Trim().ToLower()
                                $valF = "$($ws.Cells.Item($row, 6).Value2)".Trim().ToLower()

                                $matchPattern = '1|x|si|s|certified|true|ok|cumple|competente|verdad|verdadero|v|c|✔|✓|aprobado'
                                if ($valC -match $matchPattern -or $valD -match $matchPattern -or $valE -match $matchPattern -or $valF -match $matchPattern) {
                                    $isChecked = $true
                                }
                            }

                            if ($isChecked) {
                                $marcadasSI++
                            }

                            $habilidadItem = [ordered]@{
                                fila = $row
                                habilidad = $skillText
                                marcado = $isChecked
                            }

                            if ($currentCategory) {
                                $currentCategory.habilidades += $habilidadItem
                            }
                        }
                    }
                }

                # Filtrar solo categorias que tengan habilidades o porcentaje evaluado
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
                    formato = $formatoDetectado
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
