import React, { useMemo } from "react";
import { AreaData } from "@/data/ccz";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Layers } from "lucide-react";

interface BrechasPorPilarCardProps {
  area: AreaData;
  className?: string;
}

export function BrechasPorPilarCard({ area, className = "" }: BrechasPorPilarCardProps) {
  const chartData = useMemo(() => {
    const pilarMap: Record<string, { completadas: number; enProceso: number; total: number }> = {};

    (area.operadores || []).forEach(op => {
      (op.brechasDetalle || []).forEach(brecha => {
        const pilar = brecha.pilar || "Otro";
        if (!pilarMap[pilar]) {
          pilarMap[pilar] = { completadas: 0, enProceso: 0, total: 0 };
        }
        pilarMap[pilar].total += 1;
        if (brecha.estado?.toLowerCase() === "completado" || brecha.estado?.toLowerCase() === "cerrada") {
          pilarMap[pilar].completadas += 1;
        } else {
          pilarMap[pilar].enProceso += 1;
        }
      });
    });

    // Merge similar pillars if needed (e.g., Ambiental and Medio Ambiente)
    if (pilarMap["Ambiental"] && pilarMap["Medio Ambiente"]) {
      pilarMap["Medio Ambiente"].completadas += pilarMap["Ambiental"].completadas;
      pilarMap["Medio Ambiente"].enProceso += pilarMap["Ambiental"].enProceso;
      pilarMap["Medio Ambiente"].total += pilarMap["Ambiental"].total;
      delete pilarMap["Ambiental"];
    }
    if (pilarMap["Gente"] && pilarMap["People"]) {
      pilarMap["People"].completadas += pilarMap["Gente"].completadas;
      pilarMap["People"].enProceso += pilarMap["Gente"].enProceso;
      pilarMap["People"].total += pilarMap["Gente"].total;
      delete pilarMap["Gente"];
    }

    return Object.keys(pilarMap)
      .map(key => ({
        name: key.length > 12 ? key.substring(0, 12) + "..." : key,
        fullName: key,
        ...pilarMap[key]
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7); // Show top 7 pillars
  }, [area]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-white">
          <p className="font-bold text-sm mb-2">{data.fullName}</p>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Cerradas:</span>
              <span className="font-bold text-emerald-400">{data.completadas}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-slate-300">En Proceso:</span>
              <span className="font-bold text-amber-400">{data.enProceso}</span>
            </div>
            <div className="mt-1 pt-1 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Total Brechas</span>
              <span>{data.total}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-blue-600 to-cyan-700 text-white p-3 border-b border-cyan-800">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
          <Layers className="h-4 w-4 opacity-80" />
          Distribución de Brechas por Pilar
        </h3>
        <p className="text-[10px] text-cyan-100/70 font-medium mt-1">
          Top pilares con mayor volumen de brechas detectadas.
        </p>
      </div>
      
      <div className="flex-1 p-4 min-h-[300px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }}
              />
              <Bar dataKey="completadas" name="Completadas" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={32} />
              <Bar dataKey="enProceso" name="En Proceso" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Sin datos para mostrar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
