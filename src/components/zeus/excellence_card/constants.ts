import { Crown, Medal, Award, Star, Sparkles } from "lucide-react";

export const STRINGS = {
  TITLE: "ChingOwners",
  SUBTITLE: "Los reconocimientos más chingones",
  ACHIEVEMENTS_TITLE: "Logros de la semana",
  TEAM_EXCELLENCE: "Excelencia del equipo",
  GOAL_TEXT: "vs. meta 90%",
  PLACE_SUFFIX: " Lugar",
  LEADER_LABEL: "Líder:",
};

export const PODIUM_CONFIG = [
  { icon: Crown, color: "from-yellow-400 to-yellow-500", text: "text-yellow-900", label: "1°", height: "h-28" },
  { icon: Medal, color: "from-slate-300 to-slate-400", text: "text-slate-800", label: "2°", height: "h-20" },
  { icon: Award, color: "from-amber-600 to-amber-700", text: "text-amber-50", label: "3°", height: "h-16" },
  { icon: Star, color: "from-blue-400 to-blue-500", text: "text-blue-50", label: "4°", height: "h-12" },
  { icon: Sparkles, color: "from-purple-400 to-purple-500", text: "text-purple-50", label: "5°", height: "h-10" },
];

export const PODIUM_ORDER = [0, 1, 2, 3, 4];
