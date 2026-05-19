import { cn } from "@/lib/utils";
import { championColors, type Operator } from "@/data/zeus";
import { get_initials } from "./utils";
import { CHAMPION_ICONS } from "./constants";
import { SkillBar } from "./skill_bar";
import { is_assessment_expired } from "../physical_board/utils";
import { AlertTriangle } from "lucide-react";

interface OperatorItemProps {
  operator: Operator;
}

export function OperatorItem({ operator }: OperatorItemProps) {
  const is_expired = is_assessment_expired(operator.lastAssessmentDate);

  return (
    <div className={cn(
      "rounded-lg border p-2.5 transition",
      is_expired 
        ? "border-red-200 bg-red-50/50 hover:bg-red-100/80 hover:border-red-300" 
        : "border-transparent hover:border-blue-200 hover:bg-blue-50/60"
    )}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-blue-600 text-xs font-bold text-white shadow-sm">
          {get_initials(operator.nombre)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="truncate text-sm font-semibold text-slate-800">{operator.nombre}</div>
            {is_expired && (
              <div className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[8px] font-bold text-red-700 uppercase tracking-wider" title={`Última evaluación: ${operator.lastAssessmentDate}`}>
                <AlertTriangle className="h-2.5 w-2.5" />
                +2 Meses
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-500 line-clamp-2" title={operator.puesto}>{operator.puesto}</div>
          {(operator.equipoAutonomo || operator.lider || (operator.equipos && operator.equipos.length > 0)) && (
            <div className="mt-1 flex flex-col gap-0.5 text-[9px] leading-tight text-slate-400">
              {operator.equipoAutonomo && <span>EA: <span className="font-medium text-slate-500">{operator.equipoAutonomo}</span></span>}
              {operator.lider && <span>Líder: <span className="font-medium text-slate-500">{operator.lider}</span></span>}
              {operator.equipos && operator.equipos.length > 0 && <span className="line-clamp-2" title={operator.equipos.join(", ")}>Equipos: <span className="font-medium text-slate-500">{operator.equipos.join(", ")}</span></span>}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {operator.champions.map((champion_key) => {
            const Icon = CHAMPION_ICONS[champion_key];
            const config = championColors[champion_key];
            if (!Icon || !config) return null;
            return (
              <span
                key={champion_key}
                title={config.label}
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-md",
                  config.bg,
                  config.text,
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
            );
          })}
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <SkillBar label="B" value={operator.basico} level="basic" />
        <SkillBar label="I" value={operator.intermedio} level="intermediate" />
        <SkillBar label="A" value={operator.avanzado} level="advanced" />
      </div>
    </div>
  );
}
