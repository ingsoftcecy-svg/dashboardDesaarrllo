import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, Users, TrendingUp, TrendingDown, Clock, Award, ChevronRight, CheckCircle2, AlertCircle, HelpCircle, FileSpreadsheet } from "lucide-react";
import { obtenerTodoElHistorico } from "@/lib/fetchHistorico";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Tooltip as ShadcnTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { OperatorHistoryDialog } from "./operator_history_dialog";
import { AutonomyGauge } from "@/components/zeus/autonomy_card";
import { OperatorCoursesDialog } from "./operator_courses_dialog";


interface TeamMember {
  id: string;
  name: string;
  puesto: string;
  score: number;
  lastAssessmentDate?: string;
  noEvaluado?: boolean;
  cursosProgress?: number;
  cursosAprobados?: number;
  cursosTotal?: number;
  cursosEnProgreso?: number;
  cursosPendientes?: number;
  guiasProgress?: number;
  guiasL6Progress?: number;
  guiasL7Progress?: number;
  guiasL8Progress?: number;
  guiasActiveLevel?: "L6" | "L7" | "L8";
}

interface TeamHistoryDialogProps {
  teamName: string;
  members: TeamMember[];
  autonomyFactors?: {
    dinamica: number;
    liderazgo: number;
    skap: number;
    ato: number;
    seguridad: number;
    quas: number;
    multihab: number;
    vpo: number;
    solucionProb: number;
    infraest: number;
  };
  faseActual?: string;
  fase2026?: number;
  fechaCompromiso?: string;
  metricMode?: "autonomia" | "cursos" | "guias";
}

interface EvaluacionPunto {
  score: number;
  mesKey: string;
}

interface MesProgreso {
  name: string; // E.g. "Ene 2026"
  score: number;
  mesKey: string;
}

// Parseador de fechas robusto
const parsearFechaCoherente = (fechaStr: any): Date | null => {
  if (!fechaStr) return null;
  if (fechaStr instanceof Date) return isNaN(fechaStr.getTime()) ? null : fechaStr;
  if (typeof fechaStr === "number") {
    const d = new Date((fechaStr - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const limpio = String(fechaStr).trim();
  const partes = limpio.replace(/\//g, "-").split("-");
  if (partes.length !== 3) return null;

  let anio = parseInt(partes[0], 10);
  let mes = parseInt(partes[1], 10) - 1;
  let dia = parseInt(partes[2], 10);

  if (partes[2].length === 4) {
    anio = parseInt(partes[2], 10);
    mes = parseInt(partes[1], 10) - 1;
    dia = parseInt(partes[0], 10);
  }

  const d = new Date(anio, mes, dia);
  return isNaN(d.getTime()) ? null : d;
};

// Formateador de meses
const NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const formatearMesAnio = (mesAnioKey: string): string => {
  if (!mesAnioKey || !mesAnioKey.includes("-")) return mesAnioKey;
  const [anio, mes] = mesAnioKey.split("-");
  const idx = parseInt(mes, 10) - 1;
  return `${NOMBRES_MESES[idx] || mes} ${anio}`;
};

const normalizarNombreEquipo = (name: string): string => {
  if (!name) return "";
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

const TOOLKIT_LINKS: Record<string, string> = {
  "NAHUALES": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B023A848A-65DB-4CC8-B8D2-FEF404E8C084%7D&file=Toolkit%20Equipos%20Aut%C3%B3nomos%20ZAC%203.0%20(T%C3%89CNICO).xlsx&action=default&mobileredirect=true",
  "MUNICH": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B4FA54E10-7592-42E3-AEA6-D4F70A8611CA%7D&file=Toolkit%20Munich%202026%20(T%C3%89CNICO).xlsx&action=default&mobileredirect=true",
  "CUCHILLA": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7BA5052DCB-05C7-424E-805C-7FEB5D11550B%7D&file=Toolkit%20Equipos%20Aut%C3%B3nomos%20ZAC%203.0%20(OPERADOR).xlsx&action=default&mobileredirect=true",
  "PANCHITOS": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B7F51F9B2-4837-4090-AD59-F7E3F0CFDDE5%7D&file=Toolkit%20Equipos%20Aut%C3%B3nomos%20ZAC%203.0_PANCHITOS_COC_2026_(OPERADOR).xlsx&action=default&mobileredirect=true",
  "MASHRAINBOW": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B65423A94-FF88-4FDD-AED3-6CDCBCF9E0B1%7D&file=Toolkit%20Equipos%20Aut%C3%B3nomos%20ZAC%203.0%20MASH-RAINBOW%202026.xlsx&action=default&mobileredirect=true",
  "CAZADORES_AMARGOR": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B52D27915-B646-48B8-AAC3-86B362DF3EDD%7D&file=Toolkit%20Equipos%20Aut%C3%B3nomos%20ZAC%203.0%20(OPERADOR).xlsx&action=default&mobileredirect=true",
  "MOSTOBOYS": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7BA736F6A6-E58F-4694-B165-BCE530894EB2%7D&file=Toolkit%20Equipos%20Aut%C3%B3nomos%20ZAC%203.0%20(OPERADOR).xlsx&action=default&mobileredirect=true",
  "REYES_MEZCLA": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B4B558E90-2CE0-4988-BA37-60578F03E940%7D&file=Toolkit%20Reyes%20de%20la%20Mezcla%202026%20(OPERADOR).xlsx&action=default&mobileredirect=true",
  "LOS_BRAVOS": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B4DC7C1B7-2B1B-415B-989E-8C8083964AC7%7D&file=Toolkit%20Bravos%20del%20Frio%202026%20(OPERADOR).xlsx&action=default&mobileredirect=true",
  "BRONCOS": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B3981E100-4983-4AFF-BB09-53125FAB9118%7D&file=Toolkit%20Broncos%202026%20(OPERADOR).xlsx&action=default&mobileredirect=true",
  "LOS_FUERTES": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B74C66CDD-A96E-47B6-BC80-B8C44D1E6C13%7D&file=Toolkit%20Los%20Fuertes%202026%20(OPERADOR).xlsx&action=default&mobileredirect=true",
  "ANDAMOS_CON_TODO ": "https://anheuserbuschinbev.sharepoint.com/:x:/r/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc=%7B94BF09C1-62E5-4401-9B5C-55B514209C78%7D&file=Toolkit%20Andamos%20con%20todo%202026%20(OPERADOR).xlsx&action=default&mobileredirect=true"
};

// Normalizador y calculador de Autonomy Score
const obtenerScoreNormalizado = (fila: any): { score: number; noEvaluado: boolean } | null => {
  if (!fila) return null;

  const basicCols = ["Safety", "Quality", "Environment", "Management", "People", "Maintenance", "Logistics", "Operation"];
  const intermediateCols = ["Safety_1", "Quality_1", "Environment_1", "Management_1", "People_1", "Maintenance_1", "Logistics_1", "Operation_1"];
  const advancedCols = ["Safety_2", "Quality_2", "Environment_2", "Management_2", "People_2", "Maintenance_2", "Logistics_2", "Operation_2"];

  const hasEvaluation = [...basicCols, ...intermediateCols, ...advancedCols].some(c => {
    const cell = fila[c];
    return cell !== undefined && cell !== null && cell !== "-" && String(cell).trim() !== "";
  });

  if (!hasEvaluation) {
    return { score: 0, noEvaluado: true };
  }

  const colScore = Object.keys(fila).find(k =>
    k.toLowerCase().includes("autonomy score") ||
    k.toLowerCase().includes("excelencia") ||
    k.toLowerCase().includes("autono") ||
    k.toLowerCase().trim() === "autonomía"
  );

  let val: number | null = null;
  if (colScore) {
    val = parseFloat(fila[colScore]);
  }

  // Recalculo si no está el score precalculado
  if (val === null || isNaN(val) || (val === 0 && hasEvaluation)) {
    const calculateAverage = (cols: string[]) => {
      const values = cols.map(c => {
        const cell = fila[c];
        if (cell === undefined || cell === null || cell === "-") return 0;
        if (typeof cell === "number") return cell * 100;
        if (cell === "Certified" || cell === "100%") return 100;
        if (cell === "Qualified" || cell === "75%") return 75;
        if (cell === "In Training" || cell === "50%") return 50;
        if (cell === "Novice" || cell === "25%") return 25;
        return 0;
      });
      return values.reduce((sum, item) => sum + item, 0) / cols.length;
    };

    const basico = calculateAverage(basicCols);
    const intermedio = calculateAverage(intermediateCols);
    const avanzado = calculateAverage(advancedCols);
    val = (basico * 0.5) + (intermedio * 0.35) + (avanzado * 0.15);
  }

  if (val === null || isNaN(val)) return null;
  const finalScore = val <= 1.0 ? parseFloat((val * 100).toFixed(2)) : parseFloat(val.toFixed(2));

  const noEvaluado = !hasEvaluation || finalScore === 0;
  return { score: finalScore, noEvaluado };
};

const getScoreBadgeStyle = (score: number) => {
  if (score >= 90) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 70) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
};

const obtenerNivelDeScore = (score: number) => {
  const puntos = (score / 100) * 4;
  if (puntos >= 3.5) return "Nivel 4";
  if (puntos >= 2.5) return "Nivel 3";
  if (puntos >= 1.5) return "Nivel 2";
  return "Nivel 1";
};

export function TeamHistoryDialog({
  teamName,
  members,
  autonomyFactors,
  faseActual,
  fase2026,
  fechaCompromiso,
  metricMode = "autonomia"
}: TeamHistoryDialogProps) {
  const toolkitUrl = TOOLKIT_LINKS[normalizarNombreEquipo(teamName)];
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"history" | "requirements" | "progress">(() => {
    return metricMode === "cursos" ? "progress" : "history";
  });
  const [datosGrafico, setDatosGrafico] = useState<MesProgreso[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveSubTab(metricMode === "cursos" ? "progress" : "history");
  }, [metricMode]);

  useEffect(() => {
    const cargarHistoricoEquipo = async () => {
      try {
        setLoading(true);
        setError(null);

        const [historialSemanas, catalogSnap] = await Promise.all([
          obtenerTodoElHistorico(),
          getDoc(doc(db, "config_dashboard", "catalogos_fijos")),
        ]);

        const eaMap: Record<string, string> = {};
        if (catalogSnap.exists()) {
          const catData = catalogSnap.data();
          const estructuraNuevaRows = catData.estructura_nueva || [];
          const baseRows = catData.base_equipos || [];
          const eacRows = catData.eac || [];
          const eabfRows = catData.eabf || [];

          const idTranslations: Record<string, string> = {
            "32173442": "32043900", // VICTOR MANUEL HURTADO ORTIZ
            "32145333": "32044316", // SERGIO TRUJILLO GUARDADO
            "32043835": "32145333", // FLAVIO CESAR DIAZ MALDONADO
            "32043900": "32045469", // ANDRES SARABIA RODARTE
            "32043739": "32043301", // EDUARDO NERI DE LUNA
            "32043861": "32043835", // FILIBERTO PINEDO RODRIGUEZ
            "32044301": "32043861", // VICTOR MANUEL DE JESUS SIMENTAL
            "32044319": "32045769", // MARCO ANTONIO MENCHACA PEREZ / LAZARO QUEZADA OJEDA
          };

          // 1. Estructura nueva (prioridad más alta)
          estructuraNuevaRows.forEach((row: any) => {
            const id = row.SHARP ? String(row.SHARP).trim() : null;
            if (id) {
              const rawTeam = String(row["Nombre del Equipo"] || row["ESTRUCTURA DE EQUIPOS"] || "").trim();
              const match = rawTeam.match(/^\d+\.\s*(.*)$/);
              const cleanTeam = match ? match[1].trim() : rawTeam;

              eaMap[id] = cleanTeam;

              const translatedId = idTranslations[id];
              if (translatedId) {
                eaMap[translatedId] = cleanTeam;
              }
            }
          });

          // 2. Fallback baseRows
          baseRows.forEach((row: any) => {
            const id = row["ID Sharp"] ? String(row["ID Sharp"]).trim() : null;
            if (id && !eaMap[id]) {
              eaMap[id] = String(row["Nombre del equipo "] || "").trim();
            }
          });

          // 3. Fallback eac
          eacRows.forEach((row: any) => {
            if (row.SHARP) {
              const sharpStr = String(row.SHARP).trim();
              if (!eaMap[sharpStr]) {
                eaMap[sharpStr] = String(row["Nombre del Equipo"] || "").trim();
              }
            }
          });

          // 4. Fallback eabf
          let lastEquipo = "";
          eabfRows.forEach((row: any) => {
            if (row["NUEVO EQUIPO "]) lastEquipo = String(row["NUEVO EQUIPO "]).trim();
            if (row.SHARP) {
              const sharpStr = String(row.SHARP).trim();
              if (!eaMap[sharpStr]) {
                eaMap[sharpStr] = lastEquipo;
              }
            }
          });
        }

        interface EvaluacionMiembro {
          id: string;
          score: number;
          mesKey: string;
          noEvaluado: boolean;
        }
        const evPoints: EvaluacionMiembro[] = [];

        historialSemanas.forEach(semanaDoc => {
          const skap = semanaDoc.datos_skap || [];

          skap.forEach(row => {
            // Resolver equipo del operador
            let opEquipo = "SIN EQUIPO";
            const colEmp = Object.keys(row).find(k => k.toLowerCase().trim() === "employee");
            const empVal = colEmp ? String(row[colEmp]).trim() : "";
            const match = empVal.match(/\[(\d+)\]/);
            let id = "";
            if (match) {
              id = match[1].trim();

              // Corrección de ID de Lazaro Quezada para evitar colisión con Eduardo Neri
              const opNameCol = Object.keys(row).find(k => k.toLowerCase().trim() === "employee");
              const opName = opNameCol ? String(row[opNameCol]).trim() : "";
              if (id === "32043739" && opName.toUpperCase().includes("LAZARO")) {
                id = "32045769";
              }

              opEquipo = eaMap[id] || "SIN EQUIPO";
            }

            // Fallback de mantenimiento
            let area = row["Area"] || "Cold Block";
            if (row["Department"] === "Brewing" && row["Equipment"] === "Brewing Maintenance") {
              area = "Brewing Maintenance";
            }
            if (area === "Brewing Maintenance") {
              if (opEquipo === "SIN EQUIPO" || !opEquipo) {
                opEquipo = "NAHUALES";
              }
            }

            const normOpEquipo = normalizarNombreEquipo(opEquipo);
            const normTargetTeam = normalizarNombreEquipo(teamName);

            if (normOpEquipo === normTargetTeam && normTargetTeam !== "") {
              const res = obtenerScoreNormalizado(row);
              if (res !== null) {
                const colFecha = Object.keys(row).find(k => k.toLowerCase().includes("assessment") || (k.toLowerCase().includes("fecha") && !k.toLowerCase().includes("compromiso")));
                const fechaRaw = colFecha ? row[colFecha] : null;
                const dateObj = parsearFechaCoherente(fechaRaw);

                let mesKey = "";
                if (dateObj) {
                  mesKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, "0")}`;
                } else {
                  mesKey = semanaDoc.semana_anio.split("-W")[0] + "-01";
                }

                evPoints.push({
                  id: id || String(Math.random()),
                  score: res.score,
                  mesKey: mesKey,
                  noEvaluado: res.noEvaluado
                });
              }
            }
          });
        });

        // Ordenar por mes
        evPoints.sort((a, b) => a.mesKey.localeCompare(b.mesKey));

        // Solo incluimos en la línea de tiempo aquellos meses donde hubo evaluaciones reales (noEvaluado = false)
        const uniqueMeses = Array.from(new Set(evPoints.filter(p => !p.noEvaluado).map(p => p.mesKey))).sort();

        const puntosGrafico: MesProgreso[] = uniqueMeses.map(mesKey => {
          const activeMembers = new Map<string, EvaluacionMiembro>();

          evPoints.forEach(pt => {
            if (pt.mesKey <= mesKey) {
              const existing = activeMembers.get(pt.id);
              if (!existing || pt.mesKey > existing.mesKey) {
                activeMembers.set(pt.id, pt);
              }
            }
          });

          let sum = 0;
          let count = 0;
          activeMembers.forEach(pt => {
            if (!pt.noEvaluado) {
              sum += pt.score;
              count++;
            }
          });

          return {
            name: formatearMesAnio(mesKey),
            score: count > 0 ? parseFloat((sum / count).toFixed(2)) : 0,
            mesKey: mesKey
          };
        });

        setDatosGrafico(puntosGrafico);
      } catch (err) {
        console.error("Error al obtener histórico del equipo:", err);
        setError("Ocurrió un error al cargar el histórico del equipo.");
      } finally {
        setLoading(false);
      }
    };

    cargarHistoricoEquipo();
  }, [teamName]);

  const tieneDatos = datosGrafico.length > 0;
  const primerScore = tieneDatos ? datosGrafico[0].score : 0;
  const ultimoScore = tieneDatos ? datosGrafico[datosGrafico.length - 1].score : 0;
  const incremento = ultimoScore - primerScore;
  const esPositivo = incremento >= 0;

  const renderRequirementsSection = () => {
    if (!autonomyFactors) return null;

    const faseActualNum = parseInt(faseActual?.replace(/\D/g, "") || "2", 10) || 2;
    const siguienteFaseNum = Math.min(faseActualNum + 1, 4);
    const isMaxPhase = faseActualNum >= 4;
    const esMantenimiento = teamName.toUpperCase().includes("MUNICH") || teamName.toUpperCase().includes("NAHUALES");

    const factorsList = [
      { key: "dinamica", label: "1. Dinámica de Equipo" },
      { key: "liderazgo", label: "2. Liderazgo" },
      { key: "skap", label: "3. SKAP y Carrera" },
      { key: "ato", label: "4. ATO" },
      { key: "seguridad", label: "5. Seguridad" },
      { key: "quas", label: "6. Calidad en la Fuente" },
      { key: "multihab", label: "7. Multihabilidad" },
      { key: "vpo", label: "8. VPO" },
      { key: "solucionProb", label: "9. Solución de Problemas" },
      { key: "infraest", label: "10. Infraestructura" }
    ];

    const REQUISITOS_FASES: Record<string, Record<number, string>> = {
      dinamica: {
        1: "Integrantes fijos y dinámica de equipo en Formación",
        2: "Dinámica de equipo en Tormenta",
        3: "Dinámica de equipo en Normalización",
        4: "Dinámica de equipo en Desempeño"
      },
      liderazgo: {
        1: "Liderazgo en Formación",
        2: "Liderazgo en Tormenta",
        3: "Liderazgo en Normalización",
        4: "Liderazgo en Desempeño"
      },
      skap: {
        1: "25% Operadores Intermedias >85%",
        2: "75% Operadores Intermedias en >85%",
        3: "33% Operadores en 85% de Avanzadas",
        4: "75% Operadores en 85% de Avanzadas"
      },
      ato: {
        1: "Nivel 4 en 25% de las maquinas aplicables",
        2: "Nivel 4 en 75% de Máquinas aplicables",
        3: "- Nivel 4 en 100% Máquinas aplicables / - Nivel 8 en 50% Máquinas aplicables",
        4: "- Nivel 8 en 75% Máquinas aplicables"
      },
      seguridad: {
        1: "Todos los territorios del Equipo en Fase 1 Link de Acadia con requisitos de certificación",
        2: "Todos los territorios del Equipo en Fase 2 Link de Acadia con requisitos de certificación",
        3: "Todos los territorios del Equipo en Fase 3 Link de Acadia con requisitos de certificación",
        4: "Todos los territorios del Equipo en Fase 4 Link de Acadia con requisitos de certificación"
      },
      quas: {
        1: "Equipo informado de resultados de Calidad",
        2: "Equipo certificado en métodos mínimos transferibles de Calidad en la fuente (*Listado zonal)",
        3: "Equipo certificado en todos los controles de Calidad aplicables (*Listado Zonal)",
        4: "Equipo propone e implementa ideas de mejora en Calidad, soportado en las herramientas definidas de solución de problemas y el uso de la ETO digital"
      },
      multihab: {
        1: "1x1",
        2: "1x1 + 10% operadores 2x2",
        3: "100% el 2x2 + 10% operadores 3x3",
        4: "100% el 3x3"
      },
      vpo: {
        1: "Facilitado por el líder",
        2: "Facilitado por el líder + Operadores Champions (Champions asignados a pilares foco)",
        3: "Facilitado por el líder + Operadores Champions (Champions CERTIFICADOS en Supply Training de su pilar asignado y ejecutando sus responsabilidades del toolkit)",
        4: "Facilitado por el líder + Operadores Champions (Champions CERTIFICADOS en Supply Training de su pilar asignado y ejecutando sus responsabilidades del toolkit)"
      },
      solucionProb: {
        1: "Primera línea ejecuta plan de reacción o activa 5Ws (Requisito del pilar 1.9.1.1 - 1.9.1.2)",
        2: "Carrera de relevos efectiva, Planes de reacción actualizados. Reducción de recurrencia de problemas. (Requisito del Pilar 1.9.1.3 - 1.9.1.4 - 1.9.1.6 - 1.9.1.7)",
        3: "Primera línea ayuda a encontrar causa raíz y acciones efectivas (Requisito del Pilar 1.9.1.8 - 1.9.1.9)",
        4: "Primera línea usa autónomamente 5W y evidencia reducción en recurrencia de problemas (Requisito del Pilar 1.9.1.11 - 1.9.1.12)"
      },
      infraest: {
        1: "- Team Room / - ETOs en Eq. Sugerido por la zona / necesidad de la operación",
        2: "- Team Room / - ETO digital con QUAS",
        3: "- Team Room / - ETO digital con QUAS / - Uso de herramientas básicas: IAL - ACADIA - Mangyver",
        4: "- Team Room / - ETO digital con QUAS / - Uso de herramientas básicas e intermedias hasta avanzadas"
      }
    };

    return (
      <div className="flex-1 overflow-y-auto pr-1 mt-4 custom-scrollbar space-y-4">
        {/* Encabezado de la fase */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Progreso de Fase (BPRE)</div>
            <div className="text-base font-extrabold text-[#1a4491] mt-0.5">
              {isMaxPhase ? (
                <span>El equipo se encuentra en la Fase Máxima (Fase {faseActualNum})</span>
              ) : (
                <span>Evaluando paso de Fase {faseActualNum} a Fase {siguienteFaseNum}</span>
              )}
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            {/* Badge de Fase Actual */}
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-3.5 py-1.5 rounded-xl text-center shadow-sm min-w-[90px]">
              <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">Fase Actual</div>
              <div className="text-sm font-black mt-1 leading-none">FASE {faseActualNum}</div>
            </div>

            {/* Badge de Meta */}
            <div className="bg-blue-50 text-[#1a4491] border border-blue-200 px-3.5 py-1.5 rounded-xl text-center shadow-sm min-w-[90px]">
              <div className="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none">Meta 2026</div>
              <div className="text-sm font-black mt-1 leading-none">FASE {fase2026 || 4}</div>
              {fechaCompromiso && fechaCompromiso !== "No definida" && (
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-none">{fechaCompromiso}</div>
              )}
            </div>
          </div>
        </div>

        {/* Lista de factores */}
        <div className="space-y-2">
          {factorsList.map(f => {
            const rawVal = (autonomyFactors as any)[f.key];
            const isNA = esMantenimiento && (f.key === "ato" || f.key === "quas" || f.key === "multihab");
            const valorActual = isNA ? siguienteFaseNum : (parseFloat(rawVal) || 0);

            const cumple = valorActual >= siguienteFaseNum;

            return (
              <div
                key={f.key}
                className={cn(
                  "p-3 rounded-xl border flex items-start gap-3 transition-colors",
                  isNA ? "bg-slate-50/50 border-slate-200/40 text-slate-400" :
                    cumple ? "bg-emerald-50/30 border-emerald-100 text-slate-700" : "bg-rose-50/20 border-rose-100/60 text-slate-700"
                )}
              >
                <div className="shrink-0 mt-0.5">
                  {isNA ? (
                    <HelpCircle className="h-5 w-5 text-slate-300" />
                  ) : cumple ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                  )}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="text-xs font-bold text-slate-800">{f.label}</span>
                    {isNA ? (
                      <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1 py-0.2 rounded border border-slate-200 uppercase tracking-wider">Exceptuado</span>
                    ) : (
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.2 rounded border uppercase tracking-wider",
                        cumple ? "bg-emerald-100/80 text-emerald-800 border-emerald-200" : "bg-rose-100/80 text-rose-800 border-rose-200"
                      )}>
                        Fase Actual: {valorActual}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 leading-normal">
                    {isNA ? (
                      "Este factor está excluido de la evaluación para los equipos de Mantenimiento."
                    ) : (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "text-[8.5px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider",
                            cumple ? "bg-emerald-50 text-emerald-800 border-emerald-250" : "bg-rose-50 text-rose-800 border-rose-250"
                          )}>
                            Meta Fase {siguienteFaseNum}: {cumple ? "Cumplido" : "Pendiente"}
                          </span>
                          <span className="text-slate-600 font-bold">
                            {REQUISITOS_FASES[f.key]?.[siguienteFaseNum] || "Requisito no especificado."}
                          </span>
                        </div>

                        {cumple ? (
                          siguienteFaseNum < 4 ? (
                            <div className="border-t border-slate-200 pt-2 mt-1.5 text-[10.5px] flex flex-col gap-1 bg-slate-100/50 p-2.5 rounded-lg border border-slate-200/50">
                              <span className="font-extrabold text-blue-600 uppercase tracking-wide text-[8.5px] flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Reto Siguiente (Fase {siguienteFaseNum + 1}):
                              </span>
                              <span className="text-slate-700 font-medium leading-relaxed">
                                {REQUISITOS_FASES[f.key]?.[siguienteFaseNum + 1] || "Requisito no especificado."}
                              </span>
                              <span className="text-slate-500 font-bold text-[9px] mt-0.5">
                                Progreso actual del factor: {valorActual.toFixed(2)} de meta {(siguienteFaseNum + 1)}.00 ({Math.min(Math.round((valorActual / (siguienteFaseNum + 1)) * 100), 100)}%)
                              </span>
                            </div>
                          ) : (
                            <div className="text-[9.5px] text-emerald-600 font-bold italic mt-1 bg-emerald-50/50 px-2 py-1 rounded border border-emerald-100/80 w-fit">
                              ✨ ¡Nivel máximo de Autonomía alcanzado (Fase 4)!
                            </div>
                          )
                        ) : (
                          <div className="text-[9.5px] text-slate-400 font-bold mt-1">
                            Progreso: {valorActual.toFixed(2)} de meta {siguienteFaseNum}.00 ({Math.min(Math.round((valorActual / siguienteFaseNum) * 100), 100)}%)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProgressSection = () => {
    const sortedMembers = [...members].sort((a, b) => {
      const progA = a.cursosProgress ?? 0;
      const progB = b.cursosProgress ?? 0;
      if (progB !== progA) return progB - progA;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="flex-1 overflow-y-auto pr-1 mt-4 custom-scrollbar space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-[#1a4491]" />
          <span>Progreso de Capacitación de Integrantes</span>
        </h3>

        <div className="rounded-xl border border-slate-200/60 overflow-hidden bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider sticky top-0">
                <th className="p-3 border-b border-slate-200">Operador</th>
                <th className="p-3 border-b border-slate-200">Puesto</th>
                <th className="p-3 border-b border-slate-200 text-center">Cursos Aprobados</th>
                <th className="p-3 border-b border-slate-200 text-center">Progreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {sortedMembers.map((member) => {
                const total = member.cursosTotal || 0;
                const aprobados = member.cursosAprobados || 0;
                const progress = member.cursosProgress ?? 0;

                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <ChevronRight className="h-3 w-3 text-[#1a4491] opacity-40" />
                      <span>{member.name}</span>
                    </td>
                    <td className="p-3 text-slate-500 uppercase font-semibold text-[10px]">{member.puesto}</td>
                    <td className="p-3 text-center align-middle text-slate-600 font-bold">
                      {total > 0 ? `${aprobados} / ${total}` : "0 / 0"}
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200/40">
                          <div
                            className="h-full bg-[#1a4491] rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-black text-slate-800 w-10 text-right tabular-nums">
                          {progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col text-slate-800 h-full max-h-[calc(90vh-48px)] overflow-hidden">
      {/* 👥 CABECERA DEL MODAL */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest flex-wrap">
            <Users className="h-3.5 w-3.5 text-[#1a4491]" />
            <span>Desempeño Histórico de Equipo</span>
            <span className="text-slate-350 select-none">•</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider",
              metricMode === "autonomia"
                ? "bg-blue-50 text-[#1a4491] border-blue-200"
                : "bg-purple-50 text-purple-750 border-purple-200"
            )}>
              {metricMode === "autonomia" ? "Modo Autonomía" : "Modo Cursos (Capacitación)"}
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#1a4491] leading-tight uppercase">
            {teamName}
          </h2>
          <div className="flex items-center gap-3.5 mt-1 flex-wrap">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Integrantes en Planta: {members.length}
            </div>
            {toolkitUrl && (
              <>
                <span className="text-slate-300 select-none hidden sm:inline">•</span>
                <a
                  href={toolkitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded shadow-sm focus:outline-none"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Toolkit de Equipo</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* 📈 INDICADOR DE CAMBIO NETO */}
        {tieneDatos && metricMode === "autonomia" && (
          <div className="flex gap-4">
            <TooltipProvider>
              <ShadcnTooltip>
                <TooltipTrigger asChild>
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 text-center flex flex-col justify-center min-w-[100px] cursor-help">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Promedio Actual</span>
                    <span className="text-lg font-black text-[#1a4491]">{ultimoScore}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-950 text-white border border-slate-800 px-3 py-2 text-[11px] max-w-xs font-semibold shadow-xl rounded-lg">
                  <p className="leading-normal">Promedio histórico: Último registro guardado en la base de datos.</p>
                </TooltipContent>
              </ShadcnTooltip>
            </TooltipProvider>
            <div className={cn(
              "border rounded-xl px-4 py-2 text-center flex flex-col justify-center min-w-[100px]",
              esPositivo ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
            )}>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tendencia</span>
              <div className={cn(
                "text-lg font-black flex items-center justify-center gap-0.5",
                esPositivo ? "text-emerald-700" : "text-rose-700"
              )}>
                {esPositivo ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{esPositivo ? "+" : ""}{incremento.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🔄 MODO DE CARGA */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a4491] border-t-transparent"></div>
          <p className="text-[10px] font-black uppercase text-[#1a4491] tracking-widest animate-pulse">Obteniendo Histórico de Firestore...</p>
        </div>
      ) : (
        <>
          {/* 📊 TABS DE NAVEGACIÓN */}
          <div className="flex border-b border-slate-100 pb-1 gap-4 text-xs font-black uppercase tracking-wider mb-4">
            {metricMode === "autonomia" ? (
              <>
                <button
                  onClick={() => setActiveSubTab("history")}
                  className={cn(
                    "pb-2 border-b-2 px-1 transition-colors focus:outline-none cursor-pointer",
                    activeSubTab === "history" ? "border-[#1a4491] text-[#1a4491]" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Progreso del equipo
                </button>
                {autonomyFactors && (
                  <button
                    onClick={() => setActiveSubTab("requirements")}
                    className={cn(
                      "pb-2 border-b-2 px-1 transition-colors focus:outline-none flex items-center gap-1.5 cursor-pointer",
                      activeSubTab === "requirements" ? "border-[#1a4491] text-[#1a4491]" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Requisitos de Fase
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => setActiveSubTab("progress")}
                className={cn(
                  "pb-2 border-b-2 px-1 transition-colors focus:outline-none flex items-center gap-1.5 cursor-pointer",
                  activeSubTab === "progress" ? "border-[#1a4491] text-[#1a4491]" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Progreso de Cursos
              </button>
            )}
          </div>

          {activeSubTab === "history" ? (
            error ? (
              <div className="h-40 flex items-center justify-center text-center">
                <p className="text-sm font-bold text-rose-600 uppercase tracking-wider">{error}</p>
              </div>
            ) : !tieneDatos ? (
              <div className="h-48 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2">
                <Clock className="h-8 w-8 text-slate-300" />
                <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Sin evaluaciones registradas</p>
                <p className="text-[11px] text-slate-400 max-w-xs font-medium">No se encontraron registros históricos para los integrantes de este equipo.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 mt-4 custom-scrollbar space-y-6">
                {/* 📊 GRÁFICO HISTÓRICO MENSUAL */}
                <div className="bg-slate-50/60 rounded-2xl border border-slate-200/50 p-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-[#1a4491]" />
                    <span>Autonomía Promedio del Equipo</span>
                  </h3>

                  <div className="h-[200px] w-full text-[10px] font-black">
                    {datosGrafico.length === 1 ? (
                      <div className="h-full w-full flex flex-col items-center justify-center space-y-1">
                        <Award className="h-6 w-6 text-amber-500" />
                        <p className="text-[11px] font-black uppercase text-slate-600">Primera evaluación registrada</p>
                        <p className="text-[10px] text-slate-400 font-medium">Autonomía promedio de {datosGrafico[0].score}% en {datosGrafico[0].name}</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={datosGrafico} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: "900", fill: "#475569" }} />
                          <YAxis domain={[0, 100]} tickCount={5} tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fontWeight: "900", fill: "#475569" }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              borderColor: "#cbd5e1",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: "800"
                            }}
                            formatter={(value: any) => [`${value}%`, "Autonomía"]}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#1a4491"
                            strokeWidth={3}
                            dot={{ r: 4, stroke: "#1a4491", strokeWidth: 1, fill: "#ffffff" }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 📋 TABLA DETALLADA DE INTEGRANTES */}
                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#1a4491]" />
                    <span>Integrantes del Equipo y Desempeño Actual</span>
                  </h3>

                  <div className="rounded-xl border border-slate-200/60 overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider sticky top-0">
                          <th className="p-3 border-b border-slate-200">Operador</th>
                          <th className="p-3 border-b border-slate-200">Puesto</th>
                          <th className="p-3 border-b border-slate-200 text-center">Evaluación</th>
                          <th className="p-3 border-b border-slate-200 text-center">Autonomía</th>
                          <th className="p-3 border-b border-slate-200 text-center">Nivel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {(() => {
                          const sortedMembers = [...members].sort((a, b) => {
                            const aNoEval = !!a.noEvaluado;
                            const bNoEval = !!b.noEvaluado;
                            if (aNoEval && !bNoEval) return 1;
                            if (!aNoEval && bNoEval) return -1;
                            if (aNoEval && bNoEval) {
                              return a.name.localeCompare(b.name);
                            }
                            if (b.score !== a.score) {
                              return b.score - a.score;
                            }
                            return a.name.localeCompare(b.name);
                          });

                          return sortedMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                                <ChevronRight className="h-3 w-3 text-[#1a4491] opacity-40" />
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button className="hover:underline hover:text-[#1a4491] text-left focus:outline-none cursor-pointer">
                                      {member.name}
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl border-none shadow-2xl overflow-hidden">
                                    {metricMode === "cursos" ? (
                                      <OperatorCoursesDialog 
                                        operatorName={member.name}
                                        operatorId={member.id}
                                      />
                                    ) : (
                                      <OperatorHistoryDialog
                                        operatorName={member.name}
                                        operatorId={member.id}
                                        operatorPuesto={member.puesto}
                                        metricMode={metricMode}
                                        guiasProgress={member.guiasProgress}
                                        guiasL6Progress={member.guiasL6Progress}
                                        guiasL7Progress={member.guiasL7Progress}
                                        guiasL8Progress={member.guiasL8Progress}
                                        guiasActiveLevel={member.guiasActiveLevel}
                                      />
                                    )}
                                  </DialogContent>
                                </Dialog>
                              </td>
                              <td className="p-3 text-slate-500 uppercase font-semibold text-[10px]">{member.puesto}</td>
                              <td className="p-3 text-center align-middle text-slate-500 font-semibold text-[10px] whitespace-nowrap">
                                {member.lastAssessmentDate ? (() => {
                                  const dateObj = new Date(member.lastAssessmentDate);
                                  if (!isNaN(dateObj.getTime())) {
                                    return `${dateObj.getDate()} ${NOMBRES_MESES[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                                  }
                                  return member.lastAssessmentDate;
                                })() : "-"}
                              </td>
                              <td className="p-3 text-center align-middle whitespace-nowrap">
                                {member.noEvaluado ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="px-1.5 py-0.5 rounded font-black border text-[10px] bg-rose-50 text-rose-700 border-rose-100 tabular-nums">
                                      0%
                                    </span>
                                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-wider leading-none">Sin Evaluar</span>
                                  </div>
                                ) : (
                                  <span className={cn(
                                    "px-2 py-0.5 rounded font-black border text-[11px] tabular-nums",
                                    getScoreBadgeStyle(member.score)
                                  )}>
                                    {Math.round(member.score)}%
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-[#1a4491]">
                                {member.noEvaluado ? "-" : obtenerNivelDeScore(member.score)}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ) : activeSubTab === "requirements" ? (
            renderRequirementsSection()
          ) : (
            renderProgressSection()
          )}
        </>
      )}
    </div>
  );
}
