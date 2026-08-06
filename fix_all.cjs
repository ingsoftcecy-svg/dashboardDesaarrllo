const fs = require('fs');

// === STEP 1: Read the official CSV (135 operators) ===
const csvRaw = fs.readFileSync('alineacion_dashboard.csv', 'utf8').trim().split('\n');
console.log('CSV lines (including header):', csvRaw.length);

// === STEP 2: Read base.json for champion data ===
const baseRows = JSON.parse(fs.readFileSync('public/base.json', 'utf8'));

const getChampion = (raw) => {
  const s = String(raw || "").trim().toLowerCase();
  if (s.includes("seg")) return "seguridad";
  if (s.includes("calidad") || s.includes("quas")) return "calidad";
  if (s.includes("amb")) return "ambiental";
  if (s.includes("mant")) return "mantenimiento";
  if (s.includes("gest")) return "gestion";
  if (s.includes("gent")) return "gente";
  if (s.includes("log") || s.includes("pnc")) return "logistica";
  return null;
};

// Build champion map from base.json
const championMap = {};
for (const row of baseRows) {
  const id = String(row["ID Sharp"] || "").trim();
  const champ = getChampion(row["CHAMPION"]);
  if (id && champ) championMap[id] = [champ];
}

// Also check other sources
const otherFiles = ['public/eac.json', 'public/eabf.json', 'public/estructura_nueva.json'];
for (const file of otherFiles) {
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const row of data) {
      const emp = String(row["Employee"] || "").match(/\[(\d+)\]/);
      let id = emp ? emp[1] : String(row["ID Sharp"] || row["SHARP"] || row["ID"] || "").trim();
      const champ = getChampion(row["CHAMPION"] || row["Champion"]);
      if (id && champ && !championMap[id]) championMap[id] = [champ];
    }
  }
}
console.log('Champions found:', Object.keys(championMap).length);

// === STEP 3: Read old operators.json for puesto/area info ===
let oldOps = [];
try {
  oldOps = JSON.parse(fs.readFileSync('public/operators.json', 'utf8'));
} catch(e) {}
const oldMap = {};
oldOps.forEach(op => { oldMap[op.id] = op; });

// === STEP 4: Build new operators from CSV ===
const operators = [];
for (let i = 1; i < csvRaw.length; i++) {
  const line = csvRaw[i].trim();
  if (!line) continue;
  
  // CSV is semicolon-separated with possible quotes
  const parts = line.split(';').map(s => s.replace(/^"|"$/g, '').trim());
  if (parts.length < 4) continue;
  
  const nombre = parts[0];
  const equipo = parts[1];
  const lider = parts[2];
  const id = parts[3].replace(/\D/g, '');
  
  if (!id) continue;
  
  // Get puesto and area from old data
  let puesto = "Operador";
  let area = "cocimientos";
  
  if (oldMap[id]) {
    puesto = oldMap[id].puesto || "Operador";
    area = oldMap[id].area || "cocimientos";
  }
  
  // Get roles from champion map
  const roles = championMap[id] || [];
  
  operators.push({
    id,
    nombre,
    puesto,
    area,
    equipoAutonomo: equipo,
    lider,
    roles,
    status: "activo"
  });
}

// === STEP 5: Write final operators.json ===
fs.writeFileSync('public/operators.json', JSON.stringify(operators, null, 2));

const withRoles = operators.filter(o => o.roles.length > 0).length;
console.log(`\n=== DONE ===`);
console.log(`Total operators: ${operators.length}`);
console.log(`With champion roles: ${withRoles}`);
console.log(`Without roles: ${operators.length - withRoles}`);

// Show a few examples
console.log('\nExamples:');
operators.slice(0, 3).forEach(op => {
  console.log(`  ${op.nombre} (${op.id}): roles=${JSON.stringify(op.roles)}, equipo=${op.equipoAutonomo}`);
});
