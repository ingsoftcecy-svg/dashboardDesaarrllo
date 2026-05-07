import * as xlsx from "xlsx";
import * as fs from "fs";

try {
    const fileBuffer = fs.readFileSync("public/DATOS.xlsx");
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const headers = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0];
    console.log("COLUMNS FOUND IN DATOS.xlsx:");
    console.log(JSON.stringify(headers, null, 2));
} catch (error) {
    console.error("Error reading file:", error);
}
