import React, { useState } from "react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Clock, LayoutTemplate, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Brecha {
  desc: string;
  nivel: string;
  origen: string;
  pilar: string;
  estado: string;
  fechaCierre: string | null;
  accion: string;
  kpi?: string;
  fechaDeteccion?: string | null;
  ganancia?: string;
  evidencia?: string;
}

interface OperatorBrechasDialogProps {
  operatorName: string;
  operatorId: string;
  brechasDetalle?: Brecha[];
}

export function OperatorBrechasDialog({ operatorName, operatorId, brechasDetalle = [] }: OperatorBrechasDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filterPilar, setFilterPilar] = useState("Todos");
  const [filterOrigen, setFilterOrigen] = useState("Todos");

  const uniquePilares = Array.from(new Set(brechasDetalle.map(b => b.pilar).filter(Boolean))).sort();
  const uniqueOrigenes = Array.from(new Set(brechasDetalle.map(b => b.origen).filter(Boolean))).sort();

  const filteredBrechas = brechasDetalle.filter(b => {
    const matchesSearch = (b.desc || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.pilar || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.origen || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = filterEstado === "Todos" || b.estado === filterEstado;
    const matchesPilar = filterPilar === "Todos" || b.pilar === filterPilar;
    const matchesOrigen = filterOrigen === "Todos" || b.origen === filterOrigen;

    return matchesSearch && matchesEstado && matchesPilar && matchesOrigen;
  });

  const stats = brechasDetalle.reduce((acc, b) => {
    if (b.estado === "Completado") acc.completadas++;
    else acc.enProceso++;
    return acc;
  }, { completadas: 0, enProceso: 0, total: brechasDetalle.length });

  return (
    <div className="flex flex-col h-full space-y-6">
      <DialogHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 p-2.5 rounded-xl border border-blue-200 shadow-sm">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span>CIERRE DE BRECHAS</span>
              </div>
              <DialogTitle className="text-2xl font-black text-[#1a4491] leading-tight uppercase tracking-tight mt-0.5">
                {operatorName}
              </DialogTitle>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                ID: {operatorId}
              </div>
            </div>
          </div>
          <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-center">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</div>
              <div className="text-lg font-black text-slate-700 leading-none">{stats.total}</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Cerradas</div>
              <div className="text-lg font-black text-emerald-600 leading-none">{stats.completadas}</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-0.5">En Proceso</div>
              <div className="text-lg font-black text-amber-600 leading-none">{stats.enProceso}</div>
            </div>
          </div>
        </div>
      </DialogHeader>

      <div className="flex-1 min-h-0 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-slate-400" />
            Detalle de Brechas
          </h3>
          <div className="flex items-center gap-2">
            <select 
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Todos">Todos (Estado)</option>
              <option value="Completado">Completado</option>
              <option value="En Proceso">En Proceso</option>
            </select>
            
            <select 
              value={filterPilar}
              onChange={(e) => setFilterPilar(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 max-w-[120px] cursor-pointer"
            >
              <option value="Todos">Todos (Pilar)</option>
              {uniquePilares.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            
            <select 
              value={filterOrigen}
              onChange={(e) => setFilterOrigen(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 max-w-[120px] cursor-pointer"
            >
              <option value="Todos">Todos (Origen)</option>
              {uniqueOrigenes.map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            <div className="relative w-64 ml-2">
              <input 
                type="text"
                placeholder="Buscar brecha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 placeholder-slate-400"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex-1 flex flex-col">
          <div className="overflow-y-auto max-h-[50vh] flex-1 custom-scrollbar">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-slate-500 sticky top-0 z-10 font-bold uppercase tracking-wider text-[9px]">
                <tr>
                  <th className="p-3 border-b border-slate-200">Estado</th>
                  <th className="p-3 border-b border-slate-200">Descripción del Item</th>
                  <th className="p-3 border-b border-slate-200">Pilar / KPI</th>
                  <th className="p-3 border-b border-slate-200">Origen / Nivel</th>
                  <th className="p-3 border-b border-slate-200">Acción para cerrar</th>
                  <th className="p-3 border-b border-slate-200">Fechas (Det. / Prog.)</th>
                  <th className="p-3 border-b border-slate-200">Evidencia / Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBrechas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      No se encontraron brechas
                    </td>
                  </tr>
                ) : (
                  filteredBrechas.map((brecha, idx) => (
                    <React.Fragment key={idx}>
                      <tr 
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      >
                        <td className="p-3 align-middle">
                          <div className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-md border font-black uppercase text-[9px] shadow-sm whitespace-nowrap",
                            brecha.estado === "Completado" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-amber-50 text-amber-600 border-amber-200"
                          )}>
                            {brecha.estado === "Completado" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {brecha.estado}
                          </div>
                        </td>
                        <td className="p-3 align-middle font-medium text-slate-700 max-w-xs">
                          <div className="line-clamp-3" title={brecha.desc}>{brecha.desc || "-"}</div>
                        </td>
                        <td className="p-3 align-middle font-bold text-slate-600 uppercase text-[9px]">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-slate-700">{brecha.pilar || "-"}</span>
                            <span className="text-[8px] text-slate-400 font-semibold">{brecha.kpi || "Sin KPI"}</span>
                          </div>
                        </td>
                        <td className="p-3 align-middle">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-600 uppercase text-[9px]">{brecha.origen || "-"}</span>
                            <span className="text-[8px] text-slate-400 font-semibold">{brecha.nivel || "-"}</span>
                          </div>
                        </td>
                        <td className="p-3 align-middle font-medium text-slate-600 text-[10px] max-w-[200px]">
                          <div className="line-clamp-3 italic" title={brecha.accion}>{brecha.accion || "-"}</div>
                        </td>
                        <td className="p-3 align-middle font-bold text-slate-600 text-[9px] whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400">Det: {brecha.fechaDeteccion || "-"}</span>
                            <span className="text-slate-700">Prog: {brecha.fechaCierre || "-"}</span>
                          </div>
                        </td>
                        <td className="p-3 align-middle font-medium text-slate-600 text-[9px] max-w-[150px] relative pr-8">
                          <div className="flex flex-col gap-1">
                            <span className="truncate italic" title={brecha.evidencia}>{brecha.evidencia || "-"}</span>
                            <span className="text-[8px] text-emerald-600 font-bold uppercase truncate" title={brecha.ganancia}>{brecha.ganancia || "-"}</span>
                          </div>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-slate-500 transition-colors">
                            {expandedRow === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </td>
                      </tr>
                      {expandedRow === idx && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-slate-200 bg-slate-50 shadow-inner">
                            <div className="p-5 flex flex-col gap-4 text-xs text-slate-700 animate-in slide-in-from-top-1 duration-200">
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <strong className="text-slate-900 block mb-1">Descripción Completa:</strong>
                                  <p className="whitespace-pre-wrap leading-relaxed">{brecha.desc || "Sin descripción"}</p>
                                </div>
                                <div>
                                  <strong className="text-slate-900 block mb-1">Acción para Cerrar:</strong>
                                  <p className="whitespace-pre-wrap leading-relaxed italic">{brecha.accion || "Sin acción definida"}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-200/60">
                                <div>
                                  <strong className="text-slate-900 block mb-1">Evidencia de Cierre:</strong>
                                  <p className="whitespace-pre-wrap leading-relaxed">{brecha.evidencia || "N/A"}</p>
                                </div>
                                <div>
                                  <strong className="text-slate-900 block mb-1">Ganancia Esperada:</strong>
                                  <p className="whitespace-pre-wrap leading-relaxed text-emerald-700 font-medium">{brecha.ganancia || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
