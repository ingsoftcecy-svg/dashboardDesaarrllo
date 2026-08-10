import fs from 'fs';
import path from 'path';

// Read operators
const operatorsPath = path.resolve('public/operators.json');
const operators = JSON.parse(fs.readFileSync(operatorsPath, 'utf8'));

// Read assignments
const assignmentsPath = path.resolve('src/data/ips_cocimientos_kpi.json');
const ipsData = JSON.parse(fs.readFileSync(assignmentsPath, 'utf8'));

const workerAssignments = ipsData.workerAssignments;

const cocimientosKeywords = ["warm", "cocimiento", "cuchillas", "eac", "eabf", "bpre", "molienda", "guardianes"];
const frioKeywords = ["cold", "frio", "frío", "bravos", "fuertes", "reyes", "loros"];

const isCocimientos = (area) => {
  const a = (area || "").toLowerCase();
  return cocimientosKeywords.some(k => a.includes(k));
};

const isFrio = (area) => {
  const a = (area || "").toLowerCase();
  return frioKeywords.some(k => a.includes(k));
};

const normalizeStr = (str) => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/\s+/g, " ");
};

const cocimientosBank = new Map();
const frioBank = new Map();

for (const op of operators) {
  const normOp = normalizeStr(op.nombre);
  let assignments = workerAssignments[normOp] || [];
  
  if (assignments.length === 0) {
    // Try to find by best match
    const stopWords = new Set(["DE", "DEL", "LOS", "LAS", "SAN", "Y"]);
    const opTokens = normOp.split(" ").filter((t) => t.length > 2 && !stopWords.has(t));
    const opSet = new Set(opTokens);
    
    let bestScore = 0;
    let bestKey = null;
    
    for (const wNorm in workerAssignments) {
      const wTokens = wNorm.split(" ").filter((t) => t.length > 2 && !stopWords.has(t));
      const wSet = new Set(wTokens);
      const intersection = [...opSet].filter(x => wSet.has(x));
      const minReq = Math.min(opTokens.length, wTokens.length) <= 3 ? 2 : 3;
      if (intersection.length >= minReq && intersection.length > bestScore) {
        bestScore = intersection.length;
        bestKey = wNorm;
      }
    }
    
    if (bestKey) assignments = workerAssignments[bestKey];
  }

  if (isCocimientos(op.equipoAutonomo)) {
    assignments.forEach(a => {
      cocimientosBank.set(a.pi.toLowerCase().trim(), { pi: a.pi.trim(), kpi: a.kpi.trim() });
    });
  } else if (isFrio(op.equipoAutonomo)) {
    assignments.forEach(a => {
      frioBank.set(a.pi.toLowerCase().trim(), { pi: a.pi.trim(), kpi: a.kpi.trim() });
    });
  }
}

const finalCocimientos = Array.from(cocimientosBank.values()).sort((a,b) => a.pi.localeCompare(b.pi));
const finalFrio = Array.from(frioBank.values()).sort((a,b) => a.pi.localeCompare(b.pi));

const output = {
  ips_cocimientos: finalCocimientos,
  ips_bloque_frio: finalFrio
};

fs.writeFileSync(path.resolve('src/data/generated_ip_banks.json'), JSON.stringify(output, null, 2));

console.log(`Generated ${finalCocimientos.length} IPs for Cocimientos and ${finalFrio.length} for Bloque Frio`);
