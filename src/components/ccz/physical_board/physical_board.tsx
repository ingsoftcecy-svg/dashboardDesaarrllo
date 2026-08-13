import { useState, useMemo, useEffect } from "react";
import { Search, X, Download } from "lucide-react";
import { motion } from "framer-motion";
import type { Operator } from "@/data/ccz";
import { OperatorRow } from "./operator_row";
import { normalize_string } from "./utils";
import { STRINGS } from "./constants";
import { cn } from "@/lib/utils";


export interface PhysicalBoardProps {
  operadores: (Operator & { autonomyScore: number })[];
  show_ato?: boolean;
  puedeEditar?: boolean; // Nueva prop para controlar la edición
  teamRankings?: any[];
  metricMode?: "autonomia" | "cursos" | "guias" | "cierre-brecha";
}

export function PhysicalBoard({ operadores, show_ato = true, puedeEditar = false, teamRankings = [], metricMode = "autonomia" }: PhysicalBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterPuesto, setFilterPuesto] = useState("Todos");
  const [filterEquipo, setFilterEquipo] = useState("Todos");
  const [filterTipoGuia, setFilterTipoGuia] = useState("Todos");
  const [visibleCount, setVisibleCount] = useState(10);

  const uniquePuestos = useMemo(() => Array.from(new Set(operadores.map(o => o.puesto).filter(Boolean))).sort(), [operadores]);
  const uniqueEquipos = useMemo(() => Array.from(new Set(operadores.map(o => o.equipoAutonomo).filter(Boolean))).sort(), [operadores]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setVisibleCount(10);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredOperadores = useMemo(() => {
    const term = normalize_string(debouncedSearch.trim());
    const indexed = operadores.map((operator, index) => ({ operator, original_index: index }));
    
    return indexed.filter(({ operator }) => {
      const matchesSearch = !term || (
        normalize_string(operator.nombre).includes(term) ||
        normalize_string(operator.puesto || "").includes(term) ||
        normalize_string(operator.equipoAutonomo || "").includes(term)
      );

      const matchesPuesto = filterPuesto === "Todos" || operator.puesto === filterPuesto;
      const matchesEquipo = filterEquipo === "Todos" || operator.equipoAutonomo === filterEquipo;
      
      let matchesTipoGuia = true;
      if (metricMode === "guias" && filterTipoGuia !== "Todos") {
        const isMejorado = (operator as any).tipoGuia === "MEJORADO" || (operator.guiasL7Progress && operator.guiasL7Progress > 0) || (operator.guiasL8Progress && operator.guiasL8Progress > 0);
        const opTipo = isMejorado ? "Mejorado" : "Competente";
        matchesTipoGuia = filterTipoGuia === opTipo;
      }

      return matchesSearch && matchesPuesto && matchesEquipo && matchesTipoGuia;
    });
  }, [operadores, debouncedSearch, filterPuesto, filterEquipo, filterTipoGuia, metricMode]);

  const visibleOperators = useMemo(() => {
    return filteredOperadores.slice(0, visibleCount);
  }, [filteredOperadores, visibleCount]);

  const headerBgClass = metricMode === "cursos" ? "bg-purple-800" : metricMode === "guias" ? "bg-emerald-800" : metricMode === "cierre-brecha" ? "bg-blue-800" : "bg-[#1a4491]";

  return (
    <div className="flex flex-col gap-4">
      {/* 🔍 BARRA DE BÚSQUEDA Y EXPORTAR */}
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full max-w-3xl">
          <select
            value={filterEquipo}
            onChange={(e) => setFilterEquipo(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all focus:border-[#1a4491] focus:ring-1 focus:ring-[#1a4491] outline-none cursor-pointer max-w-[160px] truncate"
          >
            <option value="Todos">Todos los Equipos</option>
            {uniqueEquipos.map(eq => <option key={eq as string} value={eq as string}>{eq as string}</option>)}
          </select>
          
          <select
            value={filterPuesto}
            onChange={(e) => setFilterPuesto(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all focus:border-[#1a4491] focus:ring-1 focus:ring-[#1a4491] outline-none cursor-pointer max-w-[160px] truncate"
          >
            <option value="Todos">Todos los Puestos</option>
            {uniquePuestos.map(p => <option key={p as string} value={p as string}>{p as string}</option>)}
          </select>

          {metricMode === "guias" && (
            <select
              value={filterTipoGuia}
              onChange={(e) => setFilterTipoGuia(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all focus:border-[#1a4491] focus:ring-1 focus:ring-[#1a4491] outline-none cursor-pointer max-w-[140px]"
            >
              <option value="Todos">Todos (Nivel)</option>
              <option value="Competente">Competentes</option>
              <option value="Mejorado">Mejorados</option>
            </select>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder={STRINGS.SEARCH_PLACEHOLDER}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-[#1a4491] focus:ring-1 focus:ring-[#1a4491] outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>
      </div>


      {/* 📋 TABLA FÍSICA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl border border-white/40 bg-white/60 backdrop-blur-md shadow-xl overflow-x-auto custom-scrollbar"
      >
        <table
          className="w-full table-fixed border-collapse text-left text-sm"
          style={{ minWidth: metricMode === "autonomia" ? (show_ato ? "1696px" : "1568px") : metricMode === "cursos" ? (show_ato ? "1456px" : "1328px") : metricMode === "guias" ? "1024px" : metricMode === "cierre-brecha" ? "1500px" : "1100px" }}
        >
          <thead className="sticky top-0 z-30">
            <tr className={cn("text-xs font-bold text-white uppercase tracking-wider", headerBgClass)}>
              <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-16 text-center z-30 transition-colors duration-300", headerBgClass)}>#</th>
              <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-64 z-30 transition-colors duration-300", headerBgClass)}>OPERADOR</th>
              <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-40 text-center z-30 transition-colors duration-300", headerBgClass)}>EQUIPO AUTONOMO</th>
              
              {metricMode === "guias" ? (
                <>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-32 text-center z-30 transition-colors duration-300", headerBgClass)}>L6</th>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-32 text-center z-30 transition-colors duration-300", headerBgClass)}>L7</th>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-32 text-center z-30 transition-colors duration-300", headerBgClass)}>L8</th>
                  <th className={cn("sticky top-0 border-b border-slate-300 p-3 w-40 text-center z-30 transition-colors duration-300", headerBgClass)}>PROGRESO TOTAL</th>
                </>
              ) : metricMode === "cierre-brecha" ? (
                <>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-48 text-center z-30 transition-colors duration-300", headerBgClass)}>HABILIDADES</th>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-48 text-center z-30 transition-colors duration-300", headerBgClass)}>MULTI-HABILIDAD</th>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-28 text-center z-30 transition-colors duration-300", headerBgClass)}>TOTAL</th>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-28 text-center z-30 transition-colors duration-300", headerBgClass)}>COMPLETADAS</th>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-28 text-center z-30 transition-colors duration-300", headerBgClass)}>EN PROCESO</th>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-44 text-center z-30 transition-colors duration-300", headerBgClass)}>PROGRESO DE CIERRE</th>
                  <th className={cn("sticky top-0 border-b border-slate-300 p-3 w-40 text-center z-30 transition-colors duration-300", headerBgClass)}>FOCO PRINCIPAL (PILAR)</th>
                </>
              ) : (
                <>
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-48 text-center z-30 transition-colors duration-300", headerBgClass)}>HABILIDADES</th>
                  {metricMode === "autonomia" && (
                    <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-40 text-center z-30 transition-colors duration-300", headerBgClass)}>PROMEDIO DE HABILIDADES</th>
                  )}
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-48 z-30 transition-colors duration-300", headerBgClass)}>MULTI-HABILIDAD</th>
                  {metricMode === "autonomia" && <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-28 text-center z-30 transition-colors duration-300", headerBgClass)}>CHAMPIONS</th>}
                  {show_ato && <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-32 text-center z-30 transition-colors duration-300", headerBgClass)}>ATO</th>}
                  <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-44 z-30 transition-colors duration-300", headerBgClass)}>IPs ASIGNADOS</th>
                  {metricMode === "autonomia" && <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-64 z-30 transition-colors duration-300", headerBgClass)}>USABILIDAD EN HERRAMIENTAS DIGITALES</th>}
                  {metricMode === "cursos" && (
                    <>
                      <th className={cn("sticky top-0 border-b border-r border-slate-300 p-3 w-32 text-center z-30 transition-colors duration-300", headerBgClass)}>CURSOS ASIGNADOS</th>
                      <th className={cn("sticky top-0 border-b border-slate-300 p-3 w-40 text-center z-30 transition-colors duration-300", headerBgClass)}>PROGRESO CURSOS</th>
                    </>
                  )}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleOperators.length === 0 ? (
              <tr>
                <td colSpan={100} className="py-10 text-center border-b border-slate-200 bg-slate-50/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200/50 flex items-center justify-center mb-1">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Sin resultados</h3>
                    <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto">
                      No encontramos ningún operador que coincida con los filtros.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleOperators.map(({ operator, original_index }, visual_index) => (
                <OperatorRow
                  key={operator.id}
                  operator={operator}
                  original_index={original_index}
                  visual_index={visual_index}
                  show_ato={show_ato}
                  puedeEditar={puedeEditar}
                  teamRankings={teamRankings}
                  metricMode={metricMode}
                  team_members={operadores
                    .filter(op => op.equipoAutonomo && op.equipoAutonomo === operator.equipoAutonomo && op.id !== operator.id)
                    .map(op => ({ id: op.id, name: op.nombre }))
                  }
                  full_team_members={operadores
                    .filter(op => op.equipoAutonomo && op.equipoAutonomo === operator.equipoAutonomo)
                    .map(op => ({ 
                      id: op.id, 
                      name: op.nombre, 
                      puesto: op.puesto, 
                      score: op.autonomyScore, 
                      lastAssessmentDate: op.lastAssessmentDate, 
                      noEvaluado: op.noEvaluado,
                      cursosProgress: op.cursosProgress,
                      cursosAprobados: op.cursosAprobados,
                      cursosTotal: op.cursosTotal,
                      cursosEnProgreso: op.cursosEnProgreso,
                      cursosPendientes: op.cursosPendientes,
                      guiasProgress: op.guiasProgress,
                      guiasL6Progress: op.guiasL6Progress,
                      guiasL7Progress: op.guiasL7Progress,
                      guiasL8Progress: op.guiasL8Progress,
                      guiasActiveLevel: op.guiasActiveLevel,
                      brechasProgress: op.brechasProgress,
                      brechasTotal: op.brechasTotal,
                      brechasCompletadas: op.brechasCompletadas,
                      brechasDetalle: op.brechasDetalle || []
                    }))
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Botones de Paginación para Optimización de Rendimiento */}
      {filteredOperadores.length > visibleCount && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <button
            onClick={() => setVisibleCount(prev => prev + 10)}
            className={cn(
              "px-5 py-2 text-xs font-black uppercase tracking-wider bg-white border rounded-lg shadow-sm hover:bg-slate-50 transition-colors cursor-pointer animate-fade-in",
              metricMode === "cursos" 
                ? "text-purple-700 border-purple-700 hover:text-purple-800" 
                : metricMode === "guias"
                  ? "text-emerald-700 border-emerald-700 hover:text-emerald-800"
                  : metricMode === "cierre-brecha"
                    ? "text-blue-700 border-blue-700 hover:text-blue-800"
                    : "text-[#1a4491] border-[#1a4491] hover:text-[#1a4491]/90"
            )}
          >
            Cargar 10 más (Mostrando {visibleCount} de {filteredOperadores.length})
          </button>
          <button
            onClick={() => setVisibleCount(filteredOperadores.length)}
            className={cn(
              "px-5 py-2 text-xs font-black uppercase tracking-wider text-white border border-transparent rounded-lg shadow-sm transition-colors cursor-pointer animate-fade-in",
              metricMode === "cursos" 
                ? "bg-purple-700 hover:bg-purple-800" 
                : metricMode === "guias"
                  ? "bg-emerald-700 hover:bg-emerald-800"
                  : metricMode === "cierre-brecha"
                    ? "bg-blue-700 hover:bg-blue-800"
                    : "bg-[#1a4491] hover:bg-[#1a4491]/90"
            )}
          >
            Mostrar todos
          </button>
        </div>
      )}
    </div>
  );
}
