import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, PlayCircle, HelpCircle, Users } from "lucide-react";
import type { AreaData } from "@/data/zeus";

interface CursosCardDetailsProps {
  area: AreaData;
}

export function CursosCardDetails({ area }: CursosCardDetailsProps) {
  // Filtrar operadores con cursos asignados
  const operadoresConCursos = area.operadores.filter(
    (op) => op.cursosTotal !== undefined && op.cursosTotal > 0
  );

  // Opción 1: Resumen de Cursos del Área
  let totalCursos = 0;
  let totalAprobados = 0;
  let totalEnProgreso = 0;
  let totalPendientes = 0;

  operadoresConCursos.forEach((op) => {
    totalCursos += op.cursosTotal || 0;
    totalAprobados += op.cursosAprobados || 0;
    totalEnProgreso += op.cursosEnProgreso || 0;
    totalPendientes += op.cursosPendientes || 0;
  });

  const pctAprobados = totalCursos > 0 ? (totalAprobados / totalCursos) * 100 : 0;
  const pctEnProgreso = totalCursos > 0 ? (totalEnProgreso / totalCursos) * 100 : 0;
  const pctPendientes = totalCursos > 0 ? (totalPendientes / totalCursos) * 100 : 0;

  // Opción 2: Distribución de Operadores por Nivel
  let oro = 0; // 100%
  let plata = 0; // 80% - 99%
  let bronce = 0; // < 80%

  operadoresConCursos.forEach((op) => {
    const progress = op.cursosProgress ?? 0;
    if (progress >= 100) {
      oro++;
    } else if (progress >= 80) {
      plata++;
    } else {
      bronce++;
    }
  });

  const totalOps = operadoresConCursos.length;
  const pctOro = totalOps > 0 ? (oro / totalOps) * 100 : 0;
  const pctPlata = totalOps > 0 ? (plata / totalOps) * 100 : 0;
  const pctBronce = totalOps > 0 ? (bronce / totalOps) * 100 : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
    >
      {/* Header */}
      <header className="flex items-center justify-between bg-gradient-to-r from-purple-700 to-indigo-800 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <BookOpen className="h-5 w-5 text-purple-200" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight">Detalle de Capacitación</h2>
            <p className="text-[9px] font-black text-purple-200/70 uppercase tracking-widest">
              Distribución y avance del plan de cursos
            </p>
          </div>
        </div>
        <div className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-100">
          {area.team === "Vista General" ? "General" : area.team}
        </div>
      </header>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2 md:divide-x md:divide-slate-100">
        
        {/* Columna 1: Resumen de Cursos */}
        <div className="flex flex-col space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Cursos del Departamento
          </h3>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-800">{totalAprobados}</span>
              <span className="text-xs font-semibold text-slate-400 ml-1">/ {totalCursos} aprobados</span>
            </div>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
              {pctAprobados.toFixed(1)}% Avance
            </span>
          </div>

          {/* Barra acumulada segmentada */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
            <div 
              style={{ width: `${pctAprobados}%` }} 
              className="h-full bg-purple-600 transition-all duration-500" 
              title={`Aprobados: ${pctAprobados.toFixed(1)}%`}
            />
            <div 
              style={{ width: `${pctEnProgreso}%` }} 
              className="h-full bg-amber-400 transition-all duration-500" 
              title={`En Progreso: ${pctEnProgreso.toFixed(1)}%`}
            />
            <div 
              style={{ width: `${pctPendientes}%` }} 
              className="h-full bg-slate-300 transition-all duration-500" 
              title={`Pendientes: ${pctPendientes.toFixed(1)}%`}
            />
          </div>

          {/* Desglose de Cursos */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Aprobados */}
            <div className="flex flex-col rounded-lg bg-purple-50/50 p-2 border border-purple-100/50">
              <div className="flex items-center gap-1.5 text-purple-700 mb-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Aprobados</span>
              </div>
              <span className="text-sm font-extrabold text-slate-700">{totalAprobados}</span>
              <span className="text-[9px] font-semibold text-slate-400">{pctAprobados.toFixed(1)}%</span>
            </div>

            {/* En Progreso */}
            <div className="flex flex-col rounded-lg bg-amber-50/50 p-2 border border-amber-100/50">
              <div className="flex items-center gap-1.5 text-amber-600 mb-0.5">
                <PlayCircle className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">En Progreso</span>
              </div>
              <span className="text-sm font-extrabold text-slate-700">{totalEnProgreso}</span>
              <span className="text-[9px] font-semibold text-slate-400">{pctEnProgreso.toFixed(1)}%</span>
            </div>

            {/* Pendientes */}
            <div className="flex flex-col rounded-lg bg-slate-50 p-2 border border-slate-150">
              <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Pendientes</span>
              </div>
              <span className="text-sm font-extrabold text-slate-700">{totalPendientes}</span>
              <span className="text-[9px] font-semibold text-slate-400">{pctPendientes.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Columna 2: Distribución de Operadores */}
        <div className="flex flex-col space-y-4 md:pl-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Estatus de Operadores
            </h3>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
              <Users className="h-3.5 w-3.5" />
              <span>{totalOps} Eval.</span>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            {/* Completado (100%) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-purple-700 uppercase tracking-wide">
                  Completado (100%)
                </span>
                <span className="font-extrabold text-slate-700">
                  {oro} <span className="text-[10px] font-medium text-slate-400">({pctOro.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div 
                  style={{ width: `${pctOro}%` }} 
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500" 
                />
              </div>
            </div>

            {/* En Progreso (80% - 99%) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-amber-600 uppercase tracking-wide">
                  En Progreso (80% - 99%)
                </span>
                <span className="font-extrabold text-slate-700">
                  {plata} <span className="text-[10px] font-medium text-slate-400">({pctPlata.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div 
                  style={{ width: `${pctPlata}%` }} 
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500" 
                />
              </div>
            </div>

            {/* En Progreso (< 80%) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wide">
                  En Progreso (&lt; 80%)
                </span>
                <span className="font-extrabold text-slate-700">
                  {bronce} <span className="text-[10px] font-medium text-slate-400">({pctBronce.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div 
                  style={{ width: `${pctBronce}%` }} 
                  className="h-full rounded-full bg-gradient-to-r from-slate-350 to-slate-400 transition-all duration-500" 
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.section>
  );
}
