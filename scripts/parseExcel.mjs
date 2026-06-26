import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

function parseAndSave(filename, sheetName, outputFilename) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File not found: ${filePath}`);
    return;
  }
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const targetSheet = sheetName ? wb.Sheets[sheetName] : wb.Sheets[wb.SheetNames[0]];
    if (!targetSheet) {
      console.warn(`⚠️ Sheet ${sheetName} not found in ${filename}`);
      return;
    }
    
    const rows = XLSX.utils.sheet_to_json(targetSheet);
    const outputPath = path.join(publicDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2), 'utf-8');
    console.log(`✅ Parsed ${filename} -> ${outputFilename}`);
  } catch (error) {
    console.error(`❌ Failed to parse ${filename}:`, error);
  }
}

console.log('🔄 Parsing Excel files in public/ to JSON...');

// "0. BASE EQUIPOS AUTÓNOMOS CCZ (3).xlsx" -> base.json (hoja "BD_ZAC_OFICIAL")
parseAndSave('0. BASE EQUIPOS AUTÓNOMOS CCZ (3).xlsx', 'BD_ZAC_OFICIAL', 'base.json');

// "EAC.xlsx" -> eac.json
parseAndSave('EAC.xlsx', null, 'eac.json');

// "EABF.xlsx" -> eabf.json
parseAndSave('EABF.xlsx', null, 'eabf.json');

// "BPRE.xlsx" -> bpre.json
parseAndSave('BPRE.xlsx', null, 'bpre.json');

// "DATOS.xlsx" -> datos.json
parseAndSave('DATOS.xlsx', null, 'datos.json');

console.log('🎉 Done parsing Excel files.');
