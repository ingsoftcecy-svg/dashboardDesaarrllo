import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Trophy, Medal, Award, Target, CheckCircle2, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumenHeaderProps {
  area: any;
}

export function ResumenHeader({ area }: ResumenHeaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    // Trigger continuous confetti if we have teams
    if (area?.teamRankings && area.teamRankings.length > 0 && canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true
      });

      const intervalId = setInterval(() => {
        myConfetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#C0C0C0', '#CD7F32', '#1a4491'],
          zIndex: 0
        });
        myConfetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#C0C0C0', '#CD7F32', '#1a4491'],
          zIndex: 0
        });
      }, 150);

      return () => {
        clearInterval(intervalId);
        myConfetti.reset();
      };
    }
  }, [area]);

  if (!area || !area.teamRankings || area.teamRankings.length === 0) return null;

  // Calcular promedio usando la lógica BPRE (9 factores, 7 para mantenimiento)
  const calcAvg = (team: any) => {
    const f = team.autonomyFactors;
    if (!f) return 0;
    let sum = 0;
    const tName = team.name?.toLowerCase() || "";
    const isMantenimiento = tName.includes("munich") || tName.includes("nahuales");
    const keys = ["dinamica", "liderazgo", "skap", "seguridad", "vpo", "solucionProb", "infraest"];
    if (!isMantenimiento) {
      keys.push("ato", "quas", "multihab");
    }
    keys.forEach(k => {
      const val = Number(f[k]);
      if (!isNaN(val)) sum += val;
    });
    return sum / keys.length;
  };

  const sortedTeams = [...(area.teamRankings || [])].sort((a, b) => {
    const fA = parseInt(a.faseActual?.replace(/\D/g, '') || '0', 10);
    const fB = parseInt(b.faseActual?.replace(/\D/g, '') || '0', 10);
    if (fA !== fB) return fB - fA; // 1er Criterio: Fase Actual
    
    const avgA = calcAvg(a);
    const avgB = calcAvg(b);
    if (avgA !== avgB) return avgB - avgA; // 2do Criterio: Promedio
    
    return (a.name || '').localeCompare(b.name || ''); // 3er Criterio: Alfabético
  });

  const top3 = sortedTeams.slice(0, 3);
  
  // Calcular distribución de fases y Fase Global
  const faseDist = { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 };
  let minFase = 5;
  let hasTeams = false;
  
  area.teamRankings.forEach((t: any) => {
    hasTeams = true;
    const faseNum = parseInt(t.faseActual?.replace(/\D/g, '') || '0', 10);
    if (faseNum >= 0 && faseNum <= 5) {
      if (faseNum > 0) {
        faseDist[`F${faseNum}` as keyof typeof faseDist]++;
      }
      if (faseNum < minFase) minFase = faseNum;
    } else {
      faseDist.F1++; // Default fallback
      if (1 < minFase) minFase = 1;
    }
  });
  
  const totalFases = area.teamRankings.length;
  const globalFase = hasTeams ? `Fase ${minFase}` : "N/A";

  const getTeamLogoUrl = (teamName: string) => {
    const tName = teamName?.toLowerCase() || "";
    if (tName.includes("andamos")) return "/logos/ANDAMOS CON TODO.webp";
    if (tName.includes("bravos")) return "/logos/BRAVOS DEL FRIO.webp";
    if (tName.includes("broncos")) return "/logos/LOS BRONCOS.webp";
    if (tName.includes("cazador") || tName.includes("amargor")) return "/logos/LOS CAZADORES DEL AMARGOR.webp";
    if (tName.includes("cuchilla")) return "/logos/CUCHILLAS.webp";
    if (tName.includes("espartanos")) return "/logos/LOS ESPARTANOS.webp";
    if (tName.includes("fenix")) return "/logos/LOS FENIX.webp";
    if (tName.includes("fuertes")) return "/logos/LOS FUERTES DEL FRIO.webp";
    if (tName.includes("iluminatis")) return "/logos/LOS ILUMINATIS.webp";
    if (tName.includes("mash") || tName.includes("rainbow")) return "/logos/MASH-RAINBOW.webp";
    if (tName.includes("mosto")) return "/logos/MOSTO-BOYS.webp";
    if (tName.includes("munich")) return "/logos/MUNICH.webp";
    if (tName.includes("nahuales")) return "/logos/NAHUALES.webp";
    if (tName.includes("osos")) return "/logos/OSOS REVOLTOSOS.webp";
    if (tName.includes("panchito")) return "/logos/LOS PANCHITOS.webp";
    if (tName.includes("reyes")) return "/logos/REYES DE LA MEZCLA.webp";
    if (tName.includes("titanes")) return "/logos/TITANES DE LA CHEVE.webp";
    if (tName.includes("vengadores")) return "/logos/LOS VENGADORES.webp";
    if (tName.includes("vikings")) return "/logos/VIKINGS.webp";
    return "/logos/ELABORACION.webp"; // Default
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
      {/* 1. Tarjeta Insight & Distribución */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Fase Global */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 border border-slate-700 shadow-xl relative overflow-hidden h-1/2 flex flex-col justify-center"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Target size={120} />
          </div>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Fase Global</h3>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black text-white">{globalFase}</span>
            <span className="text-xl font-bold text-slate-400 mb-1">Actual</span>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            La fase global está determinada por el factor más bajo del departamento.
          </p>
        </motion.div>

        {/* Distribución de Madurez */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 backdrop-blur-md rounded-xl p-5 border border-white/40 shadow-xl h-1/2 flex flex-col justify-center"
        >
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Distribución de Madurez (Fases)</h3>
          <div className="flex w-full h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner mb-3">
            {Object.entries(faseDist).map(([fase, count], idx) => {
              if (count === 0) return null;
              const percentage = (count / totalFases) * 100;
              const colors = {
                F1: "bg-red-500",
                F2: "bg-amber-400",
                F3: "bg-emerald-500",
                F4: "bg-blue-500",
                F5: "bg-purple-500"
              };
              return (
                <div 
                  key={fase} 
                  className={cn("h-full transition-all duration-1000", colors[fase as keyof typeof colors])} 
                  style={{ width: `${percentage}%` }}
                  title={`${fase}: ${count} equipos`}
                />
              );
            })}
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            {Object.entries(faseDist).map(([fase, count]) => {
              if (count === 0) return null;
              return (
                <div key={fase} className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full", 
                    fase === "F1" ? "bg-red-500" :
                    fase === "F2" ? "bg-amber-400" :
                    fase === "F3" ? "bg-emerald-500" :
                    fase === "F4" ? "bg-blue-500" : "bg-purple-500"
                  )} />
                  {fase.replace('F', 'Fase ')} <span className="text-slate-400 ml-0.5">({count})</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* 2. El Podio Top 3 */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-7 bg-white/70 backdrop-blur-md rounded-xl p-5 border border-white/40 shadow-xl relative overflow-hidden flex flex-col justify-between"
      >
        <button
          aria-label="Pantalla Completa"
          title="Alternar Pantalla Completa"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200 outline-none z-20"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>

        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
        <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center mb-16 relative z-10">🏆 Podio de Equipos</h3>
        
        <div className="flex justify-center items-end h-[180px] gap-2 sm:gap-6 pb-2 relative z-10">
          {/* Segundo Lugar */}
          {top3[1] && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '70%', opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="w-1/3 max-w-[120px] bg-gradient-to-t from-slate-300 to-slate-100 rounded-t-xl border-x border-t border-slate-300/50 relative flex flex-col items-center justify-start pt-6 shadow-lg"
            >
              <div className="absolute -top-12 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-white shadow-md flex items-center justify-center mb-1 overflow-hidden relative group">
                  <img src={getTeamLogoUrl(top3[1].name)} alt={top3[1].name} className="w-full h-full object-cover bg-white" onError={(e) => { e.currentTarget.src = "/logos/ELABORACION.webp" }} />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Medal className="text-white" size={16} />
                  </div>
                </div>
                <div className="bg-slate-700 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">2º LUGAR</div>
              </div>
              <span className="text-slate-800 font-black text-center text-[10px] sm:text-xs px-1 leading-tight break-words uppercase">{top3[1].name}</span>
              <span className="text-slate-500 font-bold text-[9px] sm:text-[10px] mt-1">{top3[1].faseActual?.replace('F', 'Fase ')}</span>
            </motion.div>
          )}

          {/* Primer Lugar */}
          {top3[0] && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '95%', opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="w-1/3 max-w-[140px] bg-gradient-to-t from-yellow-300 to-yellow-100 rounded-t-xl border-x border-t border-yellow-400/50 relative flex flex-col items-center justify-start pt-8 shadow-2xl z-10"
            >
              <div className="absolute -top-16 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-yellow-400 border-4 border-white shadow-lg flex items-center justify-center mb-1 animate-pulse overflow-hidden relative group">
                  <img src={getTeamLogoUrl(top3[0].name)} alt={top3[0].name} className="w-full h-full object-cover bg-white" onError={(e) => { e.currentTarget.src = "/logos/ELABORACION.webp" }} />
                  <div className="absolute inset-0 bg-yellow-600/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trophy className="text-white" size={20} />
                  </div>
                </div>
                <div className="bg-yellow-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-md whitespace-nowrap">1º LUGAR</div>
              </div>
              <span className="text-yellow-900 font-black text-center text-xs sm:text-sm px-2 leading-tight drop-shadow-sm uppercase">{top3[0].name}</span>
              <span className="text-yellow-800 font-black text-[10px] sm:text-xs mt-1 bg-yellow-500/20 px-2 py-0.5 rounded-md">{top3[0].faseActual?.replace('F', 'Fase ')}</span>
            </motion.div>
          )}

          {/* Tercer Lugar */}
          {top3[2] && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '55%', opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="w-1/3 max-w-[120px] bg-gradient-to-t from-amber-700/30 to-amber-600/10 rounded-t-xl border-x border-t border-amber-700/20 relative flex flex-col items-center justify-start pt-6 shadow-md"
            >
              <div className="absolute -top-12 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-white shadow-md flex items-center justify-center mb-1 overflow-hidden relative group">
                  <img src={getTeamLogoUrl(top3[2].name)} alt={top3[2].name} className="w-full h-full object-cover bg-white" onError={(e) => { e.currentTarget.src = "/logos/ELABORACION.webp" }} />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Award className="text-white" size={16} />
                  </div>
                </div>
                <div className="bg-amber-800 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">3º LUGAR</div>
              </div>
              <span className="text-slate-800 font-black text-center text-[10px] sm:text-xs px-1 leading-tight uppercase">{top3[2].name}</span>
              <span className="text-slate-500 font-bold text-[9px] sm:text-[10px] mt-1">{top3[2].faseActual?.replace('F', 'Fase ')}</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
