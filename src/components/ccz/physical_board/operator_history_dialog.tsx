import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar } from "recharts";
import { Calendar, User, TrendingUp, TrendingDown, Clock, Award, ChevronRight, AlertCircle, Activity, Lightbulb } from "lucide-react";
import { obtenerTodoElHistorico, ReporteMensual } from "@/lib/fetchHistorico";
import { cn } from "@/lib/utils";

interface OperatorHistoryDialogProps {
  operatorName: string;
  operatorId: string;
  operatorPuesto: string;
  metricMode?: "autonomia" | "cursos" | "guias" | "cierre-brecha";
  guiasProgress?: number;
  guiasL6Progress?: number;
  guiasL7Progress?: number;
  guiasL8Progress?: number;
  guiasActiveLevel?: "L6" | "L7" | "L8";
}

interface EvaluacionPunto {
  fechaExacta: string;
  puesto: string;
  score: number;
  corregido?: boolean;
  evaluador: string;
  mesKey: string;
  noEvaluado?: boolean;
  rawRow?: any;
}

interface MesProgreso {
  name: string; // E.g. "Ene 2026"
  score: number;
  mesKey: string;
  [key: string]: any;
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

  // Si partes[2] es el año (4 dígitos), invertimos los valores
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

// Normalizador y calculador de Autonomy Score
const obtenerScoreNormalizado = (fila: any): { score: number; corregido: boolean; noEvaluado?: boolean } | null => {
  if (!fila) return null;
  
  const basicCols = ["Safety", "Quality", "Environment", "Management", "People", "Maintenance", "Logistics", "Operation"];
  const intermediateCols = ["Safety_1", "Quality_1", "Environment_1", "Management_1", "People_1", "Maintenance_1", "Logistics_1", "Operation_1"];
  const advancedCols = ["Safety_2", "Quality_2", "Environment_2", "Management_2", "People_2", "Maintenance_2", "Logistics_2", "Operation_2"];
  
  const hasEvaluation = [...basicCols, ...intermediateCols, ...advancedCols].some(c => {
    const cell = fila[c];
    return cell !== undefined && cell !== null && cell !== "-" && String(cell).trim() !== "";
  });

  if (!hasEvaluation) {
    return { score: 0, corregido: false, noEvaluado: true };
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
  
  let corregido = false;
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
  return { score: finalScore, corregido, noEvaluado };
};

// Mapeador de color de acuerdo al score (similar a physical board)
const getScoreBadgeStyle = (score: number) => {
  if (score >= 90) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 70) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
};

// Determina el nivel a partir de los puntos
const obtenerNivelDeScore = (score: number) => {
  const puntos = (score / 100) * 4;
  if (puntos >= 3.5) return "Nivel 4";
  if (puntos >= 2.5) return "Nivel 3";
  if (puntos >= 1.5) return "Nivel 2";
  return "Nivel 1";
};

export function OperatorHistoryDialog({ 
  operatorName, 
  operatorId, 
  operatorPuesto,
  metricMode = "autonomia",
  guiasProgress = 0,
  guiasL6Progress = 0,
  guiasL7Progress = 0,
  guiasL8Progress = 0,
  guiasActiveLevel = "L6"
}: OperatorHistoryDialogProps) {
  const [loading, setLoading] = useState(true);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionPunto[]>([]);
  const [datosGrafico, setDatosGrafico] = useState<MesProgreso[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (metricMode === "guias") {
      setLoading(false);
      return;
    }
    const cargarHistorico = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const historialSemanas = await obtenerTodoElHistorico();
        const evPoints: EvaluacionPunto[] = [];

        historialSemanas.forEach(semanaDoc => {
          const skap = semanaDoc.datos_skap || [];
          
          skap.forEach(row => {
            const employeeStr = String(row.Employee || "").toUpperCase();
            const empMatch = employeeStr.match(/\[(\d+)\]\s+(.*)/);
            let id = empMatch ? empMatch[1] : "";
            let nombre = empMatch ? empMatch[2] : employeeStr;

            const normNombre = nombre.toUpperCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, " ")
              .trim();

            // Traducción de nombres/IDs de César y Alexis
            if (normNombre.includes("CESAR ROFRIGUEZ") || normNombre.includes("CESAR RODRIGUEZ")) {
              id = "32197863";
              nombre = "CESAR RODRIGUEZ BANDA";
            } else if (normNombre.includes("ALEXIS BERLIN")) {
              id = "32244174";
              nombre = "ALEXIS BERLIN ALVAREZ CORONA";
            }

            const cleanId = String(operatorId).trim().toUpperCase();
            const cleanName = String(operatorName).trim().toUpperCase();
            
            const normCleanName = cleanName.normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, " ")
              .trim();

            // Corrección de ID de Lazaro Quezada para evitar colisión con Eduardo Neri
            if (id === "32043739" && normNombre.includes("LAZARO")) {
              id = "32045769";
            }

            // Buscar coincidencia por ID o coincidencia parcial de nombre normalizado
            const esMismoOperador = 
              (cleanId && id === cleanId) ||
              (normNombre.includes(normCleanName)) ||
              (normCleanName.includes(normNombre));

            if (esMismoOperador) {
              const res = obtenerScoreNormalizado(row);
              if (res !== null) {
                const colFecha = Object.keys(row).find(k => k.toLowerCase().includes("assessment") || (k.toLowerCase().includes("fecha") && !k.toLowerCase().includes("compromiso")));
                const fechaRaw = colFecha ? row[colFecha] : null;
                const dateObj = parsearFechaCoherente(fechaRaw);
                
                let fechaFormateada = "";
                let mesKey = "";
                
                if (dateObj) {
                  fechaFormateada = dateObj.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
                  mesKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, "0")}`;
                } else {
                  // Fallback al ID de la semana
                  fechaFormateada = `Semana ${semanaDoc.semana_anio.split("-W")[1] || semanaDoc.semana_anio}`;
                  mesKey = semanaDoc.semana_anio.split("-W")[0] + "-01";
                }

                evPoints.push({
                  fechaExacta: fechaFormateada,
                  puesto: row["SKAP Position"] || row["Position"] || operatorPuesto || "Operador",
                  score: res.score,
                  corregido: res.corregido,
                  evaluador: row.Evaluator || "Sistema",
                  mesKey: mesKey,
                  noEvaluado: res.noEvaluado,
                  rawRow: row
                });
              }
            }
          });
        });

        // Ordenar todas las evaluaciones de la más antigua a la más reciente
        evPoints.sort((a, b) => a.mesKey.localeCompare(b.mesKey));

        // Agrupar por mes y puesto para la gráfica
        const gruposMes: Record<string, Record<string, number[]>> = {};
        evPoints.forEach(pt => {
          if (!gruposMes[pt.mesKey]) gruposMes[pt.mesKey] = {};
          if (!gruposMes[pt.mesKey][pt.puesto]) gruposMes[pt.mesKey][pt.puesto] = [];
          gruposMes[pt.mesKey][pt.puesto].push(pt.score);
        });

        const puntosGrafico: MesProgreso[] = Object.keys(gruposMes).map(mesKey => {
          const puestosData = gruposMes[mesKey];
          const point: MesProgreso = {
            name: formatearMesAnio(mesKey),
            score: 0,
            mesKey: mesKey
          };
          
          let sumAll = 0;
          let countAll = 0;
          
          Object.keys(puestosData).forEach(puesto => {
            const scores = puestosData[puesto];
            const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            point[puesto] = parseFloat(avg.toFixed(2));
            sumAll += scores.reduce((sum, s) => sum + s, 0);
            countAll += scores.length;
          });
          
          point.score = countAll > 0 ? parseFloat((sumAll / countAll).toFixed(2)) : 0;
          return point;
        }).sort((a, b) => a.mesKey.localeCompare(b.mesKey));

        // Reordenar las evaluaciones individuales de la más reciente a la más antigua para mostrarlas en la tabla
        const evPointsOrdenadasTabla = [...evPoints].sort((a, b) => b.mesKey.localeCompare(a.mesKey));

        setEvaluaciones(evPointsOrdenadasTabla);
        setDatosGrafico(puntosGrafico);
      } catch (err) {
        console.error("Error al obtener histórico de operario:", err);
        setError("Ocurrió un error al cargar el histórico del trabajador.");
      } finally {
        setLoading(false);
      }
    };

    cargarHistorico();
  }, [operatorId, operatorName, operatorPuesto]);

  // Valores de progreso
  const tieneDatos = evaluaciones.length > 0;
  const primerScore = tieneDatos ? evaluaciones[evaluaciones.length - 1].score : 0;
  const ultimoScore = tieneDatos ? evaluaciones[0].score : 0;
  const incremento = ultimoScore - primerScore;
  const esPositivo = incremento >= 0;

  const puestosUnicos = Array.from(new Set(evaluaciones.map(ev => ev.puesto)));

  const generarDiagnostico = (score: number, rawRow?: any) => {
    let fortalezas = "";
    let areasOportunidad = "";
    let chartData: { pilar: string; score: number; basico: number; intermedio: number; avanzado: number }[] = [];

    if (rawRow) {
      const pilares = ["Safety", "Quality", "Environment", "Management", "People", "Maintenance", "Logistics", "Operation"];
      const traducciones: Record<string, string> = {
        "Safety": "Seguridad",
        "Quality": "Calidad",
        "Environment": "Medio Ambiente",
        "Management": "Gestión",
        "People": "Gente",
        "Maintenance": "Mantenimiento",
        "Logistics": "Logística",
        "Operation": "Operación"
      };

      const pillarScores = pilares.map(p => {
        const valB = rawRow[p];
        const valI = rawRow[`${p}_1`];
        const valA = rawRow[`${p}_2`];
        
        const parseVal = (cell: any) => {
          if (cell === undefined || cell === null || cell === "-") return 0;
          if (typeof cell === "number") return cell * 100;
          if (cell === "Certified" || cell === "100%") return 100;
          if (cell === "Qualified" || cell === "75%") return 75;
          if (cell === "In Training" || cell === "50%") return 50;
          if (cell === "Novice" || cell === "25%") return 25;
          return 0;
        };
        
        const basico = parseVal(valB);
        const intermedio = parseVal(valI);
        const avanzado = parseVal(valA);

        const avg = (basico + intermedio + avanzado) / 3;
        return { 
          pilar: traducciones[p], 
          score: avg, 
          basico: parseFloat((basico / 3).toFixed(2)), 
          intermedio: parseFloat((intermedio / 3).toFixed(2)), 
          avanzado: parseFloat((avanzado / 3).toFixed(2)),
          rawBasico: basico,
          rawIntermedio: intermedio,
          rawAvanzado: avanzado
        };
      });

      chartData = [...pillarScores];
      
      const mejores = [...pillarScores].filter(p => p.score > 0).sort((a, b) => b.score - a.score);
      const peores = [...pillarScores].sort((a, b) => a.score - b.score);
      
      const topPilar = mejores[0];
      const peorPilar = peores[0];

      if (topPilar && topPilar.score >= 50) {
        fortalezas = `Su principal fortaleza es el pilar de ${topPilar.pilar} con un ${topPilar.score.toFixed(1)}% de dominio.`;
      } else {
        fortalezas = "Se detectan niveles bajos de dominio generalizados.";
      }
      
      if (peorPilar && peorPilar.score <= 80) {
        let fallas = [];
        if (peorPilar.rawBasico < 100) fallas.push("Básico");
        if (peorPilar.rawIntermedio < 100) fallas.push("Intermedio");
        if (peorPilar.rawAvanzado < 100) fallas.push("Avanzado");
        
        let detalleFallas = fallas.length > 0 ? `, específicamente arrastrado por brechas en el nivel ${fallas.join(" y ")}` : "";
        areasOportunidad = `Debe enfocar su plan de desarrollo urgentemente en ${peorPilar.pilar} (${peorPilar.score.toFixed(1)}%)${detalleFallas}.`;
      } else if (score >= 90) {
        areasOportunidad = `Mantiene un perfil de excelencia sumamente equilibrado sin deficiencias críticas.`;
      }

      // Combine for the final specific message
    }

    const baseMsg = (() => {
      if (score >= 90) return "El operador cuenta con gran autonomía y dominio avanzado de sus funciones. Está capacitado para liderar tareas críticas.";
      if (score >= 75) return "Muestra un sólido entendimiento operativo y buen progreso en matriz.";
      if (score >= 50) return "El operador domina las funciones básicas, pero requiere seguimiento continuo.";
      return "Requiere un plan intensivo de formación y acompañamiento en piso.";
    })();

    const mensajeFinal = `${baseMsg} ${fortalezas}${areasOportunidad}`.trim();

    if (score >= 90) {
      return {
        titulo: "Nivel de Excelencia",
        colorBg: "bg-emerald-50 border-emerald-200",
        colorIcono: "text-emerald-600 bg-emerald-100",
        colorTexto: "text-emerald-800",
        icono: <Award className="h-4 w-4" />,
        mensaje: mensajeFinal,
        chartData
      };
    } else if (score >= 75) {
      return {
        titulo: "Desempeño Sólido",
        colorBg: "bg-blue-50 border-blue-200",
        colorIcono: "text-blue-600 bg-blue-100",
        colorTexto: "text-blue-800",
        icono: <TrendingUp className="h-4 w-4" />,
        mensaje: mensajeFinal,
        chartData
      };
    } else if (score >= 50) {
      return {
        titulo: "Nivel en Desarrollo",
        colorBg: "bg-amber-50 border-amber-200",
        colorIcono: "text-amber-600 bg-amber-100",
        colorTexto: "text-amber-800",
        icono: <AlertCircle className="h-4 w-4" />,
        mensaje: mensajeFinal,
        chartData
      };
    } else {
      return {
        titulo: "Nivel Inicial",
        colorBg: "bg-rose-50 border-rose-200",
        colorIcono: "text-rose-600 bg-rose-100",
        colorTexto: "text-rose-800",
        icono: <Activity className="h-4 w-4" />,
        mensaje: mensajeFinal,
        chartData
      };
    }
  };

  return (
    <div className="flex flex-col space-y-6 text-slate-800">
      
      {/* 👤 CABECERA DEL MODAL */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
            {metricMode === "guias" ? (
              <>
                <Award className="h-3.5 w-3.5 text-emerald-600" />
                <span>Estado de Guías Técnicas</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5 text-[#1a4491]" />
                <span>Perfil Histórico de Habilidades</span>
              </>
            )}
          </div>
          <h2 className="text-2xl font-black text-[#1a4491] leading-tight uppercase">
            {operatorName}
          </h2>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{operatorPuesto}</span>
            {operatorId && (
              <>
                <span className="text-slate-300">•</span>
                <span>ID: {operatorId}</span>
              </>
            )}
          </div>
        </div>

        {/* 📈 INDICADOR DE CAMBIO NETO / HABILITACIÓN */}
        {metricMode === "guias" ? (
          <div className="flex gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center flex flex-col justify-center min-w-[120px]">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Habilitación Total</span>
              <span className="text-lg font-black text-emerald-800">{guiasProgress.toFixed(1)}%</span>
            </div>
          </div>
        ) : tieneDatos && (
          <div className="flex gap-4">
            <div className="bg-gradient-to-br from-[#1a4491] to-blue-600 border border-blue-500/50 rounded-xl px-5 py-2.5 text-center flex flex-col justify-center min-w-[110px] shadow-lg shadow-blue-900/20">
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-0.5 drop-shadow-sm">Último Score</span>
              <span className="text-2xl font-black text-white drop-shadow-md">{ultimoScore}%</span>
            </div>
            <div className={cn(
              "border rounded-xl px-4 py-2 text-center flex flex-col justify-center min-w-[100px]",
              esPositivo ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
            )}>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cambio Neto</span>
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
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-center">
          <p className="text-sm font-bold text-rose-600 uppercase tracking-wider">{error}</p>
        </div>
      ) : metricMode === "guias" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
          {/* L6 Progress Card */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400" />
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Nivel L6</div>
            <div className="text-[9px] text-slate-400 font-bold mb-3 uppercase tracking-wider">Entendimiento y Operación</div>
            <div className="relative flex items-center justify-center h-20 w-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-yellow-500 transition-all duration-500"
                  strokeDasharray={`${guiasL6Progress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-xs font-black text-slate-700">{guiasL6Progress.toFixed(1)}%</div>
            </div>
            <div className="text-[10px] text-slate-500 font-black mt-3 bg-slate-50 px-2 py-0.5 rounded border uppercase">
              {Math.round((guiasL6Progress / 100) * 54)} / 54 Habilidades
            </div>
          </div>

          {/* L7 Progress Card */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Nivel L7</div>
            <div className="text-[9px] text-slate-400 font-bold mb-3 uppercase tracking-wider">Mantenimiento Autónomo</div>
            <div className="relative flex items-center justify-center h-20 w-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 transition-all duration-500"
                  strokeDasharray={`${guiasL7Progress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-xs font-black text-slate-700">{guiasL7Progress.toFixed(1)}%</div>
            </div>
            <div className="text-[10px] text-slate-500 font-black mt-3 bg-slate-50 px-2 py-0.5 rounded border uppercase">
              {Math.round((guiasL7Progress / 100) * 101)} / 101 Habilidades
            </div>
          </div>

          {/* L8 Progress Card */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Nivel L8</div>
            <div className="text-[9px] text-slate-400 font-bold mb-3 uppercase tracking-wider">Especialista y Confiabilidad</div>
            <div className="relative flex items-center justify-center h-20 w-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-500 transition-all duration-500"
                  strokeDasharray={`${guiasL8Progress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-xs font-black text-slate-700">{guiasL8Progress.toFixed(1)}%</div>
            </div>
            <div className="text-[10px] text-slate-500 font-black mt-3 bg-slate-50 px-2 py-0.5 rounded border uppercase">
              {Math.round((guiasL8Progress / 100) * 34)} / 34 Habilidades
            </div>
          </div>
        </div>
      ) : !tieneDatos ? (
        <div className="h-48 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2">
          <Clock className="h-8 w-8 text-slate-300" />
          <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Sin evaluaciones registradas</p>
          <p className="text-[11px] text-slate-400 max-w-xs font-medium">No se encontraron registros históricos en los reportes cargados de Firestore para este operador.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 📊 GRÁFICO HISTÓRICO MENSUAL */}
          <div className="bg-slate-50/60 rounded-2xl border border-slate-200/50 p-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[#1a4491]" />
              <span>Progreso de Habilidades Mensual</span>
            </h3>
            
            <div className="h-[200px] w-full text-[10px] font-black">
              {datosGrafico.length === 1 ? (
                <div className="h-full w-full flex flex-col items-center justify-center space-y-1">
                  <Award className="h-6 w-6 text-amber-500" />
                  <p className="text-[11px] font-black uppercase text-slate-600">Primera evaluación registrada</p>
                  <p className="text-[10px] text-slate-400 font-medium">Promedio de habilidades de {datosGrafico[0].score}% en {datosGrafico[0].name}</p>
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
                      formatter={(value: any, name: any) => [`${value}%`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: '900', paddingTop: '10px', textTransform: 'uppercase' }} />
                    {puestosUnicos.map((puesto, i) => {
                      const colores = ["#1a4491", "#ffcc00", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];
                      const color = colores[i % colores.length];
                      return (
                        <Line 
                          key={puesto}
                          type="monotone" 
                          dataKey={puesto} 
                          stroke={color} 
                          strokeWidth={3} 
                          dot={{ r: 4, stroke: color, strokeWidth: 1, fill: "#ffffff" }}
                          activeDot={{ r: 6 }} 
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 💡 DIAGNÓSTICO DE LA ÚLTIMA EVALUACIÓN */}
          {metricMode === "autonomia" && tieneDatos && (
            <div className="space-y-2.5 mt-6 mb-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <span>Diagnóstico de la Evaluación Más Reciente</span>
              </h3>
              
              {(() => {
                const evaluacionPrincipal = evaluaciones.find(ev => ev.puesto === operatorPuesto) || evaluaciones[0];
                const diag = generarDiagnostico(evaluacionPrincipal?.score || ultimoScore, evaluacionPrincipal?.rawRow);
                return (
                  <div className={cn("rounded-xl border p-4 shadow-sm flex flex-col md:flex-row gap-6 items-center", diag.colorBg)}>
                    
                    <div className="flex-1 flex gap-4 items-start w-full">
                      <div className={cn("p-2 rounded-lg flex-shrink-0 mt-0.5", diag.colorIcono)}>
                        {diag.icono}
                      </div>
                      <div>
                        <h4 className={cn("text-xs font-black uppercase tracking-wider mb-1.5", diag.colorTexto)}>
                          {diag.titulo}
                        </h4>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">
                          {diag.mensaje}
                        </p>
                      </div>
                    </div>

                    {diag.chartData && diag.chartData.length > 0 && (
                      <div className="w-full md:w-[360px] h-60 flex-shrink-0 bg-white/60 rounded-xl border border-slate-200/50 relative overflow-hidden flex flex-col items-center justify-center p-2 pt-6">
                        <div className="absolute top-2 left-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Radiografía de Pilares</div>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={diag.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="pilar" tick={{ fontSize: 7, fontWeight: "900", fill: "#64748b" }} interval={0} angle={-35} textAnchor="end" height={35} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 8 }} tickFormatter={(v) => `${v}%`} />
                            
                            <Bar dataKey="basico" name="Básico" stackId="a" fill="#93c5fd" />
                            <Bar dataKey="intermedio" name="Intermedio" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="avanzado" name="Avanzado" stackId="a" fill="#1e3a8a" radius={[4, 4, 0, 0]} />

                            <Tooltip 
                              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white p-3 rounded-lg shadow-md border border-slate-100 text-[10px] font-bold">
                                      <p className="text-slate-800 mb-2 uppercase tracking-wider">{label}</p>
                                      <div className="space-y-1">
                                        <p style={{ color: '#3b82f6' }}>BÁSICO: {data.rawBasico?.toFixed(1) || 0}%</p>
                                        <p style={{ color: '#2563eb' }}>INTERMEDIO: {data.rawIntermedio?.toFixed(1) || 0}%</p>
                                        <p style={{ color: '#1e3a8a' }}>AVANZADO: {data.rawAvanzado?.toFixed(1) || 0}%</p>
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-slate-100">
                                        <p className="text-slate-700">SCORE TOTAL: {data.score?.toFixed(1)}%</p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', bottom: -5 }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    
                  </div>
                );
              })()}
            </div>
          )}

          {/* 📋 TABLA DETALLADA DE EVALUACIONES */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#1a4491]" />
              <span>Desglose de Evaluaciones Individuales</span>
            </h3>

            <div className="rounded-xl border border-slate-200/60 overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider sticky top-0">
                    <th className="p-3 border-b border-slate-200">Fecha</th>
                    <th className="p-3 border-b border-slate-200">Puesto Evaluado</th>
                    <th className="p-3 border-b border-slate-200 text-center">Promedio Habilidades</th>
                    <th className="p-3 border-b border-slate-200 text-center">Nivel</th>
                    <th className="p-3 border-b border-slate-200">Evaluador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                  {evaluaciones.map((ev, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <ChevronRight className="h-3 w-3 text-[#1a4491] opacity-40" />
                        {ev.fechaExacta}
                      </td>
                      <td className="p-3 text-slate-500 uppercase font-semibold text-[11px]">{ev.puesto}</td>
                      <td className="p-3 text-center align-middle flex items-center justify-center gap-1">
                        {(ev as any).noEvaluado ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="px-1.5 py-0.5 rounded font-black border text-[10px] bg-rose-50 text-rose-700 border-rose-100 tabular-nums">
                              0%
                            </span>
                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-wider leading-none">Sin Evaluar</span>
                          </div>
                        ) : (
                          <span className={cn(
                            "px-2 py-0.5 rounded font-black border text-[11px] tabular-nums",
                            getScoreBadgeStyle(ev.score)
                          )}>
                            {ev.score}%
                          </span>
                        )}
                        {ev.corregido && !((ev as any).noEvaluado) && (
                          <span 
                            className="inline-flex items-center justify-center h-4 w-4 text-[9px] font-black text-amber-600 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full cursor-help transition-colors select-none"
                            title="Corregido: El Autonomy Score original en Excel era 0%, pero se detectaron habilidades y se recalculó el puntaje real."
                          >
                            *
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-[#1a4491]">{(ev as any).noEvaluado ? "-" : obtenerNivelDeScore(ev.score)}</td>
                      <td className="p-3 text-slate-400 font-semibold text-[10px] uppercase">{ev.evaluador}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
