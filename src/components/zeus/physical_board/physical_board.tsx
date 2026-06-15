import { useState, useMemo, useEffect } from "react";
import { Search, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Operator } from "@/data/zeus";
import { OperatorRow } from "./operator_row";
import { normalize_string } from "./utils";
import { STRINGS } from "./constants";


export interface PhysicalBoardProps {
  operadores: (Operator & { autonomyScore: number })[];
  show_ato?: boolean;
  puedeEditar?: boolean; // Nueva prop para controlar la edición
}

export function PhysicalBoard({ operadores, show_ato = true, puedeEditar = false }: PhysicalBoardProps) {
  const [search_query, set_search_query] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setVisibleCount(10);
  }, [search_query]);

  const filtered_operators = useMemo(() => {
    const indexed_operators = operadores.map((operator, index) => ({ operator, original_index: index }));

    if (!search_query.trim()) {
      return indexed_operators;
    }

    const normalized_query = normalize_string(search_query.trim());

    return indexed_operators.filter(({ operator }) =>
      normalize_string(operator.nombre).includes(normalized_query) ||
      normalize_string(operator.equipoAutonomo || "").includes(normalized_query) ||
      normalize_string(operator.lider || "").includes(normalized_query)
    );
  }, [operadores, search_query]);

  const visibleOperators = useMemo(() => {
    return filtered_operators.slice(0, visibleCount);
  }, [filtered_operators, visibleCount]);

  return (
    <div className="w-full space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search_query}
          onChange={(event) => set_search_query(event.target.value)}
          placeholder={STRINGS.SEARCH_PLACEHOLDER}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-[#1a4491] focus:outline-none focus:ring-2 focus:ring-[#1a4491]/20 transition-colors"
        />
        {search_query && (
          <button
            onClick={() => set_search_query("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl border border-white/40 bg-white/60 backdrop-blur-md shadow-xl overflow-x-auto custom-scrollbar"
      >
        <table 
          className="w-full table-fixed border-collapse text-left text-sm"
          style={{ minWidth: show_ato ? "1696px" : "1568px" }}
        >
          <thead className="sticky top-0 z-30">
            <tr className="bg-[#1a4491] text-xs font-bold text-white uppercase tracking-wider">
              <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-16 text-center z-30">#</th>
              <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-64 z-30">OPERADOR</th>
              <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-40 text-center z-30">EQUIPO AUTONOMO</th>
              <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-48 text-center z-30">CAPABILITIES</th>
              <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-48 z-30">MULTI-HABILIDAD</th>
              <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-28 text-center z-30">CHAMPIONS</th>
              {show_ato && <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-32 text-center z-30">ATO</th>}
              <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-44 z-30">IPs ASIGNADOS</th>
              <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-64 z-30">PRE REQUISITOS</th>
              <th className="sticky top-0 bg-[#1a4491] border-b p-3 w-40 text-center z-30">NIVEL AUTONOMIA</th>
            </tr>
          </thead>
          <tbody>
            {visibleOperators.map(({ operator, original_index }, visual_index) => (
              <OperatorRow
                key={operator.id}
                operator={operator}
                original_index={original_index}
                visual_index={visual_index}
                show_ato={show_ato}
                puedeEditar={puedeEditar}
                team_members={operadores
                  .filter(op => op.equipoAutonomo && op.equipoAutonomo === operator.equipoAutonomo && op.id !== operator.id)
                  .map(op => ({ id: op.id, name: op.nombre }))
                }
                full_team_members={operadores
                  .filter(op => op.equipoAutonomo && op.equipoAutonomo === operator.equipoAutonomo)
                  .map(op => ({ id: op.id, name: op.nombre, puesto: op.puesto, score: op.autonomyScore, lastAssessmentDate: op.lastAssessmentDate, noEvaluado: op.noEvaluado }))
                }
              />
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Botones de Paginación para Optimización de Rendimiento */}
      {filtered_operators.length > visibleCount && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <button
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="px-5 py-2 text-xs font-black uppercase tracking-wider text-[#1a4491] bg-white border border-[#1a4491] rounded-lg shadow-sm hover:bg-slate-50 transition-colors cursor-pointer animate-fade-in"
          >
            Cargar 10 más (Mostrando {visibleCount} de {filtered_operators.length})
          </button>
          <button
            onClick={() => setVisibleCount(filtered_operators.length)}
            className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#1a4491] border border-transparent rounded-lg shadow-sm hover:bg-[#1a4491]/90 transition-colors cursor-pointer animate-fade-in"
          >
            Mostrar todos
          </button>
        </div>
      )}
    </div>
  );
}
