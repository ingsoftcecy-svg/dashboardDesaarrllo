import { AlertTriangle, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OperatorHistoryDialog } from "./operator_history_dialog";
import { TeamHistoryDialog } from "./team_history_dialog";
import { OperatorCoursesDialog } from "./operator_courses_dialog";
import type { Operator } from "@/data/zeus";
import { OperatorAvatar } from "./operator_avatar";
import { PreReqEditor } from "./pre_req_editor";
import { IpMediator } from "./ip_mediator";
import { MultiSkillEditor } from "./multi_skill_editor";
import { AtoEditor } from "./ato_editor";
import { get_capability_color, is_assessment_expired, get_initials } from "./utils";
import { CHAMPION_ICONS, STRINGS } from "./constants";
import { cn, getLeaderColor } from "@/lib/utils";
import { GuiasEditorDialog } from "./guias_editor_dialog";

interface OperatorRowProps {
  operator: Operator & { autonomyScore: number };
  original_index: number;
  visual_index: number;
  show_ato?: boolean;
  team_members: { id: string, name: string }[];
  full_team_members?: { id: string; name: string; puesto: string; score: number; lastAssessmentDate?: string }[];
  puedeEditar?: boolean; // Nueva prop para controlar la edición
  teamRankings?: any[];
  metricMode?: "autonomia" | "cursos" | "guias";
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
  return unique.map(item => `/logos/${item}.png`);
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
                  src={`/fotos/${operator.nombre.trim()}.jpeg?v=2`} 
                  alt={operator.nombre} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.src.includes('.png')) {
                      target.src = `/fotos/${operator.nombre.trim()}.png?v=2`;
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
                <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl border-none shadow-2xl overflow-hidden">
                  <DialogTitle className="sr-only">Historial de {operator.nombre}</DialogTitle>
                  <DialogDescription className="sr-only">Detalles de evaluaciones históricas de {operator.nombre}</DialogDescription>
                  {metricMode === "cursos" ? (
                    <OperatorCoursesDialog 
                      operatorName={operator.nombre}
                      operatorId={operator.id}
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

      <td className="border-b border-r border-slate-200/50 p-3 align-middle text-center w-40">
        {operator.equipoAutonomo ? (
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center gap-1 mx-auto hover:opacity-85 active:scale-95 transition-all cursor-pointer focus:outline-none group">
                <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                  <img 
                    src={logo_fallbacks[0] || `/logos/${operator.equipoAutonomo.trim().toUpperCase()}.png`} 
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
            <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl border-none shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
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
          </td>

          {/* L8 Column */}
          <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-32 font-black text-xs text-slate-700">
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
          </td>
        </>
      ) : (
        <>
          <td className="border-b border-r border-slate-200/50 p-2 align-middle w-48">
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

          {show_ato && (
            <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center w-32">
              <AtoEditor 
                operator_id={operator.id} 
                operator_name={operator.nombre} 
                initial_ato={operator.ato || 4} 
                puedeEditar={puedeEditar}
              />
            </td>
          )}

          <td className="border-b border-r border-slate-200/50 p-2 align-middle w-44">
            <IpMediator 
              operator_id={operator.id} 
              operator_name={operator.nombre} 
              team_members={team_members}
              puedeEditar={puedeEditar}
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

      <td className="border-b p-3 align-middle text-center w-40">
        {metricMode === "autonomia" ? (
          <div className={cn(
            "mx-auto flex w-16 flex-col items-center justify-center overflow-hidden rounded border border-[#1a4491] shadow-sm transition-all",
            operator.autonomyScore === 100 && "animate-glow-gold scale-110"
          )}>
            <div className={cn(
              "w-full py-1 text-center text-[10px] font-bold leading-tight text-white uppercase",
              operator.autonomyScore === 100 ? "bg-yellow-500" : "bg-[#1a4491]"
            )}>
              {STRINGS.AUTONOMY_LEVEL}
            </div>
            <div className="flex w-full items-center justify-center bg-white py-1 text-[#1a4491] min-h-[36px]">
              {operator.noEvaluado ? (
                <div className="flex flex-col items-center justify-center leading-none">
                  <span className="text-xs font-black text-slate-400">0.00%</span>
                  <span className="text-[6.5px] text-rose-500 font-black uppercase tracking-widest mt-0.5 whitespace-nowrap">Sin Evaluar</span>
                </div>
              ) : (
                <span className="text-xs font-black">{autonomy_score_pct}</span>
              )}
            </div>
          </div>
        ) : metricMode === "cursos" ? (() => {
          const progress = operator.cursosProgress ?? 0;
          let colorHeader = "bg-[#1a4491]";
          let colorBorder = "border-[#1a4491]";
          let colorText = "text-[#1a4491]";

          if (operator.cursosTotal > 0) {
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

          const badgeEl = (
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

          return badgeEl;
        })() : (() => {
          const progress = operator.guiasProgress ?? 0;
          const level = operator.guiasActiveLevel || "L6";
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
                "mx-auto flex w-20 flex-col items-center justify-center overflow-hidden rounded border shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200",
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
              <div className={cn("flex w-full items-center justify-center bg-white py-1 min-h-[36px]", colorText)}>
                <span className="text-xs font-black tabular-nums">{progress.toFixed(2)}%</span>
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
        })()}
      </td>

    </motion.tr>
  );
}
