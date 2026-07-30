# Sincronizador de Guias Tecnicas (Cocimientos) - Proxy Nativo & Dual Sync
param (
    [string]$OneDrivePath = "",
    [string]$ProjectId = "preview-bbe71",
    [switch]$SoloLocal = $false
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SINCRONIZADOR DE GUIAS TECNICAS - AREA COCIMIENTOS    " -ForegroundColor Cyan
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
        $OneDrivePath = (Get-Item "$env:USERPROFILE\OneDrive - Anheuser-Busch InBev\Brewery Operations - *\5.0  Mantto\2026\04 ATO\03 ATO MEJORADO\Guias Tecnicas" -ErrorAction SilentlyContinue).FullName
    } catch {}
}

if (-not $OneDrivePath -or -not (Test-Path -Path $OneDrivePath)) {
    Write-Host "[ERROR] No se encontro la carpeta de Guias Tecnicas 2026." -ForegroundColor Red
    exit 1
}

$OutputFile = Join-Path -Path $PSScriptRoot -ChildPath "resultado_extraccion.json"
Write-Host "[INFO] Carpeta Encontrada: $OneDrivePath" -ForegroundColor Green
Write-Host ""

$excelFiles = Get-ChildItem -Path $OneDrivePath -Recurse -Filter "*.xlsx" -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "~$*" }
Write-Host "[INFO] Archivos encontrados: $($excelFiles.Count)" -ForegroundColor Green
Write-Host ""

# Configuracion Anti-Bloqueos de Excel COM
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.ScreenUpdating = $false
$excel.EnableEvents = $false
try { $excel.AskToUpdateLinks = $false } catch {}
try { $excel.AutomationSecurity = 3 } catch {}

$processedOperators = [ordered]@{}
$processedCount = 0

Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host " FASE 1: LECTURA LOCAL DE ARCHIVOS EXCEL                  " -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor Gray

foreach ($file in $excelFiles) {
    $wb = $null
    try {
        $fileNameRaw = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
        
        $sharpId = ""
        $operatorName = $fileNameRaw
        if ($fileNameRaw -match '^(\d{7,10})\s+(.+)$') {
            $sharpId = $matches[1]
            $operatorName = $matches[2]
        }
        
        $docId = if ($sharpId) { $sharpId } else { $operatorName -replace '[^a-zA-Z0-9_-]', '_' }
        
        if ($processedOperators.Contains($docId)) {
            Write-Host "[OMITIDO] $fileNameRaw (SHARP $docId ya procesado)" -ForegroundColor Yellow
            continue
        }
        
        $relativePath = $file.FullName.Replace($OneDrivePath, "").TrimStart("\")
        $pathParts = $relativePath.Split("\")
        $equipo = if ($pathParts.Count -gt 1) { $pathParts[0] } else { "Cocimientos" }
        $subcarpeta = if ($pathParts.Count -gt 2) { $pathParts[1] } else { "General" }
        
        $processedCount++
        Write-Host "[$processedCount/$($excelFiles.Count)] Leido: $($file.Name)" -ForegroundColor White
        
        $wb = $excel.Workbooks.Open($file.FullName, 0, $true, 5, "", "", $true)
        
        $operatorRecord = [ordered]@{
            docId = $docId
            sharpId = $sharpId
            nombre = "$operatorName".Trim()
            equipo = $equipo
            area = "Cocimientos"
            subcarpeta = $subcarpeta
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
                
                for ($row = 3; $row -le 120; $row++) {
                    $textB = "$($ws.Cells.Item($row, 2).Value2)".Trim()
                    $cellC = "$($ws.Cells.Item($row, 3).Value2)".Trim()
                    
                    if ($textB.Length -gt 0 -and $textB -notlike "*INSTRUCCIONES*" -notlike "*COMPETENCIAS*") {
                        
                        $isHeader = $false
                        if ($cellC -like "*%" -or ($ws.Cells.Item($row, 2).Font.Bold -and $cellC -ne "")) {
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
                        elseif ($textB.Length -gt 8) {
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
                    categorias = $categoriasList
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

# Cerrar Excel COM inmediatamente para liberar memoria
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
[System.GC]::Collect()

# Guardar resultado_extraccion.json localmente siempre
$allDataList = @($processedOperators.Values)
$jsonResult = $allDataList | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($OutputFile, $jsonResult, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host " FASE 2: ENVIANDO DATOS A FIREBASE                        " -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor Gray

$uploadCount = 0
if (-not $SoloLocal) {
    foreach ($docId in $processedOperators.Keys) {
        $op = $processedOperators[$docId]
        try {
            $evalJson = $op | ConvertTo-Json -Depth 8 -Compress
            $firestoreUrl = "https://firestore.googleapis.com/v1/projects/" + $ProjectId + "/databases/(default)/documents/evaluaciones_guias_tecnicas/" + $docId + "?updateMask.fieldPaths=sharpId&updateMask.fieldPaths=nombre&updateMask.fieldPaths=equipo&updateMask.fieldPaths=area&updateMask.fieldPaths=evaluationsJson&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=l6Progress&updateMask.fieldPaths=l7Progress&updateMask.fieldPaths=l8Progress"
            
            $bodyObj = @{
                fields = @{
                    sharpId = @{ stringValue = "$($op.sharpId)" }
                    nombre = @{ stringValue = "$($op.nombre)" }
                    equipo = @{ stringValue = "$($op.equipo)" }
                    area = @{ stringValue = "Cocimientos" }
                    l6Progress = @{ doubleValue = [double]$op.l6Pct }
                    l7Progress = @{ doubleValue = [double]$op.l7Pct }
                    l8Progress = @{ doubleValue = [double]$op.l8Pct }
                    evaluationsJson = @{ stringValue = "$evalJson" }
                    updatedAt = @{ stringValue = (Get-Date -Format "o") }
                }
            } | ConvertTo-Json -Depth 10 -Compress
            
            $response = Invoke-RestMethod -Uri $firestoreUrl -Method Patch -ContentType "application/json; charset=utf-8" -Body $bodyObj -TimeoutSec 5 -UseBasicParsing
            $uploadCount++
            Write-Host "[OK] Firebase -> SHARP: $($op.sharpId) | L6: $($op.l6Pct)% | L7: $($op.l7Pct)% | L8: $($op.l8Pct)%" -ForegroundColor Green
        } catch {
            Write-Host "[WARN] Red diferida para SHARP $($op.sharpId) -> Usar boton 'Cargar JSON' en el Dashboard." -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   EXTRACCION Y SINCRONIZACION COMPLETADAS               " -ForegroundColor Cyan
Write-Host "   Total Procesados : $processedCount" -ForegroundColor Green
Write-Host "   Subidos Directos : $uploadCount" -ForegroundColor Green
Write-Host "   Archivo JSON     : $OutputFile" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
