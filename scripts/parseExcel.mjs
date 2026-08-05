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
  const filename = '26_Guías-Técnicas-Elaboración-V2 2026.xlsx';
  const outputFilename = 'guias_tecnicas.json';
  const filePath = path.join(publicDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File not found: ${filePath}`);
    return;
  }
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const result = {};

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
              currentCategory.skills.push(col1.trim());
            }
          }
        }
      });
      
      result[levelKey] = categories;
    }

    const outputPath = path.join(publicDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`✅ Parsed ${filename} -> ${outputFilename}`);
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

// "26_Guías-Técnicas-Elaboración-V2 2026.xlsx" -> guias_tecnicas.json
parseAndSaveGuias();

console.log('🎉 Done parsing Excel files.');



// --- Centralized Operators Generation ---









const firebaseConfig = {
  apiKey: "AIzaSyB7mdxoIdv04sA_2aoVKkzp-1k_TLj8Hw0",
  authDomain: "preview-bbe71.firebaseapp.com",
  projectId: "preview-bbe71",
  storageBucket: "preview-bbe71.firebasestorage.app",
  messagingSenderId: "171653395226",
  appId: "1:171653395226:web:8c54c619d7ce9aa1bcf2a3",
};



const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function readJson(filename) {
  const p = path.join(publicDir, filename);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  return [];
}

async function seedOperators() {
  console.log("🔄 Starting data centralization script...");

  const estructuraNuevaRows = readJson('estructura_nueva.json');
  const baseRows = readJson('base.json');
  const eacRows = readJson('eac.json');
  const eabfRows = readJson('eabf.json');
  const datosRows = readJson('datos.json');
  const workerAssignments = readJson('ips_cocimientos_kpi.json').workerAssignments || {};

  const operatorsMap = new Map();

  // 1. Base inference from excel files to get team and leader
  const eaMap = {};
  const leaderMap = {};

  if (estructuraNuevaRows.length > 0) {
    const idTranslations = {
      "32173442": "32043900", "32145333": "32044316", "32043835": "32145333",
      "32043900": "32045469", "32043739": "32043301", "32043861": "32043835",
      "32044301": "32043861", "32044319": "32045769"
    };
    for (const row of estructuraNuevaRows) {
      const id = row["SHARP"] ? String(row["SHARP"]).trim() : null;
      if (id) {
        const rawTeam = String(row["Nombre del Equipo"] || row["ESTRUCTURA DE EQUIPOS"] || "").trim();
        const match = rawTeam.match(/^\d+\.\s*(.*)$/);
        const cleanTeam = match ? match[1].trim() : rawTeam;
        const teamData = { equipo: cleanTeam, lider: String(row["Nombre del Lider"] || row["JEFE DIRECTO"] || "No asignado").trim() };
        eaMap[id] = teamData;
        if (idTranslations[id]) eaMap[idTranslations[id]] = teamData;
      }
    }
  } else {
    for (const row of baseRows) {
      const id = row["ID Sharp"] ? String(row["ID Sharp"]) : null;
      if (id) {
        const rawEquipo = String(row["Nombre del equipo "] || "").trim();
        eaMap[id] = { equipo: rawEquipo, lider: "No asignado" };
      }
    }
    for (const row of eacRows) {
      if (row["SHARP"]) {
        const id = String(row["SHARP"]).trim();
        if (!eaMap[id]) eaMap[id] = { equipo: row["Nombre del Equipo"] || "", lider: row["Nombre del Lider"] || "" };
      }
    }
    let lastEquipo = "", lastLider = "";
    for (const row of eabfRows) {
      if (row["NUEVO EQUIPO "]) lastEquipo = String(row["NUEVO EQUIPO "]).trim();
      if (row["NUEVO LIDER"]) lastLider = String(row["NUEVO LIDER"]).trim();
      if (row["SHARP"]) {
        const id = String(row["SHARP"]).trim();
        if (!eaMap[id]) eaMap[id] = { equipo: lastEquipo, lider: lastLider };
      }
    }
  }

  // Fetch overrides from Firebase
  console.log("📡 Fetching manual overrides from Firebase...");
  const overridesMap = {};
  const modifiedMap = {};
  
  try {
    const teamOverridesSnapshot = await getDocs(collection(db, "team_overrides"));
    teamOverridesSnapshot.forEach(doc => { overridesMap[doc.id] = doc.data(); });
    
    const modifiedOperatorsSnapshot = await getDocs(collection(db, "modified_operators"));
    modifiedOperatorsSnapshot.forEach(doc => { modifiedMap[doc.id] = doc.data(); });
  } catch (err) {
    console.warn("⚠️ Could not fetch Firebase overrides (permission denied). Using local data only.");
  }

  // 2. Build Operators from datos.json (which contains evaluations and names)
  for (const row of datosRows) {
    const employeeStr = String(row["Employee"] || "");
    const match = employeeStr.match(/\[(\d+)\]\s*(.*)/);
    if (!match) continue;

    const id = match[1].trim();
    let nombre = match[2].trim();
    
    // Custom names mapping from useExcelData
    if (id === "32111307") nombre = "FRANCISCO JAVIER VARELA";
    if (id === "32045556") nombre = "VICTOR MANUEL REYES VALLE";
    
    const puesto = String(row["SKAP Position"] || row["Position"] || "Desconocido").trim();
    const area = String(row["Department"] || "").trim().toLowerCase();
    
    if (!operatorsMap.has(id)) {
      operatorsMap.set(id, {
        id,
        nombre,
        puesto,
        area: area.includes("frio") || area.includes("frío") ? "bloque_frio" : area.includes("cocimiento") ? "cocimientos" : "mantenimiento",
        equipoAutonomo: "Sin Equipo",
        lider: "No asignado",
        roles: []
      });
    }
  }

  // Ensure all eaMap operators are included even if not in datos.json
  for (const [id, eaData] of Object.entries(eaMap)) {
    if (!operatorsMap.has(id)) {
      operatorsMap.set(id, {
        id,
        nombre: `Operador ${id}`, // We don't have the name from eaMap directly, maybe lookup structure
        puesto: "Desconocido",
        area: "desconocida",
        equipoAutonomo: "Sin Equipo",
        lider: "No asignado",
        roles: []
      });
    }
  }

  // 3. Apply inference and overrides
  for (const [id, op] of operatorsMap.entries()) {
    // 3.1 Inference from eaMap
    if (eaMap[id]) {
      op.equipoAutonomo = eaMap[id].equipo || "Sin Equipo";
      op.lider = eaMap[id].lider || "No asignado";
    }

    // 3.2 Manual overrides
    if (modifiedMap[id]) {
      if (modifiedMap[id].equipoAutonomo) op.equipoAutonomo = modifiedMap[id].equipoAutonomo;
      if (modifiedMap[id].puesto) op.puesto = modifiedMap[id].puesto;
      if (modifiedMap[id].nombre) op.nombre = modifiedMap[id].nombre;
    }

    // 3.3 Default assignments if "Sin Equipo"
    if (op.equipoAutonomo === "Sin Equipo" || !op.equipoAutonomo) {
      if (op.area === "bloque_frio") op.equipoAutonomo = "LOS FUERTES";
      else op.equipoAutonomo = "NAHUALES";
    }

    // 3.4 Team overrides for leader
    const teamUpper = op.equipoAutonomo.toUpperCase();
    if (overridesMap[teamUpper] && overridesMap[teamUpper].leader) {
      op.lider = overridesMap[teamUpper].leader;
    }
  }

  console.log(`📦 Found ${operatorsMap.size} operators. Saving to public/operators.json...`);

  // 4. Save to JSON
  const operatorsArray = Array.from(operatorsMap.values());
  const outputPath = path.join(publicDir, 'operators.json');
  import('fs').then(fs => {
    fs.writeFileSync(outputPath, JSON.stringify(operatorsArray, null, 2), 'utf-8');
    console.log(`✅ Finished saving ${operatorsArray.length} operators to public/operators.json.`);
    process.exit(0);
  });
}

seedOperators().catch(console.error);
