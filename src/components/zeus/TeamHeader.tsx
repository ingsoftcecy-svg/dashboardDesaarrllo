import { AutonomyGauge } from "./AutonomyGauge";
import type { AreaData } from "@/data/zeus";
import { Factory } from "lucide-react";
import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  ok: "text-green-700 bg-green-50 border-green-200",
  warn: "text-yellow-700 bg-yellow-50 border-yellow-200",
  fail: "text-red-700 bg-red-50 border-red-200",
};

export function TeamHeader({ area, shift }: { area: AreaData; shift: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md transition hover:shadow-lg">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-900 text-yellow-400 shadow-md">
            <Factory className="h-7 w-7" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">
              Equipo natural de trabajo
            </div>
            <h1 className="text-2xl font-bold text-blue-900">{area.team}</h1>
            <div className="text-sm text-slate-500">
              {area.lema} · {area.linea} · Turno {shift}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {area.kpis.map((k) => (
              <div
                key={k.label}
                className={cn(
                  "min-w-[120px] rounded-lg border px-3 py-2 transition hover:scale-[1.02]",
                  toneClasses[k.tone],
                )}
              >
                <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                  {k.label}
                </div>
                <div className="text-xl font-bold">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
            <AutonomyGauge value={area.autonomia} />
            <div className="leading-tight">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Nivel de Autonomía
              </div>
              <div className="text-base font-bold text-blue-900">{area.nivelLabel}</div>
              <div className="mt-1 inline-flex rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold text-yellow-700">
                META: 4.00
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
