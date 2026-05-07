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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      transition={{ delay: 0.1 }}
      className="flex h-full flex-col rounded-xl border border-white/40 bg-white/70 backdrop-blur-md shadow-xl overflow-hidden"
    >
      <header className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-3 text-white">
        <Target className="h-5 w-5 text-yellow-400" />
        <div>
          <h2 className="text-sm font-bold">Nivel de Autonomía</h2>
          <p className="text-[10px] text-blue-200">Progreso actual del equipo</p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="scale-125 transform">
            <AutonomyGauge value={autonomia} />
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">{nivelLabel}</div>
            <div className="mt-2 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800 border border-yellow-200">
              META ESPERADA: 4.00
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
