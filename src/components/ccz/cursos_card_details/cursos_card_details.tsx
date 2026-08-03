import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, PlayCircle, HelpCircle, Users } from "lucide-react";
import type { AreaData } from "@/data/ccz";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OperatorCoursesDialog } from "../physical_board/operator_courses_dialog";

interface CursosCardDetailsProps {
  area: AreaData;
  className?: string;
}

import { cn } from "@/lib/utils";

export function CursosCardDetails({ area, className }: CursosCardDetailsProps) {
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

  // Obtener los operadores con cursos pendientes ordenados por la cantidad de pendientes
  const sortedOps = [...area.operadores]
    .filter((op) => op.cursosPendientes !== undefined && op.cursosPendientes > 0)
    .sort((a, b) => (b.cursosPendientes || 0) - (a.cursosPendientes || 0));

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden", className)}
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
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 md:divide-x md:divide-slate-100">
        
        {/* Columna 1: Resumen de Cursos */}
        <div className="flex flex-col gap-5 p-1">
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Cursos del Departamento</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-[#1a4491] tracking-tight">{pctAprobados.toFixed(1)}%</span>
              <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Avance</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
              {`${totalAprobados.toLocaleString()} aprobados de ${totalCursos.toLocaleString()} asignados`}
            </p>
          </div>
 
          {/* Barra de progreso */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex shadow-sm">
            <div 
              style={{ width: `${pctAprobados}%` }} 
              className="h-full bg-purple-600 transition-all duration-500" 
            />
            <div 
              style={{ width: `${pctEnProgreso}%` }} 
              className="h-full bg-amber-400 transition-all duration-500" 
            />
            <div 
              style={{ width: `${pctPendientes}%` }} 
              className="h-full bg-slate-300 transition-all duration-500" 
            />
          </div>

          {/* Lista de Cursos Detallada */}
          <div className="flex flex-col gap-2 mt-1">
            {/* Aprobados */}
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100/70">
              <span className="flex items-center gap-2.5 font-bold text-slate-600 uppercase tracking-wide text-[10px]">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600 block shrink-0" />
                Aprobados
              </span>
              <span className="font-extrabold text-slate-700">
                {totalAprobados.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">({pctAprobados.toFixed(1)}%)</span>
              </span>
            </div>
            {/* En Progreso */}
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100/70">
              <span className="flex items-center gap-2.5 font-bold text-slate-600 uppercase tracking-wide text-[10px]">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 block shrink-0" />
                En Progreso
              </span>
              <span className="font-extrabold text-slate-700">
                {totalEnProgreso.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">({pctEnProgreso.toFixed(1)}%)</span>
              </span>
            </div>
            {/* Pendientes */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-2.5 font-bold text-slate-600 uppercase tracking-wide text-[10px]">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-350 block shrink-0" />
                Pendientes
              </span>
              <span className="font-extrabold text-slate-700">
                {totalPendientes.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">({pctPendientes.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Columna 2: Estatus de Operadores */}
        <div className="flex flex-col gap-5 p-1 md:pl-6">
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Estatus de Operadores</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800 tracking-tight">{totalOps}</span>
              <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Evaluados</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
              Distribución del avance por operador
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Completado (100%) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wide text-[10px] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500 block shrink-0" />
                  Completado (100%)
                </span>
                <span className="font-extrabold text-slate-700">{oro} <span className="text-[10px] font-normal text-slate-400">({pctOro.toFixed(0)}%)</span></span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div style={{ width: `${pctOro}%` }} className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-650 transition-all duration-500" />
              </div>
            </div>

            {/* En Progreso (80% - 99%) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wide text-[10px] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 block shrink-0" />
                  En Progreso (80% - 99%)
                </span>
                <span className="font-extrabold text-slate-700">{plata} <span className="text-[10px] font-normal text-slate-400">({pctPlata.toFixed(0)}%)</span></span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div style={{ width: `${pctPlata}%` }} className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-550 transition-all duration-500" />
              </div>
            </div>

            {/* En Progreso (< 80%) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wide text-[10px] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-450 block shrink-0" />
                  En Progreso (&lt; 80%)
                </span>
                <span className="font-extrabold text-slate-700">{bronce} <span className="text-[10px] font-normal text-slate-400">({pctBronce.toFixed(0)}%)</span></span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div style={{ width: `${pctBronce}%` }} className="h-full rounded-full bg-gradient-to-r from-slate-350 to-slate-450 transition-all duration-500" />
          </div>
        </div>
    </div>
  </div>
</div>

      {/* Operadores con Cursos Pendientes */}
      {sortedOps.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <Users className="h-4 w-4 text-slate-450" />
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Operadores con Cursos Pendientes
            </h4>
          </div>
          
          <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
            {sortedOps.map((op) => {
              // Obtener iniciales del nombre
              const iniciales = op.nombre
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
                
              return (
                <Dialog key={op.id}>
                  <DialogTrigger asChild>
                    <button 
                      className="w-full flex items-center justify-between bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors px-3 py-2 rounded-lg border border-slate-150 shadow-sm text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar con Iniciales */}
                        <div className="h-7 w-7 rounded-full bg-slate-100 group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200 uppercase shrink-0">
                          {iniciales}
                        </div>
                        
                        {/* Detalles */}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-[#1a4491] transition-colors truncate" title={op.nombre}>
                            {op.nombre}
                          </p>
                          <p className="text-[9px] text-slate-405 font-semibold uppercase tracking-wider truncate">
                            {op.puesto}
                          </p>
                        </div>
                      </div>

                      {/* Badge de Pendientes */}
                      <div className="flex items-center gap-1.5 bg-amber-50 group-hover:bg-amber-100/85 border border-amber-100 px-2.5 py-0.5 rounded-full shrink-0 transition-colors">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-wide">
                          {op.cursosPendientes} {op.cursosPendientes === 1 ? "Pendiente" : "Pendientes"}
                        </span>
                      </div>
                    </button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl border-none shadow-2xl overflow-hidden">
                    <DialogTitle className="sr-only">Cursos de {op.nombre}</DialogTitle>
                    <DialogDescription className="sr-only">Detalles de cursos y capacitaciones de {op.nombre}</DialogDescription>
                    <OperatorCoursesDialog 
                      operatorName={op.nombre}
                      operatorId={op.id}
                    />
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        </div>
      )}

    </motion.section>
  );
}
