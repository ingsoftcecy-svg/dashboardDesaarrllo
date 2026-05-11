import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn, getLeaderColor } from "@/lib/utils";
import { get_initials } from "./utils";
import { PODIUM_CONFIG, STRINGS } from "./constants";
import type { Podium } from "@/data/zeus";

interface PodiumItemProps {
  person: Podium;
  index: number;
}

export function PodiumItem({ person, index }: PodiumItemProps) {
  const config = PODIUM_CONFIG[index];
  if (!config) return null;
  const Icon = config.icon;

  const handle_image_error = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.currentTarget;
    target.style.display = 'none';
    if (target.nextElementSibling) {
      (target.nextElementSibling as HTMLElement).style.display = 'flex';
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="relative mb-1">
        <Dialog>
          <DialogTrigger asChild>
            <button className="focus:outline-none transition-transform hover:scale-105 active:scale-95">
              <Avatar className="h-12 w-12 border-2 border-white shadow-md ring-2 ring-white/50 bg-gradient-to-br from-blue-700 to-blue-900">
                <AvatarImage src={`/fotos/${person.nombre.trim()}.jpeg?t=${Date.now()}`} className="object-cover" />
                <AvatarFallback className="text-sm font-bold text-white">
                  {get_initials(person.nombre)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
            <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center">
              <img 
                src={`/fotos/${person.nombre.trim()}.jpeg?t=${Date.now()}`} 
                alt={person.nombre} 
                className="w-full h-full object-cover" 
                onError={handle_image_error} 
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a4491] to-[#2c65cc] text-6xl font-black text-white hidden items-center justify-center">
                {get_initials(person.nombre)}
              </div>
            </div>
            <div className="text-center mt-4 space-y-1">
              <DialogTitle className="text-2xl font-black text-[#1a4491] leading-tight uppercase">{person.nombre}</DialogTitle>
              <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest">{person.puesto}</DialogDescription>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                <Icon className="h-4 w-4" />
                {config.label}{STRINGS.PLACE_SUFFIX}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-blue-900 shadow z-10 pointer-events-none">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      
      <div className="text-center text-[11px] font-semibold leading-tight text-slate-800">
        {person.nombre}
      </div>
      <div className="text-center text-[9px] text-slate-500 line-clamp-1" title={person.puesto}>{person.puesto}</div>
      
      {person.lider && (
        <div className="mt-1 flex justify-center">
          <div className={cn("px-1 py-0.5 text-[8px] font-bold uppercase rounded border text-center line-clamp-1", getLeaderColor(person.lider))} title={`${STRINGS.LEADER_LABEL} ${person.lider}`}>
            {STRINGS.LEADER_LABEL} {person.lider}
          </div>
        </div>
      )}
      
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
        style={{ originY: 1 }}
        className={cn(
          "mt-1 flex w-full flex-col items-center justify-end rounded-t-lg bg-gradient-to-b px-1 py-1 shadow-inner",
          config.color,
          config.height,
          config.text
        )}
      >
        <span className="text-lg font-black drop-shadow-sm leading-none">{config.label}</span>
        <span className="text-[10px] font-bold opacity-90 mb-1">{person.excelencia}%</span>
      </motion.div>
    </div>
  );
}
