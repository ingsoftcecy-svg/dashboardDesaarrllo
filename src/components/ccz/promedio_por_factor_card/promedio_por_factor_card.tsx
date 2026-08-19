import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import type { AreaData } from "@/data/ccz";
import { STRINGS, FACTORS_LABELS } from "./constants";
import { FactorItem } from "./factor_item";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface PromedioPorFactorCardProps {
  area: AreaData;
  className?: string;
}

export function PromedioPorFactorCard({ area, className }: PromedioPorFactorCardProps) {
  const usuario = useAuth();
  const puedeEditar = true;
  const [selectedTeam, setSelectedTeam] = useState<string>("general");

  // Reiniciar a "general" al cambiar de departamento/área
  useEffect(() => {
    setSelectedTeam("general");
  }, [area.team]);

  const selectedTeamData = area.teamRankings?.find((t) => t.name === selectedTeam);

  const baseFactors = (selectedTeam === "general" ? area.autonomyFactors : selectedTeamData?.autonomyFactors) || {
    dinamica: 0,
    liderazgo: 0,
    skap: 0,
    ato: 0,
    seguridad: 0,
    quas: 0,
    multihab: 0,
    vpo: 0,
    solucionProb: 0,
    infraest: 0,
  };

  const factors = baseFactors;

  const factor_items = Object.entries(FACTORS_LABELS).map(([key, label]) => ({
    key,
    label,
    value: (factors as any)[key] !== undefined ? (factors as any)[key] : (baseFactors as any)[key] || 0,
  }));

  // Filtrar los operadores pertenecientes al equipo seleccionado para calcular requisitos específicos en los modales
  const operatorsToShow = selectedTeam === "general"
    ? area.operadores
    : area.operadores.filter(
        (op) =>
          op.equipoAutonomo &&
          op.equipoAutonomo.trim().toUpperCase() === selectedTeam.trim().toUpperCase()
      );

  const displayAreaName = selectedTeam === "general" ? area.team : selectedTeam;
  const currentTeamKey = selectedTeam.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden", className)}
    >
      <header className="flex items-center justify-between bg-[#0f172a] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
            <BarChart3 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight">{STRINGS.TITLE}</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {STRINGS.SUBTITLE}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {area.teamRankings && area.teamRankings.length > 0 && (
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="text-[10px] font-bold bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[150px] truncate transition-colors hover:bg-slate-700"
            >
              <option value="general" className="bg-[#0f172a]">
                General ({area.team})
              </option>
              {area.teamRankings.map((team) => (
                <option key={team.name} value={team.name} className="bg-[#0f172a]">
                  {team.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-3 md:grid-cols-3">
        {factor_items.map((item, index) => (
          <FactorItem 
            key={item.key} 
            factorKey={item.key}
            label={item.label} 
            value={item.value} 
            index={index} 
            operadores={operatorsToShow}
            areaName={displayAreaName}
          />
        ))}
      </div>
    </motion.section>
  );
}
