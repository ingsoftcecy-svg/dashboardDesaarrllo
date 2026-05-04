import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopNav, type AreaTab } from "@/components/zeus/TopNav";
import { TeamHeader } from "@/components/zeus/TeamHeader";
import { SkillMatrixCard } from "@/components/zeus/SkillMatrixCard";
import { IPsTrackingCard } from "@/components/zeus/IPsTrackingCard";
import { ExcellenceCard } from "@/components/zeus/ExcellenceCard";
import { cocimientos, bloqueFrio } from "@/data/zeus";

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
  const area = tab === "cocimientos" ? cocimientos : bloqueFrio;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <TopNav tab={tab} onTabChange={setTab} shift={shift} onShiftChange={setShift} />

      <main className="flex flex-1 flex-col gap-4 p-4">
        <TeamHeader area={area} shift={shift} />

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <SkillMatrixCard operadores={area.operadores} />
          </div>
          <div className="lg:col-span-6">
            <IPsTrackingCard ips={area.ips} cumplimientoPorHora={area.cumplimientoPorHora} />
          </div>
          <div className="lg:col-span-3">
            <ExcellenceCard
              podio={area.podio}
              logros={area.logros}
              excelenciaEquipo={area.excelenciaEquipo}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
