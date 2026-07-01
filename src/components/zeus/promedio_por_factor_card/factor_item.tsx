import { useState } from "react";
import { motion } from "framer-motion";
import { AutonomyGauge } from "@/components/zeus/autonomy_card";
import type { Operator } from "@/data/zeus";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Star, 
  UserCheck, 
  Award,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FactorItemProps {
  factorKey: string;
  label: string;
  value: number;
  index: number;
  operadores: Operator[];
  areaName: string;
}

const REQUISITOS_FASES: Record<string, Record<number, string>> = {
  dinamica: {
    0: "Integrantes variables",
    1: "Integrantes fijos y dinámica de equipo en Formación",
    2: "Dinámica de equipo en Tormenta",
    3: "Dinámica de equipo en Normalización",
    4: "Dinámica de equipo en Desempeño"
  },
  liderazgo: {
    0: "Rol de supervisión",
    1: "Liderazgo en Formación",
    2: "Liderazgo en Tormenta",
    3: "Liderazgo en Normalización",
    4: "Liderazgo en Desempeño"
  },
  skap: {
    0: "Licencia para Operar",
    1: "25% Operadores con promedio de habilidades Intermedias ≥85%",
    2: "75% Operadores con promedio de habilidades Intermedias ≥85%",
    3: "33% Operadores con promedio de habilidades Avanzadas ≥85%",
    4: "75% Operadores con promedio de habilidades Avanzadas ≥85%"
  },
  ato: {
    0: "N.A. (No Aplica)",
    1: "Nivel 4 en 25% de las máquinas aplicables",
    2: "Nivel 4 en 75% de las máquinas aplicables",
    3: "Nivel 4 en 100% de máquinas aplicables AND Nivel 8 en 50% de las máquinas aplicables",
    4: "Nivel 8 en 75% de las máquinas aplicables"
  },
  seguridad: {
    0: "Dueños de Territorio no definidos, Equipo no integrado, sin Licencia para Operar",
    1: "Todos los territorios del Equipo en Fase 1 Link de Acadia con requisitos de certificación",
    2: "Todos los territorios del Equipo en Fase 2 Link de Acadia con requisitos de certificación",
    3: "Todos los territorios del Equipo en Fase 3 Link de Acadia con requisitos de certificación",
    4: "Todos los territorios del Equipo en Fase 4 Link de Acadia con requisitos de certificación"
  },
  quas: {
    0: "N.A.",
    1: "Equipo informado de resultados de Calidad",
    2: "Equipo certificado en métodos mínimos transferibles de Calidad en la fuente",
    3: "Equipo certificado en todos los controles de Calidad aplicables",
    4: "Equipo propone e implementa ideas de mejora en Calidad soportadas en herramientas de solución de problemas y ETO digital"
  },
  multihab: {
    0: "Sin multihabilidad",
    1: "1x1 (Todos los operadores capacitados en al menos 1 posición)",
    2: "1x1 + 10% operadores con nivel 2x2 (capacitados en al menos 2 posiciones)",
    3: "100% operadores con nivel 2x2 + 10% operadores con nivel 3x3 (capacitados en al menos 3 posiciones)",
    4: "100% operadores con nivel 3x3"
  },
  vpo: {
    0: "Facilitado por el líder",
    1: "Facilitado por el líder",
    2: "Facilitado por el líder + Operadores Champions (Champions asignados a pilares foco)",
    3: "Facilitado por el líder + Operadores Champions CERTIFICADOS en Supply Training de su pilar y ejecutando toolkit",
    4: "Facilitado por el líder + Operadores Champions CERTIFICADOS en Supply Training de su pilar y ejecutando toolkit"
  },
  solucionProb: {
    0: "Pobre",
    1: "Primera línea ejecuta plan de reacción o activa 5Ws (Requisitos de pilares 1.9.1.1 - 1.9.1.2)",
    2: "Carrera de relevos efectiva y Planes de reacción actualizados. Reducción de recurrencia de problemas (Pilares 1.9.1.3 - 1.9.1.7)",
    3: "Primera línea ayuda a encontrar causa raíz y acciones efectivas (Pilares 1.9.1.8 - 1.9.1.9)",
    4: "Primera línea usa autónomamente 5W y evidencia reducción de recurrencia (Pilares 1.9.1.11 - 1.9.1.12)"
  },
  infraest: {
    0: "Team Room",
    1: "Team Room + ETOs en Equipos sugeridos por zona o necesidad de la operación",
    2: "Team Room + ETO digital con QUAS",
    3: "Team Room + ETO digital con QUAS + Uso de herramientas básicas (IAL, ACADIA, Mangyver)",
    4: "Team Room + ETO digital con QUAS + Uso de herramientas básicas e intermedias hasta avanzadas"
  }
};

export function FactorItem({ factorKey, label, value, index, operadores, areaName }: FactorItemProps) {
  const [open, setOpen] = useState(false);

  const esMantenimiento = areaName.toUpperCase().includes("MUNICH") || 
                         areaName.toUpperCase().includes("NAHUALES") || 
                         areaName.toUpperCase().includes("TECH") || 
                         areaName.toUpperCase().includes("GUARDIANS") || 
                         areaName.toUpperCase().includes("MANTENIMIENTO");

  const esNA = esMantenimiento && (factorKey === "ato" || factorKey === "quas" || factorKey === "multihab");

  // Fase actual es la parte entera del valor del factor
  const faseActual = esNA ? 4 : Math.min(Math.floor(value), 4);
  const siguienteFase = Math.min(faseActual + 1, 4);
  const isMaxPhase = faseActual >= 4;

  // Filtrar operadores evaluados
  const evaluatedOps = (operadores || []).filter(op => !op.noEvaluado);
  const totalOps = evaluatedOps.length;

  // Lógica de cálculo dinámico para los requisitos de la Siguiente Fase
  const evaluateRequirements = () => {
    if (esNA) {
      return { 
        cumple: true, 
        detalle: "Este factor está exceptuado para el área de Mantenimiento según el estándar de la planta.",
        items: []
      };
    }

    if (totalOps === 0) {
      return {
        cumple: false,
        detalle: "No hay operadores evaluados en esta área para calcular los requisitos.",
        items: []
      };
    }

    switch (factorKey) {
      case "skap": {
        const meetIntermedio = evaluatedOps.filter(op => op.intermedio >= 85);
        const meetAvanzado = evaluatedOps.filter(op => op.avanzado >= 85);
        const pctIntermedio = (meetIntermedio.length / totalOps) * 100;
        const pctAvanzado = (meetAvanzado.length / totalOps) * 100;

        if (siguienteFase === 1) {
          const ok = pctIntermedio >= 25;
          return {
            cumple: ok,
            detalle: `Meta: 25% de operadores con Intermedio ≥ 85%. Progreso: ${pctIntermedio.toFixed(0)}% (${meetIntermedio.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.intermedio,
              meet: op.intermedio >= 85,
              label: `Intermedio: ${op.intermedio}%`
            }))
          };
        } else if (siguienteFase === 2) {
          const ok = pctIntermedio >= 75;
          return {
            cumple: ok,
            detalle: `Meta: 75% de operadores con Intermedio ≥ 85%. Progreso: ${pctIntermedio.toFixed(0)}% (${meetIntermedio.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.intermedio,
              meet: op.intermedio >= 85,
              label: `Intermedio: ${op.intermedio}%`
            }))
          };
        } else if (siguienteFase === 3) {
          const ok = pctAvanzado >= 33;
          return {
            cumple: ok,
            detalle: `Meta: 33% de operadores con Avanzado ≥ 85%. Progreso: ${pctAvanzado.toFixed(0)}% (${meetAvanzado.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.avanzado,
              meet: op.avanzado >= 85,
              label: `Avanzado: ${op.avanzado}%`
            }))
          };
        } else if (siguienteFase === 4) {
          const ok = pctAvanzado >= 75;
          return {
            cumple: ok,
            detalle: `Meta: 75% de operadores con Avanzado ≥ 85%. Progreso: ${pctAvanzado.toFixed(0)}% (${meetAvanzado.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.avanzado,
              meet: op.avanzado >= 85,
              label: `Avanzado: ${op.avanzado}%`
            }))
          };
        }
        break;
      }

      case "ato": {
        const meetAto4 = evaluatedOps.filter(op => op.ato >= 4);
        const meetAto8 = evaluatedOps.filter(op => op.ato >= 8);
        const pctAto4 = (meetAto4.length / totalOps) * 100;
        const pctAto8 = (meetAto8.length / totalOps) * 100;

        if (siguienteFase === 1) {
          const ok = pctAto4 >= 25;
          return {
            cumple: ok,
            detalle: `Meta: ATO Nivel 4 en ≥ 25% de operadores. Progreso: ${pctAto4.toFixed(0)}% (${meetAto4.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.ato,
              meet: op.ato >= 4,
              label: `Nivel ATO: ${op.ato}`
            }))
          };
        } else if (siguienteFase === 2) {
          const ok = pctAto4 >= 75;
          return {
            cumple: ok,
            detalle: `Meta: ATO Nivel 4 en ≥ 75% de operadores. Progreso: ${pctAto4.toFixed(0)}% (${meetAto4.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.ato,
              meet: op.ato >= 4,
              label: `Nivel ATO: ${op.ato}`
            }))
          };
        } else if (siguienteFase === 3) {
          const ok = pctAto4 >= 100 && pctAto8 >= 50;
          return {
            cumple: ok,
            detalle: `Meta: ATO Nivel 4 en 100% de operadores y Nivel 8 en ≥ 50%. Progreso: Nivel 4: ${pctAto4.toFixed(0)}%, Nivel 8: ${pctAto8.toFixed(0)}% (${meetAto8.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.ato,
              meet: op.ato >= 4,
              label: `Nivel ATO: ${op.ato} ${op.ato >= 8 ? "(Cumple Nivel 8)" : op.ato >= 4 ? "(Cumple Nivel 4)" : "(Pendiente)"}`
            }))
          };
        } else if (siguienteFase === 4) {
          const ok = pctAto8 >= 75;
          return {
            cumple: ok,
            detalle: `Meta: ATO Nivel 8 en ≥ 75% de operadores. Progreso: ${pctAto8.toFixed(0)}% (${meetAto8.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.ato,
              meet: op.ato >= 8,
              label: `Nivel ATO: ${op.ato}`
            }))
          };
        }
        break;
      }

      case "multihab": {
        const meet1x1 = evaluatedOps.filter(op => op.equipos && op.equipos.length >= 1);
        const meet2x2 = evaluatedOps.filter(op => op.equipos && op.equipos.length >= 2);
        const meet3x3 = evaluatedOps.filter(op => op.equipos && op.equipos.length >= 3);

        const pct1x1 = (meet1x1.length / totalOps) * 100;
        const pct2x2 = (meet2x2.length / totalOps) * 100;
        const pct3x3 = (meet3x3.length / totalOps) * 100;

        if (siguienteFase === 1) {
          const ok = pct1x1 >= 100;
          return {
            cumple: ok,
            detalle: `Meta: 100% de operadores con nivel 1x1 (≥ 1 equipo asignado). Progreso: ${pct1x1.toFixed(0)}% (${meet1x1.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.equipos?.length || 0,
              meet: (op.equipos?.length || 0) >= 1,
              label: `${op.equipos?.length || 0} equipos`
            }))
          };
        } else if (siguienteFase === 2) {
          const ok = pct1x1 >= 100 && pct2x2 >= 10;
          return {
            cumple: ok,
            detalle: `Meta: 100% en 1x1 y ≥ 10% en 2x2 (≥ 2 equipos asignados). Progreso: 1x1: ${pct1x1.toFixed(0)}%, 2x2: ${pct2x2.toFixed(0)}% (${meet2x2.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.equipos?.length || 0,
              meet: (op.equipos?.length || 0) >= 1,
              label: `${op.equipos?.length || 0} equipos ${(op.equipos?.length || 0) >= 2 ? "(Cumple 2x2)" : ""}`
            }))
          };
        } else if (siguienteFase === 3) {
          const ok = pct2x2 >= 100 && pct3x3 >= 10;
          return {
            cumple: ok,
            detalle: `Meta: 100% en 2x2 y ≥ 10% en 3x3 (≥ 3 equipos asignados). Progreso: 2x2: ${pct2x2.toFixed(0)}%, 3x3: ${pct3x3.toFixed(0)}% (${meet3x3.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.equipos?.length || 0,
              meet: (op.equipos?.length || 0) >= 2,
              label: `${op.equipos?.length || 0} equipos ${(op.equipos?.length || 0) >= 3 ? "(Cumple 3x3)" : ""}`
            }))
          };
        } else if (siguienteFase === 4) {
          const ok = pct3x3 >= 100;
          return {
            cumple: ok,
            detalle: `Meta: 100% de operadores con nivel 3x3 (≥ 3 equipos asignados). Progreso: ${pct3x3.toFixed(0)}% (${meet3x3.length} de ${totalOps} operadores).`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.equipos?.length || 0,
              meet: (op.equipos?.length || 0) >= 3,
              label: `${op.equipos?.length || 0} equipos`
            }))
          };
        }
        break;
      }

      case "vpo": {
        const meetChampions = evaluatedOps.filter(op => op.champions && op.champions.length > 0);
        const ok = meetChampions.length > 0;
        return {
          cumple: ok,
          detalle: `Se requiere asignación de Champions en pilares foco. Actualmente: ${meetChampions.length} operadores tienen roles asignados.`,
          items: evaluatedOps.map(op => ({
            name: op.nombre,
            score: op.champions?.length || 0,
            meet: (op.champions?.length || 0) > 0,
            label: op.champions && op.champions.length > 0 ? `Champions: ${op.champions.join(", ")}` : "Sin Champion"
          }))
        };
      }

      case "seguridad": {
        return {
          cumple: false,
          detalle: `Requisito Acadia: Todos los territorios en Fase ${siguienteFase}. Este requisito se valida externamente en Acadia.`,
          items: []
        };
      }

      default:
        break;
    }

    return {
      cumple: value >= siguienteFase,
      detalle: `Requisito Cualitativo de BPRE: ${REQUISITOS_FASES[factorKey]?.[siguienteFase] || "No especificado."} (Puntuación actual: ${value.toFixed(2)} de meta: ${siguienteFase}.00).`,
      items: []
    };
  };

  const evalResult = evaluateRequirements();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border p-2 shadow-sm transition-all h-[95px] w-full text-left focus:outline-none cursor-pointer",
            esNA ? "bg-slate-50/40 border-slate-100 opacity-60 hover:opacity-85" :
            "border-slate-100 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-200 hover:shadow-md"
          )}
        >
          <AutonomyGauge 
            value={value} 
            max={4} 
            size={42} 
            stroke_width={5} 
            show_text={true} 
          />
          <div className="mt-1 text-[8px] font-black text-slate-800 uppercase tracking-tighter text-center leading-tight px-1">
            {label}
          </div>
          <div className={cn(
            "mt-0.5 text-[7px] font-bold px-1 py-0.2 rounded border uppercase tracking-wider",
            esNA ? "bg-slate-100 text-slate-400 border-slate-200" :
            faseActual >= 3 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
            faseActual >= 2 ? "bg-blue-50 text-blue-600 border-blue-100" :
            faseActual >= 1 ? "bg-amber-50 text-amber-600 border-amber-100" :
            "bg-rose-50 text-rose-600 border-rose-100"
          )}>
            {esNA ? "EXCEPTUADO" : `Fase ${faseActual}`}
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-xl bg-white p-6 rounded-2xl border-none shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
            <Award className="h-4 w-4 text-[#1a4491]" />
            <span>Detalle por Factor BPRE</span>
          </div>
          <DialogTitle className="text-xl font-black text-[#1a4491] uppercase tracking-tight mt-1">{label}</DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Evaluación para el área: {areaName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 overflow-y-auto flex-1 pr-1">
          {/* BANNER DE ESTADO */}
          <div className={cn(
            "rounded-xl border p-4 flex items-start gap-3.5 transition-colors",
            esNA ? "bg-slate-50 border-slate-200 text-slate-600" :
            evalResult.cumple ? "bg-emerald-50 border-emerald-200 text-slate-700" : "bg-rose-50 border-rose-200 text-slate-700"
          )}>
            <div className="shrink-0 mt-0.5">
              {esNA ? (
                <HelpCircle className="h-5 w-5 text-slate-400" />
              ) : evalResult.cumple ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-500" />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                {esNA ? "Factor Exceptuado" : evalResult.cumple ? "Requisito Cumplido" : "Requisito Pendiente"}
              </div>
              <div className="text-[11px] font-semibold leading-normal">
                {evalResult.detalle}
              </div>
            </div>
          </div>

          {/* FASES INFO */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-center">
            <div>
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Fase Actual</div>
              <div className="text-lg font-black text-[#1a4491] mt-0.5">
                {esNA ? "N/A" : `Fase ${faseActual}`}
              </div>
              <div className="text-[9px] font-bold text-slate-500 max-w-[150px] mx-auto truncate">
                {esNA ? "No Aplica" : REQUISITOS_FASES[factorKey]?.[faseActual] || "Sin requisito"}
              </div>
            </div>
            <div>
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Meta Siguiente</div>
              <div className="text-lg font-black text-[#1a4491] mt-0.5">
                {isMaxPhase ? "Fase Máxima" : `Fase ${siguienteFase}`}
              </div>
              <div className="text-[9px] font-bold text-slate-500 max-w-[150px] mx-auto truncate">
                {isMaxPhase ? "Nivel 4 Completado" : REQUISITOS_FASES[factorKey]?.[siguienteFase] || "Sin requisito"}
              </div>
            </div>
          </div>


          {/* DESGLOSE DE OPERARIOS */}
          {evalResult.items && evalResult.items.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Desglose Detallado de Operarios ({totalOps} evaluados)
              </h4>
              <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden max-h-48 overflow-y-auto">
                {evalResult.items.map((op, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 text-xs bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        op.meet ? "bg-emerald-500" : "bg-rose-400"
                      )} />
                      <span className="font-bold text-slate-700">{op.name}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                      op.meet 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-rose-50 text-rose-700 border-rose-100"
                    )}>
                      {op.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
