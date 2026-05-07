import { readFileSync, existsSync } from 'fs';
import * as xlsx from 'xlsx';

const checkFile = (path) => {
    if (!existsSync(path)) return;
    const buf = readFileSync(path);
    const wb = xlsx.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws);

    const erika = data.find(row => {
        const str = JSON.stringify(row).toLowerCase();
        return str.includes('erika');
    });

    if (erika) {
        console.log(`Found in ${path}:`);
        console.dir(erika);
    }
};

checkFile('public/EAC.xlsx');
checkFile('public/EABF.xlsx');
checkFile('public/0. BASE EQUIPOS AUTÓNOMOS CCZ (3).xlsx');
