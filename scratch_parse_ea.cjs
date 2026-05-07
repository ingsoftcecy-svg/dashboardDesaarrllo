const xlsx = require("xlsx");
const workbook = xlsx.readFile("public/EABF.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);
console.log("EABF sample:", rows.slice(0, 10));
