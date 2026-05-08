import { Factory, Download, Medal, AlertCircle, Maximize, Minimize } from "lucide-react";
import { useState, useEffect } from "react";
import type { AreaData } from "@/data/zeus";
import { cn } from "@/lib/utils";
import { exportToPDF } from "@/lib/export";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function FullscreenButton() {
  const [isFS, setIsFS] = useState(false);

  useEffect(() => {
    const handleFSChange = () => setIsFS(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const toggleFS = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <button
      onClick={toggleFS}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white transition-all hover:bg-slate-900 hover:scale-105 active:scale-95 shadow-md shadow-slate-900/20"
      title={isFS ? "Salir de pantalla completa" : "Pantalla completa"}
    >
      {isFS ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
    </button>
  );
}

export function TeamHeader({ area }: { area: AreaData }) {
  return (
    <section className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-6 shadow-xl overflow-hidden">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        
        {/* BEST TEAM CARD */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex items-center justify-between gap-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-5 border border-emerald-500/20 shadow-sm"
        >
          {/* Team Logo */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white border-2 border-emerald-500/20 shadow-lg p-2 overflow-hidden transition-transform hover:scale-105 active:scale-95">
                <img 
                  src={`/logos/${area.bestTeam?.name.trim().toUpperCase()}.png`} 
                  alt={area.bestTeam?.name}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<div class="text-emerald-500 font-black">TOP</div>';
                    }
                  }}
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
              <div className="w-full aspect-square flex items-center justify-center p-4">
                <img 
                  src={`/logos/${area.bestTeam?.name.trim().toUpperCase()}.png`} 
                  alt={area.bestTeam?.name}
                  className="max-h-full max-w-full object-contain drop-shadow-xl"
                />
              </div>
              <div className="text-center mt-4">
                <DialogTitle className="text-2xl font-black text-emerald-600 uppercase tracking-tight">{area.bestTeam?.name}</DialogTitle>
                <DialogDescription className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Mejor Equipo del Área</DialogDescription>
              </div>
            </DialogContent>
          </Dialog>

          {/* Team Info */}
          <div className="flex-1 min-w-0 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Medal className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">Mejor Equipo</span>
            </div>
            <h2 className="truncate text-xl font-black text-slate-800 uppercase leading-none mb-3">{area.bestTeam?.name || "N/A"}</h2>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-full max-w-[120px] rounded-full bg-emerald-100 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${area.bestTeam?.avg || 0}%` }} />
                </div>
                <span className="text-xs font-black text-emerald-600">{area.bestTeam?.avg || 0}%</span>
              </div>
              <div className="text-[9px] font-bold text-emerald-700/40 uppercase tracking-widest">AUTONOMÍA EQUIPO</div>
            </div>
          </div>

          {/* Leader Info */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Dialog>
              <DialogTrigger asChild>
                <button className="focus:outline-none transition-transform hover:scale-105 active:scale-95 group">
                  <Avatar className="h-16 w-16 border-2 border-emerald-500/20 shadow-xl group-hover:border-emerald-500/50 transition-colors">
                    <AvatarImage src={`/fotos/${area.bestTeam?.leader?.trim()}.jpeg`} className="object-cover" />
                    <AvatarFallback className="text-sm font-black bg-emerald-500 text-white">
                      {area.bestTeam?.leader?.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
                <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center">
                  <img 
                    src={`/fotos/${area.bestTeam?.leader?.trim()}.jpeg`} 
                    alt={area.bestTeam?.leader} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }} 
                  />
                  <div className="absolute inset-0 bg-emerald-500 text-6xl font-black text-white hidden items-center justify-center">
                    {area.bestTeam?.leader?.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                </div>
                <div className="text-center mt-4 space-y-1">
                  <DialogTitle className="text-2xl font-black text-emerald-600 leading-tight uppercase">{area.bestTeam?.leader}</DialogTitle>
                  <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest">Líder de Equipo (Mejor Desempeño)</DialogDescription>
                </div>
              </DialogContent>
            </Dialog>
            <div className="text-center">
              <div className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">LÍDER DE EQUIPO</div>
              <div className="text-[10px] font-black text-slate-700 uppercase leading-tight max-w-[80px] break-words">
                {area.bestTeam?.leader?.split(" ").slice(-2).join(" ") || "N/A"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* CENTER INFO & ACTIONS */}
        <div className="flex flex-col items-center justify-center px-6 py-2 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-yellow-400 shadow-lg mb-2">
            <Factory className="h-5 w-5" />
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{area.linea}</div>
            <div className="text-sm font-black text-blue-900 uppercase tracking-tight">VISTA GLOBAL</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => exportToPDF("dashboard-content", `Reporte_${area.team}`)}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-[10px] font-black text-white transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-md shadow-blue-600/20"
            >
              <Download className="h-3 w-3" />
              PDF
            </button>
            <FullscreenButton />
          </div>
        </div>

        {/* WORST TEAM CARD */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex items-center justify-between gap-6 rounded-2xl bg-gradient-to-br from-rose-500/10 to-orange-500/5 p-5 border border-rose-500/20 shadow-sm"
        >
          {/* Leader Info */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Dialog>
              <DialogTrigger asChild>
                <button className="focus:outline-none transition-transform hover:scale-105 active:scale-95 group">
                  <Avatar className="h-16 w-16 border-2 border-rose-500/20 shadow-xl group-hover:border-rose-500/50 transition-colors">
                    <AvatarImage src={`/fotos/${area.worstTeam?.leader?.trim()}.jpeg`} className="object-cover" />
                    <AvatarFallback className="text-sm font-black bg-rose-500 text-white">
                      {area.worstTeam?.leader?.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
                <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center">
                  <img 
                    src={`/fotos/${area.worstTeam?.leader?.trim()}.jpeg`} 
                    alt={area.worstTeam?.leader} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }} 
                  />
                  <div className="absolute inset-0 bg-rose-500 text-6xl font-black text-white hidden items-center justify-center">
                    {area.worstTeam?.leader?.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                </div>
                <div className="text-center mt-4 space-y-1">
                  <DialogTitle className="text-2xl font-black text-rose-600 leading-tight uppercase">{area.worstTeam?.leader}</DialogTitle>
                  <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest">Líder de Equipo (Oportunidad)</DialogDescription>
                </div>
              </DialogContent>
            </Dialog>
            <div className="text-center">
              <div className="text-[8px] font-black text-rose-600 uppercase tracking-tighter">LÍDER DE EQUIPO</div>
              <div className="text-[10px] font-black text-slate-700 uppercase leading-tight max-w-[80px] break-words">
                {area.worstTeam?.leader?.split(" ").slice(-2).join(" ") || "N/A"}
              </div>
            </div>
          </div>

          {/* Team Info */}
          <div className="flex-1 min-w-0 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-600">Equipo Foco</span>
            </div>
            <h2 className="truncate text-xl font-black text-slate-800 uppercase leading-none mb-3">{area.worstTeam?.name || "N/A"}</h2>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-full max-w-[120px] rounded-full bg-rose-100 overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${area.worstTeam?.avg || 0}%` }} />
                </div>
                <span className="text-xs font-black text-rose-600">{area.worstTeam?.avg || 0}%</span>
              </div>
              <div className="text-[9px] font-bold text-rose-700/40 uppercase tracking-widest">AUTONOMÍA EQUIPO</div>
            </div>
          </div>

          {/* Team Logo */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white border-2 border-rose-500/20 shadow-lg p-2 overflow-hidden transition-transform hover:scale-105 active:scale-95">
                <img 
                  src={`/logos/${area.worstTeam?.name.trim().toUpperCase()}.png`} 
                  alt={area.worstTeam?.name}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<div class="text-rose-500 font-black">LOW</div>';
                    }
                  }}
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
              <div className="w-full aspect-square flex items-center justify-center p-4">
                <img 
                  src={`/logos/${area.worstTeam?.name.trim().toUpperCase()}.png`} 
                  alt={area.worstTeam?.name}
                  className="max-h-full max-w-full object-contain drop-shadow-xl"
                />
              </div>
              <div className="text-center mt-4">
                <DialogTitle className="text-2xl font-black text-rose-600 uppercase tracking-tight">{area.worstTeam?.name}</DialogTitle>
                <DialogDescription className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Equipo con Oportunidad de Mejora</DialogDescription>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

      </div>
    </section>
  );
}
