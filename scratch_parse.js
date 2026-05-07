const xlsx = require("xlsx");
const fs = require("fs");

try {
  const workbook = xlsx.readFile("public/DATOS.xlsx");
  const result = {};
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    result[sheetName] = xlsx.utils.sheet_to_json(sheet).slice(0, 5); // first 5 rows
  });
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error("Error reading xlsx:", e);
}
