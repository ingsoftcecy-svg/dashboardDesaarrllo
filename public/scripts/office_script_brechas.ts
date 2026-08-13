interface Brecha {
  desc: string;
  nivel: string;
  origen: string;
  pilar: string;
  estado: string;
  fechaCierre: string;
  accion: string;
  kpi: string;
  fechaDeteccion: string;
  ganancia: string;
  evidencia: string;
}

interface OperadorSummary {
  total: number;
  completadas: number;
  enProceso: number;
  porcentaje: number;
  brechas: Brecha[];
}

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  arrayValue?: { values: FirestoreValue[] };
  mapValue?: { fields: { [key: string]: FirestoreValue } };
}

async function main(workbook: ExcelScript.Workbook) {
  console.log("--- INICIANDO DEBUG DEL SCRIPT ---");
  const sheets = workbook.getWorksheets();
  console.log("Hojas detectadas: " + sheets.map((s) => "'" + s.getName() + "'").join(", "));

  let sheet = workbook.getWorksheet("PLAN CIERRE DE BRECHAS");
  if (!sheet) {
    console.log("No se encontró la hoja con el nombre exacto 'PLAN CIERRE DE BRECHAS'. Buscando similitudes...");
    sheet = sheets.find((s) => s.getName().trim().toUpperCase().includes("PLAN CIERRE"));
    if (!sheet) {
      console.log("ERROR CRÍTICO: Definitivamente no se encontró ninguna hoja parecida a 'PLAN CIERRE DE BRECHAS'.");
      return;
    }
    console.log("Se usará la hoja: '" + sheet.getName() + "'");
  } else {
    console.log("Hoja 'PLAN CIERRE DE BRECHAS' encontrada exitosamente.");
  }

  const range = sheet.getUsedRange();
  if (!range) {
    console.log("ERROR CRÍTICO: La hoja parece estar completamente vacía.");
    return;
  }
  const values = range.getValues();
  console.log("Rango de celdas detectado: " + values.length + " filas por " + values[0].length + " columnas.");

  let headerRowIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(10, values.length); i++) {
    const row = values[i].map((v) => String(v).trim().toUpperCase());
    if (row.indexOf("SHARP ID") !== -1) {
      headerRowIdx = i;
      headers = row;
      break;
    }
  }

  if (headerRowIdx === -1) {
    console.log("ERROR CRÍTICO: No se encontró la columna 'SHARP ID' en las primeras 10 filas.");
    for (let i = 0; i < Math.min(5, values.length); i++) {
        console.log("Fila " + (i + 1) + ": " + values[i].join(" | ").substring(0, 100));
    }
    return;
  }
  console.log("Fila de encabezados detectada en el índice " + headerRowIdx + " (Fila " + (headerRowIdx + 1) + " de Excel).");

  const getColIdx = (names: string[]) => {
    return headers.findIndex((h) => {
      for (let n of names) {
        if (h.includes(n.toUpperCase())) return true;
      }
      return false;
    });
  };

  const colId = getColIdx(["SHARP ID"]);
  const colNombre = getColIdx(["NOMBRE"]);
  const colEstado = getColIdx(["ESTADO"]);
  
  const colDesc = getColIdx(["DESCRIPCIÓN DEL ITEM", "DESCRIPCION DEL ITEM"]);
  const colFechaDet = getColIdx(["FECHA DE DETECCIÓN DE BRECHA", "FECHA DE DETECCION DE BRECHA", "FECHA DETECCIÓN"]);
  
  const colNivel = getColIdx(["NIVEL"]);
  const colOrigen = getColIdx(["ORIGEN DE BRECHA", "ORIGEN"]);
  const colPilar = getColIdx(["PILAR"]);
  const colFechaCierre = getColIdx(["FECHA PROGRAMADA DE CIERRE", "FECHA PROGRAMADA"]);
  const colAccion = getColIdx(["ACCIÓN PARA CERRAR", "ACCIÓN", "ACCION"]);
  const colKpi = getColIdx(["KPI IMPACTADO", "KPI"]);
  
  const colGanancia = getColIdx(["GANANCIA ESPERADA CON CIERRE DE BRECHA", "GANANCIA ESPERADA"]);
  const colEvidencia = getColIdx(["EVIDENCIA DE CIERRE"]);

  console.log("Índices de columnas clave -> ID:" + colId + ", Nombre:" + colNombre + ", Estado:" + colEstado + ", Desc:" + colDesc);
  if (colId === -1 || colEstado === -1) {
      console.log("ADVERTENCIA: Faltan columnas críticas (ID o Estado). Revisa los encabezados.");
  }

  const summary: { [id: string]: OperadorSummary } = {};

  const excelDateToStr = (val: string | number | boolean) => {
    if (typeof val === 'number') {
      const utc_days = Math.floor(val - 25569);
      const d = new Date(utc_days * 86400 * 1000);
      return d.toISOString().split('T')[0];
    }
    if (typeof val === 'string' && val.trim() !== '') return val;
    return "";
  };

  let totalFilasEvaluadas = 0;
  let filasValidas = 0;
  let filasIncompletas = 0;

  for (let i = headerRowIdx + 1; i < values.length; i++) {
    const row = values[i];
    
    if (!row[colId] || String(row[colId]).trim() === "") continue;

    totalFilasEvaluadas++;

    const idGlobal = String(row[colId]).trim();
    const statusRaw = colEstado >= 0 && row[colEstado] ? String(row[colEstado]).trim() : "";
    const statusLower = statusRaw.toLowerCase();
    
    const descRaw = colDesc >= 0 && row[colDesc] ? String(row[colDesc]).trim() : "";

    let estado = "";
    if (statusLower.includes("completado")) estado = "Completado";
    else if (statusLower.includes("en proceso")) estado = "En Proceso";
    
    if (estado === "" && descRaw === "") {
      filasIncompletas++;
      continue;
    }

    if (!estado) {
      filasIncompletas++;
      continue;
    }

    filasValidas++;

    if (!summary[idGlobal]) {
      summary[idGlobal] = { total: 0, completadas: 0, enProceso: 0, porcentaje: 0, brechas: [] };
    }

    summary[idGlobal].total++;
    if (estado === "Completado") summary[idGlobal].completadas++;
    if (estado === "En Proceso") summary[idGlobal].enProceso++;

    const nuevaBrecha: Brecha = {
      desc: colDesc >= 0 && row[colDesc] ? String(row[colDesc]).trim().substring(0, 120) : "",
      nivel: colNivel >= 0 && row[colNivel] ? String(row[colNivel]).trim() : "",
      origen: colOrigen >= 0 && row[colOrigen] ? String(row[colOrigen]).trim() : "",
      pilar: colPilar >= 0 && row[colPilar] ? String(row[colPilar]).trim() : "",
      estado: estado,
      fechaCierre: colFechaCierre >= 0 ? excelDateToStr(row[colFechaCierre]) : "",
      accion: colAccion >= 0 && row[colAccion] ? String(row[colAccion]).trim().substring(0, 100) : "",
      kpi: colKpi >= 0 && row[colKpi] ? String(row[colKpi]).trim() : "",
      fechaDeteccion: colFechaDet >= 0 ? excelDateToStr(row[colFechaDet]) : "",
      ganancia: colGanancia >= 0 && row[colGanancia] ? String(row[colGanancia]).trim() : "",
      evidencia: colEvidencia >= 0 && row[colEvidencia] ? String(row[colEvidencia]).trim() : ""
    };

    summary[idGlobal].brechas.push(nuevaBrecha);
  }

  let totalOperadores = 0;
  for (const id in summary) {
    totalOperadores++;
    const data = summary[id];
    data.porcentaje = data.total > 0 ? Number(((data.completadas / data.total) * 100).toFixed(2)) : 0;
  }

  const convertBrecha = (b: Brecha): FirestoreValue => {
    return {
      mapValue: {
        fields: {
          desc: { stringValue: b.desc },
          nivel: { stringValue: b.nivel },
          origen: { stringValue: b.origen },
          pilar: { stringValue: b.pilar },
          estado: { stringValue: b.estado },
          fechaCierre: { stringValue: b.fechaCierre },
          accion: { stringValue: b.accion },
          kpi: { stringValue: b.kpi },
          fechaDeteccion: { stringValue: b.fechaDeteccion },
          ganancia: { stringValue: b.ganancia },
          evidencia: { stringValue: b.evidencia }
        }
      }
    };
  };

  const convertOperador = (op: OperadorSummary): FirestoreValue => {
    return {
      mapValue: {
        fields: {
          total: { integerValue: String(op.total) },
          completadas: { integerValue: String(op.completadas) },
          enProceso: { integerValue: String(op.enProceso) },
          porcentaje: { doubleValue: op.porcentaje },
          brechas: { arrayValue: { values: op.brechas.map((b) => convertBrecha(b)) } }
        }
      }
    };
  };

  const summaryFields: { [key: string]: FirestoreValue } = {};
  for (const id in summary) {
    summaryFields[id] = convertOperador(summary[id]);
  }

  const payload = {
    fields: {
      summary: {
        mapValue: {
          fields: summaryFields
        }
      }
    }
  };

  console.log("Evaluación completa:");
  console.log("- Total filas revisadas con ID: " + totalFilasEvaluadas);
  console.log("- Filas ignoradas por estar vacías o sin estado/descripción: " + filasIncompletas);
  console.log("- Brechas válidas procesadas: " + filasValidas);
  console.log("Enviando el resumen de " + totalOperadores + " operadores a Firestore...");

  const projectId = "preview-bbe71";
  const url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/config_dashboard/brechas_resumen?updateMask.fieldPaths=summary";

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    console.log("ERROR AL ENVIAR A FIRESTORE (Código " + response.status + "): " + text);
  } else {
    console.log("¡ÉXITO! Plan de Brechas actualizado con éxito en Firestore.");
  }
}
