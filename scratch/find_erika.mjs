import { readFileSync } from 'fs';
import * as xlsx from 'xlsx';

const buf = readFileSync('public/DATOS.xlsx');
const wb = xlsx.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws);

const erika = data.find(row => {
    const emp = row['Employee'] ? String(row['Employee']) : '';
    return emp.toLowerCase().includes('erika');
});

console.log(erika ? erika['Employee'] : 'Not found');
