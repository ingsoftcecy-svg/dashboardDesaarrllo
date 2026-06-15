import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, User, TrendingUp, TrendingDown, Clock, Award, ChevronRight } from "lucide-react";
import { obtenerTodoElHistorico, ReporteMensual } from "@/lib/fetchHistorico";
import { cn } from "@/lib/utils";

interface OperatorHistoryDialogProps {
  operatorName: string;
  operatorId: string;
  operatorPuesto: string;
}

interface EvaluacionPunto {
  fechaExacta: string;
  puesto: string;
  score: number;
  corregido?: boolean;
  evaluador: string;
  mesKey: string;
  noEvaluado?: boolean;
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
  if (val === null || isNaN(val)) {
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

export function OperatorHistoryDialog({ operatorName, operatorId, operatorPuesto }: OperatorHistoryDialogProps) {
  const [loading, setLoading] = useState(true);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionPunto[]>([]);
  const [datosGrafico, setDatosGrafico] = useState<MesProgreso[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
            const cleanId = String(operatorId).trim().toUpperCase();
            const cleanName = String(operatorName).trim().toUpperCase();

            // Buscar coincidencia exacta por ID en corchetes o coincidencia parcial de nombre
            const esMismoOperador = 
              (cleanId && employeeStr.includes(`[${cleanId}]`)) ||
              (cleanId && employeeStr.includes(cleanId)) ||
              (cleanName && employeeStr.includes(cleanName));

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
                  noEvaluado: res.noEvaluado
                });
              }
            }
          });
        });

        // Ordenar todas las evaluaciones de la más antigua a la más reciente
        evPoints.sort((a, b) => a.mesKey.localeCompare(b.mesKey));

        // Agrupar por mes para la gráfica
        const gruposMes: Record<string, number[]> = {};
        evPoints.forEach(pt => {
          if (!gruposMes[pt.mesKey]) gruposMes[pt.mesKey] = [];
          gruposMes[pt.mesKey].push(pt.score);
        });

        const puntosGrafico: MesProgreso[] = Object.keys(gruposMes).map(mesKey => {
          const scores = gruposMes[mesKey];
          const promedio = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          return {
            name: formatearMesAnio(mesKey),
            score: parseFloat(promedio.toFixed(2)),
            mesKey: mesKey
          };
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

  return (
    <div className="flex flex-col space-y-6 text-slate-800 select-none">
      
      {/* 👤 CABECERA DEL MODAL */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
            <User className="h-3.5 w-3.5 text-[#1a4491]" />
            <span>Perfil Histórico de Autonomía</span>
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

        {/* 📈 INDICADOR DE CAMBIO NETO */}
        {tieneDatos && (
          <div className="flex gap-4">
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 text-center flex flex-col justify-center min-w-[100px]">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Último Score</span>
              <span className="text-lg font-black text-[#1a4491]">{ultimoScore}%</span>
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
              <span>Progreso de Autonomía Mensual</span>
            </h3>
            
            <div className="h-[200px] w-full text-[10px] font-black">
              {datosGrafico.length === 1 ? (
                <div className="h-full w-full flex flex-col items-center justify-center space-y-1">
                  <Award className="h-6 w-6 text-amber-500" />
                  <p className="text-[11px] font-black uppercase text-slate-600">Primera evaluación registrada</p>
                  <p className="text-[10px] text-slate-400 font-medium">Autonomía de {datosGrafico[0].score}% en {datosGrafico[0].name}</p>
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
                    <th className="p-3 border-b border-slate-200 text-center">Autonomía</th>
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
