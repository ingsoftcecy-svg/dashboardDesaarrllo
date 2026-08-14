import { AlertTriangle, Wrench, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OperatorHistoryDialog } from "./operator_history_dialog";
import { TeamHistoryDialog } from "./team_history_dialog";
import { OperatorCoursesDialog } from "./operator_courses_dialog";
import type { Operator } from "@/data/ccz";
import { OperatorAvatar } from "./operator_avatar";
import { PreReqEditor } from "./pre_req_editor";
import { IpMediator } from "./ip_mediator";
import { MultiSkillEditor } from "./multi_skill_editor";
import { AtoEditor } from "./ato_editor";
import { get_capability_color, is_assessment_expired, get_initials } from "./utils";
import { CHAMPION_ICONS, STRINGS } from "./constants";
import { cn, getLeaderColor } from "@/lib/utils";
import { GuiasEditorDialog } from "./guias_editor_dialog";
import { OperatorBrechasDialog } from "./operator_brechas_dialog";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OperatorRowProps {
  operator: Operator & { autonomyScore: number };
  original_index: number;
  visual_index: number;
  show_ato?: boolean;
  team_members: { id: string, name: string }[];
  full_team_members?: { id: string; name: string; puesto: string; score: number; lastAssessmentDate?: string }[];
  puedeEditar?: boolean; // Nueva prop para controlar la edición
  teamRankings?: any[];
  metricMode?: "autonomia" | "cursos" | "guias" | "cierre-brecha";
}

const obtenerLogoFallbacks = (name: string): string[] => {
  const clean = name.trim().toUpperCase();
  if (!clean) return [];
  const list: string[] = [];

  list.push(clean);

  if (clean.startsWith("LOS ")) {
    list.push(clean.replace(/^LOS\s+/, ""));
  } else {
    list.push(`LOS ${clean}`);
  }

  if (clean.startsWith("EL ")) list.push(clean.replace(/^EL\s+/, ""));
  else if (clean.startsWith("LA ")) list.push(clean.replace(/^LA\s+/, ""));
  else if (clean.startsWith("LAS ")) list.push(clean.replace(/^LAS\s+/, ""));

  if (clean.includes("-")) {
    list.push(clean.replace(/-/g, " "));
  } else {
    if (clean.includes("MASH") || clean.includes("MOSTO")) {
      list.push(clean.replace(/\s+/g, "-"));
    }
  }

  if (clean === "LOS_BRAVOS" || clean === "BRAVOS" || clean === "LOS BRAVOS") {
    list.push("BRAVOS DEL FRIO");
  }
  if (clean === "LOS_FUERTES" || clean === "FUERTES" || clean === "LOS FUERTES") {
    list.push("LOS FUERTES DEL FRIO");
  }

  const unique = Array.from(new Set(list));
  return unique.map(item => `/logos/${item}.webp`);
};

export function OperatorRow({ operator, original_index, visual_index, show_ato = true, team_members, full_team_members = [], puedeEditar = false, teamRankings = [], metricMode = "autonomia" }: OperatorRowProps) {
  const teamData = (teamRankings || []).find(r => r.name.trim().toUpperCase() === operator.equipoAutonomo?.trim().toUpperCase());
  const autonomy_score_pct = `${operator.autonomyScore.toFixed(2)}%`;
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
  if (is_expired && metricMode === "autonomia") {
    row_class = "bg-red-50/50 hover:bg-red-100/80 border-l-4 border-l-red-500";
  } else if (podium_style) {
    row_class = cn(podium_style, original_index === 0 && "animate-glow-gold relative z-10");
  }

  const logo_fallbacks = operator.equipoAutonomo ? obtenerLogoFallbacks(operator.equipoAutonomo) : [];

  const handle_team_logo_error = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.currentTarget;
    const fallbacksStr = target.getAttribute("data-fallbacks");
    if (fallbacksStr) {
      const fallbacks = JSON.parse(fallbacksStr) as string[];
      const currentIndex = parseInt(target.getAttribute("data-index") || "0", 10);
      const nextIndex = currentIndex + 1;
      if (nextIndex < fallbacks.length) {
        target.setAttribute("data-index", String(nextIndex));
        target.src = fallbacks[nextIndex];
        return;
      }
    }
    
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
      <td className="border-b border-r border-slate-200/50 p-3 text-center align-middle font-black text-slate-400 w-16">
        {original_index + 1}
      </td>
      
      <td className="border-b border-r border-slate-200/50 p-3 align-middle w-64">
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
                  src={`/fotos/${operator.nombre.trim()}.webp?v=3`} 
                  alt={operator.nombre} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src.includes('.webp')) {
                      target.src = `/fotos/${operator.nombre.trim()}.jpeg?v=3`;
                      return;
                    } else if (!target.src.includes('.png')) {
                      target.src = `/fotos/${operator.nombre.trim()}.png?v=3`;
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
            <div className="flex items-start gap-2 text-sm font-bold text-slate-800 flex-wrap">
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
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-left hover:underline hover:text-[#1a4491] focus:outline-none cursor-pointer transition-colors leading-tight">
                    {operator.nombre}
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl sm:max-w-5xl bg-white p-6 rounded-2xl border-none shadow-2xl max-h-[92vh] flex flex-col overflow-y-auto custom-scrollbar">
                  <DialogTitle className="sr-only">Historial de {operator.nombre}</DialogTitle>
                  <DialogDescription className="sr-only">Detalles de evaluaciones históricas de {operator.nombre}</DialogDescription>
                  {metricMode === "cursos" ? (
                    <OperatorCoursesDialog 
                      operatorName={operator.nombre}
                      operatorId={operator.id}
                    />
                  ) : metricMode === "cierre-brecha" ? (
                    <OperatorBrechasDialog
                      operatorName={operator.nombre}
                      operatorId={operator.id}
                      brechasDetalle={operator.brechasDetalle || []}
                    />
                  ) : (
                    <OperatorHistoryDialog 
                      operatorName={operator.nombre} 
                      operatorId={operator.id} 
                      operatorPuesto={operator.puesto} 
                      metricMode={metricMode}
                      guiasProgress={operator.guiasProgress}
                      guiasL6Progress={operator.guiasL6Progress}
                      guiasL7Progress={operator.guiasL7Progress}
                      guiasL8Progress={operator.guiasL8Progress}
                      guiasActiveLevel={operator.guiasActiveLevel}
                    />
                  )}
                </DialogContent>
              </Dialog>
              {is_expired && metricMode === "autonomia" && (
                <div className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[8px] font-bold text-red-700 uppercase tracking-wider animate-pulse" title={`Más de 2 meses transcurridos desde la última evaluación (${operator.lastAssessmentDate})`}>
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {STRINGS.EXPIRED_ASSESSMENT}
                </div>
              )}
            </div>
            <div className="truncate text-[10px] font-semibold text-slate-500">{operator.puesto}</div>
            
            {/* Indicador Diseñador Chido: COMPETENTE vs MEJORADO */}
            {(() => {
              const opName = operator.nombre.toUpperCase();
              const isMejorado = (operator as any).tipoGuia === "MEJORADO" || 
                                (operator.guiasL7Progress && operator.guiasL7Progress > 0) || 
                                (operator.guiasL8Progress && operator.guiasL8Progress > 0) ||
                                opName.includes("MEJORADO");
              const isTecnico = (operator as any).tipoGuia === "TECNICO" ||
                                opName.includes("TECNICO") || opName.includes("TÉCNICO");
              return (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {operator.lider && (
                    <div className={cn("px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md border", getLeaderColor(operator.lider))}>
                      {STRINGS.LEADER_LABEL} {operator.lider}
                    </div>
                  )}
                  {metricMode === "guias" && (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider shadow-2xs border transition-all",
                      isMejorado
                        ? "bg-gradient-to-r from-purple-500/15 via-fuchsia-500/15 to-violet-500/10 text-purple-700 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.15)] hover:scale-105"
                        : isTecnico
                        ? "bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-orange-500/10 text-orange-700 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.15)] hover:scale-105"
                        : "bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/10 text-emerald-700 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)] hover:scale-105"
                    )}>
                      {isMejorado ? (
                        <>
                          <Sparkles className="h-2.5 w-2.5 text-purple-600 animate-pulse" />
                          <span>MEJORADO (L6-L8)</span>
                        </>
                      ) : isTecnico ? (
                        <>
                          <Wrench className="h-2.5 w-2.5 text-orange-600" />
                          <span>TÉCNICO (L6)</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                          <span>COMPETENTE (L6)</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </td>

      <td className="border-b border-r border-slate-200/50 p-3 align-middle text-center w-40">
        {operator.equipoAutonomo ? (
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center gap-1 mx-auto hover:opacity-85 active:scale-95 transition-all cursor-pointer focus:outline-none group">
                <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                  <img 
                    src={logo_fallbacks[0] || `/logos/${operator.equipoAutonomo.trim().toUpperCase()}.webp`} 
                    alt={operator.equipoAutonomo}
                    className="max-h-full max-w-full object-contain"
                    data-fallbacks={JSON.stringify(logo_fallbacks)}
                    data-index="0"
                    onError={handle_team_logo_error}
                  />
                </div>
                <span className="text-[9px] font-bold text-[#1a4491] uppercase hover:underline leading-tight max-w-[100px] truncate block mt-0.5">
                  {operator.equipoAutonomo}
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl sm:max-w-5xl bg-white p-6 rounded-2xl border-none shadow-2xl max-h-[92vh] flex flex-col overflow-y-auto custom-scrollbar">
              <DialogTitle className="sr-only">Desempeño de Equipo: {operator.equipoAutonomo}</DialogTitle>
              <DialogDescription className="sr-only">Información histórica y de progreso del equipo {operator.equipoAutonomo}</DialogDescription>
              <TeamHistoryDialog 
                teamName={operator.equipoAutonomo} 
                members={full_team_members} 
                autonomyFactors={teamData?.autonomyFactors}
                faseActual={teamData?.faseActual}
                fase2026={teamData?.fase2026}
                fechaCompromiso={teamData?.fechaCompromiso}
                metricMode={metricMode}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <span className="text-slate-400 italic font-normal text-[10px]">{STRINGS.NO_TEAM}</span>
        )}
      </td>

      {metricMode === "guias" ? (
        <>
          {/* L6 Column */}
          <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-32 font-black text-xs text-slate-700">
            <span className={cn(
              "px-2.5 py-1 rounded font-bold tabular-nums min-w-[48px] text-center shadow-sm text-xs border inline-block",
              operator.guiasL6Progress === 100 
                ? "bg-yellow-50 text-yellow-600 border-yellow-200" 
                : (operator.guiasL6Progress ?? 0) >= 80 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : (operator.guiasL6Progress ?? 0) >= 50 
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : (operator.guiasL6Progress ?? 0) > 0
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
            )}>
              {operator.guiasL6Progress !== undefined ? `${operator.guiasL6Progress.toFixed(1)}%` : "0.0%"}
            </span>
          </td>

          {/* L7 Column */}
          <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-32 font-black text-xs text-slate-700">
            {(() => {
              const isMejorado = (operator as any).tipoGuia === "MEJORADO" || (operator.guiasL7Progress && operator.guiasL7Progress > 0) || (operator.guiasL8Progress && operator.guiasL8Progress > 0);
              return !isMejorado ? (
                <span className="px-2.5 py-1 rounded font-bold text-center shadow-sm text-xs border inline-block bg-slate-100 text-slate-400 border-slate-200 uppercase tracking-wider">
                  N/A
                </span>
              ) : (
                <span className={cn(
                  "px-2.5 py-1 rounded font-bold tabular-nums min-w-[48px] text-center shadow-sm text-xs border inline-block",
                  operator.guiasL7Progress === 100 
                    ? "bg-yellow-50 text-yellow-600 border-yellow-200" 
                    : (operator.guiasL7Progress ?? 0) >= 80 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : (operator.guiasL7Progress ?? 0) >= 50 
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : (operator.guiasL7Progress ?? 0) > 0
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                )}>
                  {operator.guiasL7Progress !== undefined ? `${operator.guiasL7Progress.toFixed(1)}%` : "0.0%"}
                </span>
              );
            })()}
          </td>

          {/* L8 Column */}
          <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-32 font-black text-xs text-slate-700">
            {(() => {
              const isMejorado = (operator as any).tipoGuia === "MEJORADO" || (operator.guiasL7Progress && operator.guiasL7Progress > 0) || (operator.guiasL8Progress && operator.guiasL8Progress > 0);
              return !isMejorado ? (
                <span className="px-2.5 py-1 rounded font-bold text-center shadow-sm text-xs border inline-block bg-slate-100 text-slate-400 border-slate-200 uppercase tracking-wider">
                  N/A
                </span>
              ) : (
                <span className={cn(
                  "px-2.5 py-1 rounded font-bold tabular-nums min-w-[48px] text-center shadow-sm text-xs border inline-block",
                  operator.guiasL8Progress === 100 
                    ? "bg-yellow-50 text-yellow-600 border-yellow-200" 
                    : (operator.guiasL8Progress ?? 0) >= 80 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : (operator.guiasL8Progress ?? 0) >= 50 
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : (operator.guiasL8Progress ?? 0) > 0
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                )}>
                  {operator.guiasL8Progress !== undefined ? `${operator.guiasL8Progress.toFixed(1)}%` : "0.0%"}
                </span>
              );
            })()}
          </td>
        </>
      ) : metricMode === "cierre-brecha" ? (
        <>
          {/* HABILIDADES */}
          <td className="border-b border-r border-slate-200/50 p-3 align-middle w-48 bg-slate-50/30">
            <div className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center justify-between">
                <span>{STRINGS.DRIVERS_LICENSE}</span>
                <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", get_capability_color(operator.basico))}>
                  {operator.basico > 0 ? Math.round(operator.basico) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{STRINGS.INTERMEDIATE}</span>
                <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", get_capability_color(operator.intermedio))}>
                  {operator.intermedio > 0 ? Math.round(operator.intermedio) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{STRINGS.ADVANCED}</span>
                <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", get_capability_color(operator.avanzado))}>
                  {operator.avanzado > 0 ? Math.round(operator.avanzado) : "-"}
                </span>
              </div>
            </div>
          </td>
          {/* MULTI-HABILIDAD */}
          <td className="border-b border-r border-slate-200/50 p-2 align-middle w-48 bg-slate-50/30">
            <MultiSkillEditor 
              operator_id={operator.id} 
              operator_name={operator.nombre} 
              equipos={operator.equipos || []} 
              puedeEditar={puedeEditar}
            />
          </td>
          {/* TOTAL */}
          <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-28">
            <span className="px-2.5 py-1 rounded font-black text-sm bg-slate-100 text-slate-700 border border-slate-200 shadow-sm min-w-[36px] inline-block tabular-nums">
              {operator.brechasTotal ?? 0}
            </span>
          </td>
          {/* COMPLETADAS */}
          <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-28">
            <span className="px-2.5 py-1 rounded font-black text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm min-w-[36px] inline-block tabular-nums">
              {operator.brechasCompletadas ?? 0}
            </span>
          </td>
          {/* EN PROCESO */}
          <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-28">
            <span className={cn(
              "px-2.5 py-1 rounded font-black text-sm shadow-sm min-w-[36px] inline-block border tabular-nums",
              (operator.brechasEnProceso ?? 0) > 0 ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-slate-50 text-slate-400 border-slate-200"
            )}>
              {operator.brechasEnProceso ?? 0}
            </span>
          </td>
          {/* PROGRESO DE CIERRE - with stacked bar */}
          <td className="border-b border-r border-slate-200/50 p-2 align-middle w-44">
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full flex flex-col items-center gap-1.5 focus:outline-none hover:bg-slate-50/50 p-2 rounded transition-colors cursor-pointer group active:scale-95 duration-200">
                  <span className={cn(
                    "text-sm font-black tabular-nums group-hover:scale-105 transition-transform",
                    (operator.brechasProgress ?? 0) === 100 
                      ? "text-yellow-600 drop-shadow-sm" 
                      : (operator.brechasProgress ?? 0) >= 80 
                        ? "text-emerald-700" 
                        : (operator.brechasProgress ?? 0) >= 50 
                          ? "text-amber-600"
                          : (operator.brechasProgress ?? 0) > 0
                            ? "text-blue-600"
                            : "text-slate-400"
                  )}>
                    {operator.brechasProgress !== undefined ? `${operator.brechasProgress.toFixed(1)}%` : "0.0%"}
                  </span>
                  {/* Stacked progress bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex group-hover:shadow-inner transition-shadow">
                    {(operator.brechasTotal ?? 0) > 0 && (
                      <>
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500" 
                          style={{ width: `${((operator.brechasCompletadas ?? 0) / (operator.brechasTotal ?? 1)) * 100}%` }} 
                        />
                        <div 
                          className="h-full bg-amber-400 transition-all duration-500" 
                          style={{ width: `${((operator.brechasEnProceso ?? 0) / (operator.brechasTotal ?? 1)) * 100}%` }} 
                        />
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 mt-0.5">
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />OK</span>
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />PROC</span>
                  </div>
                  <span className="text-[7px] font-black uppercase text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1">
                    Ver Detalles
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-white p-6 rounded-2xl border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <DialogTitle className="sr-only">Brechas de {operator.nombre}</DialogTitle>
                <DialogDescription className="sr-only">Detalle de cierre de brechas de {operator.nombre}</DialogDescription>
                <OperatorBrechasDialog 
                  operatorName={operator.nombre}
                  operatorId={operator.id}
                  brechasDetalle={operator.brechasDetalle || []}
                />
              </DialogContent>
            </Dialog>
          </td>
          {/* FOCO PRINCIPAL (PILAR) */}
          <td className="border-b border-slate-200/50 p-2 align-middle text-center w-40">
            {(() => {
              const brechas = operator.brechasDetalle || [];
              const activas = brechas.filter(b => b.estado === "En Proceso");
              
              if (activas.length === 0) return <span className="text-slate-400 text-[10px] italic">Sin brechas</span>;
              
              const counts: Record<string, number> = {};
              activas.forEach(b => {
                if (b.pilar) {
                  counts[b.pilar] = (counts[b.pilar] || 0) + 1;
                }
              });
              
              if (Object.keys(counts).length === 0) return <span className="text-slate-400 text-[10px] italic">N/A</span>;
              
              const topPilar = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
              
              return (
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold uppercase text-center leading-tight shadow-sm max-w-[130px] truncate" title={topPilar[0]}>
                    {topPilar[0]}
                  </span>
                  <span className="text-[8px] font-black text-slate-400">{topPilar[1]} abierta{topPilar[1] > 1 ? 's' : ''}</span>
                </div>
              );
            })()}
          </td>
        </>
      ) : (
        <>
          <td className="border-b border-r border-slate-200/50 p-3 align-middle w-48">
            <div className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center justify-between">
                <span>{STRINGS.DRIVERS_LICENSE}</span>
                <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", get_capability_color(operator.basico))}>
                  {operator.basico > 0 ? Math.round(operator.basico) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{STRINGS.INTERMEDIATE}</span>
                <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", get_capability_color(operator.intermedio))}>
                  {operator.intermedio > 0 ? Math.round(operator.intermedio) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{STRINGS.ADVANCED}</span>
                <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", get_capability_color(operator.avanzado))}>
                  {operator.avanzado > 0 ? Math.round(operator.avanzado) : "-"}
                </span>
              </div>
            </div>
          </td>
          {metricMode === "autonomia" && (
            <td className="border-b border-r border-slate-200/50 p-3 align-middle text-center w-40">
              {(() => {
              const evals = operator.evaluacionesDetalle && operator.evaluacionesDetalle.length > 0
                ? operator.evaluacionesDetalle
                : (operator.equipos && operator.equipos.length > 1
                  ? operator.equipos.map(eq => ({ puesto: eq, score: operator.autonomyScore }))
                  : []);
              const numEvals = evals.length;
              const esMultihabilidad = numEvals > 1;

              return (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "mx-auto flex w-24 flex-col items-center justify-center overflow-hidden rounded border transition-all cursor-pointer group shadow-sm",
                        esMultihabilidad ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-300" : "border-[#1a4491]",
                        operator.autonomyScore === 100 && "animate-glow-gold scale-105"
                      )}>
                        <div className={cn(
                          "w-full py-1 text-center text-[7.5px] font-black leading-none text-white uppercase tracking-tighter px-0.5 flex items-center justify-center gap-0.5",
                          operator.autonomyScore === 100 ? "bg-yellow-500" : "bg-[#1a4491]"
                        )}>
                          {esMultihabilidad ? `PRINCIPAL (${numEvals} POS)` : STRINGS.AUTONOMY_LEVEL}
                        </div>
                        <div className="flex w-full flex-col items-center justify-center bg-white py-1 text-[#1a4491] min-h-[38px]">
                          {operator.noEvaluado ? (
                            <div className="flex flex-col items-center justify-center leading-none">
                              <span className="text-xs font-black text-slate-400">0.00%</span>
                              <span className="text-[6.5px] text-rose-500 font-black uppercase tracking-widest mt-0.5 whitespace-nowrap">Sin Evaluar</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-black text-[#1a4491]">{autonomy_score_pct}</span>
                              {esMultihabilidad && (
                                <span className="text-[7.5px] font-black text-blue-900 uppercase tracking-tight leading-none mt-0.5 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                  Principal
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    {esMultihabilidad && (
                      <TooltipContent side="top" className="bg-[#0b1329] text-white p-3.5 rounded-xl border border-blue-800 shadow-2xl max-w-sm space-y-2.5 z-50">
                        <div className="border-b border-blue-900 pb-2 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1">
                            📊 Score Principal (Multihabilidad)
                          </span>
                          <span className="text-[9px] font-extrabold bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded border border-blue-700">
                            {numEvals} Posiciones
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-200 font-medium leading-normal">
                          El puntaje mostrado (<strong className="text-yellow-400 font-bold">{autonomy_score_pct}</strong>) es el de su <strong className="text-white font-bold">habilidad principal</strong> ({operator.puesto || "N/A"}). Evaluaciones en cada puesto:
                        </p>
                        <div className="space-y-1.5 pt-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                          {evals.map((ev: any, idx) => (
                            <div key={idx} className="bg-blue-950/80 border border-blue-900/80 p-2 rounded-lg space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-bold text-white uppercase">
                                <span className="truncate max-w-[190px]">{ev.puesto}</span>
                                <span className="text-yellow-400 font-black text-xs tabular-nums">{ev.score.toFixed(2)}%</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-300 border-t border-blue-900/40 pt-1 mt-0.5">
                                <div><span className="text-slate-300 block text-[7.5px] uppercase font-semibold">Driver's License</span> <strong className="text-sky-300 font-bold">{ev.basico !== undefined ? Math.round(ev.basico) : "-"}%</strong></div>
                                <div><span className="text-slate-300 block text-[7.5px] uppercase font-semibold">Intermedio</span> <strong className="text-sky-300 font-bold">{ev.intermedio !== undefined ? Math.round(ev.intermedio) : "-"}%</strong></div>
                                <div><span className="text-slate-300 block text-[7.5px] uppercase font-semibold">Avanzado</span> <strong className="text-sky-300 font-bold">{ev.avanzado !== undefined ? Math.round(ev.avanzado) : "-"}%</strong></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[8.5px] text-blue-200 italic pt-1 border-t border-blue-900/60 text-center">
                          💡 Refleja el nivel de autonomía integral del colaborador multifuncional.
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })()}
          </td>
        )}

          <td className="border-b border-r border-slate-200/50 p-2 align-middle w-48">
            <MultiSkillEditor 
              operator_id={operator.id} 
              operator_name={operator.nombre} 
              equipos={operator.equipos || []} 
              puedeEditar={puedeEditar}
            />
          </td>

          {metricMode === "autonomia" && (
            <td className="border-b border-r border-slate-200/50 p-2 align-middle w-28">
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
          )}

          {show_ato && (() => {
            const areaStr = ((operator as any)._area || (operator as any).area || (operator as any).equipoAutonomo || (operator as any).equipo || "").toLowerCase();
            const teamStr = ((operator as any).equipoAutonomo || (operator as any).equipo || "").toLowerCase();
            const opNameStr = (operator.nombre || "").toLowerCase();
            const puestoStr = ((operator as any).puesto || "").toLowerCase();

            const isMantenimientoArea = 
              areaStr.includes("mantenimiento") || 
              areaStr.includes("brewing maintenance") || 
              areaStr.includes("maintenance") ||
              teamStr.includes("nahual") ||
              teamStr.includes("munich") ||
              puestoStr.includes("técnico") ||
              puestoStr.includes("tecnico");

            if (isMantenimientoArea) {
              return (
                <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-32">
                  <div className="mx-auto flex w-full max-w-[100px] flex-col overflow-hidden rounded border border-[#1a4491] shadow-sm select-none opacity-80">
                    <div className="bg-[#1a4491] py-0.5 text-[10px] font-bold text-white uppercase text-center">
                      ATO
                    </div>
                    <div className="flex h-10 items-center justify-center bg-slate-200 text-sm font-black text-slate-600">
                      N/A
                    </div>
                  </div>
                </td>
              );
            }

            const isCocimientosArea = 
              areaStr.includes("warm") || 
              areaStr.includes("cocimiento") || 
              teamStr.includes("cuchilla") || 
              teamStr.includes("eac") || 
              teamStr.includes("eabf") || 
              teamStr.includes("bpre");

            const isBloqueFrioArea = 
              areaStr.includes("cold") || 
              areaStr.includes("frio") || 
              areaStr.includes("frío") ||
              teamStr.includes("bravos") ||
              teamStr.includes("fuertes") ||
              teamStr.includes("reyes") ||
              teamStr.includes("loros");

            let calculatedAto = 4;

            if (isCocimientosArea) {
              const isCuchillas = teamStr.includes("cuchilla") || opNameStr.includes("cuchilla");
              calculatedAto = isCuchillas ? 3 : 2;
            } else if (isBloqueFrioArea) {
              const isSpecialBFTeam = 
                teamStr.includes("bravos") || 
                teamStr.includes("fuertes") || 
                teamStr.includes("reyes") ||
                opNameStr.includes("bravos") ||
                opNameStr.includes("fuertes") ||
                opNameStr.includes("reyes");
              calculatedAto = isSpecialBFTeam ? 3 : 2;
            } else {
              calculatedAto = operator.ato || 4;
            }

            return (
              <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-32">
                <AtoEditor 
                  operator_id={operator.id} 
                  operator_name={operator.nombre} 
                  initial_ato={calculatedAto} 
                  puedeEditar={puedeEditar}
                />
              </td>
            );
          })()}

          <td className="border-b border-r border-slate-200/50 p-2 align-middle w-44">
            <IpMediator 
              operator_id={operator.id} 
              operator_name={operator.nombre} 
              team_members={team_members}
              puedeEditar={puedeEditar}
              area={(operator as any)._area || (operator as any).area || (operator as any).equipo}
            />
          </td>

          {metricMode === "autonomia" && (
            <td className="border-b border-r border-slate-200/50 p-2 align-middle w-64">
              <PreReqEditor 
                operator_id={operator.id}
                operator_name={operator.nombre} 
                team_name={operator.equipoAutonomo || STRINGS.NO_TEAM} 
                puedeEditar={puedeEditar}
              />
            </td>
          )}
        </>
      )}

      {metricMode !== "autonomia" && (
        <>
          {metricMode === "cursos" && (
            <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-32">
              <div className="flex flex-col items-center justify-center gap-1">
                <span className="font-black text-slate-700 text-xl leading-none">{operator.cursosTotal || 0}</span>
                {(operator.cursosTotal || 0) > 0 && (
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                    <span className="text-emerald-600 flex items-center gap-0.5" title="Aprobados">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      {operator.cursosAprobados || 0}
                    </span>
                    <span className="text-blue-600 flex items-center gap-0.5" title="En Progreso">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      {operator.cursosEnProgreso || 0}
                    </span>
                    <span className="text-slate-400 flex items-center gap-0.5" title="Pendientes">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      {operator.cursosPendientes || 0}
                    </span>
                  </div>
                )}
              </div>
            </td>
          )}
          <td className="border-b p-3 align-middle text-center w-40">
            {metricMode === "cursos" ? (() => {
          const progress = operator.cursosProgress ?? 0;
          let colorHeader = "bg-[#1a4491]";
          let colorBorder = "border-[#1a4491]";
          let colorText = "text-[#1a4491]";

          if ((operator.cursosTotal ?? 0) > 0) {
            if (progress === 100) {
              colorHeader = "bg-yellow-500";
              colorBorder = "border-yellow-500";
              colorText = "text-yellow-600";
            } else if (progress >= 80) {
              colorHeader = "bg-emerald-600";
              colorBorder = "border-emerald-600";
              colorText = "text-emerald-700";
            } else if (progress >= 50) {
              colorHeader = "bg-amber-500";
              colorBorder = "border-amber-500";
              colorText = "text-amber-600";
            } else {
              colorHeader = "bg-rose-600";
              colorBorder = "border-rose-600";
              colorText = "text-rose-700";
            }
          }

          return (
            <div 
              title={`Aprobados: ${operator.cursosAprobados || 0} / ${operator.cursosTotal || 0}\nEn progreso: ${operator.cursosEnProgreso || 0}\nPendientes: ${operator.cursosPendientes || 0}`}
              className={cn(
                "mx-auto flex w-20 flex-col items-center justify-center overflow-hidden rounded border shadow-sm transition-all cursor-help hover:scale-105 active:scale-95 duration-200",
                colorBorder,
                progress === 100 && "animate-glow-gold scale-110"
              )}
            >
              <div className={cn(
                "w-full py-1 text-center text-[9px] font-bold leading-tight text-white uppercase tracking-wider",
                colorHeader
              )}>
                PROGRESO
              </div>
              <div className={cn("flex w-full items-center justify-center bg-white py-1 min-h-[36px]", colorText)}>
                {operator.cursosTotal === 0 ? (
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Sin Cursos</span>
                  </div>
                ) : (
                  <span className="text-sm font-black tabular-nums">{progress}%</span>
                )}
              </div>
            </div>
          );
        })() : metricMode === "guias" ? (() => {
          const progress = operator.guiasProgress ?? 0;
          const level = (operator as any).tipoGuia || "L6";
          let colorHeader = "bg-slate-500";
          let colorBorder = "border-slate-500";
          let colorText = "text-slate-700";

          if (progress === 100) {
            colorHeader = "bg-yellow-500";
            colorBorder = "border-yellow-500";
            colorText = "text-yellow-600";
          } else if (progress >= 80) {
            colorHeader = "bg-emerald-600";
            colorBorder = "border-emerald-600";
            colorText = "text-emerald-700";
          } else if (progress >= 50) {
            colorHeader = "bg-amber-500";
            colorBorder = "border-amber-500";
            colorText = "text-amber-600";
          } else if (progress > 0) {
            colorHeader = "bg-blue-600";
            colorBorder = "border-blue-600";
            colorText = "text-blue-700";
          }

          const badgeEl = (
            <div 
              title={`Nivel: ${level}\nProgreso: ${progress}%`}
              className={cn(
                "mx-auto flex w-20 flex-col items-center justify-center overflow-hidden rounded border shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200 group",
                colorBorder,
                progress === 100 && "animate-glow-gold scale-110"
              )}
            >
              <div className={cn(
                "w-full py-1 text-center text-[10px] font-black leading-tight text-white uppercase tracking-widest",
                colorHeader
              )}>
                TOTAL
              </div>
              <div className={cn("flex w-full items-center justify-center bg-white py-1 min-h-[30px]", colorText)}>
                <span className="text-xs font-black tabular-nums">{progress.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-slate-50 border-t border-slate-100 py-0.5 text-center text-[7px] font-black uppercase text-slate-400 tracking-wider group-hover:text-[#1a4491] group-hover:bg-slate-100 transition-all">
                ver detalles
              </div>
            </div>
          );

          return (
            <Dialog>
              <DialogTrigger asChild>
                <button className="focus:outline-none block mx-auto">{badgeEl}</button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-white p-6 rounded-2xl border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <DialogTitle className="sr-only">Guías Técnicas de {operator.nombre}</DialogTitle>
                <DialogDescription className="sr-only">Checklist y evaluaciones de guías técnicas para {operator.nombre}</DialogDescription>
                <GuiasEditorDialog 
                  operator={operator}
                  puedeEditar={puedeEditar}
                />
              </DialogContent>
            </Dialog>
          );
        })() : null}
      </td>
        </>
      )}

    </motion.tr>
  );
}
