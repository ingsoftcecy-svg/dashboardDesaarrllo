import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopNav, type AreaTab } from "@/components/zeus/TopNav";
import { TeamHeader } from "@/components/zeus/TeamHeader";
import { PhysicalBoard } from "@/components/zeus/PhysicalBoard";

import { ExcellenceCard } from "@/components/zeus/ExcellenceCard";
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
  const [tab, setTab] = useState<AreaTab>("cocimientos");
  const [shift, setShift] = useState("Mañana");
  const { cocimientos, bloqueFrio, loading } = useExcelData();
  
  const area = tab === "cocimientos" ? cocimientos : bloqueFrio;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <TopNav tab={tab} onTabChange={setTab} shift={shift} onShiftChange={setShift} />

      <main className="flex flex-1 flex-col gap-4 p-4">
        <TeamHeader area={area} shift={shift} />

        {/* Top Cards: Excellence and Autonomy */}
        <div className="grid flex-shrink-0 grid-cols-1 gap-4 lg:grid-cols-2 mb-2">
          <ExcellenceCard
            podio={area.podio}
            logros={area.logros}
            excelenciaEquipo={area.excelenciaEquipo}
          />
          <AutonomyCard
            autonomia={area.autonomia}
            nivelLabel={area.nivelLabel}
          />
        </div>

        {/* Bottom Full-Width Table: Physical Board */}
        <div className="mt-2 flex-1">
          <h3 className="mb-3 text-lg font-bold text-slate-800">Matriz Multi-Skill y Autonomía (Board Físico)</h3>
          <PhysicalBoard operadores={area.operadores as any} />
        </div>
      </main>
    </div>
  );
}
