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

import { Sparkline } from "@/components/zeus/sparkline";
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
      className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
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

      <div className="flex flex-1 items-center gap-6 p-6">
        <div className="flex shrink-0 items-center justify-center">
          <AutonomyGauge 
            value={autonomia} 
            max={4} 
            size={130} 
            stroke_width={15} 
            customText={customText} 
            customSubText={customSubText} 
            color={isGuias ? "#0d9488" : isCapacitacion ? "#9333ea" : undefined}
          />
        </div>
        
        <div className="flex flex-col justify-center space-y-2 flex-1">
          <h3 className="text-xl font-black text-[#1a4491] uppercase tracking-tight leading-tight">
            {nivel_label}
          </h3>

          {isGuias && (guiasL6 !== undefined || guiasL7 !== undefined || guiasL8 !== undefined) ? (
            <div className="space-y-1.5 pt-0.5 max-w-[200px]">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-wide">
                  <span>L6 (Básico)</span>
                  <span className="text-emerald-700">{guiasL6?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden border border-slate-200">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${guiasL6}%` }} />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-wide">
                  <span>L7 (Intermedio)</span>
                  <span className="text-teal-700">{guiasL7?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden border border-slate-200">
                  <div className="bg-teal-600 h-full rounded-full" style={{ width: `${guiasL7}%` }} />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-wide">
                  <span>L8 (Avanzado)</span>
                  <span className="text-cyan-700">{guiasL8?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden border border-slate-200">
                  <div className="bg-cyan-600 h-full rounded-full" style={{ width: `${guiasL8}%` }} />
                </div>
              </div>
            </div>
          ) : null}
          
          <div className="inline-flex w-fit items-center rounded-full bg-yellow-100 px-3 py-1 border border-yellow-200">
            <span className="text-[10px] font-black text-yellow-800 uppercase tracking-widest">
              META ESPERADA: 100%
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
