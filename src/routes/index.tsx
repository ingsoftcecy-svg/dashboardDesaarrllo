import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { TopNav, type AreaTab } from "@/components/ccz/TopNav";
import { TeamHeader } from "@/components/ccz/team_header";
import { PhysicalBoard } from "@/components/ccz/physical_board";
import { ExcellenceCard } from "@/components/ccz/excellence_card";
import { TeamRankingCard } from "@/components/ccz/team_ranking_card";
import { AutonomyCard } from "@/components/ccz/autonomy_card";
import { PromedioPorFactorCard } from "@/components/ccz/promedio_por_factor_card";
import { BrechasPorPilarCard } from "@/components/ccz/brechas_pilar_card";
import { CursosCardDetails } from "@/components/ccz/cursos_card_details";
import { useExcelData } from "@/hooks/useExcelData";
import { DashboardSkeleton } from "@/components/ccz/dashboard_skeleton";
import { Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "DASHBOARD DE AUTONOMIA" },
      {
        name: "description",
        content:
          "Tablero TPM de Elaboración: Cocimientos y Bloque Frío, IPs, multi-skill y reconocimientos.",
      },
    ],
  }),
});

function Index() {
  const [tab, setTab] = useState<AreaTab>("general");
  const { general, cocimientos, bloqueFrio, mantenimiento, loading } = useExcelData();

  const usuario = useAuth();
  const puedeEditar = usuario?.rol === 'admin'; // Solo administradores pueden editar
  const [metricMode, setMetricMode] = useState<"autonomia" | "cursos" | "guias" | "cierre-brecha">("autonomia");

  const area = tab === "general" ? general : tab === "cocimientos" ? cocimientos : tab === "bloqueFrio" ? bloqueFrio : mantenimiento;

  const computedArea = useMemo(() => {
    // 1. Ordenar operadores
    const sortedOps = [...area.operadores].sort((a, b) => {
      if (metricMode === "autonomia") {
        const scoreA = a.autonomyScore ?? 0;
        const scoreB = b.autonomyScore ?? 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        const timeA = a.lastAssessmentDate ? new Date(a.lastAssessmentDate).getTime() : 0;
        const timeB = b.lastAssessmentDate ? new Date(b.lastAssessmentDate).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      } else if (metricMode === "cursos") {
        const progressA = a.cursosProgress ?? 0;
        const progressB = b.cursosProgress ?? 0;
        if (progressB !== progressA) {
          return progressB - progressA;
        }
        const totalA = a.cursosTotal ?? 0;
        const totalB = b.cursosTotal ?? 0;
        if (totalB !== totalA) {
          return totalB - totalA;
        }
        return a.nombre.localeCompare(b.nombre);
      } else if (metricMode === "guias") { // guias
        const progressA = a.guiasProgress ?? 0;
        const progressB = b.guiasProgress ?? 0;
        if (progressB !== progressA) {
          return progressB - progressA;
        }
        return a.nombre.localeCompare(b.nombre);
      } else { // cierre-brecha
        const progressA = a.brechasProgress ?? 0;
        const progressB = b.brechasProgress ?? 0;
        if (progressB !== progressA) {
          return progressB - progressA;
        }
        // Desempate: quién tiene más brechas completadas
        const completadasA = a.brechasCompletadas ?? 0;
        const completadasB = b.brechasCompletadas ?? 0;
        if (completadasB !== completadasA) {
          return completadasB - completadasA;
        }
        return a.nombre.localeCompare(b.nombre);
      }
    });

    // 2. Podio
    const podio = sortedOps.slice(0, 5).map(op => ({
      nombre: op.nombre,
      puesto: op.puesto,
      excelencia: metricMode === "autonomia"
        ? (op.autonomyScore ?? 0)
        : metricMode === "cursos"
          ? (op.cursosProgress ?? 0)
          : metricMode === "guias"
            ? (op.guiasProgress ?? 0)
            : (op.brechasProgress ?? 0),
      lider: op.lider
    }));

    // 3. Rankings de equipos
    const teamRankings = (area.teamRankings || []).map(team => {
      if (metricMode === "autonomia") {
        return team;
      }
      const teamOps = area.operadores.filter(
        op => op.equipoAutonomo?.trim().toUpperCase() === team.name.trim().toUpperCase()
      );
      if (metricMode === "cursos") {
        const opsWithC = teamOps.filter(op => op.cursosTotal && op.cursosTotal > 0);
        const avgCursos = opsWithC.length > 0
          ? Number((opsWithC.reduce((sum, op) => sum + (op.cursosProgress ?? 0), 0) / opsWithC.length).toFixed(2))
          : 0;
        return {
          ...team,
          avg: avgCursos
        };
      } else if (metricMode === "guias") { // guias
        const avgGuias = teamOps.length > 0
          ? Number((teamOps.reduce((sum, op) => sum + (op.guiasProgress ?? 0), 0) / teamOps.length).toFixed(2))
          : 0;
        return {
          ...team,
          avg: avgGuias
        };
      } else { // cierre-brecha
        const opsWithBrechas = teamOps.filter(op => (op.brechasProgress ?? 0) >= 0);
        const avgBrechas = opsWithBrechas.length > 0
          ? Number((opsWithBrechas.reduce((sum, op) => sum + (op.brechasProgress ?? 0), 0) / opsWithBrechas.length).toFixed(2))
          : 0;
        return {
          ...team,
          avg: avgBrechas
        };
      }
    });
    if (metricMode === "cursos" || metricMode === "guias" || metricMode === "cierre-brecha") {
      teamRankings.sort((a, b) => b.avg - a.avg);
    }

    // 4. Promedio general de la métrica (excelenciaEquipo)
    let excelenciaEquipo = area.excelenciaEquipo;
    if (metricMode === "cursos" || metricMode === "guias" || metricMode === "cierre-brecha") {
      const activeTeams = teamRankings.filter(t => t.name !== "Sin Equipo");
      excelenciaEquipo = activeTeams.length > 0
        ? Number((activeTeams.reduce((sum, t) => sum + t.avg, 0) / activeTeams.length).toFixed(2))
        : 0;
    }

    // 5. Autonomia (escala 0-4) para el Gauge
    const autonomia = metricMode === "autonomia"
      ? area.autonomia
      : Number(((excelenciaEquipo / 100) * 4).toFixed(2));

    // 6. Nivel label
    let nivelLabel = "";
    if (metricMode === "cursos") {
      nivelLabel = "Capacitación";
    } else if (metricMode === "guias") {
      nivelLabel = "Habilitación Técnica";
    } else if (metricMode === "cierre-brecha") {
      nivelLabel = "Cierre de Brechas";
    } else {
      if (tab === "general") nivelLabel = "Promedio de Habilidades General";
      else if (tab === "cocimientos") nivelLabel = "Promedio de Habilidades de Cocimientos";
      else if (tab === "bloqueFrio") nivelLabel = "Promedio de Habilidades de Bloque Frío";
      else if (tab === "mantenimiento") nivelLabel = "Promedio de Habilidades de Mantenimiento";
    }

    // 7. Logros
    let logros = area.logros;
    if (metricMode === "cursos") {
      logros = [
        `${sortedOps.filter(o => (o.cursosProgress ?? 0) >= 100).length} operadores al 100% de cursos`,
        `Promedio de cumplimiento: ${excelenciaEquipo}%`,
        `Top 1: ${podio[0]?.nombre || "N/A"} (${podio[0]?.excelencia || 0}%)`
      ];
    } else if (metricMode === "guias") {
      logros = [
        `${sortedOps.filter(o => (o.guiasProgress ?? 0) >= 100).length} operadores al 100% de guías`,
        `Promedio de habilitación: ${excelenciaEquipo}%`,
        `Top 1: ${podio[0]?.nombre || "N/A"} (${podio[0]?.excelencia || 0}%)`
      ];
    }

    const bestTeam = teamRankings[0] || undefined;
    const worstTeam = teamRankings.length > 1 ? teamRankings[teamRankings.length - 1] : undefined;

    let guiasL6Avg = 0;
    let guiasL7Avg = 0;
    let guiasL8Avg = 0;
    if (metricMode === "guias") {
      const ops = area.operadores;
      const count = ops.length;
      if (count > 0) {
        guiasL6Avg = Number((ops.reduce((sum, op) => sum + (op.guiasL6Progress ?? 0), 0) / count).toFixed(2));
        guiasL7Avg = Number((ops.reduce((sum, op) => sum + (op.guiasL7Progress ?? 0), 0) / count).toFixed(2));
        guiasL8Avg = Number((ops.reduce((sum, op) => sum + (op.guiasL8Progress ?? 0), 0) / count).toFixed(2));
      }
    }

    return {
      ...area,
      operadores: sortedOps,
      podio,
      excelenciaEquipo,
      teamRankings,
      bestTeam,
      worstTeam,
      autonomia,
      nivelLabel,
      logros,
      guiasL6Avg,
      guiasL7Avg,
      guiasL8Avg
    };
  }, [area, metricMode]);

  return (
    <div className="flex h-screen flex-col bg-slate-100 overflow-hidden">
      <TopNav tab={tab} onTabChange={setTab} />

      <main id="dashboard-content" className="flex-1 overflow-auto">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {/* Control de Métrica Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-white/50 bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-sm gap-4">
              <div className="flex flex-col">
                <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tablero de Control</h1>
                <p className="text-xs text-slate-500 font-semibold">Visualiza el promedio de habilidades de la planta o el avance del plan de capacitación.</p>
              </div>
              <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1 shrink-0 self-end sm:self-center shadow-inner">
                <button
                  onClick={() => setMetricMode("autonomia")}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-wider cursor-pointer",
                    metricMode === "autonomia"
                      ? "bg-[#1a4491] text-white shadow-md scale-[1.02]"
                      : "text-slate-600 hover:bg-slate-300 hover:text-slate-800"
                  )}
                >
                  Habilidades
                </button>
                <button
                  onClick={() => setMetricMode("guias")}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-wider cursor-pointer",
                    metricMode === "guias"
                      ? "bg-emerald-700 text-white shadow-md scale-[1.02]"
                      : "text-slate-600 hover:bg-slate-300 hover:text-slate-800"
                  )}
                >
                  Guías
                </button>
                <button
                  onClick={() => setMetricMode("cierre-brecha")}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-wider cursor-pointer",
                    metricMode === "cierre-brecha"
                      ? "bg-blue-600 text-white shadow-md scale-[1.02]"
                      : "text-slate-600 hover:bg-slate-300 hover:text-slate-800"
                  )}
                >
                  Cierre de Brecha
                </button>
                <button
                  onClick={() => setMetricMode("cursos")}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-wider cursor-pointer",
                    metricMode === "cursos"
                      ? "bg-purple-700 text-white shadow-md scale-[1.02]"
                      : "text-slate-600 hover:bg-slate-300 hover:text-slate-800"
                  )}
                >
                  Cursos
                </button>
              </div>
            </div>

              <>
                <TeamHeader area={computedArea} metricMode={metricMode} />

                {/* Top Section Grid */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
                  <ExcellenceCard
                    podio={computedArea.podio}
                    logros={computedArea.logros}
                    excelenciaEquipo={computedArea.excelenciaEquipo}
                    metricMode={metricMode}
                  />
                  <div className="flex flex-col gap-4">
                    {metricMode === "autonomia" ? (
                      <TeamRankingCard
                        rankings={computedArea.teamRankings}
                        operadores={computedArea.operadores}
                        metricMode={metricMode}
                        className="flex-1 min-h-[480px] h-full"
                      />
                    ) : metricMode === "cursos" ? (
                      <CursosCardDetails area={computedArea} className="flex-1 min-h-[480px] h-full" />
                    ) : metricMode === "guias" ? (
                      <AutonomyCard
                        autonomia={computedArea.autonomia}
                        nivel_label={computedArea.nivelLabel}
                        trend={computedArea.cumplimientoPorHora.map(h => h.cumplimiento)}
                        title="Guías Técnicas"
                        subtitle="Habilitación técnica"
                        customText={`${computedArea.excelenciaEquipo}%`}
                        customSubText="/ 100%"
                        guiasL6={computedArea.guiasL6Avg}
                        guiasL7={computedArea.guiasL7Avg}
                        guiasL8={computedArea.guiasL8Avg}
                      />
                    ) : (() => {
                      // Calculate area-wide brechas summary
                      const ops = computedArea.operadores || [];
                      const totalBrechas = ops.reduce((s, o) => s + (o.brechasTotal || 0), 0);
                      const totalCompletadas = ops.reduce((s, o) => s + (o.brechasCompletadas || 0), 0);
                      const totalEnProceso = ops.reduce((s, o) => s + (o.brechasEnProceso || 0), 0);
                      const pctGeneral = totalBrechas > 0 ? ((totalCompletadas / totalBrechas) * 100).toFixed(1) : "0.0";
                      const al100 = ops.filter(o => (o.brechasProgress || 0) === 100).length;
                      const al0 = ops.filter(o => (o.brechasTotal || 0) > 0 && (o.brechasProgress || 0) === 0).length;
                      const opsConBrechas = ops.filter(o => (o.brechasTotal || 0) > 0).length;
                      return (
                      <div className="flex flex-col gap-4 h-full">
                        <motion.section 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
                        >
                          <header className="flex items-center justify-between px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-cyan-700">
                            <div className="flex items-center gap-3">
                              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                                <div className="absolute h-5 w-5 rounded-full border-2 border-yellow-400 opacity-50" />
                                <div className="absolute h-3 w-3 rounded-full border-2 border-yellow-400" />
                                <div className="h-1 w-1 rounded-full bg-yellow-400" />
                              </div>
                              <div>
                                <h2 className="text-sm font-bold uppercase tracking-tight">Cierre de Brechas</h2>
                                <p className="text-[10px] font-medium text-cyan-100/70">Resumen del área</p>
                              </div>
                            </div>
                            <div className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 border border-white/20">
                              <span className="text-[8px] font-black uppercase tracking-widest">META: 100%</span>
                            </div>
                          </header>
                          
                          <div className="flex flex-col p-4 gap-3 flex-1 bg-slate-50/30">
                            {/* Big percentage */}
                            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm">
                              <div>
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Cumplimiento General</h3>
                                <p className="text-3xl font-black text-cyan-700 leading-none mt-1">{pctGeneral}% <span className="text-[10px] font-bold text-slate-400">/ 100%</span></p>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="text-[9px] font-black text-emerald-600">{al100} personas al 100% ✅</div>
                                {al0 > 0 && <div className="text-[9px] font-black text-red-500">{al0} personas al 0% ⚠️</div>}
                                <div className="text-[8px] font-semibold text-slate-400">{opsConBrechas} colaboradores con brechas</div>
                              </div>
                            </div>
                            
                            {/* Stats grid */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 text-center shadow-sm">
                                <div className="text-lg font-black text-slate-700 tabular-nums">{totalBrechas}</div>
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Total</div>
                              </div>
                              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200/60 text-center shadow-sm">
                                <div className="text-lg font-black text-emerald-700 tabular-nums">{totalCompletadas}</div>
                                <div className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">Cerradas</div>
                              </div>
                              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200/60 text-center shadow-sm">
                                <div className="text-lg font-black text-amber-600 tabular-nums">{totalEnProceso}</div>
                                <div className="text-[8px] font-black text-amber-500 uppercase tracking-wider">En Proceso</div>
                              </div>
                            </div>

                            {/* Stacked bar */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Distribución</div>
                              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                                {totalBrechas > 0 && (
                                  <>
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(totalCompletadas / totalBrechas) * 100}%` }} />
                                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${(totalEnProceso / totalBrechas) * 100}%` }} />
                                  </>
                                )}
                              </div>
                              <div className="flex justify-between mt-1.5 text-[8px] font-bold text-slate-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{totalBrechas > 0 ? ((totalCompletadas/totalBrechas)*100).toFixed(0) : 0}% Cerradas</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{totalBrechas > 0 ? ((totalEnProceso/totalBrechas)*100).toFixed(0) : 0}% En Proceso</span>
                              </div>
                            </div>
                          </div>
                        </motion.section>
                        <BrechasPorPilarCard area={computedArea} className="min-h-[250px]" />
                      </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col gap-4">
                    {metricMode !== "guias" && metricMode !== "cierre-brecha" && (
                      <AutonomyCard
                        autonomia={computedArea.autonomia}
                        nivel_label={computedArea.nivelLabel}
                        trend={computedArea.cumplimientoPorHora.map(h => h.cumplimiento)}
                        title={metricMode === "autonomia" ? "Promedio de Habilidades" : "Capacitación de Planta"}
                        subtitle={metricMode === "autonomia" ? "Promedio actual del departamento" : "Progreso actual de cursos"}
                        customText={`${computedArea.excelenciaEquipo}%`}
                        customSubText="/ 100%"
                      />
                    )}
                    {metricMode === "autonomia" ? (
                      <PromedioPorFactorCard area={computedArea} className="flex-1 min-h-[480px] h-full" />
                    ) : (
                      <TeamRankingCard
                        rankings={computedArea.teamRankings}
                        operadores={computedArea.operadores}
                        metricMode={metricMode}
                        className={
                          computedArea.team !== "Vista General"
                            ? "h-auto"
                            : metricMode === "cursos"
                              ? "h-[400px]"
                              : "h-[530px]"
                        }
                      />
                    )}
                  </div>
                </div>

                {/* Bottom Section: Full-Width SKAP Matrix */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn(
                      "w-2.5 h-6 rounded-full inline-block transition-colors duration-300",
                      metricMode === "cursos" ? "bg-purple-700" : metricMode === "guias" ? "bg-emerald-700" : "bg-[#1a4491]"
                    )} />
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                      {metricMode === "autonomia"
                        ? `Matriz SKAP (Autonomía) — ${tab === "general" ? "General" : tab === "cocimientos" ? "Cocimientos" : tab === "bloqueFrio" ? "Bloque Frío" : "Mantenimiento"}`
                        : metricMode === "cursos"
                          ? `Matriz de Cursos y Capacitación — ${tab === "general" ? "General" : tab === "cocimientos" ? "Cocimientos" : tab === "bloqueFrio" ? "Bloque Frío" : "Mantenimiento"}`
                          : metricMode === "guias" 
                            ? `Matriz de Guías Técnicas (L6, L7, L8) — ${tab === "general" ? "General" : tab === "cocimientos" ? "Cocimientos" : tab === "bloqueFrio" ? "Bloque Frío" : "Mantenimiento"}`
                            : `Plan de Cierre de Brechas — ${tab === "general" ? "General" : tab === "cocimientos" ? "Cocimientos" : tab === "bloqueFrio" ? "Bloque Frío" : "Mantenimiento"}`}
                    </h3>
                  </div>
                  <PhysicalBoard
                    operadores={computedArea.operadores as any}
                    show_ato={tab !== "mantenimiento"}
                    puedeEditar={puedeEditar}
                    teamRankings={computedArea.teamRankings}
                    metricMode={metricMode as any}
                  />
                </div>
              </>

          </div>

        )}
      </main>
    </div>
  );
}


