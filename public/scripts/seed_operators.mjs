import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
const publicDir = join(__dirname, '..', 'public');

function readJson(filename) {
  const path = join(publicDir, filename);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8'));
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
  const outputPath = join(publicDir, 'operators.json');
  import('fs').then(fs => {
    fs.writeFileSync(outputPath, JSON.stringify(operatorsArray, null, 2), 'utf-8');
    console.log(`✅ Finished saving ${operatorsArray.length} operators to public/operators.json.`);
    process.exit(0);
  });
}

seedOperators().catch(console.error);
