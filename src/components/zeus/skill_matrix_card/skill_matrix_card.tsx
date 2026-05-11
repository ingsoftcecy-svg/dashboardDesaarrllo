import { useState } from "react";
import { Users, Search } from "lucide-react";
import type { Operator } from "@/data/zeus";
import { STRINGS } from "./constants";
import { OperatorItem } from "./operator_item";

interface SkillMatrixCardProps {
  operadores: Operator[];
}

export function SkillMatrixCard({ operadores }: SkillMatrixCardProps) {
  const [search_term, set_search_term] = useState("");

  const filtered_operadores = operadores.filter((operator) => {
    const term = search_term.toLowerCase();
    return (
      operator.nombre.toLowerCase().includes(term) ||
      operator.puesto.toLowerCase().includes(term)
    );
  });

  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-md transition hover:shadow-lg">
      <header className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-yellow-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-blue-900">{STRINGS.TITLE}</h2>
              <p className="text-[10px] text-slate-500">{STRINGS.SUBTITLE}</p>
            </div>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-900">
            {filtered_operadores.length} / {operadores.length}
          </span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={STRINGS.SEARCH_PLACEHOLDER}
            value={search_term}
            onChange={(e) => set_search_term(e.target.value)}
            className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </header>

      <div className="flex flex-col gap-1 overflow-y-auto p-2">
        {filtered_operadores.length > 0 ? (
          filtered_operadores.map((operator) => (
            <OperatorItem key={operator.id} operator={operator} />
          ))
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            {STRINGS.EMPTY_RESULTS}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-around border-t border-slate-100 px-3 py-2 text-[10px] font-medium">
        <span className="flex items-center gap-1 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-green-500" /> {STRINGS.LEGEND_BASIC}
        </span>
        <span className="flex items-center gap-1 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-yellow-400" /> {STRINGS.LEGEND_INTERMEDIATE}
        </span>
        <span className="flex items-center gap-1 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-blue-700" /> {STRINGS.LEGEND_ADVANCED}
        </span>
      </footer>
    </section>
  );
}
