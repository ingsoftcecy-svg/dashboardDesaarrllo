import { cn } from "@/lib/utils";

interface SkillBarProps {
  label: string;
  value: number;
  level: 'basic' | 'intermediate' | 'advanced';
}

export function SkillBar({ label, value, level }: SkillBarProps) {
  const color_classes = {
    basic: "bg-green-500",
    intermediate: "bg-yellow-400",
    advanced: "bg-blue-700",
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 text-[9px] font-bold text-slate-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div 
          className={cn("h-full rounded-full transition-all", color_classes[level])} 
          style={{ width: `${value}%`, opacity: Math.max(0.4, value / 100) }} 
        />
      </div>
      <span className="w-7 text-right text-[10px] font-semibold tabular-nums text-slate-600">
        {value}%
      </span>
    </div>
  );
}
