import { useState } from "react";
import { Users, TrendingUp, TrendingDown, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn, getLeaderColor } from "@/lib/utils";

interface TeamRanking {
  name: string;
  avg: number;
  leader?: string;
}

interface Props {
  rankings?: TeamRanking[];
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("");
}

function LeaderAvatar({ leader, isBest, isWorst }: { leader?: string, isBest: boolean, isWorst: boolean }) {
  const [src, setSrc] = useState(`/fotos/${leader?.trim()}.jpeg?t=${Date.now()}`);
  const [hasError, setHasError] = useState(false);

  return (
    <Avatar className={cn(
      "h-8 w-8 border shadow-sm",
      isBest ? "border-yellow-400/50" : isWorst ? "border-rose-400/50" : "border-slate-200"
    )}>
      <AvatarImage 
        src={src} 
        className="object-cover"
        onError={() => {
          if (src.includes('.jpeg')) {
            setSrc(`/fotos/${leader?.trim()}.png?t=${Date.now()}`);
          } else {
            setHasError(true);
          }
        }}
      />
      <AvatarFallback className={cn(
        "text-[10px] font-bold text-white",
        isBest ? "bg-yellow-500" : isWorst ? "bg-rose-500" : "bg-slate-400"
      )}>
        {initials(leader || "NA")}
      </AvatarFallback>
    </Avatar>
  );
}

export function TeamRankingCard({ rankings = [] }: Props) {
  const [selectedLeader, setSelectedLeader] = useState<TeamRanking | null>(null);
  return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className="flex h-full flex-col rounded-xl border border-white/40 bg-white/70 backdrop-blur-md shadow-xl transition hover:shadow-lg overflow-hidden"
    >
      <header className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-[#1a4491] to-blue-800 px-4 py-3 text-white">
        <Users className="h-5 w-5 text-yellow-400" />
        <div>
          <h2 className="text-sm font-bold">Ranking Equipos Autónomos</h2>
          <p className="text-[10px] text-blue-200">Desempeño</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {rankings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <span className="text-xs font-semibold">Sin equipos registrados</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {rankings.map((team, idx) => {
              const isBest = idx === 0;
              const isWorst = idx === rankings.length - 1 && rankings.length > 1;
              
              return (
                <div 
                  key={team.name}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-2 transition-colors",
                    isBest ? "border-yellow-200 bg-yellow-50/50" : 
                    isWorst ? "border-rose-200 bg-rose-50/50" : 
                    "border-slate-100 bg-slate-50 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm",
                      isBest ? "bg-yellow-400 text-yellow-900" : 
                      idx === 1 ? "bg-slate-300 text-slate-800" :
                      idx === 2 ? "bg-amber-600 text-amber-50" :
                      "bg-slate-200 text-slate-600"
                    )}>
                      {idx + 1}
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <button 
                          className="focus:outline-none transition-transform hover:scale-105 active:scale-95 shrink-0"
                          onClick={() => setSelectedLeader(team)}
                        >
                          <LeaderAvatar leader={team.leader} isBest={isBest} isWorst={isWorst} />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
                        <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center">
                          <img 
                            src={`/fotos/${team.leader?.trim()}.jpeg?t=${Date.now()}`} 
                            alt={team.leader} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              if (!target.src.includes('.png')) {
                                target.src = `/fotos/${team.leader?.trim()}.png?t=${Date.now()}`;
                                return;
                              }
                              target.style.display = 'none';
                              if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }} 
                          />
                          <div className={cn(
                            "absolute inset-0 text-6xl font-black text-white hidden items-center justify-center",
                            isBest ? "bg-yellow-500" : isWorst ? "bg-rose-500" : "bg-[#1a4491]"
                          )}>
                            {initials(team.leader || "NA")}
                          </div>
                        </div>
                        <div className="text-center mt-4 space-y-1">
                          <DialogTitle className="text-2xl font-black text-[#1a4491] leading-tight uppercase">{team.leader || "No asignado"}</DialogTitle>
                          <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest">Líder de {team.name}</DialogDescription>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-800 truncate uppercase leading-tight">
                        {team.name}
                      </div>
                      <div className="text-[9px] font-semibold text-slate-500 truncate leading-tight mt-0.5">
                        Líder: {team.leader || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end justify-center ml-2">
                    <div className={cn(
                      "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold shadow-sm",
                      isBest ? "bg-yellow-100 text-yellow-800 border border-yellow-200" : 
                      isWorst ? "bg-rose-100 text-rose-800 border border-rose-200" :
                      "bg-blue-50 text-blue-800 border border-blue-100"
                    )}>
                      {isBest ? <TrendingUp className="h-3 w-3" /> : isWorst ? <TrendingDown className="h-3 w-3" /> : <Medal className="h-3 w-3" />}
                      {team.avg}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
