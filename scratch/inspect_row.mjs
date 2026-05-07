import * as xlsx from "xlsx";
import * as fs from "fs";

try {
    const fileBuffer = fs.readFileSync("public/DATOS.xlsx");
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);
    console.log("KEYS FOUND IN FIRST ROW OF DATOS.xlsx:");
    console.log(JSON.stringify(Object.keys(rows[0]), null, 2));
    console.log("VALUES IN FIRST ROW:");
    console.log(JSON.stringify(rows[0], null, 2));
} catch (error) {
    console.error("Error reading file:", error);
}
