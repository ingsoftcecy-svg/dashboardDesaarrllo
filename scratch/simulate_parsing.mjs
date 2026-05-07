import { readFileSync } from 'fs';
import * as xlsx from 'xlsx';

const buf = readFileSync('public/DATOS.xlsx');
const wb = xlsx.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);

for (const row of rows) {
    const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]\s+(.*)/) : null;
    const id = empMatch ? empMatch[1] : String(Math.random());
    const nombre = empMatch ? empMatch[2] : row["Employee"] || "Desconocido";
    
    if (nombre.toLowerCase().includes('erika')) {
        console.log(`Parsed ID: "${id}"`);
        console.log(`Parsed Name: "${nombre}"`);
    }
}
