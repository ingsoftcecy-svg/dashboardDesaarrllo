import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { STRINGS } from "./constants";

interface AchievementListProps {
  achievements: string[];
}

export function AchievementList({ achievements }: AchievementListProps) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
        <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
        {STRINGS.ACHIEVEMENTS_TITLE}
      </div>
      <ul className="space-y-1.5">
        {achievements.map((achievement, index) => (
          <motion.li
            key={achievement}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 transition hover:border-yellow-300 hover:bg-yellow-50"
          >
            <motion.span 
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: index * 0.5 }}
              className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-bold text-blue-900"
            >
              ★
            </motion.span>
            {achievement}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
