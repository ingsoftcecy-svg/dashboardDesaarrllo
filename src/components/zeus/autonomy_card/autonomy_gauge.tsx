import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { get_autonomy_color } from "./utils";

interface AutonomyGaugeProps {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  stroke_width?: number;
  show_text?: boolean;
}

export function AutonomyGauge({ 
  value, 
  max = 4, 
  label, 
  size = 140, 
  stroke_width = 12,
  show_text = true 
}: AutonomyGaugeProps) {
  const percentage = Math.min(value / max, 1);
  const center = size / 2;
  const radius = (size - stroke_width) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash_array = circumference * percentage;

  const ring_color = get_autonomy_color(value);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} stroke="#e2e8f0" strokeWidth={stroke_width} fill="none" />
        <motion.circle
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash_array} ${circumference - dash_array}` }}
          transition={{ duration: 1, ease: "easeOut" }}
          cx={center}
          cy={center}
          r={radius}
          stroke={ring_color}
          strokeWidth={stroke_width}
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      {show_text && (
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
