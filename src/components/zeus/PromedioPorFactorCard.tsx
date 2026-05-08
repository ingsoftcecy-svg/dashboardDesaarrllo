import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { AutonomyGauge } from "./AutonomyGauge";
import type { AreaData } from "@/data/zeus";

export function PromedioPorFactorCard({ area }: { area: AreaData }) {
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

  const factorItems = [
    { label: "DINÁMICA DE EQUIPO", value: factors.dinamica },
    { label: "LIDERAZGO", value: factors.liderazgo },
    { label: "SKAP", value: factors.skap },
    { label: "ATO", value: factors.ato },
    { label: "SEGURIDAD", value: factors.seguridad },
    { label: "QUAS", value: factors.quas },
    { label: "MULTIHAB", value: factors.multihab },
    { label: "VPO", value: factors.vpo },
    { label: "SOLUCIÓN DE PROB", value: factors.solucionProb },
    { label: "INFRAEST", value: factors.infraest },
  ];

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
          <h2 className="text-sm font-bold uppercase tracking-tight">Promedio por Factor</h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            PARES TPM • ESCALA 0-4
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-3 md:grid-cols-3">
        {factorItems.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 p-2 shadow-sm hover:shadow-md transition-all h-[90px]"
          >
            <AutonomyGauge 
              value={item.value} 
              max={4} 
              size={44} 
              strokeWidth={5} 
              showText={true} 
            />
            <span className="mt-1.5 text-[8px] font-black text-slate-500 uppercase tracking-tighter text-center leading-none px-1">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
