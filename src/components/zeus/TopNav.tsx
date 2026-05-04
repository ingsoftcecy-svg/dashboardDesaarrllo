import { useEffect, useState } from "react";
import { Beer, Clock, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AreaTab = "cocimientos" | "bloqueFrio";

interface Props {
  tab: AreaTab;
  onTabChange: (t: AreaTab) => void;
  shift: string;
  onShiftChange: (s: string) => void;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function TopNav({ tab, onTabChange, shift, onShiftChange }: Props) {
  const now = useClock();
  const time = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(now);

  return (
    <header className="sticky top-0 z-20 bg-blue-900 text-white shadow-lg">
      <div className="flex h-16 items-center gap-6 px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400 text-blue-900 shadow">
            <Beer className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-400">
              Proyecto ZEUS
            </div>
            <div className="text-base font-bold">Dashboard de Elaboración</div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mx-auto flex items-center gap-1 rounded-full bg-blue-950/60 p-1 shadow-inner">
          {(["cocimientos", "bloqueFrio"] as AreaTab[]).map((t) => {
            const active = tab === t;
            const label = t === "cocimientos" ? "COCIMIENTOS" : "BLOQUE FRÍO";
            return (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={cn(
                  "rounded-full px-6 py-2 text-sm font-semibold tracking-wide transition-all",
                  active
                    ? "bg-yellow-400 text-blue-900 shadow"
                    : "text-blue-100 hover:bg-blue-800/60 hover:text-white",
                )}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            <div className="flex items-center justify-end gap-1.5 text-lg font-semibold tabular-nums">
              <Clock className="h-4 w-4 text-yellow-400" />
              {time}
            </div>
            <div className="text-[11px] capitalize text-blue-200">{date}</div>
          </div>

          <Select value={shift} onValueChange={onShiftChange}>
            <SelectTrigger className="h-9 w-[130px] border-blue-700 bg-blue-800/60 text-sm text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mañana">Turno Mañana</SelectItem>
              <SelectItem value="Tarde">Turno Tarde</SelectItem>
              <SelectItem value="Noche">Turno Noche</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 rounded-full bg-blue-800/60 py-1 pl-1 pr-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-blue-900">
              <User className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold">J. Hernández</div>
              <div className="text-[10px] text-blue-200">Supervisor</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
