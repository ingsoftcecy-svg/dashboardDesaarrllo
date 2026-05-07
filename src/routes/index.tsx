import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopNav, type AreaTab } from "@/components/zeus/TopNav";
import { TeamHeader } from "@/components/zeus/TeamHeader";
import { PhysicalBoard } from "@/components/zeus/PhysicalBoard";

import { ExcellenceCard } from "@/components/zeus/ExcellenceCard";
import { TeamRankingCard } from "@/components/zeus/TeamRankingCard";
import { AutonomyCard } from "@/components/zeus/AutonomyCard";
import { useExcelData } from "@/hooks/useExcelData";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ZEUS · Dashboard de Elaboración" },
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
        <div className="flex flex-col gap-4 p-4">
        <TeamHeader area={area} />

        {/* Top Cards: Excellence, Ranking and Autonomy */}
        <div className="grid flex-shrink-0 grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
          <ExcellenceCard
            podio={area.podio}
            logros={area.logros}
            excelenciaEquipo={area.excelenciaEquipo}
          />
          <TeamRankingCard rankings={area.teamRankings} />
          <AutonomyCard
            autonomia={area.autonomia}
            nivelLabel={area.nivelLabel}
          />
        </div>

        {/* Bottom Full-Width Table: Physical Board */}
        <div className="mt-2 flex-1">
          <h3 className="mb-3 text-lg font-bold text-slate-800">Matriz SKAP</h3>
          <PhysicalBoard operadores={area.operadores as any} />
        </div>
      </div>
    </main>
  </div>
  );
}
