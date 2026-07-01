import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import type { AreaData } from "@/data/zeus";
import { STRINGS, FACTORS_LABELS } from "./constants";
import { FactorItem } from "./factor_item";

interface PromedioPorFactorCardProps {
  area: AreaData;
}

export function PromedioPorFactorCard({ area }: PromedioPorFactorCardProps) {
  const factors = area.autonomyFactors || {
    dinamica: 0,
    liderazgo: 0,
    skap: 0,
    ato: 0,
    seguridad: 0,
    quas: 0,
    multihab: 0,
    vpo: 0,
    solucionProb: 0,
    infraest: 0,
  };

  const factor_items = Object.entries(FACTORS_LABELS).map(([key, label]) => ({
    key,
    label,
    value: (factors as any)[key] || 0,
  }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
    >
      <header className="flex items-center gap-2 bg-[#0f172a] px-4 py-3 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
          <BarChart3 className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-tight">{STRINGS.TITLE}</h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {STRINGS.SUBTITLE}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-3 md:grid-cols-3">
        {factor_items.map((item, index) => (
          <FactorItem 
            key={item.key} 
            factorKey={item.key}
            label={item.label} 
            value={item.value} 
            index={index} 
            operadores={area.operadores}
            areaName={area.team}
          />
        ))}
      </div>
    </motion.section>
  );
}
