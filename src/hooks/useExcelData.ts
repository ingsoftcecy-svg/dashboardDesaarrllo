import { useState, useEffect } from "react";
import * as xlsx from "xlsx";
import { Operator, ChampionKey, cocimientos as defaultCocimientos, bloqueFrio as defaultBloqueFrio, AreaData } from "@/data/zeus";

export function useExcelData() {
  const [cocimientos, setCocimientos] = useState<AreaData>(defaultCocimientos);
  const [bloqueFrio, setBloqueFrio] = useState<AreaData>(defaultBloqueFrio);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const eaMap: Record<string, { equipo: string; lider: string }> = {};
        const championMap: Record<string, ChampionKey[]> = {};

        try {
          const baseRes = await fetch("/0. BASE EQUIPOS AUTÓNOMOS CCZ (3).xlsx");
          const baseBuf = await baseRes.arrayBuffer();
          const baseWb = xlsx.read(baseBuf, { type: "array" });
          const baseRows = xlsx.utils.sheet_to_json(baseWb.Sheets["BD_ZAC_OFICIAL"]) as any[];
          
          for (const row of baseRows) {
            const id = row["ID Sharp"] ? String(row["ID Sharp"]) : null;
            if (id) {
              const rawChamp = row["CHAMPION"];
              const champs: ChampionKey[] = [];
              if (rawChamp && rawChamp !== "-") {
                const parts = String(rawChamp).toUpperCase().split(/ Y | AND |,/);
                for (const p of parts) {
                  const clean = p.trim();
                  if (clean === "SEGURIDAD") champs.push("seguridad");
                  else if (clean === "CALIDAD") champs.push("calidad");
                  else if (clean === "AMBIENTAL") champs.push("ambiental");
                  else if (clean === "MANTENIMIENTO") champs.push("mantenimiento");
                  else if (clean === "GESTIÓN" || clean === "GESTION") champs.push("gestion");
                  else if (clean === "GENTE") champs.push("gente");
                  else if (clean === "LOGÍSTICA" || clean === "LOGISTICA") champs.push("logistica");
                }
              }
              championMap[id] = champs;
            }
          }
        } catch (e) {
          console.error("Error loading base configuration:", e);
        }


        try {
          const eacRes = await fetch("/EAC.xlsx");
          const eacBuf = await eacRes.arrayBuffer();
          const eacWb = xlsx.read(eacBuf, { type: "array" });
          const eacRows = xlsx.utils.sheet_to_json(eacWb.Sheets[eacWb.SheetNames[0]]) as any[];
          for (const row of eacRows) {
            if (row["SHARP"]) {
              eaMap[String(row["SHARP"])] = {
                equipo: row["Nombre del Equipo"] || "",
                lider: row["Nombre del Lider"] || "",
              };
            }
          }
        } catch (e) {
          console.error("Error loading EAC:", e);
        }

        try {
          const eabfRes = await fetch("/EABF.xlsx");
          const eabfBuf = await eabfRes.arrayBuffer();
          const eabfWb = xlsx.read(eabfBuf, { type: "array" });
          const eabfRows = xlsx.utils.sheet_to_json(eabfWb.Sheets[eabfWb.SheetNames[0]]) as any[];
          
          let lastEquipo = "";
          let lastLider = "";
          for (const row of eabfRows) {
            if (row["NUEVO EQUIPO "]) lastEquipo = row["NUEVO EQUIPO "];
            if (row["NUEVO LIDER"]) lastLider = row["NUEVO LIDER"];
            
            if (row["SHARP"]) {
              eaMap[String(row["SHARP"])] = {
                equipo: lastEquipo,
                lider: lastLider,
              };
            }
          }
        } catch (e) {
          console.error("Error loading EABF:", e);
        }

        const response = await fetch("/DATOS.xlsx");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet) as any[];

        const parseOperator = (row: any): Operator & { autonomyScore: number } => {
          const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]\s+(.*)/) : null;
          const id = empMatch ? empMatch[1] : String(Math.random());
          const nombre = empMatch ? empMatch[2] : row["Employee"] || "Desconocido";

          const basicCols = [
            "Driver's License", "Safety", "Quality", "Environment", 
            "Management", "People", "Maintenance", "Logistics", "Operation"
          ];
          
          let basicSum = 0;
          let basicCount = 0;
          for (const col of basicCols) {
            if (row[col] !== undefined && row[col] !== "-") {
              basicSum += Number(row[col]) || 0;
              basicCount++;
            }
          }
          const basicoRaw = basicCount > 0 ? (basicSum / basicCount) * 100 : 0;
          const basico = Number(basicoRaw.toFixed(2));
          
          const intermedioRaw = (Number(row["Intermediate Capabilities"]) || 0) * 100;
          const intermedio = Number(intermedioRaw.toFixed(2));
          
          const avanzadoRaw = (Number(row["Advanced Capabilities"]) || 0) * 100;
          const avanzado = Number(avanzadoRaw.toFixed(2));

          const champions = championMap[id] || [];


          const eaInfo = eaMap[id] || {};
          const autonomyScore = Number((Number(row["Autonomy Score"]) || 0) * 100);

          return {
            id,
            nombre,
            puesto: row["SKAP Position"] || "Operador",
            basico,
            intermedio,
            avanzado,
            champions,
            equipoAutonomo: eaInfo.equipo,
            lider: eaInfo.lider,
            autonomyScore,
            lastAssessmentDate: row["Assessment Date"] ? String(row["Assessment Date"]) : undefined
          };
        };

        const opsMap: Record<string, Operator & { autonomyScore: number, _count: number, _area: string }> = {};

        for (const row of rows) {
          const area = row["Area"];
          if (area !== "Warm Block" && area !== "Cold Block") continue;
          
          const parsed = parseOperator(row);
          const eqStr = row["SKAP Position"] ? String(row["SKAP Position"]) : "";

          if (opsMap[parsed.id]) {
            const ext = opsMap[parsed.id];
            ext.basico += parsed.basico;
            ext.intermedio += parsed.intermedio;
            ext.avanzado += parsed.avanzado;
            ext.autonomyScore += parsed.autonomyScore;
            ext._count++;
            
            if (eqStr) {
               const newEqs = eqStr.split(",").map(e => e.trim()).filter(Boolean);
               for (const eq of newEqs) {
                 if (!ext.equipos!.includes(eq)) ext.equipos!.push(eq);
               }
            }

            for (const c of parsed.champions) {
               if (!ext.champions.includes(c)) ext.champions.push(c);
            }

            if (parsed.lastAssessmentDate) {
              if (!ext.lastAssessmentDate) {
                ext.lastAssessmentDate = parsed.lastAssessmentDate;
              } else {
                const dateExt = new Date(ext.lastAssessmentDate).getTime();
                const dateParsed = new Date(parsed.lastAssessmentDate).getTime();
                if (dateParsed > dateExt) {
                  ext.lastAssessmentDate = parsed.lastAssessmentDate;
                }
              }
            }
          } else {
            opsMap[parsed.id] = {
              ...parsed,
              equipos: eqStr ? eqStr.split(",").map(e => e.trim()).filter(Boolean) : [],
              _count: 1,
              _area: area
            };
          }
        }

        const cocimientosOps: (Operator & { autonomyScore: number })[] = [];
        const bloqueFrioOps: (Operator & { autonomyScore: number })[] = [];

        Object.values(opsMap).forEach(op => {
           op.basico = Number((op.basico / op._count).toFixed(2));
           op.intermedio = Number((op.intermedio / op._count).toFixed(2));
           op.avanzado = Number((op.avanzado / op._count).toFixed(2));
           op.autonomyScore = Number((op.autonomyScore / op._count).toFixed(2));
           
           if (op._area === "Warm Block") cocimientosOps.push(op);
           else if (op._area === "Cold Block") bloqueFrioOps.push(op);
        });

        cocimientosOps.sort((a, b) => b.autonomyScore - a.autonomyScore);
        bloqueFrioOps.sort((a, b) => b.autonomyScore - a.autonomyScore);

        const buildExcellence = (ops: (Operator & { autonomyScore: number })[]) => {
          if (ops.length === 0) return null;
          
          const sorted = [...ops].sort((a, b) => b.autonomyScore - a.autonomyScore);
          const podio = sorted.slice(0, 3).map(op => ({
            nombre: op.nombre,
            puesto: op.puesto,
            excelencia: Number(op.autonomyScore.toFixed(2)),
            lider: op.lider
          }));

          const totalScore = ops.reduce((sum, op) => sum + op.autonomyScore, 0);
          const excelenciaEquipo = Number((totalScore / ops.length).toFixed(2));
          const autonomia = Number(((excelenciaEquipo / 100) * 5).toFixed(2));
          
          const logros = [
            `${ops.filter(o => o.autonomyScore >= 80).length} operadores con autonomía ≥ 80%`,
            `Promedio de autonomía del equipo: ${excelenciaEquipo}%`,
            `Top 1: ${podio[0]?.nombre || "N/A"} (${podio[0]?.excelencia || 0}%)`
          ];

          return { podio, excelenciaEquipo, logros, autonomia };
        };

        const cocimientosExc = buildExcellence(cocimientosOps);
        setCocimientos(prev => ({
          ...prev,
          operadores: cocimientosOps.length > 0 ? cocimientosOps : prev.operadores,
          ...(cocimientosExc ? cocimientosExc : {})
        }));

        const bloqueFrioExc = buildExcellence(bloqueFrioOps);
        setBloqueFrio(prev => ({
          ...prev,
          operadores: bloqueFrioOps.length > 0 ? bloqueFrioOps : prev.operadores,
          ...(bloqueFrioExc ? bloqueFrioExc : {})
        }));

      } catch (e) {
        console.error("Error loading excel data:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { cocimientos, bloqueFrio, loading };
}
