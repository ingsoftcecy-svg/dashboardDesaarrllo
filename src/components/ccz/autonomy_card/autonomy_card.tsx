import { motion } from "framer-motion";
import { AutonomyGauge } from "./autonomy_gauge";
import { STRINGS } from "./constants";

interface AutonomyCardProps {
  autonomia: number;
  nivel_label: string;
  trend?: number[];
  title?: string;
  subtitle?: string;
  customText?: string;
  customSubText?: string;
  guiasL6?: number;
  guiasL7?: number;
  guiasL8?: number;
}

import { Sparkline } from "@/components/ccz/sparkline";
import { cn } from "@/lib/utils";

export function AutonomyCard({ 
  autonomia, 
  nivel_label, 
  trend = [], 
  title, 
  subtitle, 
  customText, 
  customSubText,
  guiasL6,
  guiasL7,
  guiasL8
}: AutonomyCardProps) {
  const titleText = title || STRINGS.TITLE;
  const subtitleText = subtitle || STRINGS.SUBTITLE;
  const isCapacitacion = titleText.toLowerCase().includes("capacitac") || titleText.toLowerCase().includes("curso");
  const isGuias = titleText.toLowerCase().includes("guía") || titleText.toLowerCase().includes("técnica");

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden transition-all duration-300",
        isGuias ? "min-h-[530px]" : ""
      )}
    >
      <header className={cn(
        "flex items-center justify-between px-4 py-3 text-white transition-all duration-300",
        isCapacitacion
          ? "bg-gradient-to-r from-purple-700 to-indigo-800"
          : isGuias
            ? "bg-gradient-to-r from-emerald-700 to-teal-800"
            : "bg-gradient-to-r from-blue-700 to-blue-800"
      )}>
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
            <div className="absolute h-5 w-5 rounded-full border-2 border-yellow-400 opacity-50" />
            <div className="absolute h-3 w-3 rounded-full border-2 border-yellow-400" />
            <div className="h-1 w-1 rounded-full bg-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight">{titleText}</h2>
            <p className="text-[10px] font-medium text-blue-100/70">{subtitleText}</p>
          </div>
        </div>
        
        {trend.length > 0 && (
          <div className="w-20 h-8 opacity-60">
            <Sparkline data={trend} color="#facc15" height={32} />
          </div>
        )}
      </header>

      {isGuias ? (
        <div className="flex flex-col p-5 space-y-4 flex-1 justify-between bg-slate-50/30">
          {/* Info general a nivel de texto */}
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm">
            <div>
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Habilitación General del Área
              </h3>
              <p className="text-2xl font-black text-[#1a4491] leading-none mt-1.5">
                {customText} <span className="text-[10px] font-bold text-slate-400">/ 100%</span>
              </p>
            </div>
            <div className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 border border-yellow-200 shadow-sm">
              <span className="text-[8px] font-black text-yellow-800 uppercase tracking-widest">
                META: 100%
              </span>
            </div>
          </div>

          {/* Tres filas verticales para L6, L7, L8 */}
          <div className="flex flex-col gap-3 flex-1 justify-center">
            
            {/* L6 Row */}
            <div className="flex items-center gap-4 bg-white p-2.5 rounded-xl border border-slate-200/60 hover:border-emerald-200 hover:shadow-md hover:scale-[1.01] transition-all duration-300">
              <div className="shrink-0">
                <AutonomyGauge 
                  value={guiasL6 || 0} 
                  max={100} 
                  size={75} 
                  stroke_width={8} 
                  customText={`${(guiasL6 || 0).toFixed(0)}%`}
                  color="#059669"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Nivel L6 (Básico)</h4>
                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded tracking-wide uppercase">Básico</span>
                </div>
                <p className="text-[9px] font-semibold text-slate-400 leading-none">Conocimientos teóricos y procedimientos estándar (SOPs)</p>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${guiasL6}%` }} />
                </div>
              </div>
            </div>

            {/* L7 Row */}
            <div className="flex items-center gap-4 bg-white p-2.5 rounded-xl border border-slate-200/60 hover:border-teal-200 hover:shadow-md hover:scale-[1.01] transition-all duration-300">
              <div className="shrink-0">
                <AutonomyGauge 
                  value={guiasL7 || 0} 
                  max={100} 
                  size={75} 
                  stroke_width={8} 
                  customText={`${(guiasL7 || 0).toFixed(0)}%`}
                  color="#0d9488"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Nivel L7 (Intermedio)</h4>
                  <span className="text-[8px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded tracking-wide uppercase">Autónomo</span>
                </div>
                <p className="text-[9px] font-semibold text-slate-400 leading-none">Autosuficiencia técnica y mantenimiento de primer nivel</p>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${guiasL7}%` }} />
                </div>
              </div>
            </div>

            {/* L8 Row */}
            <div className="flex items-center gap-4 bg-white p-2.5 rounded-xl border border-slate-200/60 hover:border-cyan-200 hover:shadow-md hover:scale-[1.01] transition-all duration-300">
              <div className="shrink-0">
                <AutonomyGauge 
                  value={guiasL8 || 0} 
                  max={100} 
                  size={75} 
                  stroke_width={8} 
                  customText={`${(guiasL8 || 0).toFixed(0)}%`}
                  color="#0891b2"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Nivel L8 (Avanzado)</h4>
                  <span className="text-[8px] font-black text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded tracking-wide uppercase">Especialista</span>
                </div>
                <p className="text-[9px] font-semibold text-slate-400 leading-none">Optimización de procesos, resolución de problemas y mentoría</p>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${guiasL8}%` }} />
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-6 p-6">
          <div className="flex shrink-0 items-center justify-center">
            <AutonomyGauge 
              value={autonomia} 
              max={4} 
              size={130} 
              stroke_width={15} 
              customText={customText} 
              customSubText={customSubText} 
              color={isCapacitacion ? "#9333ea" : undefined}
            />
          </div>
          
          <div className="flex flex-col justify-center space-y-2 flex-1">
            <h3 className="text-xl font-black text-[#1a4491] uppercase tracking-tight leading-tight">
              {nivel_label}
            </h3>
            <div className="inline-flex w-fit items-center rounded-full bg-yellow-100 px-3 py-1 border border-yellow-200">
              <span className="text-[10px] font-black text-yellow-800 uppercase tracking-widest">
                META ESPERADA: 100%
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}
