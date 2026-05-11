import { Factory, Download } from "lucide-react";
import type { AreaData } from "@/data/zeus";
import { exportToPDF } from "@/lib/export";
import { FullscreenButton } from "./fullscreen_button";
import { TeamCard } from "./team_card";
import { STRINGS } from "./constants";

interface TeamHeaderProps {
  area: AreaData;
}

export function TeamHeader({ area }: TeamHeaderProps) {
  return (
    <section className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-6 shadow-xl overflow-hidden">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        
        <TeamCard variant="best" team={area.bestTeam} />

        <div className="flex flex-col items-center justify-center px-6 py-2 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-yellow-400 shadow-lg mb-2">
            <Factory className="h-5 w-5" />
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{area.linea}</div>
            <div className="text-sm font-black text-blue-900 uppercase tracking-tight">{STRINGS.GLOBAL_VIEW}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => exportToPDF("dashboard-content", `${STRINGS.REPORT_PREFIX}${area.team}`)}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-[10px] font-black text-white transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-md shadow-blue-600/20"
            >
              <Download className="h-3 w-3" />
              {STRINGS.PDF_BUTTON}
            </button>
            <FullscreenButton />
          </div>
        </div>

        <TeamCard variant="worst" team={area.worstTeam} />

      </div>
    </section>
  );
}
