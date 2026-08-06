const fs = require('fs');

const operatorsPath = 'public/operators.json';
const operators = JSON.parse(fs.readFileSync(operatorsPath, 'utf8'));

const files = [
  'public/base.json',
  'public/eac.json',
  'public/eabf.json',
  'public/estructura_nueva.json'
];

const championMap = {};

const getChampion = (row) => {
  const raw = String(row["CHAMPION"] || row["Champion"] || "").trim().toLowerCase();
  if (raw.includes("seg")) return "seguridad";
  if (raw.includes("calidad") || raw.includes("quas")) return "calidad";
  if (raw.includes("amb")) return "ambiental";
  if (raw.includes("mant")) return "mantenimiento";
  if (raw.includes("gest")) return "gestion";
  if (raw.includes("gent")) return "gente";
  if (raw.includes("log") || raw.includes("pnc")) return "logistica";
  return null;
};

for (const file of files) {
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const row of data) {
      const emp = String(row["Employee"] || "").match(/\[(\d+)\]/);
      let id = emp ? emp[1] : String(row["ID Sharp"] || row["ID"] || "").trim();
      
      const champ = getChampion(row);
      if (id && champ && !championMap[id]) {
        championMap[id] = [champ];
      }
    }
  }
}

let updatedCount = 0;
for (const op of operators) {
  if (championMap[op.id]) {
    op.roles = championMap[op.id];
    updatedCount++;
  }
}

fs.writeFileSync(operatorsPath, JSON.stringify(operators, null, 2));
console.log(`Updated roles for ${updatedCount} operators.`);
