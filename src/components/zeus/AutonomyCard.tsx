import { AutonomyGauge } from "./AutonomyGauge";
import { Target } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  autonomia: number;
  nivelLabel: string;
}

export function AutonomyCard({ autonomia, nivelLabel }: Props) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
    >
      <header className="flex items-center gap-3 bg-gradient-to-r from-blue-700 to-blue-800 px-4 py-3 text-white">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
          <div className="absolute h-5 w-5 rounded-full border-2 border-yellow-400 opacity-50" />
          <div className="absolute h-3 w-3 rounded-full border-2 border-yellow-400" />
          <div className="h-1 w-1 rounded-full bg-yellow-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-tight">Nivel de Autonomía</h2>
          <p className="text-[10px] font-medium text-blue-100/70">Progreso actual del equipo</p>
        </div>
      </header>

      <div className="flex flex-1 items-center gap-8 p-6">
        <div className="flex shrink-0 items-center justify-center">
          <AutonomyGauge value={autonomia} max={4} size={130} strokeWidth={15} />
        </div>
        
        <div className="flex flex-col justify-center space-y-2">
          <h3 className="text-xl font-black text-[#1a4491] uppercase tracking-tight leading-tight">
            {nivelLabel}
          </h3>
          <div className="inline-flex w-fit items-center rounded-full bg-yellow-100 px-3 py-1 border border-yellow-200">
            <span className="text-[10px] font-black text-yellow-800 uppercase tracking-widest">
              META ESPERADA: 4.00
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
