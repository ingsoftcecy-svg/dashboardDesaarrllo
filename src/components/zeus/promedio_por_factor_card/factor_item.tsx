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

  // Filtrar operadores evaluados
  const evaluatedOps = (operadores || []).filter(op => !op.noEvaluado);
  const totalOps = evaluatedOps.length;

  // Lógica de cálculo dinámico para los requisitos de la Fase Objetivo
  const evaluateRequirements = (targetFase: number) => {
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

        const avgIntermedio = evaluatedOps.reduce((sum, op) => sum + op.intermedio, 0) / totalOps;
        const avgAvanzado = evaluatedOps.reduce((sum, op) => sum + op.avanzado, 0) / totalOps;

        if (targetFase === 1) {
          const ok = pctIntermedio >= 25;
          const reqCount = Math.ceil(0.25 * totalOps);
          const missing = Math.max(0, reqCount - meetIntermedio.length);
          return {
            cumple: ok,
            detalle: `Meta: 25% de operadores con Intermedio ≥ 85% (mínimo ${reqCount} operador(es)). Progreso actual: ${pctIntermedio.toFixed(0)}% (${meetIntermedio.length} de ${totalOps} operadores) | Promedio del equipo: ${avgIntermedio.toFixed(1)}%. ${ok ? "¡Completado!" : `Falta certificar a ${missing} operador(es).`}`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.intermedio,
              meet: op.intermedio >= 85,
              label: `Intermedio: ${op.intermedio}%`,
              missingText: op.intermedio >= 85 ? "Cumple" : `Falta certificar Intermedio (tiene ${op.intermedio}%)`
            }))
          };
        } else if (targetFase === 2) {
          const ok = pctIntermedio >= 75;
          const reqCount = Math.ceil(0.75 * totalOps);
          const missing = Math.max(0, reqCount - meetIntermedio.length);
          return {
            cumple: ok,
            detalle: `Meta: 75% de operadores con Intermedio ≥ 85% (mínimo ${reqCount} operador(es)). Progreso actual: ${pctIntermedio.toFixed(0)}% (${meetIntermedio.length} de ${totalOps} operadores) | Promedio del equipo: ${avgIntermedio.toFixed(1)}%. ${ok ? "¡Completado!" : `Falta certificar a ${missing} operador(es).`}`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.intermedio,
              meet: op.intermedio >= 85,
              label: `Intermedio: ${op.intermedio}%`,
              missingText: op.intermedio >= 85 ? "Cumple" : `Falta certificar Intermedio (tiene ${op.intermedio}%)`
            }))
          };
        } else if (targetFase === 3) {
          const ok = pctAvanzado >= 33;
          const reqCount = Math.ceil(0.33 * totalOps);
          const missing = Math.max(0, reqCount - meetAvanzado.length);
          return {
            cumple: ok,
            detalle: `Meta: 33% de operadores con Avanzado ≥ 85% (mínimo ${reqCount} operador(es)). Progreso actual: ${pctAvanzado.toFixed(0)}% (${meetAvanzado.length} de ${totalOps} operadores) | Promedio del equipo: ${avgAvanzado.toFixed(1)}%. ${ok ? "¡Completado!" : `Falta certificar a ${missing} operador(es).`}`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.avanzado,
              meet: op.avanzado >= 85,
              label: `Avanzado: ${op.avanzado}%`,
              missingText: op.avanzado >= 85 ? "Cumple" : `Falta certificar Avanzado (tiene ${op.avanzado}%)`
            }))
          };
        } else if (targetFase === 4) {
          const ok = pctAvanzado >= 75;
          const reqCount = Math.ceil(0.75 * totalOps);
          const missing = Math.max(0, reqCount - meetAvanzado.length);
          return {
            cumple: ok,
            detalle: `Meta: 75% de operadores con Avanzado ≥ 85% (mínimo ${reqCount} operador(es)). Progreso actual: ${pctAvanzado.toFixed(0)}% (${meetAvanzado.length} de ${totalOps} operadores) | Promedio del equipo: ${avgAvanzado.toFixed(1)}%. ${ok ? "¡Completado!" : `Falta certificar a ${missing} operador(es).`}`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.avanzado,
              meet: op.avanzado >= 85,
              label: `Avanzado: ${op.avanzado}%`,
              missingText: op.avanzado >= 85 ? "Cumple" : `Falta certificar Avanzado (tiene ${op.avanzado}%)`
            }))
          };
        }
        break;
      }

      case "ato": {
        const meetAto4 = evaluatedOps.filter(op => (op.ato ?? 0) >= 4);
        const meetAto8 = evaluatedOps.filter(op => (op.ato ?? 0) >= 8);
        const pctAto4 = (meetAto4.length / totalOps) * 100;
        const pctAto8 = (meetAto8.length / totalOps) * 100;

        const avgAto = evaluatedOps.reduce((sum, op) => sum + (op.ato ?? 0), 0) / totalOps;

        if (targetFase === 1) {
          const ok = pctAto4 >= 25;
          const reqCount = Math.ceil(0.25 * totalOps);
          const missing = Math.max(0, reqCount - meetAto4.length);
          return {
            cumple: ok,
            detalle: `Meta: ATO Nivel 4 en ≥ 25% de operadores (mínimo ${reqCount} operador(es)). Progreso actual: ${pctAto4.toFixed(0)}% (${meetAto4.length} de ${totalOps} operadores) | Promedio del equipo: Nivel ${avgAto.toFixed(1)}. ${ok ? "¡Completado!" : `Falta certificar a ${missing} operador(es).`}`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.ato ?? 0,
              meet: (op.ato ?? 0) >= 4,
              label: `Nivel ATO: ${op.ato ?? 0}`,
              missingText: (op.ato ?? 0) >= 4 ? "Cumple Nivel 4" : `Falta certificar ATO Nivel 4 (tiene Nivel ${op.ato ?? 0})`
            }))
          };
        } else if (targetFase === 2) {
          const ok = pctAto4 >= 75;
          const reqCount = Math.ceil(0.75 * totalOps);
          const missing = Math.max(0, reqCount - meetAto4.length);
          return {
            cumple: ok,
            detalle: `Meta: ATO Nivel 4 en ≥ 75% de operadores (mínimo ${reqCount} operador(es)). Progreso actual: ${pctAto4.toFixed(0)}% (${meetAto4.length} de ${totalOps} operadores) | Promedio del equipo: Nivel ${avgAto.toFixed(1)}. ${ok ? "¡Completado!" : `Falta certificar a ${missing} operador(es).`}`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.ato ?? 0,
              meet: (op.ato ?? 0) >= 4,
              label: `Nivel ATO: ${op.ato ?? 0}`,
              missingText: (op.ato ?? 0) >= 4 ? "Cumple Nivel 4" : `Falta certificar ATO Nivel 4 (tiene Nivel ${op.ato ?? 0})`
            }))
          };
        } else if (targetFase === 3) {
          const ok = pctAto4 >= 100 && pctAto8 >= 50;
          const reqCountAto8 = Math.ceil(0.50 * totalOps);
          const missingAto4 = Math.max(0, totalOps - meetAto4.length);
          const missingAto8 = Math.max(0, reqCountAto8 - meetAto8.length);
          return {
            cumple: ok,
            detalle: `Meta: ATO Nivel 4 al 100% de operadores y Nivel 8 al ≥ 50% (mínimo ${reqCountAto8} operador(es)). Progreso actual: Nivel 4: ${pctAto4.toFixed(0)}%, Nivel 8: ${pctAto8.toFixed(0)}% | Promedio del equipo: Nivel ${avgAto.toFixed(1)}. ${ok ? "¡Completado!" : `Falta: ${missingAto4 > 0 ? `${missingAto4} op. en Nivel 4` : ""}${missingAto4 > 0 && missingAto8 > 0 ? " y " : ""}${missingAto8 > 0 ? `${missingAto8} op. en Nivel 8` : ""}.`}`,
            items: evaluatedOps.map(op => {
              const compliesAto8 = (op.ato ?? 0) >= 8;
              const compliesAto4 = (op.ato ?? 0) >= 4;
              return {
                name: op.nombre,
                score: op.ato ?? 0,
                meet: compliesAto8,
                label: `Nivel ATO: ${op.ato ?? 0}`,
                missingText: compliesAto8 ? "Cumple Nivel 8" : compliesAto4 ? "Falta Nivel 8 (tiene Nivel 4)" : "Falta certificar Nivel 4 y Nivel 8"
              };
            })
          };
        } else if (targetFase === 4) {
          const ok = pctAto8 >= 75;
          const reqCount = Math.ceil(0.75 * totalOps);
          const missing = Math.max(0, reqCount - meetAto8.length);
          return {
            cumple: ok,
            detalle: `Meta: ATO Nivel 8 en ≥ 75% de operadores (mínimo ${reqCount} operador(es)). Progreso actual: ${pctAto8.toFixed(0)}% (${meetAto8.length} de ${totalOps} operadores) | Promedio del equipo: Nivel ${avgAto.toFixed(1)}. ${ok ? "¡Completado!" : `Falta certificar a ${missing} operador(es).`}`,
            items: evaluatedOps.map(op => ({
              name: op.nombre,
              score: op.ato ?? 0,
              meet: (op.ato ?? 0) >= 8,
              label: `Nivel ATO: ${op.ato ?? 0}`,
              missingText: (op.ato ?? 0) >= 8 ? "Cumple Nivel 8" : `Falta certificar ATO Nivel 8 (tiene Nivel ${op.ato ?? 0})`
            }))
          };
        }
        break;
      }

      case "multihab": {
        const checkMeet = (op: any, required: number) => {
          const current = op.equipos?.length || 0;
          const max = op.maxEquipos || 1;
          return current >= required || current >= max;
        };

        const meet1x1 = evaluatedOps.filter(op => checkMeet(op, 1));
        const meet2x2 = evaluatedOps.filter(op => checkMeet(op, 2));
        const meet3x3 = evaluatedOps.filter(op => checkMeet(op, 3));

        const pct1x1 = (meet1x1.length / totalOps) * 100;
        const pct2x2 = (meet2x2.length / totalOps) * 100;
        const pct3x3 = (meet3x3.length / totalOps) * 100;

        const avgEquipos = evaluatedOps.reduce((sum, op) => sum + (op.equipos?.length || 0), 0) / totalOps;

        if (targetFase === 1) {
          const ok = pct1x1 >= 100;
          const missing = Math.max(0, totalOps - meet1x1.length);
          return {
            cumple: ok,
            detalle: `Meta: 100% de operadores con nivel 1x1 (o máximo cubierto). Progreso actual: ${pct1x1.toFixed(0)}% (${meet1x1.length} de ${totalOps} operadores) | Promedio del equipo: ${avgEquipos.toFixed(1)} equipos. ${ok ? "¡Completado!" : `Falta capacitar a ${missing} operador(es).`}`,
            items: evaluatedOps.map(op => {
              const current = op.equipos?.length || 0;
              const max = op.maxEquipos || 1;
              const complies = checkMeet(op, 1);
              return {
                name: op.nombre,
                score: current,
                meet: complies,
                label: `Nivel ${current}x${current} (Máx: ${max}x${max})`,
                missingText: complies ? "Cumple Nivel 1x1" : "Falta certificar Nivel 1x1 (actual: 0 equipos)"
              };
            })
          };
        } else if (targetFase === 2) {
          const ok = pct1x1 >= 100 && pct2x2 >= 10;
          const reqCount2x2 = Math.ceil(0.10 * totalOps);
          const missing1x1 = Math.max(0, totalOps - meet1x1.length);
          const missing2x2 = Math.max(0, reqCount2x2 - meet2x2.length);
          return {
            cumple: ok,
            detalle: `Meta: 100% en 1x1 y ≥ 10% en 2x2 (mínimo ${reqCount2x2} operador(es)). Progreso actual: 1x1: ${pct1x1.toFixed(0)}%, 2x2: ${pct2x2.toFixed(0)}% | Promedio del equipo: ${avgEquipos.toFixed(1)} equipos. ${ok ? "¡Completado!" : `Falta: ${missing1x1 > 0 ? `${missing1x1} op. en 1x1` : ""}${missing1x1 > 0 && missing2x2 > 0 ? " y " : ""}${missing2x2 > 0 ? `${missing2x2} op. en 2x2` : ""}.`}`,
            items: evaluatedOps.map(op => {
              const current = op.equipos?.length || 0;
              const max = op.maxEquipos || 1;
              const complies2x2 = checkMeet(op, 2);
              const complies1x1 = checkMeet(op, 1);
              return {
                name: op.nombre,
                score: current,
                meet: complies2x2,
                label: `Nivel ${current}x${current} (Máx: ${max}x${max})`,
                missingText: complies2x2 ? "Cumple Nivel 2x2 (o Máx)" : complies1x1 ? "Falta Nivel 2x2 (tiene 1x1)" : "Falta certificar Nivel 1x1 y 2x2"
              };
            })
          };
        } else if (targetFase === 3) {
          const ok = pct2x2 >= 100 && pct3x3 >= 10;
          const reqCount3x3 = Math.ceil(0.10 * totalOps);
          const missing2x2 = Math.max(0, totalOps - meet2x2.length);
          const missing3x3 = Math.max(0, reqCount3x3 - meet3x3.length);
          return {
            cumple: ok,
            detalle: `Meta: 100% en 2x2 y ≥ 10% en 3x3 (mínimo ${reqCount3x3} operador(es)). Progreso actual: 2x2: ${pct2x2.toFixed(0)}%, 3x3: ${pct3x3.toFixed(0)}% | Promedio del equipo: ${avgEquipos.toFixed(1)} equipos. ${ok ? "¡Completado!" : `Falta: ${missing2x2 > 0 ? `${missing2x2} op. en 2x2` : ""}${missing2x2 > 0 && missing3x3 > 0 ? " y " : ""}${missing3x3 > 0 ? `${missing3x3} op. en 3x3` : ""}.`}`,
            items: evaluatedOps.map(op => {
              const current = op.equipos?.length || 0;
              const max = op.maxEquipos || 1;
              const complies3x3 = checkMeet(op, 3);
              const complies2x2 = checkMeet(op, 2);
              return {
                name: op.nombre,
                score: current,
                meet: complies3x3,
                label: `Nivel ${current}x${current} (Máx: ${max}x${max})`,
                missingText: complies3x3 ? "Cumple Nivel 3x3 (o Máx)" : complies2x2 ? "Falta Nivel 3x3 (tiene 2x2)" : "Falta certificar Nivel 2x2 y 3x3"
              };
            })
          };
        } else if (targetFase === 4) {
          const ok = pct3x3 >= 100;
          const missing = Math.max(0, totalOps - meet3x3.length);
          return {
            cumple: ok,
            detalle: `Meta: 100% de operadores con nivel 3x3 (o máximo cubierto). Progreso actual: ${pct3x3.toFixed(0)}% (${meet3x3.length} de ${totalOps} operadores) | Promedio del equipo: ${avgEquipos.toFixed(1)} equipos. ${ok ? "¡Completado!" : `Falta capacitar a ${missing} operador(es).`}`,
            items: evaluatedOps.map(op => {
              const current = op.equipos?.length || 0;
              const max = op.maxEquipos || 1;
              const complies = checkMeet(op, 3);
              return {
                name: op.nombre,
                score: current,
                meet: complies,
                label: `Nivel ${current}x${current} (Máx: ${max}x${max})`,
                missingText: complies ? "Cumple Nivel 3x3" : `Falta certificar Nivel 3x3 (actual: Nivel ${current}x${current})`
              };
            })
          };
        }
        break;
      }

      case "vpo": {
        const meetChampions = evaluatedOps.filter(op => op.champions && op.champions.length > 0);
        const ok = meetChampions.length > 0;
        return {
          cumple: ok,
          detalle: `Se requiere asignación de Champions en pilares foco. Actualmente: ${meetChampions.length} operadores tienen roles asignados. ${ok ? "¡Requisito cubierto!" : "Falta asignar al menos un operador como Champion."}`,
          items: evaluatedOps.map(op => {
            const hasRole = (op.champions?.length || 0) > 0;
            return {
              name: op.nombre,
              score: op.champions?.length || 0,
              meet: hasRole,
              label: op.champions && op.champions.length > 0 ? `Champions: ${op.champions.join(", ")}` : "Sin Champion",
              missingText: hasRole ? "Rol Asignado" : "Falta asignar rol de Champion en algún pilar foco"
            };
          })
        };
      }

      case "seguridad": {
        return {
          cumple: false,
          detalle: `Requisito Acadia: Todos los territorios en Fase ${targetFase}. Este requisito se valida externamente en Acadia.`,
          items: []
        };
      }

      default:
        break;
    }

    return {
      cumple: value >= targetFase,
      detalle: `Requisito Cualitativo de BPRE: ${REQUISITOS_FASES[factorKey]?.[targetFase] || "No especificado."} (Puntuación actual: ${value.toFixed(2)} de meta: ${targetFase}.00).`,
      items: []
    };
  };

  // Ir estrictamente uno por uno (Fase Actual + 1) sin saltar fases
  const siguienteFase = Math.min(faseActual + 1, 4);
  const evalResult = evaluateRequirements(siguienteFase);
  const isMaxPhase = faseActual >= 4;

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
          {/* BANNER DE ESTADO MINIMALISTA */}
          <div className={cn(
            "rounded-xl border px-3 py-2 flex items-center justify-between text-xs transition-colors",
            esNA ? "bg-slate-50 border-slate-200 text-slate-600" :
            evalResult.cumple ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          )}>
            <div className="flex items-center gap-2 font-semibold">
              {esNA ? (
                <HelpCircle className="h-4 w-4 text-slate-400" />
              ) : evalResult.cumple ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span className="uppercase tracking-wider text-[10px]">
                {esNA ? "Factor Exceptuado" : evalResult.cumple ? "Requisito Cumplido" : "Requisito Pendiente"}
              </span>
            </div>
            {!esNA && (
              <span className="text-[9px] font-black uppercase tracking-widest bg-white/60 px-2 py-0.5 rounded border border-current/10">
                Fase {faseActual} → Fase {siguienteFase}
              </span>
            )}
          </div>

          {/* GRID DE FASES REDISTRIBUIDO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Tarjeta de Fase Actual */}
            <div className={cn(
              "rounded-xl border p-4 space-y-2 flex flex-col justify-between transition-all",
              esNA ? "bg-slate-50/40 border-slate-150" :
              faseActual >= 3 ? "bg-emerald-50/20 border-emerald-100/50" :
              faseActual >= 2 ? "bg-blue-50/20 border-blue-100/50" :
              faseActual >= 1 ? "bg-amber-50/20 border-amber-100/50" :
              "bg-rose-50/20 border-rose-100/50"
            )}>
              <div className="space-y-1.5">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Fase Actual</span>
                  <span className={cn(
                    "text-base font-black uppercase tracking-tight",
                    esNA ? "text-slate-650" :
                    faseActual >= 3 ? "text-emerald-700" :
                    faseActual >= 2 ? "text-blue-700" :
                    faseActual >= 1 ? "text-amber-700" :
                    "text-rose-700"
                  )}>
                    {esNA ? "EXCEPTUADO" : `Fase ${faseActual}`}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-550 leading-normal">
                  {esNA ? "No Aplica" : REQUISITOS_FASES[factorKey]?.[faseActual] || "Sin requisito específico registrado."}
                </p>
              </div>
              <div className="text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-200/50 mt-2">
                Puntuación registrada: {value.toFixed(2)}
              </div>
            </div>

            {/* Tarjeta de Siguiente Meta */}
            <div className={cn(
              "rounded-xl border p-4 space-y-2 flex flex-col justify-between transition-all",
              evalResult.cumple 
                ? "bg-emerald-50/20 border-emerald-100/50" 
                : "bg-rose-50/20 border-rose-100/50"
            )}>
              <div className="space-y-1.5">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Meta Siguiente</span>
                  <span className="text-base font-black text-[#1a4491] uppercase tracking-tight">
                    {isMaxPhase ? "Fase Máxima" : `Fase ${siguienteFase}`}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-600 leading-normal">
                  {isMaxPhase ? "Nivel 4 Completado." : REQUISITOS_FASES[factorKey]?.[siguienteFase] || "Sin requisito registrado."}
                </p>
              </div>
              
              {!esNA && !isMaxPhase && (
                <div className="pt-2 border-t border-slate-200/50 mt-2">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Diagnóstico de Meta</div>
                  <div className={cn(
                    "text-[10px] font-bold leading-normal uppercase tracking-wide",
                    evalResult.cumple ? "text-emerald-700" : "text-rose-700"
                  )}>
                    {evalResult.detalle}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DESGLOSE DE OPERARIOS */}
          {evalResult.items && evalResult.items.length > 0 && (() => {
            const pendingItems = evalResult.items.filter((item: any) => !item.meet);
            const completeItems = evalResult.items.filter((item: any) => item.meet);
            const pendingPct = ((pendingItems.length / totalOps) * 100).toFixed(0);
            const completePct = ((completeItems.length / totalOps) * 100).toFixed(0);

            return (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Desglose Detallado de Operarios ({totalOps} evaluados)
                  </h4>
                  <span className="text-[10px] font-black bg-[#1a4491]/10 text-[#1a4491] px-2 py-0.5 rounded-full border border-[#1a4491]/20">
                    CUMPLEN META: {completePct}%
                  </span>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {pendingItems.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>Pendientes para la Meta</span>
                        </div>
                        <span className="tabular-nums font-black">{pendingItems.length} de {totalOps} ({pendingPct}%)</span>
                      </div>
                      <div className="rounded-xl border border-rose-100 divide-y divide-rose-50 overflow-hidden bg-rose-50/5">
                        {pendingItems.map((op, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 text-xs bg-rose-50/10 hover:bg-rose-50/20 transition-colors">
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-slate-700">{op.name}</span>
                              <span className="text-[10px] text-rose-600 font-semibold">{op.missingText}</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-100">
                              {op.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {completeItems.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Certificados / Cumplen</span>
                        </div>
                        <span className="tabular-nums font-black">{completeItems.length} de {totalOps} ({completePct}%)</span>
                      </div>
                      <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden bg-slate-50/5">
                        {completeItems.map((op, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 text-xs bg-white hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-slate-700">{op.name}</span>
                              <span className="text-[10px] text-emerald-600 font-medium">Requisito Cubierto</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100">
                              {op.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
