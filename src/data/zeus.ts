export type SystemKey = "SAP" | "MES" | "ACADIA" | "WVD" | "MANGYVER";
export type ChampionKey = "seguridad" | "calidad" | "ambiental" | "mantenimiento" | "gestion" | "gente" | "logistica";
export type Status = "ok" | "warn" | "fail";

export interface Operator {
  id: string;
  nombre: string;
  puesto: string;
  basico: number;
  intermedio: number;
  avanzado: number;
  champions: ChampionKey[];
  equipoAutonomo?: string;
  lider?: string;
  equipos?: string[];
  lastAssessmentDate?: string;
}

export interface IPRow {
  id: string;
  categoria: "Productividad" | "Calidad";
  metrica: string;
  objetivo: string;
  valor: string;
  equipos: string[];
  sistemas: SystemKey[];
  estado: Status;
  trend: number[];
}

export interface Podium {
  nombre: string;
  puesto: string;
  excelencia: number;
  lider?: string;
}

export interface AreaData {
  team: string;
  lema: string;
  linea: string;
  autonomia: number; // 0-5
  nivelLabel: string;
  kpis: { label: string; value: string; tone: "ok" | "warn" | "fail" }[];
  operadores: Operator[];
  ips: IPRow[];
  podio: Podium[];
  logros: string[];
  excelenciaEquipo: number;
  cumplimientoPorHora: { hora: string; cumplimiento: number }[];
}

const baseHoras = ["06h", "07h", "08h", "09h", "10h", "11h", "12h", "13h"];

export const cocimientos: AreaData = {
  team: "Guardianes Cerveceros",
  lema: "Pilar de Mantenimiento Autónomo · Cocimientos",
  linea: "Línea Cocimientos 2 · Sala de Cocción",
  autonomia: 3.2,
  nivelLabel: "Nivel 3 — Mejora Autónoma",
  kpis: [
    { label: "Asistencia", value: "100%", tone: "ok" },
    { label: "OEE turno", value: "87.4%", tone: "ok" },
    { label: "Cumplimiento IPs", value: "92%", tone: "warn" },
    { label: "Incidentes", value: "0", tone: "ok" },
  ],
  operadores: [
    { id: "1", nombre: "ALDO ADRIAN SIFUENTES", puesto: "Operador Senior", basico: 100, intermedio: 90, avanzado: 70, champions: ["seguridad", "calidad"] },
    { id: "2", nombre: "JOSE LUIS CAZARES", puesto: "Cocedor", basico: 100, intermedio: 85, avanzado: 60, champions: ["mantenimiento"] },
    { id: "3", nombre: "RAFAEL VERA", puesto: "Molinero", basico: 100, intermedio: 75, avanzado: 45, champions: ["ambiental"] },
    { id: "4", nombre: "URIEL ESCOBEDO", puesto: "Tablerista", basico: 100, intermedio: 95, avanzado: 80, champions: ["calidad", "seguridad"] },
    { id: "5", nombre: "VALERIA NATALY CASTAÑON", puesto: "Filtración", basico: 100, intermedio: 70, avanzado: 40, champions: ["mantenimiento", "ambiental"] },
    { id: "6", nombre: "Diana Rojas", puesto: "Operador Jr.", basico: 90, intermedio: 55, avanzado: 25, champions: [] },
    { id: "7", nombre: "Raúl Gómez", puesto: "Líder de Turno", basico: 100, intermedio: 100, avanzado: 90, champions: ["seguridad", "calidad", "mantenimiento"] },
    { id: "8", nombre: "Sofía Mendoza", puesto: "Operador", basico: 100, intermedio: 80, avanzado: 55, champions: ["ambiental"] },
  ],
  ips: [
    { id: "i1", categoria: "Productividad", metrica: "Merma de molienda", objetivo: "≤ 1.20%", valor: "0.98%", equipos: ["Molinos", "Tolva de granos"], sistemas: ["SAP", "MES"], estado: "ok", trend: [1.2, 1.1, 1.0, 1.05, 0.98, 0.97, 0.98] },
    { id: "i2", categoria: "Calidad", metrica: "°Plato del mosto", objetivo: "16.0 ± 0.2", valor: "16.05", equipos: ["Cocedor", "Olla de mosto"], sistemas: ["ACADIA", "MES"], estado: "ok", trend: [16.0, 16.1, 15.9, 16.0, 16.05, 16.02, 16.05] },
    { id: "i3", categoria: "Productividad", metrica: "Tiempo de cocción", objetivo: "≤ 65 min", valor: "67 min", equipos: ["Cocedor"], sistemas: ["MES", "MANGYVER"], estado: "warn", trend: [62, 64, 65, 66, 67, 67, 67] },
    { id: "i4", categoria: "Calidad", metrica: "Tiempo de adición de lúpulo", objetivo: "± 30 s", valor: "+18 s", equipos: ["Cocedor", "Dosificador"], sistemas: ["ACADIA", "WVD"], estado: "ok", trend: [10, 12, 15, 18, 18, 17, 18] },
    { id: "i5", categoria: "Productividad", metrica: "Rendimiento de cocción", objetivo: "≥ 96%", valor: "94.2%", equipos: ["Whirlpool", "Filtro Prensa"], sistemas: ["SAP", "MES", "ACADIA"], estado: "fail", trend: [96, 95, 95, 94, 94, 94.5, 94.2] },
    { id: "i6", categoria: "Calidad", metrica: "Turbidez del mosto", objetivo: "≤ 30 EBC", valor: "22 EBC", equipos: ["Filtro Prensa"], sistemas: ["ACADIA"], estado: "ok", trend: [28, 26, 24, 23, 22, 22, 22] },
    { id: "i7", categoria: "Productividad", metrica: "Consumo de vapor", objetivo: "≤ 220 kg/hL", valor: "215 kg/hL", equipos: ["Cocedor", "Caldera"], sistemas: ["MANGYVER", "WVD"], estado: "ok", trend: [225, 222, 220, 218, 216, 215, 215] },
  ],
  podio: [
    { nombre: "Raúl Gómez", puesto: "Líder de Turno", excelencia: 98.5 },
    { nombre: "URIEL ESCOBEDO", puesto: "Tablerista", excelencia: 96.2 },
    { nombre: "ALDO ADRIAN SIFUENTES", puesto: "Operador Sr.", excelencia: 94.8 },
  ],
  logros: [
    "5 días sin desviaciones de °Plato",
    "Kaizen entregado: reducción de merma -0.3%",
    "Auditoría 5S aprobada con 92 pts",
    "Cero paros no programados en el turno",
  ],
  excelenciaEquipo: 92,
  cumplimientoPorHora: baseHoras.map((h, i) => ({ hora: h, cumplimiento: [88, 90, 93, 95, 92, 91, 94, 92][i] })),
};

export const bloqueFrio: AreaData = {
  team: "Sensory Avengers",
  lema: "Pilar de Calidad · Bloque Frío",
  linea: "Línea Bloque Frío · Bodega de Fermentación",
  autonomia: 3.6,
  nivelLabel: "Nivel 3 — Mejora Autónoma",
  kpis: [
    { label: "Asistencia", value: "96%", tone: "warn" },
    { label: "OEE turno", value: "90.1%", tone: "ok" },
    { label: "Cumplimiento IPs", value: "95%", tone: "ok" },
    { label: "Incidentes", value: "0", tone: "ok" },
  ],
  operadores: [
    { id: "1", nombre: "Carlos Vega", puesto: "Líder de Turno", basico: 100, intermedio: 100, avanzado: 95, champions: ["seguridad", "calidad", "mantenimiento"] },
    { id: "2", nombre: "Lucía Torres", puesto: "Microbiología", basico: 100, intermedio: 95, avanzado: 85, champions: ["calidad", "ambiental"] },
    { id: "3", nombre: "Esteban Cruz", puesto: "Propagación", basico: 100, intermedio: 90, avanzado: 75, champions: ["mantenimiento"] },
    { id: "4", nombre: "Paola Reyes", puesto: "Fermentación", basico: 100, intermedio: 85, avanzado: 65, champions: ["seguridad"] },
    { id: "5", nombre: "Iván López", puesto: "Filtración Fría", basico: 100, intermedio: 80, avanzado: 55, champions: ["ambiental"] },
    { id: "6", nombre: "Mónica Aguilar", puesto: "Tablerista", basico: 100, intermedio: 95, avanzado: 80, champions: ["calidad"] },
    { id: "7", nombre: "Héctor Salinas", puesto: "Operador", basico: 95, intermedio: 60, avanzado: 30, champions: [] },
    { id: "8", nombre: "Brenda Núñez", puesto: "Operador Jr.", basico: 90, intermedio: 50, avanzado: 20, champions: [] },
  ],
  ips: [
    { id: "i1", categoria: "Calidad", metrica: "pH del mosto frío", objetivo: "5.20 ± 0.05", valor: "5.22", equipos: ["Tanque de Propagación", "Intercambiador"], sistemas: ["ACADIA", "MES"], estado: "ok", trend: [5.2, 5.21, 5.22, 5.21, 5.22, 5.22, 5.22] },
    { id: "i2", categoria: "Calidad", metrica: "Oxígeno disuelto", objetivo: "8 - 10 ppm", valor: "9.1 ppm", equipos: ["Línea de aireación", "Intercambiador"], sistemas: ["ACADIA"], estado: "ok", trend: [8.5, 8.8, 9.0, 9.2, 9.1, 9.1, 9.1] },
    { id: "i3", categoria: "Productividad", metrica: "Temperatura de fermentación", objetivo: "12.5 ± 0.3 °C", valor: "12.9 °C", equipos: ["Tanque CCT 12", "Glycol"], sistemas: ["MES", "MANGYVER"], estado: "warn", trend: [12.5, 12.6, 12.7, 12.8, 12.9, 12.9, 12.9] },
    { id: "i4", categoria: "Calidad", metrica: "Conteo de levadura", objetivo: "12-15 M cel/mL", valor: "13.4 M", equipos: ["Tanque de Propagación"], sistemas: ["ACADIA", "WVD"], estado: "ok", trend: [12, 12.8, 13.1, 13.3, 13.4, 13.4, 13.4] },
    { id: "i5", categoria: "Productividad", metrica: "Presión de tanque", objetivo: "0.8 - 1.2 bar", valor: "1.35 bar", equipos: ["Tanque CCT 08"], sistemas: ["MES"], estado: "fail", trend: [1.0, 1.1, 1.2, 1.25, 1.3, 1.32, 1.35] },
    { id: "i6", categoria: "Calidad", metrica: "Diacetilo", objetivo: "≤ 0.10 ppm", valor: "0.07 ppm", equipos: ["Tanques CCT", "Cromatógrafo"], sistemas: ["ACADIA"], estado: "ok", trend: [0.12, 0.10, 0.09, 0.08, 0.07, 0.07, 0.07] },
    { id: "i7", categoria: "Productividad", metrica: "Pérdidas en filtración", objetivo: "≤ 0.8%", valor: "0.6%", equipos: ["Filtro de Tierras", "Bombas"], sistemas: ["SAP", "MES"], estado: "ok", trend: [0.9, 0.8, 0.7, 0.65, 0.6, 0.6, 0.6] },
  ],
  podio: [
    { nombre: "Carlos Vega", puesto: "Líder de Turno", excelencia: 99.1 },
    { nombre: "Lucía Torres", puesto: "Microbiología", excelencia: 97.4 },
    { nombre: "Mónica Aguilar", puesto: "Tablerista", excelencia: 95.6 },
  ],
  logros: [
    "12 días consecutivos sin desviaciones de O₂",
    "Kaizen entregado: -8% consumo de glycol",
    "Reto Sensorial #14 superado",
    "Auditoría microbiológica perfecta",
  ],
  excelenciaEquipo: 95,
  cumplimientoPorHora: baseHoras.map((h, i) => ({ hora: h, cumplimiento: [92, 94, 95, 96, 97, 95, 96, 95][i] })),
};

export const championColors: Record<ChampionKey, { bg: string; text: string; label: string }> = {
  seguridad: { bg: "bg-red-100", text: "text-red-700", label: "Seguridad" },
  calidad: { bg: "bg-sky-100", text: "text-sky-700", label: "Calidad" },
  ambiental: { bg: "bg-green-100", text: "text-green-700", label: "Ambiental" },
  mantenimiento: { bg: "bg-orange-100", text: "text-orange-700", label: "Mantenimiento" },
  gestion: { bg: "bg-purple-100", text: "text-purple-700", label: "Gestión" },
  gente: { bg: "bg-pink-100", text: "text-pink-700", label: "Gente" },
  logistica: { bg: "bg-slate-100", text: "text-slate-700", label: "Logística" },
};

export const systemColors: Record<SystemKey, string> = {
  SAP: "bg-blue-100 text-blue-800 border-blue-200",
  MES: "bg-violet-100 text-violet-800 border-violet-200",
  ACADIA: "bg-emerald-100 text-emerald-800 border-emerald-200",
  WVD: "bg-amber-100 text-amber-800 border-amber-200",
  MANGYVER: "bg-pink-100 text-pink-800 border-pink-200",
};
