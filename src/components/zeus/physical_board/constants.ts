import { ShieldAlert, BadgeCheck, Leaf, Wrench, ClipboardList, Users, Truck } from "lucide-react";
import type { ChampionKey } from "@/data/zeus";

export const CHAMPION_ICONS: Record<ChampionKey, any> = {
  seguridad: ShieldAlert,
  calidad: BadgeCheck,
  ambiental: Leaf,
  mantenimiento: Wrench,
  gestion: ClipboardList,
  gente: Users,
  logistica: Truck,
};

export const PRE_REQUISITES_LIST = ["WVD", "ACADIA", "CORREO", "MANGYVER", "SAP", "CORE", "IAL", "ETO", "SPLAN", "SUITE 360"];

export const STRINGS = {
  SEARCH_PLACEHOLDER: "Buscar por operador, equipo o líder…",
  NO_TEAM: "Sin Equipo",
  NO_EQUIPMENT: "Sin equipos",
  NOT_ASSIGNED: "No asignado",
  DRIVERS_LICENSE: "Driver's License",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  SAFETY_TERRITORY: "Territorio Safety",
  AUTONOMY_LEVEL: "NIVEL AUTONOMIA",
  ATO: "ATO",
  MANAGE_IPS_TITLE: "Gestionar IPs",
  SELECT_IPS_SUBTITLE: "Seleccionar IPs para el operador",
  GLOBAL_LIST_SUBTITLE: "Administrar Lista Global (Para todos)",
  ADD_BUTTON: "AÑADIR",
  REMOVE_BUTTON: "ELIMINAR",
  EXPIRED_ASSESSMENT: "+2 Meses",
  LEADER_LABEL: "Líder:",
  TEAM_LOGO_OFFICIAL: "Logo Oficial del Equipo",
  LOGO_FALLBACK: "LOGO",
};
