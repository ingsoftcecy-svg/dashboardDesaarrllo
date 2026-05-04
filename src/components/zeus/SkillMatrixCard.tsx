import { Users, ShieldAlert, BadgeCheck, Leaf, Wrench } from "lucide-react";
import { championColors, type ChampionKey, type Operator } from "@/data/zeus";
import { cn } from "@/lib/utils";

const championIcon: Record<ChampionKey, typeof ShieldAlert> = {
  seguridad: ShieldAlert,
  calidad: BadgeCheck,
  ambiental: Leaf,
  mantenimiento: Wrench,
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

function SkillBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 text-[9px] font-bold text-slate-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 text-right text-[10px] font-semibold tabular-nums text-slate-600">
        {value}%
      </span>
    </div>
  );
}

export function SkillMatrixCard({ operadores }: { operadores: Operator[] }) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-md transition hover:shadow-lg">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-yellow-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-blue-900">Matriz Multi-Skill</h2>
            <p className="text-[10px] text-slate-500">Co-Champions activos por operador</p>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-900">
          {operadores.length} operadores
        </span>
      </header>

      <div className="flex flex-col gap-1 overflow-y-auto p-2">
        {operadores.map((op) => (
          <div
            key={op.id}
            className="rounded-lg border border-transparent p-2.5 transition hover:border-blue-200 hover:bg-blue-50/60"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-blue-600 text-xs font-bold text-white shadow-sm">
                {initials(op.nombre)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{op.nombre}</div>
                <div className="text-[10px] text-slate-500">{op.puesto}</div>
              </div>
              <div className="flex gap-1">
                {op.champions.map((c) => {
                  const Icon = championIcon[c];
                  const cfg = championColors[c];
                  return (
                    <span
                      key={c}
                      title={cfg.label}
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-md",
                        cfg.bg,
                        cfg.text,
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <SkillBar label="B" value={op.basico} color="bg-green-500" />
              <SkillBar label="I" value={op.intermedio} color="bg-yellow-400" />
              <SkillBar label="A" value={op.avanzado} color="bg-blue-700" />
            </div>
          </div>
        ))}
      </div>

      <footer className="flex items-center justify-around border-t border-slate-100 px-3 py-2 text-[10px] font-medium">
        <span className="flex items-center gap-1 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-green-500" /> Básico (Lic. manejo)
        </span>
        <span className="flex items-center gap-1 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-yellow-400" /> Intermedio
        </span>
        <span className="flex items-center gap-1 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-blue-700" /> Avanzado
        </span>
      </footer>
    </section>
  );
}
