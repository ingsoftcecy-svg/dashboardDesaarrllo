import fs from 'fs';
import path from 'path';
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

// "Cursos.xlsx" -> cursos.json (Optimizado y filtrado por IDs activos)
parseAndOptimizeCursos();

console.log('🎉 Done parsing Excel files.');
