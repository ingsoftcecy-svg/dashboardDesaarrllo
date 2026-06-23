import { useState, useEffect } from "react";
import * as xlsx from "xlsx";
import { Operator, ChampionKey, cocimientos as defaultCocimientos, bloqueFrio as defaultBloqueFrio, mantenimiento as defaultMantenimiento, AreaData } from "@/data/zeus";

export function useExcelData() {
  const [cocimientos, setCocimientos] = useState<AreaData>(defaultCocimientos);
  const [bloqueFrio, setBloqueFrio] = useState<AreaData>(defaultBloqueFrio);
  const [mantenimiento, setMantenimiento] = useState<AreaData>(defaultMantenimiento);
  const [general, setGeneral] = useState<AreaData>({ ...defaultCocimientos, team: "Vista General", lema: "Toda la Planta" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const timestamp = new Date().getTime();
      try {
        const eaMap: Record<string, { equipo: string; lider: string }> = {};
        const championMap: Record<string, ChampionKey[]> = {};
        const factorMap: Record<string, AreaData["autonomyFactors"]> = {};

        try {
          
          const baseRes = await fetch(`/0. BASE EQUIPOS AUTÓNOMOS CCZ (3).xlsx?t=${timestamp}`);
          const baseBuf = await baseRes.arrayBuffer();
          const baseWb = xlsx.read(baseBuf, { type: "array" });
        // nombre de la hoja de excel 
          const baseRows = xlsx.utils.sheet_to_json(baseWb.Sheets["BD_ZAC_OFICIAL"]) as any[];
          
          for (const row of baseRows) {
            // id de los empleados, fotos, 
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
          const eacRes = await fetch(`/EAC.xlsx?t=${timestamp}`);
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
          const eabfRes = await fetch(`/EABF.xlsx?t=${timestamp}`);
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

        try {
          const bpreRes = await fetch(`/BPRE.xlsx?t=${timestamp}`);
          const bpreBuf = await bpreRes.arrayBuffer();
          const bpreWb = xlsx.read(bpreBuf, { type: "array" });
          const bpreRows = xlsx.utils.sheet_to_json(bpreWb.Sheets[bpreWb.SheetNames[0]]) as any[];
          
          for (const row of bpreRows) {
            const rawArea = String(row["ÁREA"] || "").trim();
            const rawNombre = String(row["NOMBRE"] || "").trim();
            
            // Determine area key
            let areaKey = "";
            const areaLower = rawArea.toLowerCase();
            const nombreLower = rawNombre.toLowerCase();
            const combined = (areaLower + " " + nombreLower).trim();

            if (combined.includes("cocimientos")) areaKey = "Warm Block";
            else if (combined.includes("bloque frio") || combined.includes("cuartos frios")) areaKey = "Cold Block";
            else if (combined.includes("mantenimiento")) areaKey = "Brewing Maintenance";
            
            // Priority for General if it contains "promedio general" or similar
            if (combined.includes("promedio general")) areaKey = "General";
            else if (areaKey === "" && combined.includes("general")) areaKey = "General";

            if (areaKey) {
              // Helper to find column value by partial name match
              const getVal = (keyword: string) => {
                const colName = Object.keys(row).find(key => 
                  key.toLowerCase().includes(keyword.toLowerCase())
                );
                if (!colName) return 0;
                let val = row[colName];
                if (typeof val === "string") {
                  val = val.replace(",", ".");
                }
                const num = Number(val);
                return isNaN(num) ? 0 : num;
              };

              const factors = {
                dinamica: getVal("DINÁMICA") || getVal("DINAMICA"),
                liderazgo: getVal("LIDERAZGO") || getVal("LIDERAZ"),
                skap: getVal("SKAP"),
                ato: getVal("ATO"),
                seguridad: getVal("SEGURIDAD"),
                quas: getVal("QUAS") || getVal("CALIDAD"),
                multihab: getVal("MULTIHAB") || getVal("MULTIHA") || getVal("MULTI"),
                vpo: getVal("VPO"),
                solucionProb: getVal("SOLUCIÓN") || getVal("SOLUCION") || getVal("PROB"),
                infraest: getVal("INFRAEST") || getVal("INFRAESTRUCTURA"),
              };

              // If it's a 'Promedio' row, it should overwrite any previous team-specific data for that area map
              if (nombreLower.includes("promedio") || areaLower.includes("promedio") || !factorMap[areaKey]) {
                factorMap[areaKey] = factors;
              }
            }
          }
        } catch (e) {
          console.error("Error loading BPRE:", e);
        }

        const response = await fetch(`/DATOS.xlsx?t=${timestamp}`);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet) as any[];

        const parseOperator = (row: any): Operator & { autonomyScore: number, noEvaluado: boolean } => {
          const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]\s+(.*)/) : null;
          const id = empMatch ? empMatch[1] : String(Math.random());
          const nombre = empMatch ? empMatch[2] : row["Employee"] || "Desconocido";

          // NEW COLUMN STRUCTURE FROM INSPECTION
          const basicCols = ["Safety", "Quality", "Environment", "Management", "People", "Maintenance", "Logistics", "Operation"];
          const intermediateCols = ["Safety_1", "Quality_1", "Environment_1", "Management_1", "People_1", "Maintenance_1", "Logistics_1", "Operation_1"];
          const advancedCols = ["Safety_2", "Quality_2", "Environment_2", "Management_2", "People_2", "Maintenance_2", "Logistics_2", "Operation_2"];

          const calculateAverage = (cols: string[]) => {
            const values = cols.map(c => {
              const val = row[c];
              if (val === undefined || val === null || val === "-") return 0;
              if (typeof val === "number") return val * 100; // Assuming 1 = 100%
              if (val === "Certified" || val === "100%") return 100;
              if (val === "Qualified" || val === "75%") return 75;
              if (val === "In Training" || val === "50%") return 50;
              if (val === "Novice" || val === "25%") return 25;
              return 0;
            });
            return values.reduce((a, b) => a + b, 0) / cols.length;
          };

          const hasEvaluation = [...basicCols, ...intermediateCols, ...advancedCols].some(c => {
            const val = row[c];
            return val !== undefined && val !== null && val !== "-" && String(val).trim() !== "";
          });

          const colScore = Object.keys(row).find(k => 
            k.toLowerCase().includes("autonomy score") || 
            k.toLowerCase().includes("excelencia") || 
            k.toLowerCase().includes("autono") || 
            k.toLowerCase().trim() === "autonomía"
          );
          
          let val: number | null = null;
          if (colScore) {
            val = parseFloat(row[colScore]);
          }

          const basico = calculateAverage(basicCols);
          const intermedio = calculateAverage(intermediateCols);
          const avanzado = calculateAverage(advancedCols);

          if (val === null || isNaN(val)) {
            val = (basico * 0.5) + (intermedio * 0.35) + (avanzado * 0.15);
          }

          const autonomyScore = val <= 1.0 ? parseFloat((val * 100).toFixed(2)) : parseFloat(val.toFixed(2));

          const eaData = eaMap[id] || { equipo: "Sin Equipo", lider: "No asignado" };

          return {
            id,
            nombre,
            puesto: row["SKAP Position"] || row["Position"] || "Operador",
            basico: Number(basico.toFixed(2)),
            intermedio: Number(intermedio.toFixed(2)),
            avanzado: Number(avanzado.toFixed(2)),
            autonomyScore: Number(autonomyScore.toFixed(2)),
            champions: championMap[id] || [],
            equipoAutonomo: eaData.equipo,
            lider: eaData.lider,
            lastAssessmentDate: row["Assessment Date"] || row["Last Assessment Date"] || null,
            ato: row["ATO"] || 4,
            noEvaluado: !hasEvaluation || Number(autonomyScore.toFixed(2)) === 0
          };
        };

        const opsMap: Record<string, Operator & { autonomyScore: number, noEvaluado: boolean, _count: number, _area: string }> = {};

        for (const row of rows) {
          const area = row["Area"] || "";
          const parsed = parseOperator(row);
          const eqStr = row["SKAP Position"] ? String(row["SKAP Position"]) : "";

          if (opsMap[parsed.id]) {
            const ext = opsMap[parsed.id];
            ext.basico += parsed.basico;
            ext.intermedio += parsed.intermedio;
            ext.avanzado += parsed.avanzado;
            ext.autonomyScore += parsed.autonomyScore;
            ext._count++;
            if (!parsed.noEvaluado) {
              ext.noEvaluado = false;
            }
            
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

        const cocimientosOps: (Operator & { autonomyScore: number, noEvaluado: boolean, _area: string })[] = [];
        const bloqueFrioOps: (Operator & { autonomyScore: number, noEvaluado: boolean, _area: string })[] = [];
        const mantenimientoOps: (Operator & { autonomyScore: number, noEvaluado: boolean, _area: string })[] = [];

        Object.values(opsMap).forEach(op => {
           op.basico = Number((op.basico / op._count).toFixed(2));
           op.intermedio = Number((op.intermedio / op._count).toFixed(2));
           op.avanzado = Number((op.avanzado / op._count).toFixed(2));
           op.autonomyScore = Number((op.autonomyScore / op._count).toFixed(2));
           
           if (op._area === "Warm Block") cocimientosOps.push(op);
           else if (op._area === "Cold Block") bloqueFrioOps.push(op);
           else if (op._area === "Brewing Maintenance") {
             if (op.equipoAutonomo === "Sin Equipo" || !op.equipoAutonomo) {
               op.equipoAutonomo = "LOS NAHUALES";
             }
             if (op.equipoAutonomo.toUpperCase() === "LOS NAHUALES") {
               op.lider = "LUIS MANUEL GARCIA VICTORIO";
             }
             mantenimientoOps.push(op);
           }
        });

        const compararOperadores = (a: any, b: any) => {
          if (b.autonomyScore !== a.autonomyScore) {
            return b.autonomyScore - a.autonomyScore;
          }
          const timeA = a.lastAssessmentDate ? new Date(a.lastAssessmentDate).getTime() : 0;
          const timeB = b.lastAssessmentDate ? new Date(b.lastAssessmentDate).getTime() : 0;
          const validA = isNaN(timeA) ? 0 : timeA;
          const validB = isNaN(timeB) ? 0 : timeB;
          return validB - validA;
        };

        cocimientosOps.sort(compararOperadores);
        bloqueFrioOps.sort(compararOperadores);
        mantenimientoOps.sort(compararOperadores);

        const buildExcellence = (ops: (Operator & { autonomyScore: number, noEvaluado: boolean, _area: string })[], areaKey?: string) => {
          if (ops.length === 0) return null;
          
          const sorted = [...ops].sort(compararOperadores);
          const podio = sorted.slice(0, 5).map(op => ({
            nombre: op.nombre,
            puesto: op.puesto,
            excelencia: Number(op.autonomyScore.toFixed(2)),
            lider: op.lider
          }));

          const evaluatedOps = ops.filter(op => !op.noEvaluado);
          const totalScore = evaluatedOps.reduce((sum, op) => sum + op.autonomyScore, 0);
          const excelenciaEquipo = evaluatedOps.length > 0 ? Number((totalScore / evaluatedOps.length).toFixed(2)) : 0;
          const autonomia = Number(((excelenciaEquipo / 100) * 4).toFixed(2));
          
          let nivelLabel = "Nivel 1 — Inicial";
          if (autonomia >= 3.5) nivelLabel = "Nivel 4 — Operación Autónoma";
          else if (autonomia >= 2.5) nivelLabel = "Nivel 3 — Mejora Autónoma";
          else if (autonomia >= 1.5) nivelLabel = "Nivel 2 — Mantenimiento Autónomo";

          const logros = [
            `${ops.filter(o => o.autonomyScore >= 80).length} operadores con autonomía ≥ 80%`,
            `Promedio de autonomía del equipo: ${excelenciaEquipo}%`,
            `Top 1: ${podio[0]?.nombre || "N/A"} (${podio[0]?.excelencia || 0}%)`
          ];

          const teamsMap: Record<string, { sum: number, count: number, leader: string }> = {};
          ops.forEach(op => {
            const team = op.equipoAutonomo || "Sin Equipo";
            if (!teamsMap[team]) teamsMap[team] = { sum: 0, count: 0, leader: op.lider || "No asignado" };
            if (!op.noEvaluado) {
              teamsMap[team].sum += op.autonomyScore;
              teamsMap[team].count += 1;
            }
            if (op.lider && teamsMap[team].leader === "No asignado") {
              teamsMap[team].leader = op.lider;
            }
          });

          const teamRankings = Object.entries(teamsMap)
            .filter(([name]) => name !== "Sin Equipo")
            .map(([name, data]) => ({
              name,
              avg: data.count > 0 ? Number((data.sum / data.count).toFixed(2)) : 0,
              leader: data.leader
            }))
            .sort((a, b) => b.avg - a.avg);

          const bestTeam = teamRankings[0] || undefined;
          const worstTeam = teamRankings[teamRankings.length - 1] || undefined;

          // Find factors for this area
          const nameToLookup = areaKey || ops[0]?._area;
          const autonomyFactors = factorMap[nameToLookup] || factorMap["General"] || undefined;

          return { podio, excelenciaEquipo, logros, autonomia, nivelLabel, bestTeam, worstTeam, teamRankings, autonomyFactors };
        };

        const cocimientosExc = buildExcellence(cocimientosOps, "Warm Block");
        setCocimientos(prev => ({
          ...prev,
          operadores: cocimientosOps.length > 0 ? cocimientosOps : prev.operadores,
          ...(cocimientosExc ? cocimientosExc : {})
        }));

        const bloqueFrioExc = buildExcellence(bloqueFrioOps, "Cold Block");
        setBloqueFrio(prev => ({
          ...prev,
          operadores: bloqueFrioOps.length > 0 ? bloqueFrioOps : prev.operadores,
          ...(bloqueFrioExc ? bloqueFrioExc : {})
        }));

        const mantenimientoExc = buildExcellence(mantenimientoOps, "Brewing Maintenance");
        setMantenimiento(prev => ({
          ...prev,
          operadores: mantenimientoOps.length > 0 ? mantenimientoOps : prev.operadores,
          ...(mantenimientoExc ? mantenimientoExc : {})
        }));

        const allOps = [...cocimientosOps, ...bloqueFrioOps, ...mantenimientoOps]
          .sort(compararOperadores);
        const generalExc = buildExcellence(allOps, "General");
        setGeneral(prev => ({
          ...prev,
          operadores: allOps.length > 0 ? allOps : prev.operadores,
          ...(generalExc ? generalExc : {})
        }));

      } catch (e) {
        console.error("Error loading excel data:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { general, cocimientos, bloqueFrio, mantenimiento, loading };
}
