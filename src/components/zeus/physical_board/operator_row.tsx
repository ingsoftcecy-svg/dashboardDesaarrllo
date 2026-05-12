import { AlertTriangle, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Operator } from "@/data/zeus";
import { OperatorAvatar } from "./operator_avatar";
import { PreReqEditor } from "./pre_req_editor";
import { IpMediator } from "./ip_mediator";
import { MultiSkillEditor } from "./multi_skill_editor";
import { AtoEditor } from "./ato_editor";
import { get_capability_color, is_assessment_expired, get_initials } from "./utils";
import { CHAMPION_ICONS, STRINGS } from "./constants";
import { cn, getLeaderColor } from "@/lib/utils";

interface OperatorRowProps {
  operator: Operator & { autonomyScore: number };
  original_index: number;
  visual_index: number;
  show_ato?: boolean;
  team_members: { id: string, name: string }[];
}

export function OperatorRow({ operator, original_index, visual_index, show_ato = true, team_members }: OperatorRowProps) {
  const autonomy_score = ((operator.autonomyScore / 100) * 4).toFixed(2);
  const is_expired = is_assessment_expired(operator.lastAssessmentDate);
  
  const get_podium_style = (index: number) => {
    if (index === 0) return "bg-[#fef9c3]/60 hover:bg-[#fef3c7] border-l-4 border-l-[#f59e0b]";
    if (index === 1) return "bg-[#f1f5f9]/80 hover:bg-[#e2e8f0] border-l-4 border-l-[#94a3b8]";
    if (index === 2) return "bg-[#fed7aa]/40 hover:bg-[#fde68a]/50 border-l-4 border-l-[#d97706]";
    if (index === 3) return "bg-blue-50/50 hover:bg-blue-100/80 border-l-4 border-l-blue-400";
    if (index === 4) return "bg-purple-50/50 hover:bg-purple-100/80 border-l-4 border-l-purple-400";
    return null;
  };

  const podium_style = get_podium_style(original_index);
  const alternate_row_style = cn("border-l-4 border-l-transparent", visual_index % 2 === 0 ? "bg-white/40" : "bg-slate-50/30");
  
  let row_class = alternate_row_style;
  if (is_expired) {
    row_class = "bg-red-50/50 hover:bg-red-100/80 border-l-4 border-l-red-500";
  } else if (podium_style) {
    row_class = cn(podium_style, original_index === 0 && "animate-glow-gold relative z-10");
  }

  const handle_team_logo_error = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.currentTarget;
    target.style.display = 'none';
    if (target.parentElement) {
      target.parentElement.innerHTML = `<div class="text-[8px] font-bold text-slate-400">${STRINGS.LOGO_FALLBACK}</div>`;
    }
  };

  return (
    <motion.tr 
      key={operator.id} 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: visual_index * 0.03 }}
      className={cn("group transition-colors", row_class)}
    >
      <td className="border-b border-r border-slate-200/50 p-3 text-center align-middle font-black text-slate-400">
        {original_index + 1}
      </td>
      
      <td className="border-b border-r border-slate-200/50 p-3 align-middle">
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <button className="focus:outline-none focus:ring-2 focus:ring-[#1a4491] rounded-md transition-transform hover:scale-105 active:scale-95">
                <OperatorAvatar operator_name={operator.nombre} />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
              <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center">
                <img 
                  src={`/fotos/${operator.nombre.trim()}.jpeg?t=${Date.now()}`} 
                  alt={operator.nombre} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.src.includes('.png')) {
                      target.src = `/fotos/${operator.nombre.trim()}.png?t=${Date.now()}`;
                      return;
                    }
                    target.style.display = 'none';
                    if (target.nextElementSibling) {
                      (target.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                  }} 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a4491] to-[#2c65cc] text-6xl font-black text-white hidden items-center justify-center">
                  {get_initials(operator.nombre)}
                </div>
              </div>
              <div className="text-center mt-4 space-y-1">
                <DialogTitle className="text-2xl font-black text-[#1a4491] leading-tight uppercase">{operator.nombre}</DialogTitle>
                <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest">{operator.puesto}</DialogDescription>
                {operator.lider && <p className="text-xs font-semibold text-slate-400 mt-2 uppercase tracking-widest">{STRINGS.LEADER_LABEL} {operator.lider}</p>}
              </div>
            </DialogContent>
          </Dialog>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 truncate text-sm font-bold text-slate-800">
              {original_index === 0 ? (
                <motion.span 
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-lg"
                >
                  👑
                </motion.span>
              ) : original_index < 5 ? (
                <span className="text-base">{["🥇", "🥈", "🥉", "⭐", "✨"][original_index]}</span>
              ) : null}
              {operator.nombre}
              {is_expired && (
                <div className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[8px] font-bold text-red-700 uppercase tracking-wider" title={`Última evaluación: ${operator.lastAssessmentDate}`}>
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {STRINGS.EXPIRED_ASSESSMENT}
                </div>
              )}
            </div>
            <div className="truncate text-[10px] font-semibold text-slate-500">{operator.puesto}</div>
            {operator.lider && (
              <div className="mt-1.5 flex">
                <div className={cn("px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md border", getLeaderColor(operator.lider))}>
                  {STRINGS.LEADER_LABEL} {operator.lider}
                </div>
              </div>
            )}
          </div>
        </div>
      </td>

      <td className="border-b border-r border-slate-200/50 p-3 align-middle text-center">
        {operator.equipoAutonomo ? (
          <div className="flex flex-col items-center gap-1">
            <Dialog>
              <DialogTrigger asChild>
              <button className="h-20 w-20 overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-lg flex items-center justify-center p-2 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#1a4491]">
                  <img 
                    src={`/logos/${operator.equipoAutonomo.trim().toUpperCase()}.png`} 
                    alt={operator.equipoAutonomo}
                    className="max-h-full max-w-full object-contain"
                    onError={handle_team_logo_error}
                  />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
                <div className="w-full aspect-square flex items-center justify-center p-4">
                  <img 
                    src={`/logos/${operator.equipoAutonomo.trim().toUpperCase()}.png`} 
                    alt={operator.equipoAutonomo}
                    className="max-h-full max-w-full object-contain drop-shadow-xl"
                  />
                </div>
                <div className="text-center mt-4">
                  <DialogTitle className="text-2xl font-black text-[#1a4491] uppercase tracking-tight">{operator.equipoAutonomo}</DialogTitle>
                  <DialogDescription className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{STRINGS.TEAM_LOGO_OFFICIAL}</DialogDescription>
                </div>
              </DialogContent>
            </Dialog>
            <div className="text-[9px] font-bold text-[#1a4491] uppercase leading-tight max-w-[100px] truncate">
              {operator.equipoAutonomo}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 italic font-normal text-[10px]">{STRINGS.NO_TEAM}</span>
        )}
      </td>

      <td className="border-b border-r border-slate-200/50 p-2 align-middle">
        <div className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center justify-between">
            <span>{STRINGS.DRIVERS_LICENSE}</span>
            <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", get_capability_color(operator.basico))}>
              {Math.round(operator.basico)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{STRINGS.INTERMEDIATE}</span>
            <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", get_capability_color(operator.intermedio))}>
              {Math.round(operator.intermedio)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{STRINGS.ADVANCED}</span>
            <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", get_capability_color(operator.avanzado))}>
              {Math.round(operator.avanzado)}
            </span>
          </div>
        </div>
      </td>

      <td className="border-b border-r border-slate-200/50 p-2 align-middle">
        <MultiSkillEditor 
          operator_id={operator.id} 
          operator_name={operator.nombre} 
          equipos={operator.equipos || []} 
        />
      </td>

      <td className="border-b border-r border-slate-200/50 p-2 align-middle">
        <div className="flex flex-col gap-1.5">
          {operator.champions && operator.champions.length > 0 ? (
            operator.champions.map((champion_role) => {
              const Icon = CHAMPION_ICONS[champion_role];
              let background_color = "bg-slate-200 text-slate-700";
              if (champion_role === "seguridad") background_color = "bg-orange-500 text-white";
              if (champion_role === "calidad") background_color = "bg-purple-600 text-white";
              if (champion_role === "ambiental") background_color = "bg-green-600 text-white";
              if (champion_role === "mantenimiento") background_color = "bg-blue-600 text-white";
              if (champion_role === "gestion") background_color = "bg-purple-400 text-white";
              if (champion_role === "gente") background_color = "bg-pink-500 text-white";
              if (champion_role === "logistica") background_color = "bg-slate-500 text-white";

              return (
                <div key={champion_role} className={cn("flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold uppercase shadow-sm leading-none", background_color)}>
                  <Icon className="h-3 w-3" />
                  {champion_role}
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-400 italic">{STRINGS.NOT_ASSIGNED}</div>
          )}
        </div>
      </td>

      {show_ato && (
        <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center">
          <AtoEditor 
            operator_id={operator.id} 
            operator_name={operator.nombre} 
            initial_ato={operator.ato || 4} 
          />
        </td>
      )}

      <td className="border-b border-r border-slate-200/50 p-2 align-middle">
        <IpMediator 
          operator_id={operator.id} 
          operator_name={operator.nombre} 
          team_members={team_members}
        />
      </td>

      <td className="border-b border-r border-slate-200/50 p-2 align-middle">
        <PreReqEditor operator_id={operator.id} operator_name={operator.nombre} team_name={operator.equipoAutonomo || STRINGS.NO_TEAM} />
      </td>

      <td className="border-b p-3 align-middle text-center">
        <div className={cn(
          "mx-auto flex w-16 flex-col items-center justify-center overflow-hidden rounded border border-[#1a4491] shadow-sm transition-all",
          autonomy_score === "4.00" && "animate-glow-gold scale-110"
        )}>
          <div className={cn(
            "w-full py-1 text-center text-[10px] font-bold leading-tight text-white uppercase",
            autonomy_score === "4.00" ? "bg-yellow-500" : "bg-[#1a4491]"
          )}>
            {STRINGS.AUTONOMY_LEVEL}
          </div>
          <div className="flex w-full items-center justify-center bg-white py-1.5 text-xl font-black text-[#1a4491]">
            {autonomy_score}
          </div>
        </div>
      </td>

    </motion.tr>
  );
}
