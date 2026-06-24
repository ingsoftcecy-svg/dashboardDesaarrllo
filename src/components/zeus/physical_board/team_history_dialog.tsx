import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, Users, TrendingUp, TrendingDown, Clock, Award, ChevronRight } from "lucide-react";
import { obtenerTodoElHistorico } from "@/lib/fetchHistorico";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Tooltip as ShadcnTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { OperatorHistoryDialog } from "./operator_history_dialog";


interface TeamMember {
  id: string;
  name: string;
  puesto: string;
  score: number;
  lastAssessmentDate?: string;
  noEvaluado?: boolean;
}

interface TeamHistoryDialogProps {
  teamName: string;
  members: TeamMember[];
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

export function TeamHistoryDialog({ teamName, members }: TeamHistoryDialogProps) {
  const [loading, setLoading] = useState(true);
  const [datosGrafico, setDatosGrafico] = useState<MesProgreso[]>([]);
  const [error, setError] = useState<string | null>(null);

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
          const eac = catData.eac || [];
          const eabf = catData.eabf || [];

          eac.forEach((row: any) => {
            if (row.SHARP) {
              eaMap[String(row.SHARP).trim()] = String(row["Nombre del Equipo"] || "").trim().toUpperCase();
            }
          });

          let lastEquipo = "";
          eabf.forEach((row: any) => {
            if (row["NUEVO EQUIPO "]) lastEquipo = String(row["NUEVO EQUIPO "]).trim().toUpperCase();
            if (row.SHARP) {
              eaMap[String(row.SHARP).trim()] = lastEquipo;
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
            if (match) {
              const id = match[1].trim();
              opEquipo = eaMap[id] || "SIN EQUIPO";
            }

            if (opEquipo.toUpperCase() === teamName.toUpperCase()) {
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
                  id: match ? match[1].trim() : String(Math.random()),
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

  return (
    <div className="flex flex-col space-y-6 text-slate-800">
      {/* 👥 CABECERA DEL MODAL */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
            <Users className="h-3.5 w-3.5 text-[#1a4491]" />
            <span>Desempeño Histórico de Equipo</span>
          </div>
          <h2 className="text-2xl font-black text-[#1a4491] leading-tight uppercase">
            {teamName}
          </h2>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Integrantes en Planta: {members.length}
          </div>
        </div>

        {/* 📈 INDICADOR DE CAMBIO NETO */}
        {tieneDatos && (
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
      ) : error ? (
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
        <div className="space-y-6">
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

            <div className="rounded-xl border border-slate-200/60 overflow-hidden max-h-60 overflow-y-auto bg-white">
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
                              <OperatorHistoryDialog 
                                operatorName={member.name} 
                                operatorId={member.id} 
                                operatorPuesto={member.puesto} 
                              />
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
      )}
    </div>
  );
}
