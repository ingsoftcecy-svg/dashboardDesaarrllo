import { useEffect, useRef, useState } from "react";
import { Medal, AlertCircle, Edit2, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { STRINGS } from "./constants";
import { useAuth } from "@/lib/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LeaderCombobox } from "./leader_combobox";

interface TeamData {
  name: string;
  leader?: string;
  avg: number;
}

interface TeamCardProps {
  variant: "best" | "worst";
  team?: TeamData;
  operadores?: any[];
}

/**
 * TeamCard: Componente visual que muestra la información de un equipo (el mejor o el peor).
 * Incluye funcionalidad para que los administradores puedan editar y guardar un nuevo líder
 * para el equipo, almacenando dicha anulación (override) directamente en Firestore.
 */
export function TeamCard({ variant, team, operadores = [] }: TeamCardProps) {
  const is_best = variant === "best";
  const canvas_ref = useRef<HTMLCanvasElement>(null);
  
  const auth = useAuth();
  const is_admin = auth?.rol === "admin";
  const [editingLeader, setEditingLeader] = useState(false);
  const [localLeader, setLocalLeader] = useState(team?.leader || STRINGS.NOT_AVAILABLE);
  const [newLeader, setNewLeader] = useState(localLeader);

  useEffect(() => {
    setLocalLeader(team?.leader || STRINGS.NOT_AVAILABLE);
    setNewLeader(team?.leader || STRINGS.NOT_AVAILABLE);
  }, [team?.leader]);

  const handleSaveLeader = async () => {
    if (!team?.name) return;
    try {
      await setDoc(doc(db, "team_overrides", team.name), { leader: newLeader });
      setLocalLeader(newLeader);
      setEditingLeader(false);
    } catch (e) {
      console.error("Error saving new leader:", e);
    }
  };

  useEffect(() => {
    if (is_best && canvas_ref.current) {
      const my_confetti = confetti.create(canvas_ref.current, {
        resize: true,
        useWorker: true
      });

      const fire = () => {
        my_confetti({
          particleCount: 15,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 1 },
          colors: ['#10b981', '#34d399', '#059669', '#fcd34d', '#fbbf24']
        });
        my_confetti({
          particleCount: 15,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 1 },
          colors: ['#10b981', '#34d399', '#059669', '#fcd34d', '#fbbf24']
        });
      };

      fire();
      const interval = setInterval(fire, 2000);

      return () => clearInterval(interval);
    }
  }, [is_best]);

  
  const icon = is_best ? <Medal className="h-3.5 w-3.5 text-emerald-600" /> : <AlertCircle className="h-3.5 w-3.5 text-rose-600" />;
  const label = is_best ? STRINGS.BEST_TEAM : STRINGS.WORST_TEAM;
  const label_color = is_best ? "text-emerald-600" : "text-rose-600";
  const bg_gradient = is_best ? "from-emerald-500/10 to-teal-500/5 border-emerald-500/20" : "from-rose-500/10 to-orange-500/5 border-rose-500/20";
  const avatar_border = is_best ? "border-emerald-500/20 group-hover:border-emerald-500/50 bg-emerald-500" : "border-rose-500/20 group-hover:border-rose-500/50 bg-rose-500";
  const progress_bg = is_best ? "bg-emerald-100" : "bg-rose-100";
  const progress_fill = is_best ? "bg-emerald-500" : "bg-rose-500";
  const progress_text = is_best ? "text-emerald-600" : "text-rose-600";
  const progress_label = is_best ? "text-emerald-700/40" : "text-rose-700/40";
  
  const leader_subtitle = is_best ? STRINGS.LEADER_BEST : STRINGS.LEADER_WORST;
  const team_subtitle = is_best ? STRINGS.BEST_TEAM_SUBTITLE : STRINGS.WORST_TEAM_SUBTITLE;
  
  const team_name = team?.name || STRINGS.NOT_AVAILABLE;
  const leader_name = localLeader;
  const initial_animation_x = is_best ? -20 : 20;

  const handle_logo_error = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.currentTarget;
    target.style.display = 'none';
    if (target.parentElement) {
      target.parentElement.innerHTML = `<div class="${label_color} font-black">${is_best ? 'TOP' : 'LOW'}</div>`;
    }
  };

  const handle_leader_error = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.currentTarget;
    target.style.display = 'none';
    if (target.nextElementSibling) {
      (target.nextElementSibling as HTMLElement).style.display = 'flex';
    }
  };

  const leader_section = (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <Dialog>
        <DialogTrigger asChild>
          <button className="focus:outline-none transition-transform hover:scale-105 active:scale-95 group">
            <Avatar className={`h-16 w-16 border-2 shadow-xl transition-colors ${avatar_border}`}>
              <AvatarImage src={`/fotos/${leader_name.trim()}.jpeg`} className="object-cover" />
              <AvatarFallback className={`text-sm font-black text-white ${avatar_border}`}>
                {leader_name.split(" ").map(name_part => name_part[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
          <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center">
            <img 
              src={`/fotos/${leader_name.trim()}.jpeg`} 
              alt={leader_name} 
              className="w-full h-full object-cover" 
              onError={handle_leader_error} 
            />
            <div className={`absolute inset-0 text-6xl font-black text-white hidden items-center justify-center ${avatar_border}`}>
              {leader_name.split(" ").map(name_part => name_part[0]).slice(0, 2).join("")}
            </div>
          </div>
          <div className="text-center mt-4 space-y-1">
            <DialogTitle className={`text-2xl font-black leading-tight uppercase ${label_color}`}>{leader_name}</DialogTitle>
            <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest">{leader_subtitle}</DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
      <div className="text-center">
        <div className={`flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-tighter ${label_color}`}>
          {STRINGS.TEAM_LEADER}
          {is_admin && !editingLeader && (
            <button onClick={() => setEditingLeader(true)} className="hover:opacity-75 transition-opacity" title="Editar Líder">
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
        {editingLeader ? (
          <div className="flex flex-col items-center gap-1 mt-1">
            <LeaderCombobox 
              value={newLeader} 
              onChange={setNewLeader} 
              operadores={operadores} 
            />
            <div className="flex items-center gap-2 mt-1">
              <button onClick={handleSaveLeader} className="text-emerald-500 hover:text-emerald-600 bg-emerald-50 rounded p-0.5"><Check className="w-3 h-3"/></button>
              <button onClick={() => { setEditingLeader(false); setNewLeader(localLeader); }} className="text-rose-500 hover:text-rose-600 bg-rose-50 rounded p-0.5"><X className="w-3 h-3"/></button>
            </div>
          </div>
        ) : (
          <div className="text-[10px] font-black text-slate-700 uppercase leading-tight max-w-[80px] break-words mt-0.5">
            {leader_name !== STRINGS.NOT_AVAILABLE ? leader_name.split(" ").slice(-2).join(" ") : STRINGS.NOT_AVAILABLE}
          </div>
        )}
      </div>
    </div>
  );

  const logo_section = (
    <Dialog>
      <DialogTrigger asChild>
        <button className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white border shadow-lg p-0.5 overflow-hidden transition-transform hover:scale-105 active:scale-95 ${avatar_border}`}>
          <img 
            src={`/logos/${team_name.trim().toUpperCase()}.png`} 
            alt={team_name}
            className="max-h-full max-w-full object-contain"
            onError={handle_logo_error}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
        <div className="w-full aspect-square flex items-center justify-center p-4">
          <img 
            src={`/logos/${team_name.trim().toUpperCase()}.png`} 
            alt={team_name}
            className="max-h-full max-w-full object-contain drop-shadow-xl"
          />
        </div>
        <div className="text-center mt-4">
          <DialogTitle className={`text-2xl font-black uppercase tracking-tight ${label_color}`}>{team_name}</DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{team_subtitle}</DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: initial_animation_x }}
      animate={{ 
        opacity: 1, 
        x: 0,
        ...(!is_best && {
          scale: [1, 1.01, 1],
          boxShadow: [
            "0 0 0px 0px rgba(244, 63, 94, 0)",
            "0 0 15px 2px rgba(244, 63, 94, 0.2)",
            "0 0 0px 0px rgba(244, 63, 94, 0)"
          ]
        })
      }}
      transition={{
        x: { duration: 0.5 },
        opacity: { duration: 0.5 },
        scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
        boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" }
      }}
      className={`relative overflow-hidden flex-1 flex items-center justify-between gap-6 rounded-2xl bg-gradient-to-br p-5 border shadow-sm ${bg_gradient}`}
    >
      {is_best && (
        <canvas 
          ref={canvas_ref} 
          className="absolute inset-0 pointer-events-none w-full h-full z-0" 
        />
      )}
      
      <div className="relative z-10 shrink-0">
        {is_best ? logo_section : leader_section}
      </div>

      <div className="relative z-10 flex-1 min-w-0 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          {icon}
          <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${label_color}`}>{label}</span>
        </div>
        <h2 className="truncate text-xl font-black text-slate-800 uppercase leading-none mb-3">{team_name}</h2>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <div className={`h-2 w-full max-w-[120px] rounded-full overflow-hidden ${progress_bg}`}>
              <div className={`h-full ${progress_fill}`} style={{ width: `${team?.avg || 0}%` }} />
            </div>
            <span className={`text-xs font-black ${progress_text}`}>{team?.avg || 0}%</span>
          </div>
          <div className={`text-[9px] font-bold uppercase tracking-widest ${progress_label}`}>{STRINGS.TEAM_AUTONOMY}</div>
        </div>
      </div>

      <div className="relative z-10 shrink-0">
        {is_best ? leader_section : logo_section}
      </div>
    </motion.div>
  );
}
