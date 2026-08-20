import React, { useState } from 'react';
import { AreaData } from '@/data/ccz';
import { cn } from '@/lib/utils';
import { BpreEditorDialog } from './promedio_por_factor_card/bpre_editor_dialog';
import { normalizarNombreEquipo } from '@/hooks/useExcelData';
import { useAuth } from '@/lib/auth';

interface BpreMatrixCardProps {
  area: AreaData;
}

const ORDEN_ESTRUCTURADO = [
  "CAZADORES_AMARGOR",
  "CUCHILLA",
  "MASHRAINBOW",
  "MOSTOBOYS",
  "PANCHITOS",
  "ANDAMOS_CON_TODO",
  "BRONCOS",
  "LOS_BRAVOS",
  "LOS_FUERTES",
  "REYES_MEZCLA",
  "MUNICH",
  "NAHUALES"
];

const getStructuredIndex = (teamName: string) => {
  const norm = normalizarNombreEquipo(teamName || '').trim();
  const idx = ORDEN_ESTRUCTURADO.indexOf(norm);
  return idx !== -1 ? idx : 999;
};

export function BpreMatrixCard({ area }: BpreMatrixCardProps) {
  const user = useAuth();
  const userEmail = user?.email?.toLowerCase();
  const canEditBpre = user?.rol === 'admin' || userEmail === "ingsoftcecy@gmail.com" || userEmail === "elaboracion@gmail.com" || userEmail === "adminelaboracion@gmail.com";
  const [sortBy, setSortBy] = useState<'fase' | 'estructurado'>('fase');

  const getCellColor = (value: number | undefined) => {
    if (value === undefined || value === null) return "bg-slate-100 text-slate-400";
    if (value >= 4) return "bg-gradient-to-br from-[#0099ff] to-[#007acc] text-white font-black shadow-inner"; // Light blue
    if (value === 3) return "bg-gradient-to-br from-[#00b050] to-[#008a3d] text-white font-black shadow-inner"; // Green
    if (value === 2) return "bg-gradient-to-br from-[#c6efce] to-[#a0d6a8] text-[#006100] font-black shadow-inner"; // Pale green/yellow
    return "bg-slate-50 text-slate-600";
  };

  const getFaseColor = (fase: string | number | undefined) => {
    if (!fase) return "bg-slate-50 text-slate-400";
    const val = String(fase).toUpperCase();
    if (val === "3") return "bg-gradient-to-br from-[#ffc000] to-[#e6ac00] text-amber-950 font-black shadow-inner"; // Target 3 is yellow
    if (val === "2") return "bg-gradient-to-br from-[#c6efce] to-[#a0d6a8] text-[#006100] font-black shadow-inner"; // Target 2 is pale green
    if (val.includes("F3")) return "bg-gradient-to-br from-[#00b050] to-[#008a3d] text-white font-black shadow-inner"; // F3 is green
    if (val.includes("F2")) return "bg-gradient-to-br from-[#c6efce] to-[#a0d6a8] text-[#006100] font-black shadow-inner"; // F2 is pale green
    return "bg-slate-100 text-slate-600 font-bold";
  };

  const getAreaColor = (areaName: string) => {
    const name = areaName?.toLowerCase() || "";
    if (name.includes("cocimiento")) return "bg-red-400 text-white font-black shadow-inner";
    if (name.includes("frio") || name.includes("frío")) return "bg-blue-500 text-white font-black shadow-inner";
    if (name.includes("mantenimiento")) return "bg-orange-400 text-white font-black shadow-inner";
    return "bg-slate-500 text-white font-black shadow-inner";
  };

  const getTeamLogoUrl = (teamName: string) => {
    const tName = teamName?.toLowerCase() || "";
    if (tName.includes("andamos")) return "/logos/ANDAMOS CON TODO.webp";
    if (tName.includes("bravos")) return "/logos/BRAVOS DEL FRIO.webp";
    if (tName.includes("broncos")) return "/logos/LOS BRONCOS.webp";
    if (tName.includes("cazador") || tName.includes("amargor")) return "/logos/LOS CAZADORES DEL AMARGOR.webp";
    if (tName.includes("cuchilla")) return "/logos/CUCHILLAS.webp";
    if (tName.includes("fuertes")) return "/logos/LOS FUERTES DEL FRIO.webp";
    if (tName.includes("panchito")) return "/logos/LOS PANCHITOS.webp";
    if (tName.includes("mash")) return "/logos/MASH-RAINBOW.webp";
    if (tName.includes("mosto")) return "/logos/MOSTO-BOYS.webp";
    if (tName.includes("munich")) return "/logos/MUNICH.webp";
    if (tName.includes("nahuales")) return "/logos/NAHUALES.webp";
    if (tName.includes("reyes")) return "/logos/REYES DE LA MEZCLA.webp";
    return "/logos/ELABORACION.webp"; // Default
  };

  // Extraer nombre del área general a partir de area.lema o team
  const generalAreaName = area.lema.includes("Toda la Planta") ? "" : 
                          area.team.includes("Cocimientos") ? "Cocimientos" : 
                          area.team.includes("Bloque") ? "Cuartos Fríos" : 
                          area.team.includes("Mantenimiento") ? "Mantenimiento Elaboración" : "Planta";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in flex flex-col">
      <div className="bg-[#1a4491] p-4 flex justify-between items-center text-white">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider">Matriz de Madurez de Equipos Autónomos</h2>
          <p className="text-[10px] text-blue-200 font-bold mt-0.5">Resumen general de los pilares de autonomía por equipo</p>
        </div>
        
        {/* Alternador de Ordenamiento */}
        <div className="flex bg-white/10 p-0.5 rounded-lg border border-white/20 shadow-inner shrink-0">
          <button
            onClick={() => setSortBy('fase')}
            className={cn(
              "rounded-md px-3 py-1 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
              sortBy === 'fase'
                ? "bg-white text-[#1a4491] shadow"
                : "text-blue-100 hover:text-white hover:bg-white/5"
            )}
          >
            Ranking de Fase
          </button>
          <button
            onClick={() => setSortBy('estructurado')}
            className={cn(
              "rounded-md px-3 py-1 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
              sortBy === 'estructurado'
                ? "bg-white text-[#1a4491] shadow"
                : "text-blue-100 hover:text-white hover:bg-white/5"
            )}
          >
            Orden Estructural
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] text-center border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white uppercase tracking-wider font-black">
              <th className="p-3 border border-slate-700 w-28 font-bold tracking-widest text-[9px]">ÁREA</th>
              <th className="p-3 border border-slate-700 w-40 text-left font-bold tracking-widest text-[9px]">NOMBRE</th>
              <th className="p-3 border border-slate-700 w-36 text-left font-bold tracking-widest text-[9px]">LÍDER</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">1. DINÁMICA<br/>DE EQUIPO</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">2. LIDERAZGO</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">3. SKAP</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">4. ATO</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">5. SEGURIDAD</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">6. QUAS</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">7. MULTIHAB</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">8. VPO</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">9. SOLUCIÓN<br/>DE PROB</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">10. INFRAEST</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">FASE<br/>ACTUAL</th>
              <th className="p-3 border border-slate-700 w-16 leading-tight text-[9px]">FECHA<br/>CAMBIO FASE</th>
            </tr>
          </thead>
          <tbody>
            {[...(area.teamRankings || [])].sort((a, b) => {
              if (sortBy === 'estructurado') {
                return getStructuredIndex(a.name) - getStructuredIndex(b.name);
              }
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
              const fA = parseInt(a.faseActual?.replace(/\D/g, '') || '0', 10);
              const fB = parseInt(b.faseActual?.replace(/\D/g, '') || '0', 10);
              if (fA !== fB) return fB - fA;

              const avgA = calcAvg(a);
              const avgB = calcAvg(b);
              if (avgA !== avgB) return avgB - avgA;
              
              return (a.name || '').localeCompare(b.name || '');
            }).map((team, idx) => {
              const f = team.autonomyFactors;
              const hasData = f && Object.keys(f).length > 0;
              
              // Determinar el área específica por equipo (si es "Vista General" hay que tratar de deducirlo, si no usamos generalAreaName)
              let rowAreaName = generalAreaName;
              if (!rowAreaName) {
                const tName = team.name?.toLowerCase() || "";
                if (tName.includes("cazador") || tName.includes("cuchilla") || tName.includes("mash") || tName.includes("mosto") || tName.includes("panchito")) rowAreaName = "Cocimientos";
                else if (tName.includes("andamos") || tName.includes("bronco") || tName.includes("bravos") || tName.includes("fuertes") || tName.includes("reyes")) rowAreaName = "Cuartos Fríos";
                else if (tName.includes("munich") || tName.includes("nahuales")) rowAreaName = "Mantenimiento";
                else rowAreaName = "Planta";
              }

              return (
                <tr key={idx} className="hover:bg-slate-50 hover:shadow-md transition-all duration-300 transform hover:-translate-y-[1px] relative z-10 group">
                  <td className={cn("p-2 border border-slate-200 font-bold uppercase tracking-wider text-[10px]", getAreaColor(rowAreaName))}>{rowAreaName}</td>
                  <td className="p-2 border border-slate-200 font-bold text-left text-slate-800 bg-white group-hover:bg-slate-50 uppercase tracking-widest text-[10px] transition-colors group/cell">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={getTeamLogoUrl(team.name)} alt={team.name} className="w-8 h-8 rounded-full border border-slate-200 shadow-sm object-cover bg-slate-50 group-hover:scale-110 transition-transform duration-300" />
                        <span>{team.name}</span>
                      </div>
                      <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity">
                        {canEditBpre && (
                          <BpreEditorDialog 
                            teamKey={normalizarNombreEquipo(team.name || '')} 
                            teamName={team.name || ''} 
                            currentFactors={f || {}} 
                            currentFase={team.faseActual}
                            currentFecha={team.fechaCompromiso}
                            puedeEditar={true} 
                            isGeneral={false} 
                            teamOperators={area.operadores?.filter(op => op.equipoAutonomo?.toUpperCase() === team.name?.toUpperCase())} 
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-2 border border-slate-200 font-medium text-left text-slate-700 bg-white group-hover:bg-slate-50 uppercase tracking-widest text-[10px] transition-colors">{team.leader || '-'}</td>
                  
                  {hasData ? (
                    <>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.dinamica))}>{f.dinamica || '-'}</div></td>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.liderazgo))}>{f.liderazgo || '-'}</div></td>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.skap))}>{f.skap || '-'}</div></td>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.ato))}>{f.ato || '-'}</div></td>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.seguridad))}>{f.seguridad || '-'}</div></td>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.quas))}>{f.quas || '-'}</div></td>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.multihab))}>{f.multihab || '-'}</div></td>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.vpo))}>{f.vpo || '-'}</div></td>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.solucionProb))}>{f.solucionProb || '-'}</div></td>
                      <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getCellColor(f.infraest))}>{f.infraest || '-'}</div></td>
                    </>
                  ) : (
                    <td colSpan={10} className="p-2 border border-slate-200 text-slate-400 italic bg-slate-50 text-[11px]">Sin datos registrados</td>
                  )}
                  
                  <td className={cn("p-0 border border-slate-200 text-[11px]")}><div className={cn("w-full h-full p-2 hover:opacity-80 transition-opacity duration-300 cursor-default", getFaseColor(team.faseActual))}>{team.faseActual || 'NA'}</div></td>
                  <td className={cn("p-0 border border-slate-200 text-[9px] font-bold text-center text-slate-600")}><div className="w-full h-full p-2 flex items-center justify-center">{team.fechaCompromiso || 'No definida'}</div></td>
                </tr>
              );
            })}
            
            {(area.teamRankings || []).length === 0 && (
              <tr>
                <td colSpan={15} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">
                  No hay equipos disponibles en esta área.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded shadow-sm block bg-gradient-to-br from-[#c6efce] to-[#a0d6a8]"></span> Fase 2</div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded shadow-sm block bg-gradient-to-br from-[#00b050] to-[#008a3d]"></span> Fase 3</div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded shadow-sm block bg-gradient-to-br from-[#0099ff] to-[#007acc]"></span> Fase 4</div>
      </div>
    </div>
  );
}
