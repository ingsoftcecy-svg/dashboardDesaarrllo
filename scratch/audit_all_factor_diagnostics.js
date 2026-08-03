import fs from 'fs';

const PROJECT_ID = "preview-bbe71";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function auditAllFactorDiagnostics() {
  console.log("================================================================");
  console.log("🔍 AUDITORÍA COMPLETA DE INCONGRUENCIAS EN FACTORES BPRE");
  console.log("================================================ glassmorphism\n");

  const est = JSON.parse(fs.readFileSync('public/estructura_nueva.json', 'utf8'));
  const eac = JSON.parse(fs.readFileSync('public/eac.json', 'utf8'));
  const eabf = JSON.parse(fs.readFileSync('public/eabf.json', 'utf8'));
  const datos = JSON.parse(fs.readFileSync('public/datos.json', 'utf8'));
  const bpreJson = JSON.parse(fs.readFileSync('public/bpre.json', 'utf8'));
  const guiasJson = JSON.parse(fs.readFileSync('public/guias_tecnicas.json', 'utf8'));

  // Obtener Firestore evaluaciones_guias_tecnicas
  let firestoreOps = {};
  let firestoreBpre = {};
  try {
    const res = await fetch(`${BASE_URL}/evaluaciones_guias_tecnicas?pageSize=300`);
    if (res.ok) {
      const data = await res.json();
      (data.documents || []).forEach(doc => {
        const id = doc.name.split('/').pop();
        const fields = doc.fields || {};
        if (id.startsWith('bpre_')) {
          const teamKey = id.replace('bpre_', '');
          const factors = {};
          if (fields.factors && fields.factors.mapValue && fields.factors.mapValue.fields) {
            Object.keys(fields.factors.mapValue.fields).forEach(k => {
              const valObj = fields.factors.mapValue.fields[k];
              factors[k] = Number(valObj.doubleValue || valObj.integerValue || 0);
            });
          }
          firestoreBpre[teamKey] = factors;
        } else {
          firestoreOps[id] = {
            l6: Number(fields.l6Progress?.doubleValue || fields.l6Progress?.integerValue || 0),
            l7: Number(fields.l7Progress?.doubleValue || fields.l7Progress?.integerValue || 0),
            l8: Number(fields.l8Progress?.doubleValue || fields.l8Progress?.integerValue || 0),
            overall: Number(fields.overallProgress?.doubleValue || fields.overallProgress?.integerValue || 0),
            tipoGuia: fields.tipoGuia?.stringValue || "MEJORADO"
          };
        }
      });
    }
  } catch (e) {
    console.error("Error consultando Firestore:", e);
  }

  // Agrupar operadores por equipo
  const teamsMap = {};
  est.forEach(row => {
    const rawTeam = String(row['Nombre del Equipo'] || '').trim();
    if (!rawTeam) return;
    const match = rawTeam.match(/^\d+\.\s*(.*)$/);
    const teamName = match ? match[1].trim() : rawTeam;
    const cleanUpper = teamName.toUpperCase();

    if (!teamsMap[cleanUpper]) {
      teamsMap[cleanUpper] = { name: teamName, operators: [] };
    }

    const sharpId = String(row['Ficha'] || row['ID'] || row['SharpID'] || row['Ficha / ID'] || '').trim();
    const name = String(row['Nombre'] || row['Colaborador'] || '').trim();
    const puesto = String(row['Puesto'] || '').trim();

    // SKAP de datos.json o guias_tecnicas.json o Firestore
    let intPct = 0;
    let avPct = 0;

    const opFs = firestoreOps[sharpId];
    if (opFs) {
      intPct = opFs.l6;
      avPct = Math.round((opFs.l7 + opFs.l8) / 2);
    } else {
      const matchDatos = datos.find(d => String(d.Ficha || d.ID || '').trim() === sharpId);
      if (matchDatos) {
        intPct = Number(matchDatos.Intermedio || matchDatos.INTERMEDIO || matchDatos['L6'] || 0);
        avPct = Number(matchDatos.Avanzado || matchDatos.AVANZADO || matchDatos['L7'] || 0);
      }
    }

    teamsMap[cleanUpper].operators.push({
      id: sharpId,
      nombre: name,
      puesto,
      intermedio: intPct,
      avanzado: avPct
    });
  });

  const inconsistencies = [];

  Object.values(teamsMap).forEach(team => {
    const totalOps = team.operators.length;
    if (totalOps === 0) return;

    const meetInt = team.operators.filter(op => op.intermedio >= 85).length;
    const meetAv = team.operators.filter(op => op.avanzado >= 85).length;
    const pctInt = (meetInt / totalOps) * 100;
    const pctAv = (meetAv / totalOps) * 100;

    // SKAP real phase
    let realFaseSkap = 0;
    if (pctAv >= 75) realFaseSkap = 4;
    else if (pctAv >= 33) realFaseSkap = 3;
    else if (pctInt >= 75) realFaseSkap = 2;
    else if (pctInt >= 25) realFaseSkap = 1;

    // BPRE score registered
    const cleanUpper = team.name.toUpperCase();
    const teamKey = cleanUpper.replace(/[^A-Z0-9]/g, '_');
    const customBpre = firestoreBpre[teamKey] || {};

    const matchRow = bpreJson.find(r => {
      const eq = String(r['EQUIPO'] || r['Equipo'] || r['Nombre del equipo'] || '').toUpperCase();
      return eq.includes(cleanUpper) || cleanUpper.includes(eq);
    });

    const regSkapScore = customBpre.skap !== undefined ? customBpre.skap : Number(matchRow?.SKAP || 2.0);
    const regFaseSkap = Math.floor(regSkapScore);

    if (realFaseSkap !== regFaseSkap) {
      inconsistencies.push({
        team: team.name,
        factor: "SKAP",
        regScore: regSkapScore,
        regFase: regFaseSkap,
        realFase: realFaseSkap,
        pctInt: pctInt.toFixed(1) + "%",
        pctAv: pctAv.toFixed(1) + "%",
        meetIntCount: `${meetInt}/${totalOps}`,
        meetAvCount: `${meetAv}/${totalOps}`,
        detail: `La fase registrada (${regFaseSkap}) difiere de la fase real demostrada por los datos (${realFaseSkap}).`
      });
    }
  });

  console.log(`📌 Se detectaron ${inconsistencies.length} incongruencias en factores BPRE:\n`);
  inconsistencies.forEach((inc, idx) => {
    console.log(` [${idx + 1}] Equipo: "${inc.team}"`);
    console.log(`     Factor: ${inc.factor}`);
    console.log(`     Puntuación Registrada: ${inc.regScore.toFixed(2)} pts (Fase Registrada: ${inc.regFase})`);
    console.log(`     Fase Real Demostrada: FASE ${inc.realFase}`);
    console.log(`     Datos Operadores: ${inc.meetAvCount} en Avanzado ≥ 85% (${inc.pctAv}) | ${inc.meetIntCount} en Intermedio ≥ 85% (${inc.pctInt})`);
    console.log(`     Detalle: ${inc.detail}\n`);
  });

  console.log("================================================================");
  console.log("✅ AUDITORÍA DE INCONGRUENCIAS FINALIZADA");
  console.log("================================================================");
}

auditAllFactorDiagnostics();
