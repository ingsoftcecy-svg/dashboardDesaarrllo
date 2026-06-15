import { ShieldAlert, BadgeCheck, Leaf, Wrench, ClipboardList, Users, Truck } from "lucide-react";
import type { ChampionKey } from "@/data/zeus";

export const STRINGS = {
  TITLE: "Matriz Multi-Skill",
  SUBTITLE: "Co-Champions activos por operador",
  SEARCH_PLACEHOLDER: "Buscar por nombre o puesto...",
  EMPTY_RESULTS: "No se encontraron operadores que coincidan con la búsqueda.",
  LEGEND_BASIC: "Básico (Lic. manejo)",
  LEGEND_INTERMEDIATE: "Intermedio",
  LEGEND_ADVANCED: "Avanzado",
};

export const CHAMPION_ICONS: Record<ChampionKey, any> = {
  seguridad: ShieldAlert,
  calidad: BadgeCheck,
  ambiental: Leaf,
  mantenimiento: Wrench,
  gestion: ClipboardList,
  gente: Users,
  logistica: Truck,
};
