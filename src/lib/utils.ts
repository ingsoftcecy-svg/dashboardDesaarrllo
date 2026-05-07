import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLeaderColor(name: string) {
  if (!name) return "bg-slate-100 text-slate-700";
  const colors = [
    "bg-amber-100 text-amber-800 border-amber-300",
    "bg-emerald-100 text-emerald-800 border-emerald-300",
    "bg-indigo-100 text-indigo-800 border-indigo-300",
    "bg-rose-100 text-rose-800 border-rose-300",
    "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
    "bg-cyan-100 text-cyan-800 border-cyan-300",
    "bg-teal-100 text-teal-800 border-teal-300",
    "bg-violet-100 text-violet-800 border-violet-300",
  ];
  
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % colors.length;
  };

  const normalized = name.trim().toUpperCase();
  if (normalized === "FÁTIMA NEDITH GOMEZ MIRELES" || normalized === "FATIMA NEDITH GOMEZ MIRELES") {
    return colors[getHash("JUAN SALAZAR BANDA")];
  }
  if (normalized === "JUAN SALAZAR BANDA") {
    return colors[getHash("FÁTIMA NEDITH GOMEZ MIRELES")];
  }

  return colors[getHash(name)];
}
