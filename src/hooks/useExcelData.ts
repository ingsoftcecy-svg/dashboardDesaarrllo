import { useState, useEffect } from "react";
import * as xlsx from "xlsx";
import { Operator, ChampionKey, cocimientos as defaultCocimientos, bloqueFrio as defaultBloqueFrio, mantenimiento as defaultMantenimiento, AreaData } from "@/data/zeus";

export function useExcelData() {
  const [cocimientos, setCocimientos] = useState<AreaData>(defaultCocimientos);
  const [bloqueFrio, setBloqueFrio] = useState<AreaData>(defaultBloqueFrio);
  const [mantenimiento, setMantenimiento] = useState<AreaData>(defaultMantenimiento);
  const [general, setGeneral] = useState<AreaData>({ ...defaultCocimientos, title: "Vista General", subtitle: "Toda la Planta" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const timestamp = new Date().getTime();
      try {
        const eaMap: Record<string, { equipo: string; lider: string }> = {};
        const championMap: Record<string, ChampionKey[]> = {};

        try {
          const baseRes = await fetch(`/0. BASE EQUIPOS AUTÓNOMOS CCZ (3).xlsx?t=${timestamp}`);
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

        const response = await fetch(`/DATOS.xlsx?t=${timestamp}`);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet) as any[];

        const parseOperator = (row: any): Operator & { autonomyScore: number } => {
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

          const basico = calculateAverage(basicCols);
          const intermedio = calculateAverage(intermediateCols);
          const avanzado = calculateAverage(advancedCols);
          
          // Use provided Autonomy Score if available, otherwise calculate
          let autonomyScore = 0;
          if (row["Autonomy Score"] !== undefined && typeof row["Autonomy Score"] === "number") {
             autonomyScore = row["Autonomy Score"] * 100;
          } else {
             autonomyScore = (basico * 0.5) + (intermedio * 0.35) + (avanzado * 0.15);
          }

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
            ato: id === "32102191" ? 8 : 4
          };
        };

        const opsMap: Record<string, Operator & { autonomyScore: number, _count: number, _area: string }> = {};

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
        const mantenimientoOps: (Operator & { autonomyScore: number })[] = [];

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
             mantenimientoOps.push(op);
           }
        });

        cocimientosOps.sort((a, b) => b.autonomyScore - a.autonomyScore);
        bloqueFrioOps.sort((a, b) => b.autonomyScore - a.autonomyScore);
        mantenimientoOps.sort((a, b) => b.autonomyScore - a.autonomyScore);

        const buildExcellence = (ops: (Operator & { autonomyScore: number })[]) => {
          if (ops.length === 0) return null;
          
          const sorted = [...ops].sort((a, b) => b.autonomyScore - a.autonomyScore);
          const podio = sorted.slice(0, 5).map(op => ({
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

          const teamsMap: Record<string, { sum: number, count: number, leader: string }> = {};
          ops.forEach(op => {
            const team = op.equipoAutonomo || "Sin Equipo";
            if (!teamsMap[team]) teamsMap[team] = { sum: 0, count: 0, leader: op.lider || "No asignado" };
            teamsMap[team].sum += op.autonomyScore;
            teamsMap[team].count += 1;
            if (op.lider && teamsMap[team].leader === "No asignado") {
              teamsMap[team].leader = op.lider;
            }
          });

          const teamRankings = Object.entries(teamsMap)
            .filter(([name]) => name !== "Sin Equipo")
            .map(([name, data]) => ({
              name,
              avg: Number((data.sum / data.count).toFixed(2)),
              leader: data.leader
            }))
            .sort((a, b) => b.avg - a.avg);

          const bestTeam = teamRankings[0] || undefined;
          const worstTeam = teamRankings[teamRankings.length - 1] || undefined;

          return { podio, excelenciaEquipo, logros, autonomia, bestTeam, worstTeam, teamRankings };
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

        const mantenimientoExc = buildExcellence(mantenimientoOps);
        setMantenimiento(prev => ({
          ...prev,
          operadores: mantenimientoOps.length > 0 ? mantenimientoOps : prev.operadores,
          ...(mantenimientoExc ? mantenimientoExc : {})
        }));

        const allOps = [...cocimientosOps, ...bloqueFrioOps, ...mantenimientoOps]
          .sort((a, b) => b.autonomyScore - a.autonomyScore);
        const generalExc = buildExcellence(allOps);
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
