import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { PodiumItem } from "./podium_item";
import { AchievementList } from "./achievement_list";
import { TeamExcellenceChart } from "./team_excellence_chart";
import { STRINGS, PODIUM_ORDER } from "./constants";
import type { Podium } from "@/data/zeus";

interface ExcellenceCardProps {
  podio: Podium[];
  logros: string[];
  excelenciaEquipo: number;
}

export function ExcellenceCard({ podio, logros, excelenciaEquipo }: ExcellenceCardProps) {
  return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className="flex h-full flex-col rounded-xl border border-white/40 bg-white/70 backdrop-blur-md shadow-xl transition hover:shadow-lg"
    >
      <header className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-3 text-white">
        <Trophy className="h-5 w-5 text-yellow-400" />
        <div>
          <h2 className="text-sm font-bold">{STRINGS.TITLE}</h2>
          <p className="text-[10px] text-blue-200">{STRINGS.SUBTITLE}</p>
        </div>
      </header>

      <div className="p-3">
        <div className="flex items-end justify-center gap-1.5">
          {PODIUM_ORDER.map((index) => {
            const person = podio[index];
            if (!person) return null;
            return <PodiumItem key={index} person={person} index={index} />;
          })}
        </div>

        <AchievementList achievements={logros} />
        
        <TeamExcellenceChart score={excelenciaEquipo} />
      </div>
    </motion.section>
  );
}
