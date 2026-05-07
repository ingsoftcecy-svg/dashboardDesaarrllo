import { readFileSync } from 'fs';
import * as xlsx from 'xlsx';

const buf = readFileSync('public/DATOS.xlsx');
const wb = xlsx.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);

const ids = new Set();
const randomIds = [];

for (const row of rows) {
    const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]\s+(.*)/) : null;
    const id = empMatch ? empMatch[1] : null;
    const nombre = row["Employee"] || "Desconocido";
    
    if (id) {
        ids.add(`${id} - ${nombre}`);
    } else {
        randomIds.push(nombre);
    }
}

console.log("STABLE IDs found:");
console.log(Array.from(ids));
console.log("\nUNSTABLE (Random) IDs would be generated for:");
console.log(randomIds);
