import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopNav, type AreaTab } from "@/components/zeus/TopNav";
import { TeamHeader } from "@/components/zeus/team_header";
import { PhysicalBoard } from "@/components/zeus/physical_board";

import { ExcellenceCard } from "@/components/zeus/excellence_card";
import { TeamRankingCard } from "@/components/zeus/team_ranking_card";
import { AutonomyCard } from "@/components/zeus/autonomy_card";
import { PromedioPorFactorCard } from "@/components/zeus/promedio_por_factor_card";
import { useExcelData } from "@/hooks/useExcelData";
import { DashboardSkeleton } from "@/components/zeus/dashboard_skeleton";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "DASHBOARD DE AUTONOMIA" },
      {
        name: "description",
        content:
          "Tablero TPM de Elaboración del Proyecto ZEUS: Cocimientos y Bloque Frío, IPs, multi-skill y reconocimientos.",
      },
    ],
  }),
});

function Index() {
  const [tab, setTab] = useState<AreaTab>("general");
  const { general, cocimientos, bloqueFrio, mantenimiento, loading } = useExcelData();
  
  const area = tab === "general" ? general : tab === "cocimientos" ? cocimientos : tab === "bloqueFrio" ? bloqueFrio : mantenimiento;

  return (
    <div className="flex h-screen flex-col bg-slate-100 overflow-hidden">
      <TopNav tab={tab} onTabChange={setTab} />

      <main id="dashboard-content" className="flex-1 overflow-auto">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="flex flex-col gap-4 p-4">
            <TeamHeader area={area} />

            {/* Top Section Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
              <ExcellenceCard
                podio={area.podio}
                logros={area.logros}
                excelenciaEquipo={area.excelenciaEquipo}
              />
              
              <TeamRankingCard rankings={area.teamRankings} />

              <div className="flex flex-col gap-4">
                <AutonomyCard
                  autonomia={area.autonomia}
                  nivel_label={area.nivelLabel}
                  trend={area.cumplimientoPorHora.map(h => h.cumplimiento)}
                />
                <PromedioPorFactorCard area={area} />
              </div>
            </div>

            {/* Bottom Section: Full-Width SKAP Matrix */}
            <div className="mt-4">
              <h3 className="mb-3 text-lg font-bold text-slate-800 uppercase tracking-tight">Matriz SKAP</h3>
              <PhysicalBoard 
                operadores={area.operadores as any} 
                show_ato={tab !== "mantenimiento"}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
