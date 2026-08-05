import ipsData from "./ips_cocimientos_kpi.json";

export interface IpKpiInfo {
  pi: string;
  kpi: string;
  proceso: string;
  dueno: string;
}

export interface KpiTheme {
  bg: string;
  border: string;
  text: string;
  kpiBg: string;
  kpiText: string;
}

export const KPI_COLOR_THEMES: Record<string, KpiTheme> = {
  "VIC Elaboracion Materiales": {
    bg: "bg-emerald-50/90 hover:bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-950",
    kpiBg: "bg-emerald-600",
    kpiText: "text-white",
  },
  "MPA": {
    bg: "bg-sky-50/90 hover:bg-sky-100",
    border: "border-sky-300",
    text: "text-sky-950",
    kpiBg: "bg-sky-600",
    kpiText: "text-white",
  },
  "Brewhouse OSE": {
    bg: "bg-amber-50/90 hover:bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-950",
    kpiBg: "bg-amber-600",
    kpiText: "text-white",
  },
  "Total Extract Losses": {
    bg: "bg-purple-50/90 hover:bg-purple-100",
    border: "border-purple-300",
    text: "text-purple-950",
    kpiBg: "bg-purple-600",
    kpiText: "text-white",
  },
  "BQI": {
    bg: "bg-rose-50/90 hover:bg-rose-100",
    border: "border-rose-300",
    text: "text-rose-950",
    kpiBg: "bg-rose-600",
    kpiText: "text-white",
  },
  "VPO score Nivel Excelencia": {
    bg: "bg-indigo-50/90 hover:bg-indigo-100",
    border: "border-indigo-300",
    text: "text-indigo-950",
    kpiBg: "bg-indigo-600",
    kpiText: "text-white",
  },
  "Cumplimiento al Plan de Autonomia": {
    bg: "bg-teal-50/90 hover:bg-teal-100",
    border: "border-teal-300",
    text: "text-teal-950",
    kpiBg: "bg-teal-600",
    kpiText: "text-white",
  },
  "Lesiones": {
    bg: "bg-red-50/90 hover:bg-red-100",
    border: "border-red-300",
    text: "text-red-950",
    kpiBg: "bg-red-600",
    kpiText: "text-white",
  },
  "Índice Sensorial": {
    bg: "bg-fuchsia-50/90 hover:bg-fuchsia-100",
    border: "border-fuchsia-300",
    text: "text-fuchsia-950",
    kpiBg: "bg-fuchsia-600",
    kpiText: "text-white",
  },
  "Fermentation Consistency Index(FCI)": {
    bg: "bg-lime-50/90 hover:bg-lime-100",
    border: "border-lime-300",
    text: "text-lime-950",
    kpiBg: "bg-lime-600",
    kpiText: "text-white",
  },
  "Consumo de agua": {
    bg: "bg-cyan-50/90 hover:bg-cyan-100",
    border: "border-cyan-300",
    text: "text-cyan-950",
    kpiBg: "bg-cyan-600",
    kpiText: "text-white",
  },
  "TPE": {
    bg: "bg-orange-50/90 hover:bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-950",
    kpiBg: "bg-orange-600",
    kpiText: "text-white",
  },
  "VILC": {
    bg: "bg-slate-50/90 hover:bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-950",
    kpiBg: "bg-slate-600",
    kpiText: "text-white",
  },
  "ZBB": {
    bg: "bg-zinc-100/90 hover:bg-zinc-200",
    border: "border-zinc-400",
    text: "text-zinc-950",
    kpiBg: "bg-zinc-700",
    kpiText: "text-white",
  },
  "Backlog (Pasado + Futuro)": {
    bg: "bg-blue-50/90 hover:bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-950",
    kpiBg: "bg-blue-600",
    kpiText: "text-white",
  },
  "Consumo de CO2": {
    bg: "bg-violet-50/90 hover:bg-violet-100",
    border: "border-violet-300",
    text: "text-violet-950",
    kpiBg: "bg-violet-600",
    kpiText: "text-white",
  },
  "Downtime Envasado": {
    bg: "bg-amber-50/90 hover:bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-950",
    kpiBg: "bg-amber-600",
    kpiText: "text-white",
  },
  "Eficiencia en Filtracion de Cerveza": {
    bg: "bg-emerald-50/90 hover:bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-950",
    kpiBg: "bg-emerald-600",
    kpiText: "text-white",
  },
  "OEE Filtros de cerveza": {
    bg: "bg-sky-50/90 hover:bg-sky-100",
    border: "border-sky-300",
    text: "text-sky-950",
    kpiBg: "bg-sky-600",
    kpiText: "text-white",
  },
  "Proceso Fermentación": {
    bg: "bg-lime-50/90 hover:bg-lime-100",
    border: "border-lime-300",
    text: "text-lime-950",
    kpiBg: "bg-lime-600",
    kpiText: "text-white",
  },
  "Proceso Filtración": {
    bg: "bg-teal-50/90 hover:bg-teal-100",
    border: "border-teal-300",
    text: "text-teal-950",
    kpiBg: "bg-teal-600",
    kpiText: "text-white",
  },
};

export const DEFAULT_KPI_THEME: KpiTheme = {
  bg: "bg-blue-50/90 hover:bg-blue-100",
  border: "border-blue-300",
  text: "text-blue-950",
  kpiBg: "bg-[#1a4491]",
  kpiText: "text-white",
};

const normalizeStr = (str: string): string => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
};

export function getKpiForPi(piName: string): IpKpiInfo | null {
  const norm = normalizeStr(piName);
  const map = ipsData.piToKpiMap as Record<string, IpKpiInfo>;
  if (map[norm]) return map[norm];

  for (const key in map) {
    if (key.includes(norm) || norm.includes(key)) {
      return map[key];
    }
  }
  return null;
}

export function getOperatorDefaultIps(operatorName: string): IpKpiInfo[] {
  const normOp = normalizeStr(operatorName);
  const assignments = ipsData.workerAssignments as Record<string, IpKpiInfo[]>;

  if (assignments[normOp]) return assignments[normOp];

  const stopWords = new Set(["DE", "DEL", "LOS", "LAS", "SAN", "Y"]);
  const opTokens = normOp.split(" ").filter((t) => t.length > 2 && !stopWords.has(t));
  const opSet = new Set(opTokens);

  let bestMatchKey: string | null = null;
  let bestScore = 0;

  for (const wNorm in assignments) {
    const wTokens = wNorm.split(" ").filter((t) => t.length > 2 && !stopWords.has(t));
    const wSet = new Set(wTokens);
    const intersection = new Set([...opSet].filter((x) => wSet.has(x)));

    const minRequired = Math.min(opTokens.length, wTokens.length) <= 3 ? 2 : 3;

    if (intersection.size >= minRequired) {
      if (intersection.size > bestScore) {
        bestScore = intersection.size;
        bestMatchKey = wNorm;
      }
    }
  }

  if (bestMatchKey) {
    return assignments[bestMatchKey];
  }

  return [];
}
