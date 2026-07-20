import { Users } from "lucide-react";
import { motion } from "framer-motion";
import { STRINGS } from "./constants";
import { RankingItem } from "./ranking_item";
import { cn } from "@/lib/utils";

interface TeamRanking {
  name: string;
  avg: number;
  leader?: string;
}

interface TeamRankingCardProps {
  rankings?: TeamRanking[];
  operadores?: any[];
  metricMode?: "autonomia" | "cursos" | "guias";
}

export function TeamRankingCard({ rankings = [], operadores = [], metricMode = "autonomia" }: TeamRankingCardProps) {
  return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className="flex h-full flex-col rounded-xl border border-white/40 bg-white/70 backdrop-blur-md shadow-xl transition hover:shadow-lg overflow-hidden"
    >
      <header className={cn(
        "flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-white transition-all duration-300",
        metricMode === "cursos"
          ? "bg-gradient-to-r from-purple-800 to-indigo-900"
          : metricMode === "guias"
            ? "bg-gradient-to-r from-emerald-800 to-teal-900"
            : "bg-gradient-to-r from-[#1a4491] to-blue-800"
      )}>
        <Users className="h-5 w-5 text-yellow-400" />
        <div>
          <h2 className="text-sm font-bold">{STRINGS.TITLE}</h2>
          <p className="text-[10px] text-blue-200">{STRINGS.SUBTITLE}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {rankings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <span className="text-xs font-semibold">{STRINGS.EMPTY_TEAMS}</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {rankings.map((team, index) => {
              const is_best = index === 0;
              const is_worst = index === rankings.length - 1 && rankings.length > 1;
              return (
                <RankingItem 
                  key={team.name} 
                  team={team} 
                  index={index} 
                  is_best={is_best} 
                  is_worst={is_worst} 
                  operadores={operadores}
                  metricMode={metricMode}
                />
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
