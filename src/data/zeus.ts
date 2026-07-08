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
  maxEquipos?: number;
  lastAssessmentDate?: string;
  ato?: number;
  noEvaluado?: boolean;
  cursosProgress?: number;
  cursosAprobados?: number;
  cursosTotal?: number;
  cursosEnProgreso?: number;
  cursosPendientes?: number;
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
  bestTeam?: { name: string; avg: number; leader?: string };
  worstTeam?: { name: string; avg: number; leader?: string };
  teamRankings?: {
    name: string;
    avg: number;
    leader?: string;
    faseActual?: string;
    fase2026?: number;
    fechaCompromiso?: string;
    autonomyFactors?: AreaData["autonomyFactors"];
  }[];
  cumplimientoPorHora: { hora: string; cumplimiento: number }[];
  autonomyFactors?: {
    dinamica: number;
    liderazgo: number;
    skap: number;
    ato: number;
    seguridad: number;
    quas: number;
    multihab: number;
    vpo: number;
    solucionProb: number;
    infraest: number;
  };
}

const baseHoras = ["06h", "07h", "08h", "09h", "10h", "11h", "12h", "13h"];

export const cocimientos: AreaData = {
  team: "Guardianes Cerveceros",
  lema: "Pilar de Mantenimiento Autónomo · Cocimientos",
  linea: "Cocimientos 2 · Sala de Cocción",
  autonomia: 3.2,
  nivelLabel: "Nivel 3 — Mejora Autónoma",
  kpis: [
    { label: "Asistencia", value: "100%", tone: "ok" },
    { label: "OEE turno", value: "87.4%", tone: "ok" },
    { label: "Cumplimiento IPs", value: "92%", tone: "warn" },
    { label: "Incidentes", value: "0", tone: "ok" },
  ],
  // Los operadores se cargan dinámicamente desde Firebase/Excel
  operadores: [],
  ips: [
    { id: "i1", categoria: "Productividad", metrica: "Merma de molienda", objetivo: "≤ 1.20%", valor: "0.98%", equipos: ["Molinos", "Tolva de granos"], sistemas: ["SAP", "MES"], estado: "ok", trend: [1.2, 1.1, 1.0, 1.05, 0.98, 0.97, 0.98] },
    { id: "i2", categoria: "Calidad", metrica: "°Plato del mosto", objetivo: "16.0 ± 0.2", valor: "16.05", equipos: ["Cocedor", "Olla de mosto"], sistemas: ["ACADIA", "MES"], estado: "ok", trend: [16.0, 16.1, 15.9, 16.0, 16.05, 16.02, 16.05] },
    { id: "i3", categoria: "Productividad", metrica: "Tiempo de cocción", objetivo: "≤ 65 min", valor: "67 min", equipos: ["Cocedor"], sistemas: ["MES", "MANGYVER"], estado: "warn", trend: [62, 64, 65, 66, 67, 67, 67] },
    { id: "i4", categoria: "Calidad", metrica: "Tiempo de adición de lúpulo", objetivo: "± 30 s", valor: "+18 s", equipos: ["Cocedor", "Dosificador"], sistemas: ["ACADIA", "WVD"], estado: "ok", trend: [10, 12, 15, 18, 18, 17, 18] },
    { id: "i5", categoria: "Productividad", metrica: "Rendimiento de cocción", objetivo: "≥ 96%", valor: "94.2%", equipos: ["Whirlpool", "Filtro Prensa"], sistemas: ["SAP", "MES", "ACADIA"], estado: "fail", trend: [96, 95, 95, 94, 94, 94.5, 94.2] },
    { id: "i6", categoria: "Calidad", metrica: "Turbidez del mosto", objetivo: "≤ 30 EBC", valor: "22 EBC", equipos: ["Filtro Prensa"], sistemas: ["ACADIA"], estado: "ok", trend: [28, 26, 24, 23, 22, 22, 22] },
    { id: "i7", categoria: "Productividad", metrica: "Consumo de vapor", objetivo: "≤ 220 kg/hL", valor: "215 kg/hL", equipos: ["Cocedor", "Caldera"], sistemas: ["MANGYVER", "WVD"], estado: "ok", trend: [225, 222, 220, 218, 216, 215, 215] },
  ],
  podio: [],
  logros: [
    "5 días sin desviaciones de °Plato",
    "Kaizen entregado: reducción de merma -0.3%",
    "Auditoría 5S aprobada con 92 pts",
    "Cero paros no programados en el turno",
  ],
  excelenciaEquipo: 92,
  cumplimientoPorHora: baseHoras.map((h, i) => ({ hora: h, cumplimiento: [88, 90, 93, 95, 92, 91, 94, 92][i] })),
  autonomyFactors: {
    dinamica: 4.0,
    liderazgo: 4.0,
    skap: 2.3,
    ato: 2.1,
    seguridad: 2.1,
    quas: 2.6,
    multihab: 2.6,
    vpo: 3.0,
    solucionProb: 3.0,
    infraest: 4.0,
  }
};

export const bloqueFrio: AreaData = {
  team: "Sensory Avengers",
  lema: "Pilar de Calidad · Bloque Frío",
  linea: "Bloque Frío · Bodega de Fermentación",
  autonomia: 3.6,
  nivelLabel: "Nivel 3 — Mejora Autónoma",
  kpis: [
    { label: "Asistencia", value: "96%", tone: "warn" },
    { label: "OEE turno", value: "90.1%", tone: "ok" },
    { label: "Cumplimiento IPs", value: "95%", tone: "ok" },
    { label: "Incidentes", value: "0", tone: "ok" },
  ],
  // Los operadores se cargan dinámicamente desde Firebase/Excel
  operadores: [],
  ips: [
    { id: "i1", categoria: "Calidad", metrica: "pH del mosto frío", objetivo: "5.20 ± 0.05", valor: "5.22", equipos: ["Tanque de Propagación", "Intercambiador"], sistemas: ["ACADIA", "MES"], estado: "ok", trend: [5.2, 5.21, 5.22, 5.21, 5.22, 5.22, 5.22] },
    { id: "i2", categoria: "Calidad", metrica: "Oxígeno disuelto", objetivo: "8 - 10 ppm", valor: "9.1 ppm", equipos: ["Línea de aireación", "Intercambiador"], sistemas: ["ACADIA"], estado: "ok", trend: [8.5, 8.8, 9.0, 9.2, 9.1, 9.1, 9.1] },
    { id: "i3", categoria: "Productividad", metrica: "Temperatura de fermentación", objetivo: "12.5 ± 0.3 °C", valor: "12.9 °C", equipos: ["Tanque CCT 12", "Glycol"], sistemas: ["MES", "MANGYVER"], estado: "warn", trend: [12.5, 12.6, 12.7, 12.8, 12.9, 12.9, 12.9] },
    { id: "i4", categoria: "Calidad", metrica: "Conteo de levadura", objetivo: "12-15 M cel/mL", valor: "13.4 M", equipos: ["Tanque de Propagación"], sistemas: ["ACADIA", "WVD"], estado: "ok", trend: [12, 12.8, 13.1, 13.3, 13.4, 13.4, 13.4] },
    { id: "i5", categoria: "Productividad", metrica: "Presión de tanque", objetivo: "0.8 - 1.2 bar", valor: "1.35 bar", equipos: ["Tanque CCT 08"], sistemas: ["MES"], estado: "fail", trend: [1.0, 1.1, 1.2, 1.25, 1.3, 1.32, 1.35] },
    { id: "i6", categoria: "Calidad", metrica: "Diacetilo", objetivo: "≤ 0.10 ppm", valor: "0.07 ppm", equipos: ["Tanques CCT", "Cromatógrafo"], sistemas: ["ACADIA"], estado: "ok", trend: [0.12, 0.10, 0.09, 0.08, 0.07, 0.07, 0.07] },
    { id: "i7", categoria: "Productividad", metrica: "Pérdidas en filtración", objetivo: "≤ 0.8%", valor: "0.6%", equipos: ["Filtro de Tierras", "Bombas"], sistemas: ["SAP", "MES"], estado: "ok", trend: [0.9, 0.8, 0.7, 0.65, 0.6, 0.6, 0.6] },
  ],
  podio: [],
  logros: [
    "12 días consecutivos sin desviaciones de O₂",
    "Kaizen entregado: -8% consumo de glycol",
    "Reto Sensorial #14 superado",
    "Auditoría microbiológica perfecta",
  ],
  excelenciaEquipo: 95,
  cumplimientoPorHora: baseHoras.map((h, i) => ({ hora: h, cumplimiento: [92, 94, 95, 96, 97, 95, 96, 95][i] })),
  autonomyFactors: {
    dinamica: 3.8,
    liderazgo: 4.0,
    skap: 3.2,
    ato: 2.5,
    seguridad: 3.5,
    quas: 2.8,
    multihab: 3.0,
    vpo: 3.2,
    solucionProb: 3.5,
    infraest: 3.8,
  }
};

export const mantenimiento: AreaData = {
  team: "Tech Guardians",
  lema: "Pilar de Confiabilidad · Mantenimiento",
  linea: "Área Mantenimiento · Brewery Maintenance",
  autonomia: 0,
  nivelLabel: "Evaluación de Autonomía",
  kpis: [
    { label: "MTBF", value: "142h", tone: "ok" },
    { label: "MTTR", value: "1.2h", tone: "ok" },
    { label: "PM Compliance", value: "98%", tone: "ok" },
    { label: "Backlog", value: "12", tone: "warn" },
  ],
  operadores: [],
  ips: [],
  podio: [],
  logros: [],
  excelenciaEquipo: 0,
  cumplimientoPorHora: baseHoras.map((h, i) => ({ hora: h, cumplimiento: [90, 92, 88, 95, 93, 91, 94, 92][i] })),
  autonomyFactors: {
    dinamica: 0,
    liderazgo: 0,
    skap: 0,
    ato: 0,
    seguridad: 0,
    quas: 0,
    multihab: 0,
    vpo: 0,
    solucionProb: 0,
    infraest: 0,
  }
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

export const OPERATORS_MAX_SKILLS: Record<string, number> = {
  // Mantenimiento (Brewing Maintenance)
  "32043739": 1, // LAZARO QUEZADA
  "32043804": 1, // ALEJANDRO LOPEZ
  "32043835": 1, // FILIBERTO PINEDO
  "32043861": 1, // VICTOR MANUEL DE JESUS SIMENTAL
  "32043900": 1, // VICTOR MANUEL HURTADO
  "32044251": 1, // GERARDO ESPARZA
  "32044301": 1, // EDUARDO NERI
  "32044314": 1, // JOSE MARIA LUJAN
  "32044316": 1, // SERGIO TRUJILLO
  "32044319": 1, // MARCO ANTONIO MENCHACA
  "32044478": 1, // SERGIO ENRIQUE RODRIGUEZ
  "32044789": 1, // JUAN ISIDRO CAMPOS
  "32044909": 1, // HERIBERTO LIMON
  "32045043": 1, // LUIS ANTONIO RAMIREZ
  "32045106": 1, // ARTURO VELAZQUEZ
  "32045469": 1, // ANDRES SARABIA
  "32045769": 1, // JUAN LOPEZ
  "32045952": 1, // VICTOR MENDOZA
  "32092747": 1, // JOSE GABRIEL RODRIGUEZ
  "32145333": 1, // FLAVIO CESAR DIAZ
  "32146005": 1, // RAMON COLLAZO
  "32149490": 1, // JUAN ANTONIO RIVERA
  "32173442": 1, // MARIO DAVID CASTAÑEDA
  "32173447": 1, // ALEJANDRO DE JESUS ROBLES
  "32176714": 1, // JOSE EUSEBIO IBARRA
  "32199772": 1, // ARTURO RODARTE
  "32199794": 1, // LUIS OTONIEL PACHECO
  "32219006": 1, // PABLO CESAR OROZCO

  // Bloque Frío (Cold Block)
  "32043849": 2, // PEDRO ANTONIO URIBE
  "32043880": 1, // JAIME CID
  "32043886": 2, // RAFAEL CHAVEZ
  "32043891": 2, // ARMANDO RAYZOLA
  "32043902": 2, // ARTURO SAUCEDO
  "32044036": 2, // VICTOR SOTO
  "32044235": 1, // JESUS EDUARDO BRICEÑO
  "32044246": 1, // MIGUEL ANGEL SANCHEZ
  "32044513": 2, // HUMBERTO RODARTE
  "32044514": 1, // LUIS MANUEL DOMINGUEZ
  "32044751": 1, // JUAN MANUEL HUERTA
  "32044760": 2, // MAURICIO ARELLANO
  "32044771": 1, // RAFAEL MARTINEZ
  "32044776": 1, // BENITO VALLE
  "32045076": 2, // ERON GUARDADO
  "32045116": 1, // JOSE LEANDRO MARTINEZ
  "32045128": 2, // JESUS CALDERON
  "32045134": 2, // PEDRO MALDONADO
  "32045139": 1, // RICARDO ESPARZA
  "32045149": 1, // ENRIQUE MEDINA
  "32045357": 1, // GUSTAVO MELENCIANO
  "32045396": 2, // JUAN GABRIEL HERNANDEZ
  "32045410": 2, // RODOLFO CABRERA
  "32045556": 2, // VICTOR MANUEL REYES VALLE
  "32045574": 2, // PEDRO PALOS
  "32111307": 2, // FRANCISCO JAVIER VARELA
  "32132025": 2, // SERGIO MIGUEL PARRA
  "32142953": 2, // GERMAN RUEDAS
  "32143106": 1, // VICTOR HUGO ZAPATA
  "32144776": 2, // WILMAR YOEL GONZALEZ
  "32144777": 2, // OSCAR CAMPOS
  "32144778": 1, // JUAN FRANCISCO GARCIA
  "32146003": 1, // LUIS FERNANDO ZAPATA
  "32149237": 2, // HELMER DEL REAL
  "32149238": 2, // OSWALDO DELGADILLO
  "32149605": 2, // JUAN MANUEL RODARTE
  "32149607": 2, // JORGE ALBERTO ORTIZ
  "32154634": 1, // EDGAR RENE DIAZ
  "32157221": 2, // JESUS MENCHACA
  "32173446": 2, // JOSE EDUARDO ALVARADO
  "32175115": 2, // NESTOR MONTOYA
  "32176720": 2, // JOSE REFUGIO LOPEZ
  "32181712": 2, // CARLOS ADRIAN ROBLES
  "32183480": 2, // LUIS ARMANDO REYES
  "32188009": 2, // ALDO ERNESTO SILVA
  "32188117": 2, // MIGUEL ANGEL NAVARRO
  "32188513": 1, // GUILLERMO GERARDO GONZALEZ
  "32196366": 2, // VICTOR HUGO ASCENCIO
  "32196674": 1, // OSCAR RODRIGUEZ
  "32197833": 3, // JORGE LUIS RODRIGUEZ
  "32197834": 2, // LUIS ADOLFO MALDONADO
  "32197835": 2, // MARIO ALBERTO REYES
  "32197975": 2, // LUIS RICARDO VALDES
  "32201712": 3, // JUAN CARLOS MORALES
  "32201713": 2, // RODOLFO ESPARZA
  "32209921": 3, // OSCAR EDUARDO VALDEZ
  "32209922": 2, // JOSE GUADALUPE VALLE
  "32213345": 3, // MANUEL DE JESUS FALCON
  "32213349": 2, // PEDRO LUIS RODRIGUEZ
  "32222222": 3, // EFREN GONZALEZ
  "32222223": 3, // HECTOR MANUEL DE LA ROSA
  "32222224": 2, // RICARDO ESTEBAN JARAMILLO
  "32224001": 1, // SHERLYN GARCIA
  "32224377": 1, // CARLOS EDUARDO ORNEDO
  "32231910": 1, // ARIADNNE MAGDALENA TORRES
  "32231911": 1, // ANA PAOLA PERERA
  "32233327": 1  // ISAI SOLORZANO
};
