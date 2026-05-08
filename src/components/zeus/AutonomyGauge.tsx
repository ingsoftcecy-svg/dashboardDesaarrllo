interface Props {
  value: number; // 0-max
  max?: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
}

export function AutonomyGauge({ 
  value, 
  max = 4, 
  label, 
  size = 140, 
  strokeWidth = 12,
  showText = true 
}: Props) {
  const pct = Math.min(value / max, 1);
  const center = size / 2;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  // Color logic based on value (matching the image)
  // 4.0 is Green, around 3.0 is Blue/Orange, lower is Orange
  const getColor = (val: number) => {
    if (val >= 4) return "#10b981"; // Emerald-500
    if (val >= 3) return "#3b82f6"; // Blue-500
    if (val >= 2.5) return "#f59e0b"; // Amber-500
    return "#f97316"; // Orange-500
  };

  const ringColor = getColor(value);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={r} stroke="#e2e8f0" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c - dash}` }}
          transition={{ duration: 1, ease: "easeOut" }}
          cx={center}
          cy={center}
          r={r}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold text-blue-900", size < 100 ? "text-sm" : "text-3xl")}>
            {value.toFixed(2)}
          </span>
          {size >= 100 && (
            <span className="text-[10px] uppercase tracking-wider text-slate-500">/ {max.toFixed(2)}</span>
          )}
        </div>
      )}
      {label && <div className="mt-2 text-[9px] font-black uppercase tracking-tighter text-slate-600 text-center max-w-[80px] leading-tight">{label}</div>}
    </div>
  );
}

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
