const fs = require('fs');

const datos = JSON.parse(fs.readFileSync('./public/datos.json', 'utf8'));
const base = JSON.parse(fs.readFileSync('./public/base.json', 'utf8'));

// Build centralized operators map
const central = {};
base.forEach(row => {
    const id = row['ID Sharp'];
    if (id) {
        central[id] = {
            puesto: row['Puesto / ROL'] || "Operador"
        };
    }
});

const opsMap = {};

datos.forEach(row => {
    const empStr = String(row["Employee"] || "");
    const match = empStr.match(/\[(\d+)\]/);
    if (!match) return;
    const id = match[1];
    
    let autonomyScore = row["Autonomy Score"];
    if (typeof autonomyScore === 'string') {
        autonomyScore = autonomyScore === '1' ? 100 : parseFloat(autonomyScore) * 100;
    } else if (typeof autonomyScore === 'number') {
        autonomyScore = autonomyScore <= 1 ? autonomyScore * 100 : autonomyScore;
    } else {
        autonomyScore = 0;
    }
    
    const puesto = row["SKAP Position"] || row["Position"];
    
    if (!opsMap[id]) {
        opsMap[id] = {
            id,
            nombre: empStr,
            puestoBase: central[id]?.puesto || "Operador",
            evals: []
        };
    }
    opsMap[id].evals.push({ puesto, score: Number(autonomyScore.toFixed(2)) });
});

let found = [];

Object.values(opsMap).forEach(op => {
    if (op.evals.length > 1) {
        // Find main eval
        let mainEval = op.evals.find(e => e.puesto && op.puestoBase && e.puesto.trim().toLowerCase() === op.puestoBase.trim().toLowerCase());
        if (!mainEval) {
            mainEval = op.evals[0]; // fallback
        }
        
        let maxOther = -1;
        let otherPuesto = "";
        op.evals.forEach(e => {
            if (e !== mainEval && e.score > maxOther) {
                maxOther = e.score;
                otherPuesto = e.puesto;
            }
        });
        
        if (maxOther > mainEval.score) {
            found.push({
                nombre: op.nombre,
                puestoBase: op.puestoBase,
                mainScore: mainEval.score,
                mainEvalPuesto: mainEval.puesto,
                higherPuesto: otherPuesto,
                higherScore: maxOther
            });
        }
    }
});

console.log("Found:", found.length);
if (found.length > 0) {
    console.log(found.slice(0, 5));
}
