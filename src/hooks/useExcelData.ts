import { useState, useEffect } from "react";
import * as xlsx from "xlsx";
import { collection, getDocs, doc, getDoc, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Operator, ChampionKey, cocimientos as defaultCocimientos, bloqueFrio as defaultBloqueFrio, mantenimiento as defaultMantenimiento, AreaData, OPERATORS_MAX_SKILLS } from "@/data/zeus";

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

        // Obtener líderes de baseRows para los equipos (como fallback)
        const leaderMap: Record<string, string> = {};
        for (const row of baseRows) {
          const rol = String(row["Puesto / ROL"] || "").toUpperCase();
          if (rol.includes("LÍDER") || rol.includes("LIDER")) {
            const eq = String(row["Nombre del equipo "] || "").trim().toUpperCase();
            if (eq) {
              leaderMap[eq] = String(row["Nombre del integrante "] || "").trim();
            }
          }
        }

        // Poblar eaMap usando la estructura nueva oficial
        if (estructuraNuevaRows && estructuraNuevaRows.length > 0) {
          const idTranslations: Record<string, string> = {
            "32173442": "32043900",
            "32145333": "32044316",
            "32043835": "32145333",
            "32043900": "32045469",
            "32043739": "32043301",
            "32043861": "32043835",
            "32044301": "32043861",
            "32044319": "32045769",
          };

          for (const row of estructuraNuevaRows) {
            const id = row["SHARP"] ? String(row["SHARP"]).trim() : null;
            if (id) {
              const rawTeam = String(row["Nombre del Equipo"] || row["ESTRUCTURA DE EQUIPOS"] || "").trim();
              const match = rawTeam.match(/^\d+\.\s*(.*)$/);
              const cleanTeam = match ? match[1].trim() : rawTeam;

              const teamData = {
                equipo: cleanTeam,
                lider: String(row["Nombre del Lider"] || row["JEFE DIRECTO"] || "No asignado").trim()
              };

              eaMap[id] = teamData;
              const translatedId = idTranslations[id];
              if (translatedId) {
                eaMap[translatedId] = teamData;
              }
            }
          }
        } else {
          // Fallback
          for (const row of baseRows) {
            const id = row["ID Sharp"] ? String(row["ID Sharp"]) : null;
            if (id) {
              const rawEquipo = String(row["Nombre del equipo "] || "").trim();
              const rawEquipoUpper = rawEquipo.toUpperCase();
              eaMap[id] = {
                equipo: rawEquipo,
                lider: leaderMap[rawEquipoUpper] || "No asignado",
              };
            }
          }

          for (const row of eacRows) {
            if (row["SHARP"]) {
              const sharpStr = String(row["SHARP"]).trim();
              if (!eaMap[sharpStr]) {
                eaMap[sharpStr] = {
                  equipo: row["Nombre del Equipo"] || "",
                  lider: row["Nombre del Lider"] || "",
                };
              }
            }
          }

          let lastEquipo = "";
          let lastLider = "";
          for (const row of eabfRows) {
            if (row["NUEVO EQUIPO "]) lastEquipo = String(row["NUEVO EQUIPO "]).trim();
            if (row["NUEVO LIDER"]) lastLider = String(row["NUEVO LIDER"]).trim();
            
            if (row["SHARP"]) {
              const sharpStr = String(row["SHARP"]).trim();
              if (!eaMap[sharpStr]) {
                eaMap[sharpStr] = {
                  equipo: lastEquipo,
                  lider: lastLider,
                };
              }
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
            const baseInactiveIds = new Set(["32045556", "32188117"]);
            
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
                r["SKAP Position"] = mod.puesto;
                r["Position"] = mod.puesto;
                r["Area"] = mod.area;
                changed = true;

                // Modificar eaMap
                eaMap[id] = {
                  equipo: mod.equipoAutonomo || "Sin Equipo",
                  lider: mod.lider || "No asignado"
                };
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
                  const val = row[c];
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

              const rawBasico = parseSkillValue(row["Driver's License"]);
              const rawIntermedio = parseSkillValue(row["Intermediate Capabilities"] || row["Intermediate"]);
              const rawAvanzado = parseSkillValue(row["Advanced Capabilities"] || row["Advanced"]);

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
              let puesto = row["SKAP Position"] || row["Position"] || "Operador";

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

              // Guías Técnicas properties calculation — per level
              const guiasData = guiasMap[id] || {};
              const guiasActiveLevel = guiasData.activeLevel || "L6";
              const guiasEvaluations = guiasData.evaluations || {};

              const calcGuiasProgress = (level: string) => {
                const levelEval = guiasEvaluations[level] || {};
                const checked = levelEval.checked || [];
                const checkedCount = checked.filter(Boolean).length;
                const totalSkills = guiasTotals[level as keyof typeof guiasTotals] || (level === "L6" ? 54 : level === "L7" ? 101 : 155);
                return totalSkills > 0 ? parseFloat(((checkedCount / totalSkills) * 100).toFixed(2)) : 0;
              };

              const guiasL6Progress = calcGuiasProgress("L6");
              const guiasL7Progress = calcGuiasProgress("L7");
              const guiasL8Progress = calcGuiasProgress("L8");
              // Progreso del nivel activo (para compatibilidad con otros componentes)
              const guiasProgress = calcGuiasProgress(guiasActiveLevel);

              const maxEquipos = OPERATORS_MAX_SKILLS[id] || 1;

              return {
                id,
                nombre,
                puesto: puesto,
                basico: Number(basico.toFixed(2)),
                intermedio: Number(intermedio.toFixed(2)),
                avanzado: Number(avanzado.toFixed(2)),
                autonomyScore: Number(autonomyScore.toFixed(2)),
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
                guiasEvaluations
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
