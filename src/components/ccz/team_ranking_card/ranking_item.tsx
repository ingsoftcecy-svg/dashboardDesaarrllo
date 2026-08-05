import { useState, useEffect } from "react";
import { Trophy, Shield, AlertCircle, Edit2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { get_initials } from "./utils";
import { STRINGS } from "./constants";
import { LeaderAvatar } from "./leader_avatar";
import { TeamHistoryDialog } from "../physical_board/team_history_dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LeaderCombobox } from "../team_header/leader_combobox";


interface TeamRanking {
  name: string;
  avg: number;
  leader?: string;
  faseActual?: string;
  fase2026?: number;
  fechaCompromiso?: string;
  autonomyFactors?: any;
}

interface RankingItemProps {
  team: TeamRanking;
  index: number;
  is_best: boolean;
  is_worst: boolean;
  operadores?: any[];
  metricMode?: "autonomia" | "cursos" | "guias";
}

/**
 * RankingItem: Representa una fila individual en la lista del ranking de equipos.
 * Integra validación de roles (admin) para permitir la modificación manual del líder
 * del equipo asociado, guardando los cambios asíncronamente en Firestore.
 */
export function RankingItem({ team, index, is_best, is_worst, operadores = [], metricMode = "autonomia" }: RankingItemProps) {
  const auth = useAuth();
  const is_admin = auth?.rol === "admin";
  const [editingLeader, setEditingLeader] = useState(false);
  const [localLeader, setLocalLeader] = useState(team.leader || "N/A");
  const [newLeader, setNewLeader] = useState(localLeader);

  const [dialogImageSrc, setDialogImageSrc] = useState("");
  const [dialogFallbackIndex, setDialogFallbackIndex] = useState(0);

  const get_dialog_fallbacks = (name: string): string[] => {
    const clean = name.trim();
    if (!clean) return [];
    const parts = clean.split(/\s+/);
    const list: string[] = [];

    // 1. Full name
    list.push(`${clean}.webp`);
    list.push(`${clean}.jpeg`);
    list.push(`${clean}.png`);

    if (parts.length >= 3) {
      // 2. Omit second surname (last word)
      const omitLast = parts.slice(0, -1).join(" ");
      list.push(`${omitLast}.webp`);
      list.push(`${omitLast}.jpeg`);
      list.push(`${omitLast}.png`);
    }

    if (parts.length >= 4) {
      // 3. First name + First surname (e.g. "RAUL DAVID CORTES ALANIZ" -> "RAUL CORTES")
      const firstAndThird = `${parts[0]} ${parts[2]}`;
      list.push(`${firstAndThird}.webp`);
      list.push(`${firstAndThird}.jpeg`);
      list.push(`${firstAndThird}.png`);
    }

    if (parts.length >= 2) {
      // 4. First name + Second word
      const firstTwo = `${parts[0]} ${parts[1]}`;
      list.push(`${firstTwo}.webp`);
      list.push(`${firstTwo}.jpeg`);
      list.push(`${firstTwo}.png`);
      
      // 5. First + Last
      const firstAndLast = `${parts[0]} ${parts[parts.length - 1]}`;
      list.push(`${firstAndLast}.webp`);
      list.push(`${firstAndLast}.jpeg`);
      list.push(`${firstAndLast}.png`);
    }

    return list.map(filename => `/fotos/${filename}?t=${Date.now()}`);
  };

  const dialogFallbacks = team.leader ? get_dialog_fallbacks(team.leader) : [];

  useEffect(() => {
    setLocalLeader(team.leader || "N/A");
    setNewLeader(team.leader || "N/A");

    if (dialogFallbacks.length > 0) {
      setDialogImageSrc(dialogFallbacks[0]);
      setDialogFallbackIndex(0);
    } else {
      setDialogImageSrc("");
    }
  }, [team.leader]);

  const handleSaveLeader = async () => {
    if (!team.name) return;
    try {
      await setDoc(doc(db, "team_overrides", team.name), { leader: newLeader });
      setLocalLeader(newLeader);
      setEditingLeader(false);
    } catch (e) {
      console.error("Error saving new leader:", e);
    }
  };
  const members = (operadores || [])
    .filter(op => op.equipoAutonomo && op.equipoAutonomo.trim().toUpperCase() === team.name.trim().toUpperCase())
    .map(op => ({
      id: op.id,
      name: op.nombre,
      puesto: op.puesto,
      score: op.autonomyScore,
      lastAssessmentDate: op.lastAssessmentDate,
      noEvaluado: op.noEvaluado,
      cursosProgress: op.cursosProgress,
      cursosAprobados: op.cursosAprobados,
      cursosTotal: op.cursosTotal,
      cursosEnProgreso: op.cursosEnProgreso,
      cursosPendientes: op.cursosPendientes,
      guiasProgress: op.guiasProgress,
      guiasL6Progress: op.guiasL6Progress,
      guiasL7Progress: op.guiasL7Progress,
      guiasL8Progress: op.guiasL8Progress,
      guiasActiveLevel: op.guiasActiveLevel
    }));
  const handle_dialog_image_error = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const nextIndex = dialogFallbackIndex + 1;
    if (nextIndex < dialogFallbacks.length) {
      setDialogFallbackIndex(nextIndex);
      setDialogImageSrc(dialogFallbacks[nextIndex]);
    } else {
      const target = event.currentTarget;
      target.style.display = 'none';
      if (target.nextElementSibling) {
        (target.nextElementSibling as HTMLElement).style.display = 'flex';
      }
    }
  };

  return (
    <Dialog>
      <div 
        className={cn(
          "flex items-center justify-between rounded-lg border p-2 transition-all",
          is_best ? "border-yellow-200 bg-yellow-50/50" : 
          is_worst ? "border-rose-200 bg-rose-50/50" : 
          "border-slate-100 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-200"
        )}
      >
        <DialogTrigger asChild>
          <button className="flex flex-1 items-center gap-2.5 min-w-0 text-left focus:outline-none hover:opacity-90 transition-opacity cursor-pointer group">
            <div className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm",
              is_best ? "bg-yellow-400 text-yellow-900" : 
              index === 1 ? "bg-slate-300 text-slate-800" :
              index === 2 ? "bg-amber-600 text-amber-50" :
              "bg-slate-200 text-slate-600"
            )}>
              {index + 1}
            </div>

            <div className="shrink-0 transition-transform group-hover:scale-105">
              <LeaderAvatar leader={team.leader} is_best={is_best} is_worst={is_worst} />
            </div>

            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-800 truncate uppercase leading-tight block text-left group-hover:text-[#1a4491] group-hover:underline">
                {team.name}
              </span>
              {!editingLeader && (
                <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 truncate leading-tight mt-0.5">
                  <span>{STRINGS.LEADER_LABEL} {localLeader}</span>
                </div>
              )}
            </div>
          </button>
        </DialogTrigger>

        {editingLeader ? (
          <div className="flex items-center gap-1 mt-1 ml-2">
            <LeaderCombobox 
              value={newLeader} 
              onChange={setNewLeader} 
              operadores={operadores} 
            />
            <button onClick={(e) => { e.stopPropagation(); handleSaveLeader(); }} className="text-emerald-500 hover:text-emerald-600 bg-emerald-50 rounded p-0.5 cursor-pointer"><Check className="w-3 h-3"/></button>
            <button onClick={(e) => { e.stopPropagation(); setEditingLeader(false); setNewLeader(localLeader); }} className="text-rose-500 hover:text-rose-600 bg-rose-50 rounded p-0.5 cursor-pointer"><X className="w-3 h-3"/></button>
          </div>
        ) : (
          !editingLeader && is_admin && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setEditingLeader(true); 
              }} 
              className="hover:text-[#1a4491] hover:scale-110 active:scale-95 transition-all p-1 text-slate-400 cursor-pointer ml-1" 
              title="Editar Líder"
            >
              <Edit2 className="w-2.5 h-2.5" />
            </button>
          )
        )}

        <DialogTrigger asChild>
          <button className="flex shrink-0 flex-col items-end justify-center ml-2 focus:outline-none hover:opacity-90 transition-opacity cursor-pointer">
            {team.faseActual && (
              <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider mb-1.5 leading-none">
                {team.faseActual.toUpperCase().includes("F") ? `FASE ${team.faseActual.replace(/\D/g, "")}` : `FASE ${team.faseActual}`}
              </span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold shadow-sm",
                    is_best ? "bg-yellow-100 text-yellow-800 border border-yellow-200" : 
                    is_worst ? "bg-rose-100 text-rose-800 border border-rose-200" :
                    "bg-blue-50 text-blue-800 border border-blue-100"
                  )}>
                    {is_best ? <Trophy className="h-3 w-3" /> : is_worst ? <AlertCircle className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {team.avg}%
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-950 text-white border border-slate-800 px-3 py-2 text-[11px] max-w-xs font-semibold shadow-xl rounded-lg">
                  <p className="leading-normal">Promedio en vivo: Calculado a partir de las habilidades de los integrantes actuales.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl border-none shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">Desempeño de Equipo: {team.name}</DialogTitle>
          <DialogDescription className="sr-only">Información histórica y de progreso del equipo {team.name}</DialogDescription>
          <TeamHistoryDialog 
            teamName={team.name} 
            members={members} 
            autonomyFactors={team.autonomyFactors}
            faseActual={team.faseActual}
            fase2026={team.fase2026}
            fechaCompromiso={team.fechaCompromiso}
            metricMode={metricMode}
          />
        </DialogContent>
      </div>
    </Dialog>
  );
}
