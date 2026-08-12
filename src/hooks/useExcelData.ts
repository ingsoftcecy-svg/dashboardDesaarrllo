import { useState, useEffect } from "react";
import * as xlsx from "xlsx";
import { collection, getDocs, doc, getDoc, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Operator, ChampionKey, cocimientos as defaultCocimientos, bloqueFrio as defaultBloqueFrio, mantenimiento as defaultMantenimiento, AreaData, OPERATORS_MAX_SKILLS } from "@/data/ccz";

export const normalizarNombreEquipo = (name: string): string => {
  const n = name.trim().toUpperCase();
  if (n === "LOS CAZADORES DEL AMARGOR" || n === "CAZADORES_AMARGOR" || n === "LOS CAZADORES DEL AMARGOR " || n === "CAZADORES DEL AMARGOR") return "CAZADORES_AMARGOR";
  if (n === "CUCHILLAS" || n === "CUCHILLA") return "CUCHILLA";
  if (n === "MASH-RAINBOW" || n === "MASHRAINBOW") return "MASHRAINBOW";
  if (n === "MOSTO-BOYS" || n === "MOSTOBOYS") return "MOSTOBOYS";
  if (n === "LOS PANCHITOS" || n === "PANCHITOS") return "PANCHITOS";
  if (n === "LOS ANDAMOS CON TODO" || n === "ANDAMOS CON TODO" || n === "ANDAMOS_CON_TODO" || n === "ANDAMOS_CON_TODO ") return "ANDAMOS_CON_TODO ";
  if (n === "LOS BRONCOS" || n === "BRONCOS") return "BRONCOS";
  if (n === "LOS BRAVOS DEL FRIO" || n === "BRAVOS DEL FRIO" || n === "LOS_BRAVOS" || n === "BRAVOS DEL FRÍO" || n === "LOS BRAVOS DEL FRÍO") return "LOS_BRAVOS";
  if (n === "LOS FUERTES DEL FRIO" || n === "FUERTES DEL FRIO" || n === "LOS_FUERTES" || n === "FUERTES DEL FRÍO" || n === "LOS FUERTES DEL FRÍO") return "LOS_FUERTES";
  if (n === "REYES DE LA MEZCLA" || n === "REYES_MEZCLA") return "REYES_MEZCLA";
  if (n === "MUNICH") return "MUNICH";
  if (n === "NAHUALES" || n === "LOS NAHUALES") return "NAHUALES";
  return n;
};

export function useExcelData() {
  const [cocimientos, setCocimientos] = useState<AreaData>(defaultCocimientos);
  const [bloqueFrio, setBloqueFrio] = useState<AreaData>(defaultBloqueFrio);
  const [mantenimiento, setMantenimiento] = useState<AreaData>(defaultMantenimiento);
  const [general, setGeneral] = useState<AreaData>({ ...defaultCocimientos, team: "Vista General", lema: "Toda la Planta" });
  const [loading, setLoading] = useState(true);
  const [guiasCatalog, setGuiasCatalog] = useState<any>(null);

  useEffect(() => {
    let unsubscribeGuias: (() => void) | null = null;
    let unsubscribeModificados: (() => void) | null = null;

    const loadData = async () => {
      const timestamp = new Date().getTime();
      try {
        // Cargar catálogo de guías técnicas
        let loadedCatalog: any = null;
        try {
          const guiasRes = await fetch(`/guias_tecnicas.json?t=${timestamp}`);
          loadedCatalog = await guiasRes.json();
          setGuiasCatalog(loadedCatalog);
        } catch (e) {
          console.error("Error loading guias_tecnicas.json:", e);
        }

        const getGuiasTotalSkills = (level: string) => {
          if (!loadedCatalog || !loadedCatalog[level]) return 0;
          let total = 0;
          loadedCatalog[level].forEach((cat: any) => {
            total += (cat.skills || []).length;
          });
          return total;
        };

        const guiasTotals = {
          L6: getGuiasTotalSkills("L6") || 54,
          L7: getGuiasTotalSkills("L7") || 101,
          L8: getGuiasTotalSkills("L8") || 34
        };

        const eaMap: Record<string, { equipo: string; lider: string }> = {};
        const championMap: Record<string, ChampionKey[]> = {};
        const factorMap: Record<string, AreaData["autonomyFactors"]> = {};
        const overridesMap: Record<string, { leader: string }> = {
          "LOS PANCHITOS": { leader: "JOSÉ FRANCISCO TORRES LÓPEZ" },
          "PANCHITOS": { leader: "JOSÉ FRANCISCO TORRES LÓPEZ" },
          "REYES DE LA MEZCLA": { leader: "RODRIGO REGALADO PALOMEQUE" },
          "REYES_MEZCLA": { leader: "RODRIGO REGALADO PALOMEQUE" }
        };

        // Carga overrides
        try {
          const overridesSnapshot = await getDocs(collection(db, "team_overrides"));
          overridesSnapshot.forEach((doc) => {
            overridesMap[doc.id] = doc.data() as { leader: string };
          });
        } catch (e) {
          console.error("Error loading team overrides:", e);
        }

        // Carga catálogos fijos
        let baseRows: any[] = [];
        let eacRows: any[] = [];
        let eabfRows: any[] = [];
        let estructuraNuevaRows: any[] = [];
        let catalogosCargados = false;

        const isDev = import.meta.env.DEV;
        if (!isDev) {
          try {
            const catDocRef = doc(db, "config_dashboard", "catalogos_fijos");
            const catSnap = await getDoc(catDocRef);
            if (catSnap.exists()) {
              const data = catSnap.data();
              baseRows = data.base_equipos || [];
              eacRows = data.eac || [];
              eabfRows = data.eabf || [];
              estructuraNuevaRows = data.estructura_nueva || [];
              catalogosCargados = true;
            }
          } catch (e) {
            console.error("Error loading fixed catalogs from Firestore:", e);
          }
        }

        if (!catalogosCargados) {
          try {
            const baseRes = await fetch(`/base.json?t=${timestamp}`);
            baseRows = await baseRes.json() as any[];
          } catch (e) { console.error("Error loading fallback base.json:", e); }

          try {
            const eacRes = await fetch(`/eac.json?t=${timestamp}`);
            eacRows = await eacRes.json() as any[];
          } catch (e) { console.error("Error loading fallback eac.json:", e); }

          try {
            const eabfRes = await fetch(`/eabf.json?t=${timestamp}`);
            eabfRows = await eabfRes.json() as any[];
          } catch (e) { console.error("Error loading fallback eabf.json:", e); }

          try {
            const estRes = await fetch(`/estructura_nueva.json?t=${timestamp}`);
            estructuraNuevaRows = await estRes.json() as any[];
          } catch (e) { console.error("Error loading fallback estructura_nueva.json:", e); }
        }

        // Carga cursos_resumen
        let cursosResumen: Record<string, { t: number; a: number; e: number; p: number }> = {};
        try {
          const cursosDocRef = doc(db, "config_dashboard", "cursos_resumen");
          const cursosDocSnap = await getDoc(cursosDocRef);
          if (cursosDocSnap.exists() && cursosDocSnap.data().summary) {
            cursosResumen = cursosDocSnap.data().summary;
          } else {
            const cursosRes = await fetch(`/cursos_resumen.json?t=${timestamp}`);
            cursosResumen = await cursosRes.json();
          }
        } catch (e) {
          console.error("Error loading courses summary, trying local fallback:", e);
          try {
            const cursosRes = await fetch(`/cursos_resumen.json?t=${timestamp}`);
            cursosResumen = await cursosRes.json();
          } catch (err) {
            console.error("Local fallback for courses summary failed:", err);
          }
        }

        // Carga brechas_resumen
        let brechasResumen: Record<string, { total: number; completadas: number; enProceso: number; porcentaje: number; brechas: any[] }> = {};
        try {
          const brechasRes = await fetch(`/brechas_resumen.json?t=${timestamp}`);
          brechasResumen = await brechasRes.json();
        } catch (e) {
          console.error("Error loading brechas summary:", e);
        }

        // Procesar Base Config (championMap)
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

        // Cargar operadores centralizados
        let centralizedOperators: any[] = [];
        try {
          const opsRes = await fetch(`/operators.json?t=${timestamp}`);
          centralizedOperators = await opsRes.json();
        } catch (e) {
          console.error("Error loading centralized operators.json:", e);
        }

        // Poblar eaMap usando operators.json
        if (centralizedOperators && centralizedOperators.length > 0) {
          for (const op of centralizedOperators) {
            if (op.id) {
              eaMap[op.id] = {
                equipo: op.equipoAutonomo || "Sin Equipo",
                lider: op.lider || "No asignado",
              };
            }
          }
        }

        // Cargar datos activos
        let bpreRows: any[] = [];
        let rows: any[] = [];
        let datosCargados = false;

        try {
          const q = query(collection(db, "historicos_excel"));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const sortedDocs = [...snap.docs].sort((a, b) => a.id.localeCompare(b.id));
            const skapMap: Record<string, any> = {};
            const bpreMap: Record<string, any> = {};

            sortedDocs.forEach(docSnap => {
              const docData = docSnap.data();
              const weekSkap = docData.datos_skap || [];
              const weekBpre = docData.bpre || [];

              weekSkap.forEach((fila: any) => {
                const empCol = Object.keys(fila).find(k => k.toLowerCase().trim() === 'employee');
                const empVal = empCol ? String(fila[empCol]).trim() : '';
                const posCol = Object.keys(fila).find(k => k.toLowerCase().trim() === 'skap position' || k.toLowerCase().trim() === 'position');
                const posVal = posCol ? String(fila[posCol]).trim() : '';
                if (empVal) {
                  const key = `${empVal}_${posVal}`;
                  skapMap[key] = fila;
                }
              });

              weekBpre.forEach((fila: any) => {
                const nameCol = Object.keys(fila).find(k => k.toLowerCase().trim() === 'nombre');
                const areaCol = Object.keys(fila).find(k => k.toLowerCase().trim() === 'area' || k.toLowerCase().trim() === 'área');
                const nameVal = nameCol ? String(fila[nameCol]).trim() : '';
                const areaVal = areaCol ? String(fila[areaCol]).trim() : '';
                
                const key = `${nameVal}_${areaVal}`.toUpperCase();
                if (nameVal || areaVal) {
                  bpreMap[key] = fila;
                }
              });
            });

            rows = Object.values(skapMap);
            bpreRows = Object.values(bpreMap);
            datosCargados = true;
          }
        } catch (e) {
          console.error("Error loading active data from Firestore:", e);
        }

        if (!datosCargados) {
          try {
            const bpreRes = await fetch(`/bpre.json?t=${timestamp}`);
            bpreRows = await bpreRes.json() as any[];
          } catch (e) { console.error("Error loading fallback bpre.json:", e); }

          try {
            const response = await fetch(`/datos.json?t=${timestamp}`);
            rows = await response.json() as any[];
          } catch (e) { console.error("Error loading fallback datos.json:", e); }
        }

        // Definir variables para guardar el estado en tiempo real
        let guiasMap: Record<string, any> = {};
        let modificadosMap: Record<string, any> = {};
        let guiasReady = false;
        let modificadosReady = false;

        const executeRecalculate = () => {
          try {
            // Clonar rows para no contaminar ejecuciones futuras de onSnapshot
            let localRows = rows ? JSON.parse(JSON.stringify(rows)) : [];

            // APLICAR CAMBIOS DE OPERADORES MODIFICADOS (Bajas, Modificaciones, Altas)
            const baseInactiveIds = new Set(["32045556", "32188117", "32231307"]); // 32231307 is Rodrigo Regalado
            
            // Combinar inactivos desde modificados
            Object.values(modificadosMap).forEach((mod: any) => {
              if (mod.status === 'inactivo') {
                baseInactiveIds.add(mod.id);
              }
            });

            localRows.forEach((r: any) => {
              if (!r["Employee"]) return;
              const empStr = String(r["Employee"]).trim();
              const empMatch = empStr.match(/\[(\d+)\]\s+(.*)/);
              let id = empMatch ? empMatch[1] : "";
              let nombre = empMatch ? empMatch[2] : empStr;

              const normNombre = nombre.toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, " ")
                .trim();

              let changed = false;
              if (normNombre.includes("CESAR ROFRIGUEZ") || normNombre.includes("CESAR RODRIGUEZ")) {
                id = "32197863";
                nombre = "CESAR RODRIGUEZ BANDA";
                changed = true;
              } else if (normNombre.includes("ALEXIS BERLIN")) {
                id = "32244174";
                nombre = "ALEXIS BERLIN ALVAREZ CORONA";
                changed = true;
              }

              // Aplicar modificación en tiempo real (si está activo)
              if (id && modificadosMap[id] && modificadosMap[id].status === 'activo') {
                const mod = modificadosMap[id];
                nombre = mod.nombre;
                if (!r["SKAP Position"] && !r["Position"]) {
                  r["SKAP Position"] = mod.puesto;
                  r["Position"] = mod.puesto;
                }
                r["Area"] = mod.area;
                changed = true;

                // Modificar eaMap
                eaMap[id] = {
                  equipo: mod.equipoAutonomo || "Sin Equipo",
                  lider: mod.lider || "No asignado"
                };
                if (mod.roles) {
                  championMap[id] = mod.roles;
                }
              }

              if (changed) {
                r["Employee"] = `[${id}] ${nombre}`;
              }
            });

            // Filtrar los inactivos
            localRows = localRows.filter((r: any) => {
              const empMatch = r["Employee"] ? String(r["Employee"]).match(/\[(\d+)\]/) : null;
              const id = empMatch ? empMatch[1] : "";
              return !baseInactiveIds.has(id);
            });

            // 2. Inyectar César Rodríguez Banda si no está (y no está desactivado)
            if (!baseInactiveIds.has("32197863")) {
              const hasCesar = localRows.some((r: any) => {
                const empMatch = r["Employee"] ? String(r["Employee"]).match(/\[(\d+)\]/) : null;
                return empMatch && empMatch[1] === "32197863";
              });
              if (!hasCesar) {
                localRows.push({
                  "Employee": "[32197863] CESAR RODRIGUEZ BANDA",
                  "SKAP Position": "Integrante",
                  "Position": "Integrante",
                  "Autonomy Score": 0,
                  "Area": "Cold Block",
                  "Department": "Brewing",
                  "Safety": 0,
                  "Quality": 0,
                  "Environment": 0,
                  "Management": 0,
                  "People": 0,
                  "Maintenance": 0,
                  "Logistics": 0,
                  "Operation": 0
                });
              }
            }

            // 3. Inyectar Alexis Berlin Alvarez Corona si no está (y no está desactivado)
            if (!baseInactiveIds.has("32244174")) {
              const hasAlexis = localRows.some((r: any) => {
                const empMatch = r["Employee"] ? String(r["Employee"]).match(/\[(\d+)\]/) : null;
                return empMatch && empMatch[1] === "32244174";
              });
              if (!hasAlexis) {
                localRows.push({
                  "Employee": "[32244174] ALEXIS BERLIN ALVAREZ CORONA",
                  "SKAP Position": "QUAS",
                  "Position": "QUAS",
                  "Autonomy Score": 0,
                  "Area": "Cold Block",
                  "Department": "Brewing",
                  "Safety": 0,
                  "Quality": 0,
                  "Environment": 0,
                  "Management": 0,
                  "People": 0,
                  "Maintenance": 0,
                  "Logistics": 0,
                  "Operation": 0
                });
              }
            }

            // 4. Inyectar Altas Manuales de modificadosMap
            Object.values(modificadosMap).forEach((mod: any) => {
              if (mod.isManual && mod.status === 'activo' && !baseInactiveIds.has(mod.id)) {
                const exists = localRows.some((r: any) => {
                  const empMatch = r["Employee"] ? String(r["Employee"]).match(/\[(\d+)\]/) : null;
                  return empMatch && empMatch[1] === mod.id;
                });
                if (!exists) {
                  // También setear eaMap para este nuevo manual
                  eaMap[mod.id] = {
                    equipo: mod.equipoAutonomo || "Sin Equipo",
                    lider: mod.lider || "No asignado"
                  };
                  if (mod.roles) {
                    championMap[mod.id] = mod.roles;
                  }

                  localRows.push({
                    "Employee": `[${mod.id}] ${mod.nombre}`,
                    "SKAP Position": mod.puesto,
                    "Position": mod.puesto,
                    "Autonomy Score": 0,
                    "Area": mod.area,
                    "Department": "Brewing",
                    "Safety": 0,
                    "Quality": 0,
                    "Environment": 0,
                    "Management": 0,
                    "People": 0,
                    "Maintenance": 0,
                    "Logistics": 0,
                    "Operation": 0
                  });
                }
              }
            });

            // Procesar BPRE (factorMap)
            for (const row of bpreRows) {
              const rawArea = String(row["ÁREA"] || "").trim();
              const rawNombre = String(row["NOMBRE"] || "").trim();
              
              let areaKey = "";
              const areaLower = rawArea.toLowerCase();
              const nombreLower = rawNombre.toLowerCase();
              const combined = (areaLower + " " + nombreLower).trim();

              if (combined.includes("cocimientos")) areaKey = "Warm Block";
              else if (combined.includes("bloque frio") || combined.includes("cuartos frios")) areaKey = "Cold Block";
              else if (combined.includes("mantenimiento")) areaKey = "Brewing Maintenance";
              
              if (combined.includes("promedio general")) areaKey = "General";
              else if (areaKey === "" && combined.includes("general")) areaKey = "General";

              if (areaKey) {
                const getVal = (keyword: string) => {
                  const normKeyword = keyword.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

                  const colName = Object.keys(row).find(key => {
                    const keyLower = key.toLowerCase();
                    if (keyLower.includes("fecha") || keyLower.includes("compromiso")) {
                      return false;
                    }
                    const normKey = keyLower
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '');
                    return normKey.includes(normKeyword);
                  });
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

                if (nombreLower.includes("promedio") || areaLower.includes("promedio") || !factorMap[areaKey]) {
                  factorMap[areaKey] = factors;
                }
              }
            }

            const getColValue = (rowObj: any, ...keys: string[]) => {
              if (!rowObj || typeof rowObj !== 'object') return undefined;
              const rowKeys = Object.keys(rowObj);
              for (const targetKey of keys) {
                if (rowObj[targetKey] !== undefined && rowObj[targetKey] !== null) {
                  return rowObj[targetKey];
                }
                const normTarget = targetKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                const foundKey = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === normTarget);
                if (foundKey && rowObj[foundKey] !== undefined && rowObj[foundKey] !== null) {
                  return rowObj[foundKey];
                }
              }
              return undefined;
            };

            const parseOperator = (row: any): Operator & { autonomyScore: number, noEvaluado: boolean } => {
              const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]\s+(.*)/) : null;
              let id = empMatch ? empMatch[1] : String(Math.random());
              const nombre = empMatch ? empMatch[2] : row["Employee"] || "Desconocido";

              if (id === "32043739" && nombre.toUpperCase().includes("LAZARO")) {
                id = "32045769";
              }

              const basicCols = ["Safety", "Quality", "Environment", "Management", "People", "Maintenance", "Logistics", "Operation"];
              const intermediateCols = ["Safety_1", "Quality_1", "Environment_1", "Management_1", "People_1", "Maintenance_1", "Logistics_1", "Operation_1"];
              const advancedCols = ["Safety_2", "Quality_2", "Environment_2", "Management_2", "People_2", "Maintenance_2", "Logistics_2", "Operation_2"];

              const calculateAverage = (cols: string[]) => {
                const values = cols.map(c => {
                  const val = getColValue(row, c);
                  if (val === undefined || val === null || val === "-") return 0;
                  if (typeof val === "number") return val * 100;
                  if (val === "Certified" || val === "100%") return 100;
                  if (val === "Qualified" || val === "75%") return 75;
                  if (val === "In Training" || val === "50%") return 50;
                  if (val === "Novice" || val === "25%") return 25;
                  return 0;
                });
                return values.reduce((a, b) => a + b, 0) / cols.length;
              };

              const hasEvaluation = Object.keys(row).some(k => 
                k.toLowerCase().includes("safety") || 
                k.toLowerCase().includes("driver") || 
                k.toLowerCase().includes("intermediate") || 
                k.toLowerCase().includes("advanced") || 
                k.toLowerCase().includes("autono") || 
                k.toLowerCase().trim() === "autonomía"
              );
              
              let val: number | null = null;
              const rawScoreVal = getColValue(row, "Autonomy Score", "AutonomyScore", "Score", "Autonomía", "Autonomia");
              if (rawScoreVal !== undefined && rawScoreVal !== null && rawScoreVal !== "") {
                val = parseFloat(String(rawScoreVal));
              }

              const parseSkillValue = (val: any) => {
                if (val === undefined || val === null || val === "-") return null;
                if (typeof val === "number") {
                  return val <= 1.0 ? val * 100 : val;
                }
                if (typeof val === "string") {
                  const clean = val.replace("%", "").trim();
                  const num = parseFloat(clean);
                  return isNaN(num) ? null : num;
                }
                return null;
              };

              const rawBasico = parseSkillValue(getColValue(row, "Driver's License", "Drivers License", "Driver License", "Basic"));
              const rawIntermedio = parseSkillValue(getColValue(row, "Intermediate Capabilities", "IntermediateCapabilities", "Intermediate"));
              const rawAvanzado = parseSkillValue(getColValue(row, "Advanced Capabilities", "AdvancedCapabilities", "Advanced"));

              const basico = rawBasico !== null ? rawBasico : calculateAverage(basicCols);
              const intermedio = rawIntermedio !== null ? rawIntermedio : calculateAverage(intermediateCols);
              const avanzado = rawAvanzado !== null ? rawAvanzado : calculateAverage(advancedCols);

              if (val === null || isNaN(val) || (val === 0 && hasEvaluation)) {
                val = (basico * 0.5) + (intermedio * 0.35) + (avanzado * 0.15);
              }

              const autonomyScore = val <= 1.0 ? parseFloat((val * 100).toFixed(2)) : parseFloat(val.toFixed(2));

              const eaData = eaMap[id] || { equipo: "Sin Equipo", lider: "No asignado" };
              const normalizedTeam = normalizarNombreEquipo(eaData.equipo);
              const activeOverride = Object.entries(overridesMap).find(
                ([teamName]) => normalizarNombreEquipo(teamName) === normalizedTeam
              );
              let leaderName = activeOverride ? activeOverride[1].leader : eaData.lider;
              let puesto = getColValue(row, "SKAP Position", "SKAPPosition", "Position", "position") || "Operador";

              if (leaderName === "JOSÉ FRANCISCO TORRES LÓPEZ" && normalizedTeam === "PANCHITOS") {
                if (nombre.trim().toUpperCase() === "JOSÉ FRANCISCO TORRES LÓPEZ") {
                  puesto = "Líder";
                } else if (nombre.trim().toUpperCase() === "LUIS FERNANDO GUTIERREZ MURILLO") {
                  puesto = "Integrante";
                }
              }

              const empCursos = cursosResumen[id] || { t: 0, a: 0, e: 0, p: 0 };
              const totalC = empCursos.t;
              const aprobadosC = empCursos.a;
              const enProgresoC = empCursos.e;
              const pendientesC = empCursos.p;
              const cursosProgress = totalC > 0 ? parseFloat(((aprobadosC / totalC) * 100).toFixed(2)) : 0;

              const empBrechas = brechasResumen[id] || { total: 0, completadas: 0, enProceso: 0, porcentaje: 0, brechas: [] as any[] };
              const brechasProgress = empBrechas.porcentaje || 0;
              const brechasTotal = empBrechas.total || 0;
              const brechasCompletadas = empBrechas.completadas || 0;
              const brechasEnProceso = empBrechas.enProceso || 0;
              const brechasDetalle = empBrechas.brechas || [];

              // Guías Técnicas properties calculation — per level
              const guiasData = guiasMap[id] || guiasMap[String(id).trim()] || {};
              const guiasEvaluations = guiasData.evaluations || {};

              const getLevelPercentageFromJson = (level: string) => {
                if (!guiasData.evaluationsJson) return null;
                try {
                  const parsed = typeof guiasData.evaluationsJson === 'string' 
                    ? JSON.parse(guiasData.evaluationsJson) 
                    : guiasData.evaluationsJson;
                    
                  if (parsed.niveles && parsed.niveles[level]) {
                    const cats = parsed.niveles[level].categorias || [];
                    const evalCats = cats.filter((c: any) => (c.habilidades || []).length > 0);
                    if (evalCats.length > 0) {
                      let totalHabs = 0;
                      let aprobadas = 0;
                      evalCats.forEach((c: any) => {
                        const h = c.habilidades || [];
                        totalHabs += h.length;
                        aprobadas += h.filter((x: any) => x.marcado).length;
                      });
                      if (totalHabs > 0) {
                        return parseFloat(((aprobadas / totalHabs) * 100).toFixed(1));
                      }
                    }
                  }
                } catch (e) {
                  console.error("Error parsing evaluationsJson in useExcelData:", e);
                }
                return null;
              };

              const calcGuiasProgress = (level: string) => {
                const levelEval = guiasEvaluations[level] || {};
                const checked = levelEval.checked || [];
                const checkedCount = checked.filter(Boolean).length;
                const totalSkills = guiasTotals[level as keyof typeof guiasTotals] || (level === "L6" ? 54 : level === "L7" ? 101 : 34);
                return {
                  checkedCount,
                  totalSkills,
                  progress: totalSkills > 0 ? parseFloat(((checkedCount / totalSkills) * 100).toFixed(2)) : 0
                };
              };

              const guiasL6Eval = calcGuiasProgress("L6");
              const guiasL7Eval = calcGuiasProgress("L7");
              const guiasL8Eval = calcGuiasProgress("L8");

              const guiasL6Progress = getLevelPercentageFromJson("L6") ?? (typeof guiasData.l6Progress === 'number' ? guiasData.l6Progress : guiasL6Eval.progress);
              const guiasL7Progress = getLevelPercentageFromJson("L7") ?? (typeof guiasData.l7Progress === 'number' ? guiasData.l7Progress : guiasL7Eval.progress);
              const guiasL8Progress = getLevelPercentageFromJson("L8") ?? (typeof guiasData.l8Progress === 'number' ? guiasData.l8Progress : guiasL8Eval.progress);

              // Determinación inteligente del nivel activo
              let guiasActiveLevel: "L6" | "L7" | "L8" = (guiasData.activeLevel as "L6" | "L7" | "L8") || "L6";
              if (guiasL6Progress > 0 && guiasL6Progress < 100) guiasActiveLevel = "L6";
              else if (guiasL7Progress > 0 && guiasL7Progress < 100) guiasActiveLevel = "L7";
              else if (guiasL8Progress > 0) guiasActiveLevel = "L8";

              const tipoGuia = guiasData.tipoGuia || "COMPETENTE";

              // Porcentaje de Habilitación Total Absoluta según tipo de guía
              let guiasProgress = (guiasL6Progress + guiasL7Progress + guiasL8Progress) / 3;
              if (tipoGuia === "COMPETENTE") {
                guiasProgress = guiasL6Progress;
              } else if (guiasL7Progress > 0 || guiasL8Progress > 0) {
                const activeLevels = [guiasL6Progress, guiasL7Progress, guiasL8Progress].filter(p => p > 0);
                if (activeLevels.length > 0) {
                  guiasProgress = activeLevels.reduce((a, b) => a + b, 0) / activeLevels.length;
                }
              }
              guiasProgress = parseFloat(guiasProgress.toFixed(2));

              const guiasProgressFinal = typeof guiasData.overallProgress === 'number' ? guiasData.overallProgress : guiasProgress;

              const maxEquipos = OPERATORS_MAX_SKILLS[id] || 1;

              const evalDetail = {
                puesto: row["SKAP Position"] || row["Position"] || puesto,
                score: Number(autonomyScore.toFixed(2)),
                basico: Number(basico.toFixed(2)),
                intermedio: Number(intermedio.toFixed(2)),
                avanzado: Number(avanzado.toFixed(2)),
                date: row["Assessment Date"] || row["Last Assessment Date"] || undefined,
                evaluator: row["Evaluator"] || undefined
              };

              return {
                id,
                nombre,
                puesto: puesto,
                basico: Number(basico.toFixed(2)),
                intermedio: Number(intermedio.toFixed(2)),
                avanzado: Number(avanzado.toFixed(2)),
                autonomyScore: Number(autonomyScore.toFixed(2)),
                evaluacionesDetalle: [evalDetail],
                champions: championMap[id] || [],
                equipoAutonomo: eaData.equipo,
                lider: leaderName,
                maxEquipos,
                lastAssessmentDate: row["Assessment Date"] || row["Last Assessment Date"] || null,
                ato: row["ATO"] || 4,
                noEvaluado: !hasEvaluation || Number(autonomyScore.toFixed(2)) === 0,
                cursosProgress,
                cursosAprobados: aprobadosC,
                cursosTotal: totalC,
                cursosEnProgreso: enProgresoC,
                cursosPendientes: pendientesC,
                // Guías Técnicas properties
                guiasActiveLevel,
                guiasProgress,
                guiasL6Progress,
                guiasL7Progress,
                guiasL8Progress,
                brechasProgress,
                brechasTotal,
                brechasCompletadas,
                brechasEnProceso,
                brechasDetalle
              };
            };

            const opsMap: Record<string, Operator & { autonomyScore: number, noEvaluado: boolean, _count: number, _area: string }> = {};

            for (const row of localRows) {
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
                if (!ext.evaluacionesDetalle) ext.evaluacionesDetalle = [];
                if (parsed.evaluacionesDetalle && parsed.evaluacionesDetalle.length > 0) {
                  ext.evaluacionesDetalle.push(parsed.evaluacionesDetalle[0]);
                }
                if (!parsed.noEvaluado) {
                  ext.noEvaluado = false;
                }
                
                if (eqStr) {
                   const newEqs = eqStr.split(",").map(e => e.trim()).filter(Boolean);
                   for (const eq of newEqs) {
                     if (!ext.equipos!.includes(eq)) ext.equipos!.push(eq);
                   }
                }
                ext.maxEquipos = OPERATORS_MAX_SKILLS[parsed.id] || ext.equipos!.length || 1;

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
                  evaluacionesDetalle: parsed.evaluacionesDetalle ? [...parsed.evaluacionesDetalle] : [],
                  equipos: eqStr ? eqStr.split(",").map(e => e.trim()).filter(Boolean) : [],
                  _count: 1,
                  _area: area
                };
              }
            }

            // INYECTAR OPERADORES MODIFICADOS QUE NO ESTÁN EN SKAP
            Object.values(modificadosMap).forEach((mod: any) => {
              if (mod.status === 'activo' && !baseInactiveIds.has(mod.id)) {
                if (!opsMap[mod.id]) {
                  const masterOp = centralizedOperators?.find((o: any) => o.id === mod.id);
                  const mappedArea = mod.area || masterOp?.area || "desconocida";
                  
                  let finalArea = mappedArea.toLowerCase();
                  if (finalArea.includes("cocimiento")) finalArea = "Warm Block";
                  else if (finalArea.includes("frio") || finalArea.includes("frío")) finalArea = "Cold Block";
                  else if (finalArea.includes("mantenimiento")) finalArea = "Brewing Maintenance";
                  else finalArea = mappedArea;

                  opsMap[mod.id] = {
                    id: mod.id,
                    nombre: mod.nombre || masterOp?.nombre || `Operador ${mod.id}`,
                    puesto: mod.puesto || masterOp?.puesto || "Operador",
                    basico: 0,
                    intermedio: 0,
                    avanzado: 0,
                    autonomyScore: 0,
                    noEvaluado: true,
                    evaluacionesDetalle: [],
                    champions: championMap[mod.id] || [],
                    equipoAutonomo: mod.equipoAutonomo || masterOp?.equipoAutonomo || "Sin Equipo",
                    lider: mod.lider || masterOp?.lider || "No asignado",
                    equipos: [],
                    maxEquipos: 1,
                    _count: 1,
                    _area: finalArea,
                    guiasProgress: 0,
                    guiasL6Progress: 0,
                    guiasL7Progress: 0,
                    guiasL8Progress: 0,
                    guiasEvaluations: {},
                    brechasProgress: brechasResumen[mod.id]?.porcentaje || 0,
                    brechasTotal: brechasResumen[mod.id]?.total || 0,
                    brechasCompletadas: brechasResumen[mod.id]?.completadas || 0,
                    brechasEnProceso: brechasResumen[mod.id]?.enProceso || 0,
                    brechasDetalle: brechasResumen[mod.id]?.brechas || []
                  };
                }
              }
            });

            const cocimientosOps: (Operator & { autonomyScore: number, noEvaluado: boolean, _area: string })[] = [];
            const bloqueFrioOps: (Operator & { autonomyScore: number, noEvaluado: boolean, _area: string })[] = [];
            const mantenimientoOps: (Operator & { autonomyScore: number, noEvaluado: boolean, _area: string })[] = [];

            Object.values(opsMap).forEach(op => {
               const masterOp = centralizedOperators?.find((o: any) => String(o.id) === String(op.id));
               if (masterOp) {
                  if (masterOp.puesto) {
                    op.puesto = masterOp.puesto;
                  }
                  if (masterOp.equipoAutonomo && masterOp.equipoAutonomo !== "Sin Equipo") {
                    op.equipoAutonomo = masterOp.equipoAutonomo;
                  }
                  if (masterOp.lider && masterOp.lider !== "No asignado") {
                    op.lider = masterOp.lider;
                  }
                  if (masterOp.multihabilidades && Array.isArray(masterOp.multihabilidades) && masterOp.multihabilidades.length > 0) {
                    const masterSkills = [...masterOp.multihabilidades];
                    (op.equipos || []).forEach((eq: string) => {
                      if (!masterSkills.some(m => m.trim().toLowerCase() === eq.trim().toLowerCase())) {
                        masterSkills.push(eq);
                      }
                    });
                    op.equipos = masterSkills;
                  }
               }

               if (op.puesto && op.equipos && op.equipos.length > 0) {
                 const primaryIdx = op.equipos.findIndex(e => e.trim().toLowerCase() === op.puesto.trim().toLowerCase());
                 if (primaryIdx > 0) {
                   const primarySkill = op.equipos[primaryIdx];
                   op.equipos.splice(primaryIdx, 1);
                   op.equipos.unshift(primarySkill);
                 }
               }

               if (op.equipoAutonomo) {
                 const eqUpper = op.equipoAutonomo.trim().toUpperCase();
                 const cocimientosTeams = ['LOS CAZADORES DEL AMARGOR', 'CUCHILLAS', 'LOS PANCHITOS', 'MASH-RAINBOW', 'MOSTO-BOYS'];
                 const frioTeams = ['ANDAMOS CON TODO', 'BRAVOS DEL FRIO', 'LOS BRONCOS', 'LOS FUERTES DEL FRIO', 'REYES DE LA MEZCLA'];
                 const mantTeams = ['MUNICH', 'NAHUALES'];

                 if (cocimientosTeams.includes(eqUpper)) op._area = "Warm Block";
                 else if (frioTeams.includes(eqUpper)) op._area = "Cold Block";
                 else if (mantTeams.includes(eqUpper)) op._area = "Brewing Maintenance";
               }

               op.basico = Number((op.basico / op._count).toFixed(2));
               op.intermedio = Number((op.intermedio / op._count).toFixed(2));
               op.avanzado = Number((op.avanzado / op._count).toFixed(2));
               op.autonomyScore = Number((op.autonomyScore / op._count).toFixed(2));
               
               if (op._area === "Warm Block") cocimientosOps.push(op);
               else if (op._area === "Cold Block") bloqueFrioOps.push(op);
               else if (op._area === "Brewing Maintenance") {
                 if (op.equipoAutonomo === "Sin Equipo" || !op.equipoAutonomo) {
                   op.equipoAutonomo = "NAHUALES";
                 }
                 const teamUpper = op.equipoAutonomo.toUpperCase();
                 if (teamUpper === "NAHUALES" || teamUpper === "LOS NAHUALES") {
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
                .map(([name, data]) => {
                  const bpreName = normalizarNombreEquipo(name);
                  const bpreRow = bpreRows.find(r => normalizarNombreEquipo(r["NOMBRE"] || "") === bpreName);

                  const getVal = (row: any, keyword: string) => {
                    if (!row) return 0;
                    const normKeyword = keyword.toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '');

                    const colName = Object.keys(row).find(key => {
                      const keyLower = key.toLowerCase();
                      if (keyLower.includes("fecha") || keyLower.includes("compromiso")) {
                        return false;
                      }
                      const normKey = keyLower
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '');
                      return normKey.includes(normKeyword);
                    });
                    if (!colName) return 0;
                    let val = row[colName];
                    if (typeof val === "string") {
                      val = val.replace(",", ".");
                    }
                    const num = Number(val);
                    return isNaN(num) ? 0 : num;
                  };

                  const autonomyFactors = bpreRow ? {
                    dinamica: getVal(bpreRow, "DINÁMICA") || getVal(bpreRow, "DINAMICA"),
                    liderazgo: getVal(bpreRow, "LIDERAZGO") || getVal(bpreRow, "LIDERAZ"),
                    skap: getVal(bpreRow, "SKAP"),
                    ato: getVal(bpreRow, "ATO"),
                    seguridad: getVal(bpreRow, "SEGURIDAD"),
                    quas: getVal(bpreRow, "QUAS") || getVal(bpreRow, "CALIDAD"),
                    multihab: getVal(bpreRow, "MULTIHAB") || getVal(bpreRow, "MULTIHA") || getVal(bpreRow, "MULTI"),
                    vpo: getVal(bpreRow, "VPO"),
                    solucionProb: getVal(bpreRow, "SOLUCIÓN") || getVal(bpreRow, "SOLUCION") || getVal(bpreRow, "PROB"),
                    infraest: getVal(bpreRow, "INFRAEST") || getVal(bpreRow, "INFRAESTRUCTURA"),
                  } : undefined;

                  return {
                    name,
                    avg: data.count > 0 ? Number((data.sum / data.count).toFixed(2)) : 0,
                    leader: overridesMap[name]?.leader || data.leader,
                    autonomyFactors,
                    faseActual: bpreRow ? bpreRow["FASE ACTUAL"] || "F2" : "F2",
                    fase2026: 4,
                    fechaCompromiso: bpreRow ? bpreRow["FECHA COMPROMISO CAMBIO DE FASE"] || "No definida" : "No definida",
                  };
                })
                .sort((a, b) => b.avg - a.avg);

              const excelenciaEquipo = teamRankings.length > 0
                ? Number((teamRankings.reduce((sum, t) => sum + t.avg, 0) / teamRankings.length).toFixed(2))
                : 0;
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

              const bestTeam = teamRankings[0] || undefined;
              const worstTeam = teamRankings[teamRankings.length - 1] || undefined;

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

          } catch (errRec) {
            console.error("Error in recalculate:", errRec);
          } finally {
            setLoading(false);
          }
        };

        // Ejecutar inmediatamente con los datos disponibles (fallback inicial)
        // Esto asegura que el dashboard se muestre aunque los snapshots tarden o fallen
        executeRecalculate();

        // Escuchar en tiempo real evaluaciones de guías técnicas
        unsubscribeGuias = onSnapshot(
          collection(db, "evaluaciones_guias_tecnicas"),
          (guiasSnap) => {
            const map: Record<string, any> = {};
            guiasSnap.forEach(d => {
              map[d.id] = d.data();
            });
            guiasMap = map;
            guiasReady = true;
            executeRecalculate();
          },
          (err) => {
            console.warn("onSnapshot guias error (posiblemente App Check):", err.message);
            setLoading(false);
          }
        );

        // Escuchar en tiempo real operadores modificados
        unsubscribeModificados = onSnapshot(
          collection(db, "operadores_modificados"),
          (modSnap) => {
            const map: Record<string, any> = {};
            modSnap.forEach(d => {
              map[d.id] = d.data();
            });
            modificadosMap = map;
            modificadosReady = true;
            executeRecalculate();
          },
          (err) => {
            console.warn("onSnapshot modificados error (posiblemente App Check):", err.message);
            setLoading(false);
          }
        );

      } catch (e) {
        console.error("Error loading initial data:", e);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribeGuias) unsubscribeGuias();
      if (unsubscribeModificados) unsubscribeModificados();
    };
  }, []);

  return { general, cocimientos, bloqueFrio, mantenimiento, loading };
}
