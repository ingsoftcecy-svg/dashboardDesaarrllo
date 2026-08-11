import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

function parseAndSave(filename, sheetName, outputFilename, options = {}) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File not found: ${filePath}`);
    return;
  }
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const targetSheet = sheetName ? wb.Sheets[sheetName] : wb.Sheets[wb.SheetNames[0]];
    if (!targetSheet) {
      console.warn(`⚠️ Sheet ${sheetName} not found in ${filename}`);
      return;
    }
    
    const rows = XLSX.utils.sheet_to_json(targetSheet, options);
    const outputPath = path.join(publicDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2), 'utf-8');
    console.log(`✅ Parsed ${filename} (${sheetName || 'default'}) -> ${outputFilename}`);
  } catch (error) {
    console.error(`❌ Failed to parse ${filename}:`, error);
  }
}

function parseAndSaveGuias() {
  const filesInPublic = fs.readdirSync(publicDir);
  // Find the most recent Guías Técnicas Excel file
  const candidate = filesInPublic
    .filter(f => f.startsWith('26_Guías-Técnicas-Elaboración') && f.endsWith('.xlsx'))
    .sort((a, b) => b.localeCompare(a))[0];

  const filename = candidate || '26_Guías-Técnicas-Elaboración-V2---ANEXO (1).xlsx';
  const outputFilename = 'guias_tecnicas.json';
  const filePath = path.join(publicDir, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File not found: ${filePath}`);
    return;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    
    const isV2Anexo = wb.SheetNames.includes('RESUMEN') || wb.SheetNames.includes('ANEXO - Criterios transversales');
    const versionTag = isV2Anexo ? 'V2_ANEXO' : 'V1_ANTERIOR';

    const result = {
      metadata: {
        version: versionTag,
        fileProcessed: filename,
        tieneHojaResumen: isV2Anexo,
        processedAt: new Date().toISOString()
      },
      levels: {}
    };

    // Parse RESUMEN mapping if present
    if (wb.SheetNames.includes('RESUMEN')) {
      const resumenSheet = wb.Sheets['RESUMEN'];
      const resumenRows = XLSX.utils.sheet_to_json(resumenSheet, { header: 1 });
      const posMap = [];
      resumenRows.forEach((r, idx) => {
        if (idx >= 3 && r && r[0] && r[1]) {
          posMap.push({
            puesto: String(r[0]).trim(),
            equipoSala: String(r[1]).trim()
          });
        }
      });
      result.resumenMapeo = posMap;
    }

    // Parse Criterios Transversales if present
    if (wb.SheetNames.includes('ANEXO - Criterios transversales')) {
      const anexoSheet = wb.Sheets['ANEXO - Criterios transversales'];
      const anexoRows = XLSX.utils.sheet_to_json(anexoSheet, { header: 1 });
      const criterios = {};
      anexoRows.forEach((r, idx) => {
        if (idx >= 3 && r && r[0] && r[2]) {
          const lvl = String(r[0]).trim();
          if (lvl.match(/^L\d+/)) {
            criterios[lvl] = {
              enfoque: r[1] ? String(r[1]).trim() : '',
              competenciasTransversales: String(r[2]).trim(),
              evidenciaMinima: r[3] ? String(r[3]).trim() : '',
              aplicacion: r[4] ? String(r[4]).trim() : ''
            };
          }
        }
      });
      result.criteriosTransversales = criterios;
    }

    let totalGuiasCount = 0;

    for (const sheetName of wb.SheetNames) {
      const match = sheetName.match(/L\d+/);
      if (!match) continue;
      const levelKey = match[0];

      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const categories = [];
      let currentCategory = null;

      rows.forEach((row, index) => {
        if (!row || row.length === 0) return;
        if (index < 2) return;

        const col0 = row[0];
        const col1 = row[1];
        const col2 = row[2];

        const isCategory = !col0 && col1 && typeof col1 === 'string' && col1 === col1.toUpperCase() && (col2 === 0 || col2 === null || col2 === undefined || typeof col2 === 'string');

        if (isCategory) {
          currentCategory = {
            category: col1.trim(),
            skills: []
          };
          categories.push(currentCategory);
        } else {
          if (col1 && typeof col1 === 'string' && col1.trim().length > 0) {
            if (currentCategory) {
              const skillObj = {
                name: col1.trim(),
                metodoValidacion: row[3] && typeof row[3] === 'string' ? row[3].trim() : '',
                herramientas: row[4] && typeof row[4] === 'string' ? row[4].trim() : ''
              };
              currentCategory.skills.push(skillObj);
              totalGuiasCount++;
            }
          }
        }
      });

      result.levels[levelKey] = categories;
      // Backward compatibility array format: levelKey legacy key
      result[levelKey] = categories.map(cat => ({
        category: cat.category,
        skills: cat.skills.map(s => s.name)
      }));
    }

    result.metadata.totalGuias = totalGuiasCount;

    const outputPath = path.join(publicDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`✅ Parsed ${filename} (${versionTag}) -> ${outputFilename} (${totalGuiasCount} guías en total)`);
  } catch (error) {
    console.error(`❌ Failed to parse ${filename}:`, error);
  }
}

function parseAndOptimizeCursos() {
  const filename = 'Cursos.xlsx';
  const sheetName = 'Hoja1';
  const outputFilename = 'cursos.json';
  
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File not found: ${filePath}`);
    return;
  }
  
  try {
    const activeIds = new Set();
    const knownIds = [
      "32173442", "32043900", "32145333", "32044316", "32043835", "32045469", 
      "32043301", "32043739", "32043861", "32044301", "32045769", "32044319",
      "32197863", "32244174"
    ];
    knownIds.forEach(id => activeIds.add(id));

    // Cargar IDs de estructura_nueva.json si existe
    const estPath = path.join(publicDir, 'estructura_nueva.json');
    if (fs.existsSync(estPath)) {
      try {
        const estData = JSON.parse(fs.readFileSync(estPath, 'utf-8'));
        for (const row of estData) {
          if (row.SHARP) activeIds.add(String(row.SHARP).trim());
        }
      } catch (err) {
        console.error("Error reading structure for IDs:", err);
      }
    }

    // Cargar IDs de datos.json si existe
    const datosPath = path.join(publicDir, 'datos.json');
    if (fs.existsSync(datosPath)) {
      try {
        const datosData = JSON.parse(fs.readFileSync(datosPath, 'utf-8'));
        for (const row of datosData) {
          const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]/) : null;
          if (empMatch) activeIds.add(empMatch[1].trim());
        }
      } catch (err) {
        console.error("Error reading datos for IDs:", err);
      }
    }

    const translations = {
      "32173442": "32043900",
      "32145333": "32044316",
      "32043835": "32145333",
      "32043900": "32045469",
      "32043301": "32043739",
      "32043861": "32043835",
      "32044301": "32043861",
      "32044319": "32045769",
    };

    const targetIdsIncludesAlternative = (idGlobal) => {
      if (activeIds.has(idGlobal)) return true;
      const transVal = translations[idGlobal];
      if (transVal && activeIds.has(transVal)) return true;
      const transKey = Object.keys(translations).find(k => translations[k] === idGlobal);
      if (transKey && activeIds.has(transKey)) return true;
      return false;
    };

    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const targetSheet = wb.Sheets[sheetName];
    if (!targetSheet) {
      console.warn(`⚠️ Sheet ${sheetName} not found in ${filename}`);
      return;
    }
    
    const rows = XLSX.utils.sheet_to_json(targetSheet, { range: 14 });
    const optimizedRows = rows
      .filter(row => {
        const idGlobal = row["ID GLOBAL"] ? String(row["ID GLOBAL"]).trim() : "";
        return targetIdsIncludesAlternative(idGlobal);
      })
      .map(row => ({
        id: row["ID GLOBAL"] ? Number(row["ID GLOBAL"]) : null,
        n: row["Nombre de Curso"] ? String(row["Nombre de Curso"]).trim() : "",
        e: row["Estado"] ? String(row["Estado"]).trim() : "Pendiente",
        f: row["Fecha de aprobación"] || "-",
        m: row["Submódulo 1"] || "-"
      }));

    const outputPath = path.join(publicDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(optimizedRows, null, 2), 'utf-8');
    console.log(`✅ Parsed and optimized ${filename} -> ${outputFilename} (Reduced to ${optimizedRows.length} rows)`);

    // Generate courses summary for initial quick load
    const summary = {};
    for (const row of optimizedRows) {
      const id = row.id;
      if (!id) continue;
      
      if (!summary[id]) {
        summary[id] = { t: 0, a: 0, e: 0, p: 0 }; // t: total, a: aprobados, e: en progreso, p: pendientes
      }
      
      summary[id].t++;
      if (row.e === "Aprobado") {
        summary[id].a++;
      } else if (row.e === "En progreso") {
        summary[id].e++;
      } else {
        summary[id].p++;
      }
    }
    
    fs.writeFileSync(path.join(publicDir, 'cursos_resumen.json'), JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`✅ Generated cursos_resumen.json for ${Object.keys(summary).length} employees`);
  } catch (error) {
    console.error(`❌ Failed to parse ${filename}:`, error);
  }
}

function parseAndSaveBrechas() {
  const filename = '02. FORMATO_PLAN_CIERRE_DE_BRECHAS_2.0.xlsx';
  const sheetName = 'PLAN CIERRE DE BRECHAS';
  const outputFilename = 'brechas_resumen.json';
  const filePath = path.join(publicDir, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File not found: ${filePath}`);
    return;
  }

  try {
    // 1. Cargar IDs activos (empleados del dashboard)
    const activeIds = new Set();
    const knownIds = [
      "32173442", "32043900", "32145333", "32044316", "32043835", "32045469", 
      "32043301", "32043739", "32043861", "32044301", "32045769", "32044319",
      "32197863", "32244174"
    ];
    knownIds.forEach(id => activeIds.add(id));

    const estPath = path.join(publicDir, 'estructura_nueva.json');
    if (fs.existsSync(estPath)) {
      try {
        const estData = JSON.parse(fs.readFileSync(estPath, 'utf-8'));
        for (const row of estData) {
          if (row.SHARP) activeIds.add(String(row.SHARP).trim());
        }
      } catch (err) {}
    }

    const datosPath = path.join(publicDir, 'datos.json');
    if (fs.existsSync(datosPath)) {
      try {
        const datosData = JSON.parse(fs.readFileSync(datosPath, 'utf-8'));
        for (const row of datosData) {
          const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]/) : null;
          if (empMatch) activeIds.add(empMatch[1].trim());
        }
      } catch (err) {}
    }

    // Usar la tabla de traducción de IDs si el dashboard la usa
    const translations = {
      "32173442": "32043900",
      "32145333": "32044316",
      "32043835": "32145333",
      "32043900": "32045469",
      "32043301": "32043739",
      "32043861": "32043835",
      "32044301": "32043861",
      "32044319": "32045769",
    };

    const isTargetActive = (idGlobal) => {
      if (activeIds.has(idGlobal)) return true;
      if (translations[idGlobal] && activeIds.has(translations[idGlobal])) return true;
      const transKey = Object.keys(translations).find(k => translations[k] === idGlobal);
      if (transKey && activeIds.has(transKey)) return true;
      return false;
    };

    // 2. Leer Excel
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const targetSheet = wb.Sheets[sheetName];
    if (!targetSheet) {
      console.warn(`⚠️ Sheet ${sheetName} not found in ${filename}`);
      return;
    }

    const rows = XLSX.utils.sheet_to_json(targetSheet, { header: 1 });
    const summary = {};
    const missingEmployees = {};

    // Helper to convert Excel serial dates
    const excelDateToStr = (serial) => {
      if (!serial || typeof serial !== 'number') return null;
      const utc_days = Math.floor(serial - 25569);
      const d = new Date(utc_days * 86400 * 1000);
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    // Headers are at row index 2 (row[2]), data starts at row index 3
    // Columns:
    //  [0] AREA, [1] SUB AREA, [2] EQUIPO AUTÓNOMO, [3] SHARP ID, [4] NOMBRE
    //  [5] MÁQUINA/PROCESO/POSICIÓN, [6] ORIGEN DE BRECHA, [7] CONSECUTIVO
    //  [8] NIVEL, [9] PILAR, [10] ITEM, [11] DESCRIPCIÓN DEL ITEM
    //  [12] KPI IMPACTADO, [13] FECHA DETECCIÓN, [14] ACCIÓN PARA CERRAR
    //  [15] RESPONSABLE/LIDER, [16] ESTADO, [17] FECHA PROGRAMADA DE CIERRE
    //  [18] GANANCIA ESPERADA, [19] EVIDENCIA DE CIERRE
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const rawId = row[3];
      if (!rawId) continue;
      
      const idGlobal = String(rawId).trim();
      const nombre = row[4] ? String(row[4]).trim() : "Desconocido";
      const statusRaw = row[16] ? String(row[16]).trim() : "";
      const statusLower = statusRaw.toLowerCase();

      // Determine normalized status
      let estado = "";
      if (statusLower === "completado") estado = "Completado";
      else if (statusLower === "en proceso") estado = "En Proceso";

      if (!estado) continue; // Si no tiene un status válido (Completado/En Proceso), no es una brecha (ej. filas en blanco)

      if (!isTargetActive(idGlobal)) {
        if (!missingEmployees[idGlobal]) {
          missingEmployees[idGlobal] = { nombre, conteo: 0 };
        }
        missingEmployees[idGlobal].conteo++;
        continue;
      }

      if (!summary[idGlobal]) {
        summary[idGlobal] = { total: 0, completadas: 0, enProceso: 0, brechas: [] };
      }

      summary[idGlobal].total++;
      if (estado === "Completado") {
        summary[idGlobal].completadas++;
      } else if (estado === "En Proceso") {
        summary[idGlobal].enProceso++;
      }

      // Store individual brecha detail (compact)
      summary[idGlobal].brechas.push({
        desc: row[11] ? String(row[11]).trim().substring(0, 120) : "",
        nivel: row[8] ? String(row[8]).trim() : "",
        origen: row[6] ? String(row[6]).trim() : "",
        pilar: row[9] ? String(row[9]).trim() : "",
        estado,
        fechaCierre: excelDateToStr(row[17]),
        accion: row[14] ? String(row[14]).trim().substring(0, 100) : "",
        kpi: row[12] ? String(row[12]).trim() : "",
        fechaDeteccion: excelDateToStr(row[13]),
        ganancia: row[18] ? String(row[18]).trim() : "",
        evidencia: row[19] ? String(row[19]).trim() : ""
      });
    }

    // Calcular porcentaje
    Object.keys(summary).forEach(id => {
      const data = summary[id];
      data.porcentaje = data.total > 0 ? Number(((data.completadas / data.total) * 100).toFixed(2)) : 0;
    });

    const outputPath = path.join(publicDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`✅ Generated ${outputFilename} for ${Object.keys(summary).length} employees`);

    const missingKeys = Object.keys(missingEmployees);
    if (missingKeys.length > 0) {
      console.warn(`⚠️ Found ${missingKeys.length} employees in Plan de Cierre de Brechas that are NOT in the Dashboard.`);
      const missingPath = path.join(publicDir, 'brechas_faltantes.json');
      fs.writeFileSync(missingPath, JSON.stringify(missingEmployees, null, 2), 'utf-8');
      console.log(`📝 Wrote missing employees list to public/brechas_faltantes.json`);
    }

  } catch (error) {
    console.error(`❌ Failed to parse ${filename}:`, error);
  }
}

console.log('🔄 Parsing Excel files in public/ to JSON...');

// "0. BASE EQUIPOS AUTÓNOMOS CCZ (3).xlsx" -> base.json (hoja "BD_ZAC_OFICIAL")
parseAndSave('0. BASE EQUIPOS AUTÓNOMOS CCZ (3).xlsx', 'BD_ZAC_OFICIAL', 'base.json');

// "ESTRUCTURA NUEVA OFICIAL 2 EAs.xlsx" -> estructura_nueva.json (hoja "Personal Total")
parseAndSave('ESTRUCTURA NUEVA OFICIAL 2 EAs.xlsx', 'Personal Total', 'estructura_nueva.json', { range: 2 });

// "EAC.xlsx" -> eac.json
parseAndSave('EAC.xlsx', null, 'eac.json');

// "EABF.xlsx" -> eabf.json
parseAndSave('EABF.xlsx', null, 'eabf.json');

// "BPRE.xlsx" -> bpre.json
parseAndSave('BPRE.xlsx', null, 'bpre.json');

// "DATOS.xlsx" -> datos.json

parseAndSave('DATOS.xlsx', null, 'datos.json');

// Re-order datos.json by #POSICION (1, 2, 3)
try {
  const opsFile = path.join(publicDir, 'operators.json');
  const datosFile = path.join(publicDir, 'datos.json');
  if (fs.existsSync(opsFile) && fs.existsSync(datosFile)) {
    const opsData = JSON.parse(fs.readFileSync(opsFile, 'utf8'));
    const datosData = JSON.parse(fs.readFileSync(datosFile, 'utf8'));
    const opsMapById = {};
    opsData.forEach(o => { opsMapById[o.id] = o; });

    const grouped = {};
    const unmapped = [];
    datosData.forEach(r => {
      const emp = String(r.Employee || '');
      const idMatch = emp.match(/\[(\d+)\]/);
      if (idMatch) {
        const id = idMatch[1];
        if (!grouped[id]) grouped[id] = [];
        grouped[id].push(r);
      } else {
        unmapped.push(r);
      }
    });

    const orderedDatos = [];
    Object.keys(grouped).forEach(id => {
      const rows = grouped[id];
      const master = opsMapById[id];
      if (master && master.puesto) {
        const pIdx = rows.findIndex(r => String(r['SKAP Position'] || r.Position || '').trim().toLowerCase() === master.puesto.trim().toLowerCase());
        if (pIdx > 0) {
          const pRow = rows[pIdx];
          rows.splice(pIdx, 1);
          rows.unshift(pRow);
        }
      }
      orderedDatos.push(...rows);
    });
    orderedDatos.push(...unmapped);
    fs.writeFileSync(datosFile, JSON.stringify(orderedDatos, null, 2), 'utf-8');
    console.log('✅ Post-processed datos.json to prioritize Posición #1 puestos.');
  }
} catch (errPost) {
  console.error('Error post-processing datos.json:', errPost);
}


// "Cursos.xlsx" -> cursos.json (Optimizado y filtrado por IDs activos)
parseAndOptimizeCursos();

// "26_Guías-Técnicas-Elaboración-V2 2026.xlsx" -> guias_tecnicas.json
parseAndSaveGuias();

// "02. FORMATO_PLAN_CIERRE_DE_BRECHAS_2.0.xlsx" -> brechas_resumen.json
parseAndSaveBrechas();

console.log('🎉 Done parsing Excel files.');



// --- Centralized Operators Generation Disabled ---
// The public/operators.json file is now maintained statically based on alineacion_dashboard.csv
