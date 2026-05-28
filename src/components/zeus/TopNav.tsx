import { useEffect, useState } from "react";
import { Beer, Clock, Settings } from "lucide-react"; // ⚙️ Importado Settings
import { cn } from "@/lib/utils";
import { useNavigate } from '@tanstack/react-router';

export type AreaTab = "general" | "cocimientos" | "bloqueFrio" | "mantenimiento";

interface Props {
  tab: AreaTab;
  onTabChange: (t: AreaTab) => void;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function TopNav({ tab, onTabChange }: Props) {
  const navigate = useNavigate();
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-blue-900 text-white shadow-lg">
      <div className="flex h-16 items-center gap-6 px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg shadow bg-white overflow-hidden">
            <img src="/logos/BREWMAN.jpeg" alt="BREWMAN" className="h-full w-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold">Dashboard de Autonomía</div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mx-auto flex items-center gap-1 rounded-full bg-blue-950/60 p-1 shadow-inner">
          {(["general", "cocimientos", "bloqueFrio", "mantenimiento"] as AreaTab[]).map((t) => {
            const active = tab === t;
            const label = t === "general" ? "GENERAL" : t === "cocimientos" ? "COCIMIENTOS" : t === "bloqueFrio" ? "BLOQUE FRÍO" : "MANTENIMIENTO";
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
        <div className="flex items-center gap-5"> {/* Se aumentó ligeramente el gap de 4 a 5 */}
          <div className="hidden text-right md:block min-w-[120px]">
            {mounted && (
              <>
                <div className="flex items-center justify-end gap-1.5 text-lg font-semibold tabular-nums">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  {time}
                </div>
                <div className="text-[11px] capitalize text-blue-200">{date}</div>
              </>
            )}
          </div>

          {/* ⚙️ Icono de Configuración interactivo al lado del reloj */}
          <button
            aria-label="Configuración"
            className="text-blue-200 hover:text-yellow-400 transition-colors p-1.5 rounded-lg hover:bg-blue-800/50 outline-none"
            onClick={() => {
              // Aquí puedes redirigir usando TanStack Router si lo necesitas
              navigate({ to: '/cargar-datos' })
              console.log("Abrir configurador de datos (ruta: /cargar-datos)");
            }}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
