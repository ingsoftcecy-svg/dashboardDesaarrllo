import { motion } from "framer-motion";
import { AutonomyGauge } from "@/components/zeus/autonomy_card";

interface FactorItemProps {
  label: string;
  value: number;
  index: number;
}

export function FactorItem({ label, value, index }: FactorItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 p-2 shadow-sm hover:shadow-md transition-all h-[90px]"
    >
      <AutonomyGauge 
        value={value} 
        max={4} 
        size={44} 
        stroke_width={5} 
        show_text={true} 
      />
      <span className="mt-1.5 text-[8px] font-black text-slate-500 uppercase tracking-tighter text-center leading-none px-1">
        {label}
      </span>
    </motion.div>
  );
}
