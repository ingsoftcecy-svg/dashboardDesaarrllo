/**
 * Script para verificar qué operadores de Bloque Frío carecen de IPs asignadas
 * en Firebase (colección operator_ips) y en el JSON de workerAssignments.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase config (from .env)
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

// Operadores de bloque frío extraídos de ccz.ts
const BLOQUE_FRIO_OPERATORS = {
  "32043849": "PEDRO ANTONIO URIBE",
  "32043880": "JAIME CID",
  "32043886": "RAFAEL CHAVEZ",
  "32043891": "ARMANDO RAYZOLA",
  "32043902": "ARTURO SAUCEDO",
  "32044036": "VICTOR SOTO",
  "32044235": "JESUS EDUARDO BRICEÑO",
  "32044246": "MIGUEL ANGEL SANCHEZ",
  "32044513": "HUMBERTO RODARTE",
  "32044514": "LUIS MANUEL DOMINGUEZ",
  "32044751": "JUAN MANUEL HUERTA",
  "32044760": "MAURICIO ARELLANO",
  "32044771": "RAFAEL MARTINEZ",
  "32044776": "BENITO VALLE",
  "32045076": "ERON GUARDADO",
  "32045116": "JOSE LEANDRO MARTINEZ",
  "32045128": "JESUS CALDERON",
  "32045134": "PEDRO MALDONADO",
  "32045139": "RICARDO ESPARZA",
  "32045149": "ENRIQUE MEDINA",
  "32045357": "GUSTAVO MELENCIANO",
  "32045396": "JUAN GABRIEL HERNANDEZ",
  "32045410": "RODOLFO CABRERA",
  "32045556": "VICTOR MANUEL REYES VALLE",
  "32045574": "PEDRO PALOS",
  "32111307": "FRANCISCO JAVIER VARELA",
  "32132025": "SERGIO MIGUEL PARRA",
  "32142953": "GERMAN RUEDAS",
  "32143106": "VICTOR HUGO ZAPATA",
  "32144776": "WILMAR YOEL GONZALEZ",
  "32144777": "OSCAR CAMPOS",
  "32144778": "JUAN FRANCISCO GARCIA",
  "32146003": "LUIS FERNANDO ZAPATA",
  "32149237": "HELMER DEL REAL",
  "32149238": "OSWALDO DELGADILLO",
  "32149605": "JUAN MANUEL RODARTE",
  "32149607": "JORGE ALBERTO ORTIZ",
  "32154634": "EDGAR RENE DIAZ",
  "32157221": "JESUS MENCHACA",
  "32173446": "JOSE EDUARDO ALVARADO",
  "32175115": "NESTOR MONTOYA",
  "32176720": "JOSE REFUGIO LOPEZ",
  "32181712": "CARLOS ADRIAN ROBLES",
  "32183480": "LUIS ARMANDO REYES",
  "32188009": "ALDO ERNESTO SILVA",
  "32188117": "MIGUEL ANGEL NAVARRO",
  "32188513": "GUILLERMO GERARDO GONZALEZ",
  "32196366": "VICTOR HUGO ASCENCIO",
  "32196674": "OSCAR RODRIGUEZ",
  "32197833": "JORGE LUIS RODRIGUEZ",
  "32197834": "LUIS ADOLFO MALDONADO",
  "32197835": "MARIO ALBERTO REYES",
  "32197975": "LUIS RICARDO VALDES",
  "32201712": "JUAN CARLOS MORALES",
  "32201713": "RODOLFO ESPARZA",
  "32209921": "OSCAR EDUARDO VALDEZ",
  "32209922": "JOSE GUADALUPE VALLE",
  "32213345": "MANUEL DE JESUS FALCON",
  "32213349": "PEDRO LUIS RODRIGUEZ",
  "32222222": "EFREN GONZALEZ",
  "32222223": "HECTOR MANUEL DE LA ROSA",
  "32222224": "RICARDO ESTEBAN JARAMILLO",
  "32224001": "SHERLYN GARCIA",
  "32224377": "CARLOS EDUARDO ORNEDO",
  "32231910": "ARIADNNE MAGDALENA TORRES",
  "32231911": "ANA PAOLA PERERA",
  "32233327": "ISAI SOLORZANO",
};

// Load workerAssignments from JSON to check Excel defaults
const ipsJsonPath = join(__dirname, '..', 'src', 'data', 'ips_cocimientos_kpi.json');
const ipsData = JSON.parse(readFileSync(ipsJsonPath, 'utf-8'));
const workerAssignments = ipsData.workerAssignments || {};

// Normalization helper (same as in ips_cocimientos_helper.ts)
function normalizeStr(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

function findExcelAssignment(operatorName) {
  const normOp = normalizeStr(operatorName);
  if (workerAssignments[normOp]) return workerAssignments[normOp];

  const stopWords = new Set(["DE", "DEL", "LOS", "LAS", "SAN", "Y"]);
  const opTokens = normOp.split(" ").filter(t => t.length > 2 && !stopWords.has(t));
  const opSet = new Set(opTokens);

  let bestMatchKey = null;
  let bestScore = 0;

  for (const wNorm in workerAssignments) {
    const wTokens = wNorm.split(" ").filter(t => t.length > 2 && !stopWords.has(t));
    const wSet = new Set(wTokens);
    const intersection = new Set([...opSet].filter(x => wSet.has(x)));
    const minRequired = Math.min(opTokens.length, wTokens.length) <= 3 ? 2 : 3;

    if (intersection.size >= minRequired) {
      if (intersection.size > bestScore) {
        bestScore = intersection.size;
        bestMatchKey = wNorm;
      }
    }
  }

  if (bestMatchKey) return workerAssignments[bestMatchKey];
  return [];
}

async function main() {
  const sinIps = [];
  const conIps = [];
  const conIpsExcel = [];

  const entries = Object.entries(BLOQUE_FRIO_OPERATORS);
  console.log(`\n🔍 Consultando Firebase para ${entries.length} operadores de Bloque Frío...\n`);

  for (const [id, name] of entries) {
    const docRef = doc(db, "operator_ips", id);
    const snapshot = await getDoc(docRef);
    
    const firebaseAssigned = [];
    let hasManualOverride = false;
    if (snapshot.exists()) {
      const data = snapshot.data();
      hasManualOverride = !!data.hasManualOverride;
      if (data.assigned && data.assigned.length > 0) {
        firebaseAssigned.push(...data.assigned);
      }
    }

    const excelAssigned = findExcelAssignment(name);
    const excelIps = excelAssigned.map(item => item.pi || item);

    if (hasManualOverride && firebaseAssigned.length > 0) {
      conIps.push({ id, name, ips: firebaseAssigned, source: "Firebase (manual)" });
    } else if (excelIps.length > 0) {
      conIpsExcel.push({ id, name, ips: excelIps, source: "Excel (default)" });
    } else if (firebaseAssigned.length > 0) {
      conIps.push({ id, name, ips: firebaseAssigned, source: "Firebase" });
    } else {
      sinIps.push({ id, name });
    }
  }

  console.log("=" .repeat(80));
  console.log("❌ OPERADORES DE BLOQUE FRÍO SIN IPs ASIGNADAS");
  console.log("=" .repeat(80));
  if (sinIps.length === 0) {
    console.log("  ✅ ¡Todos los operadores tienen IPs asignadas!");
  } else {
    sinIps.forEach((op, i) => {
      console.log(`  ${i + 1}. [${op.id}] ${op.name}`);
    });
  }
  console.log(`\n  Total sin IPs: ${sinIps.length} de ${entries.length}\n`);

  console.log("=" .repeat(80));
  console.log("✅ OPERADORES CON IPs (Firebase manual override)");
  console.log("=" .repeat(80));
  conIps.forEach((op, i) => {
    console.log(`  ${i + 1}. [${op.id}] ${op.name} → ${op.ips.length} IP(s) [${op.source}]`);
    op.ips.forEach(ip => console.log(`       • ${ip}`));
  });
  console.log(`\n  Total con IPs manuales: ${conIps.length}\n`);

  console.log("=" .repeat(80));
  console.log("📋 OPERADORES CON IPs (Excel default, sin override en Firebase)");
  console.log("=" .repeat(80));
  conIpsExcel.forEach((op, i) => {
    console.log(`  ${i + 1}. [${op.id}] ${op.name} → ${op.ips.length} IP(s) [${op.source}]`);
    op.ips.forEach(ip => console.log(`       • ${ip}`));
  });
  console.log(`\n  Total con IPs Excel: ${conIpsExcel.length}\n`);

  console.log("=" .repeat(80));
  console.log("📊 RESUMEN");
  console.log("=" .repeat(80));
  console.log(`  Total Bloque Frío:        ${entries.length}`);
  console.log(`  Con IPs (Firebase):       ${conIps.length}`);
  console.log(`  Con IPs (Excel default):  ${conIpsExcel.length}`);
  console.log(`  Sin IPs:                  ${sinIps.length}`);
  console.log();

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
