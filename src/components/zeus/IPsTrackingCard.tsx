import { useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SystemBadge } from "./SystemBadge";
import { StatusIcon, statusLabel } from "./StatusIcon";
import type { IPRow } from "@/data/zeus";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

type Filter = "todos" | "Productividad" | "Calidad";

interface Props {
  ips: IPRow[];
  cumplimientoPorHora: { hora: string; cumplimiento: number }[];
}

export function IPsTrackingCard({ ips, cumplimientoPorHora }: Props) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      ips.filter(
        (r) =>
          (filter === "todos" || r.categoria === filter) &&
          (q === "" ||
            r.metrica.toLowerCase().includes(q.toLowerCase()) ||
            r.equipos.some((e) => e.toLowerCase().includes(q.toLowerCase()))),
      ),
    [ips, filter, q],
  );

  const compliance = ips.filter((r) => r.estado === "ok").length;
  const compliancePct = Math.round((compliance / ips.length) * 100);

  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-md transition hover:shadow-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-yellow-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-blue-900">Seguimiento de IPs · Indicadores de Proceso</h2>
            <p className="text-[10px] text-slate-500">
              {ips.length} indicadores asignados · {compliancePct}% en meta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
            {(["todos", "Productividad", "Calidad"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3 py-1 font-semibold capitalize transition",
                  filter === f ? "bg-blue-900 text-white shadow" : "text-slate-600 hover:text-blue-900",
                )}
              >
                {f === "todos" ? "Todos" : f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar IP o equipo…"
              className="h-8 w-48 pl-7 text-xs"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Categoría</th>
              <th className="px-3 py-2 text-left font-semibold">IP Asignado</th>
              <th className="px-3 py-2 text-left font-semibold">Equipos</th>
              <th className="px-3 py-2 text-left font-semibold">Sistemas</th>
              <th className="px-3 py-2 text-left font-semibold">Tendencia turno</th>
              <th className="px-3 py-2 text-center font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="group border-b border-slate-100 transition hover:bg-blue-50/40"
              >
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      r.categoria === "Productividad"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800",
                    )}
                  >
                    {r.categoria}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-slate-800">{r.metrica}</div>
                  <div className="text-[11px] text-slate-500">
                    Meta {r.objetivo} · <span className="font-bold text-blue-900">{r.valor}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {r.equipos.map((e) => (
                      <span
                        key={e}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {r.sistemas.map((s) => (
                      <SystemBadge key={s} system={s} />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="h-9 w-24">
                    <ResponsiveContainer>
                      <LineChart data={r.trend.map((v, i) => ({ i, v }))}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={
                            r.estado === "ok" ? "#16a34a" : r.estado === "warn" ? "#eab308" : "#dc2626"
                          }
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex flex-col items-center gap-0.5" title={statusLabel(r.estado)}>
                    <StatusIcon status={r.estado} />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                      {statusLabel(r.estado)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-slate-100 p-3">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Cumplimiento IPs por hora del turno
          </h3>
          <span className="text-[10px] text-slate-500">% de IPs en meta</span>
        </div>
        <div className="h-28 w-full">
          <ResponsiveContainer>
            <BarChart data={cumplimientoPorHora}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(v: number) => [`${v}%`, "Cumplimiento"]}
              />
              <Bar dataKey="cumplimiento" radius={[4, 4, 0, 0]}>
                {cumplimientoPorHora.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.cumplimiento >= 95 ? "#1e3a8a" : d.cumplimiento >= 90 ? "#eab308" : "#dc2626"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </footer>
    </section>
  );
}
