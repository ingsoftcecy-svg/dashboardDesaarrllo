import { TrendingUp, TrendingDown, Medal } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { get_initials } from "./utils";
import { STRINGS } from "./constants";
import { LeaderAvatar } from "./leader_avatar";
import { TeamHistoryDialog } from "../physical_board/team_history_dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";


interface TeamRanking {
  name: string;
  avg: number;
  leader?: string;
}

interface RankingItemProps {
  team: TeamRanking;
  index: number;
  is_best: boolean;
  is_worst: boolean;
  operadores?: any[];
}

export function RankingItem({ team, index, is_best, is_worst, operadores = [] }: RankingItemProps) {
  const members = (operadores || [])
    .filter(op => op.equipoAutonomo && op.equipoAutonomo.trim().toUpperCase() === team.name.trim().toUpperCase())
    .map(op => ({
      id: op.id,
      name: op.nombre,
      puesto: op.puesto,
      score: op.autonomyScore,
      lastAssessmentDate: op.lastAssessmentDate,
      noEvaluado: op.noEvaluado
    }));
  const handle_dialog_image_error = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.currentTarget;
    if (!target.src.includes('.png')) {
      target.src = `/fotos/${team.leader?.trim()}.png?t=${Date.now()}`;
      return;
    }
    target.style.display = 'none';
    if (target.nextElementSibling) {
      (target.nextElementSibling as HTMLElement).style.display = 'flex';
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center justify-between rounded-lg border p-2 transition-colors",
        is_best ? "border-yellow-200 bg-yellow-50/50" : 
        is_worst ? "border-rose-200 bg-rose-50/50" : 
        "border-slate-100 bg-slate-50 hover:bg-slate-100"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm",
          is_best ? "bg-yellow-400 text-yellow-900" : 
          index === 1 ? "bg-slate-300 text-slate-800" :
          index === 2 ? "bg-amber-600 text-amber-50" :
          "bg-slate-200 text-slate-600"
        )}>
          {index + 1}
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button className="focus:outline-none transition-transform hover:scale-105 active:scale-95 shrink-0">
              <LeaderAvatar leader={team.leader} is_best={is_best} is_worst={is_worst} />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
            <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center">
              <img 
                src={`/fotos/${team.leader?.trim()}.jpeg?t=${Date.now()}`} 
                alt={team.leader} 
                className="w-full h-full object-cover" 
                onError={handle_dialog_image_error} 
              />
              <div className={cn(
                "absolute inset-0 text-6xl font-black text-white hidden items-center justify-center",
                is_best ? "bg-yellow-500" : is_worst ? "bg-rose-500" : "bg-[#1a4491]"
              )}>
                {get_initials(team.leader || "NA")}
              </div>
            </div>
            <div className="text-center mt-4 space-y-1">
              <DialogTitle className="text-2xl font-black text-[#1a4491] leading-tight uppercase">{team.leader || STRINGS.NO_ASSIGNED}</DialogTitle>
              <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest">Líder de {team.name}</DialogDescription>
            </div>
          </DialogContent>
        </Dialog>

        <div className="min-w-0">
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-[11px] font-bold text-slate-800 hover:text-[#1a4491] hover:underline cursor-pointer focus:outline-none truncate uppercase leading-tight block text-left">
                {team.name}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl border-none shadow-2xl overflow-hidden">
              <TeamHistoryDialog 
                teamName={team.name} 
                members={members} 
              />
            </DialogContent>
          </Dialog>
          <div className="text-[9px] font-semibold text-slate-500 truncate leading-tight mt-0.5">
            {STRINGS.LEADER_LABEL} {team.leader || "N/A"}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-center ml-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold shadow-sm cursor-help",
                is_best ? "bg-yellow-100 text-yellow-800 border border-yellow-200" : 
                is_worst ? "bg-rose-100 text-rose-800 border border-rose-200" :
                "bg-blue-50 text-blue-800 border border-blue-100"
              )}>
                {is_best ? <TrendingUp className="h-3 w-3" /> : is_worst ? <TrendingDown className="h-3 w-3" /> : <Medal className="h-3 w-3" />}
                {team.avg}%
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-950 text-white border border-slate-800 px-3 py-2 text-[11px] max-w-xs font-semibold shadow-xl rounded-lg">
              <p className="leading-normal">Promedio en vivo: Calculado a partir de las habilidades de los integrantes actuales.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
