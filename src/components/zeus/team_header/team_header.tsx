import { Factory } from "lucide-react";
import type { AreaData } from "@/data/zeus";
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
        
        <TeamCard variant="best" team={area.bestTeam} operadores={area.operadores} />

        <div className="flex flex-col items-center justify-center px-6 py-2 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-yellow-400 shadow-lg mb-2">
            <Factory className="h-5 w-5" />
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{area.linea}</div>
            <div className="text-sm font-black text-blue-900 uppercase tracking-tight">{STRINGS.GLOBAL_VIEW}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <FullscreenButton />
          </div>
        </div>

        <TeamCard variant="worst" team={area.worstTeam} operadores={area.operadores} />

      </div>
    </section>
  );
}
