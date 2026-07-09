import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { TopNav, type AreaTab } from "@/components/zeus/TopNav";
import { TeamHeader } from "@/components/zeus/team_header";
import { PhysicalBoard } from "@/components/zeus/physical_board";
import { ExcellenceCard } from "@/components/zeus/excellence_card";
import { TeamRankingCard } from "@/components/zeus/team_ranking_card";
import { AutonomyCard } from "@/components/zeus/autonomy_card";
import { PromedioPorFactorCard } from "@/components/zeus/promedio_por_factor_card";
import { CursosCardDetails } from "@/components/zeus/cursos_card_details";
import { useExcelData } from "@/hooks/useExcelData";
import { DashboardSkeleton } from "@/components/zeus/dashboard_skeleton";
import { Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

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
  const [metricMode, setMetricMode] = useState<"autonomia" | "cursos">("autonomia");

  const area = tab === "general" ? general : tab === "cocimientos" ? cocimientos : tab === "bloqueFrio" ? bloqueFrio : mantenimiento;

  const computedArea = useMemo(() => {
    // 1. Ordenar operadores
    const sortedOps = [...area.operadores].sort((a, b) => {
      if (metricMode === "autonomia") {
        if (b.autonomyScore !== a.autonomyScore) {
          return b.autonomyScore - a.autonomyScore;
        }
        const timeA = a.lastAssessmentDate ? new Date(a.lastAssessmentDate).getTime() : 0;
        const timeB = b.lastAssessmentDate ? new Date(b.lastAssessmentDate).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      } else {
        const progressA = a.cursosProgress ?? 0;
        const progressB = b.cursosProgress ?? 0;
        if (progressB !== progressA) {
          return progressB - progressA;
        }
        return a.nombre.localeCompare(b.nombre);
      }
    });

    // 2. Podio
    const podio = sortedOps.slice(0, 5).map(op => ({
      nombre: op.nombre,
      puesto: op.puesto,
      excelencia: metricMode === "autonomia" ? op.autonomyScore : (op.cursosProgress ?? 0),
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
      const opsWithC = teamOps.filter(op => op.cursosTotal && op.cursosTotal > 0);
      const avgCursos = opsWithC.length > 0
        ? Number((opsWithC.reduce((sum, op) => sum + (op.cursosProgress ?? 0), 0) / opsWithC.length).toFixed(2))
        : 0;
      return {
        ...team,
        avg: avgCursos
      };
    });
    if (metricMode === "cursos") {
      teamRankings.sort((a, b) => b.avg - a.avg);
    }

    // 4. Promedio general de la métrica (excelenciaEquipo)
    let excelenciaEquipo = area.excelenciaEquipo;
    if (metricMode === "cursos") {
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
    } else {
      if (tab === "general") nivelLabel = "Autonomía General";
      else if (tab === "cocimientos") nivelLabel = "Autonomía de Cocimientos";
      else if (tab === "bloqueFrio") nivelLabel = "Autonomía de Bloque Frío";
      else if (tab === "mantenimiento") nivelLabel = "Autonomía de Mantenimiento";
    }

    // 7. Logros
    let logros = area.logros;
    if (metricMode === "cursos") {
      logros = [
        `${sortedOps.filter(o => (o.cursosProgress ?? 0) >= 100).length} operadores al 100% de cursos`,
        `Promedio de cumplimiento: ${excelenciaEquipo}%`,
        `Top 1: ${podio[0]?.nombre || "N/A"} (${podio[0]?.excelencia || 0}%)`
      ];
    }

    const bestTeam = teamRankings[0] || undefined;
    const worstTeam = teamRankings.length > 1 ? teamRankings[teamRankings.length - 1] : undefined;

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
      logros
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
                <p className="text-xs text-slate-500 font-semibold">Visualiza la autonomía de la planta o el avance del plan de capacitación.</p>
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
                  Autonomía
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

            <TeamHeader area={computedArea} metricMode={metricMode} />
            
            {/* Top Section Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
              <ExcellenceCard
                podio={computedArea.podio}
                logros={computedArea.logros}
                excelenciaEquipo={computedArea.excelenciaEquipo}
                metricMode={metricMode}
              />
              
              <TeamRankingCard rankings={computedArea.teamRankings} operadores={computedArea.operadores} metricMode={metricMode} />

              <div className="flex flex-col gap-4">
                <AutonomyCard
                  autonomia={computedArea.autonomia}
                  nivel_label={computedArea.nivelLabel}
                  trend={computedArea.cumplimientoPorHora.map(h => h.cumplimiento)}
                  title={metricMode === "autonomia" ? "Nivel de Autonomía" : "Capacitación de Planta"}
                  subtitle={metricMode === "autonomia" ? "Progreso actual del departamento" : "Progreso actual de cursos"}
                  customText={`${computedArea.excelenciaEquipo}%`}
                  customSubText="/ 100%"
                />
                {metricMode === "autonomia" ? (
                  <PromedioPorFactorCard area={computedArea} />
                ) : (
                  <CursosCardDetails area={computedArea} />
                )}
              </div>
            </div>

            {/* Bottom Section: Full-Width SKAP Matrix */}
            <div className="mt-4">
              <h3 className="mb-3 text-lg font-bold text-slate-800 uppercase tracking-tight">Matriz SKAP</h3>
              <PhysicalBoard 
                operadores={computedArea.operadores as any} 
                show_ato={tab !== "mantenimiento"}
                puedeEditar={puedeEditar}
                teamRankings={computedArea.teamRankings}
                metricMode={metricMode}
              />
            </div>
            
          </div>
          
        )}
      </main>
    </div>
  );
}
 

