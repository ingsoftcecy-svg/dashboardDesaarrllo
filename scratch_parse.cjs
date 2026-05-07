const xlsx = require("xlsx");
try {
  const workbook = xlsx.readFile("public/DATOS.xlsx");
  const sheet = workbook.Sheets["data"];
  const rows = xlsx.utils.sheet_to_json(sheet);
  if (rows.length > 0) {
    console.log("Columns:", Object.keys(rows[0]));
  }
} catch (e) {
  console.error(e);
}
