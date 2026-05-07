import { useState, useMemo } from "react";
import { Check, ShieldAlert, BadgeCheck, Leaf, Wrench, AlertTriangle, Search, ClipboardList, Users, Truck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { championColors, type ChampionKey, type Operator } from "@/data/zeus";
import { cn, getLeaderColor } from "@/lib/utils";

const championIcon: Record<ChampionKey, any> = {
  seguridad: ShieldAlert,
  calidad: BadgeCheck,
  ambiental: Leaf,
  mantenimiento: Wrench,
  gestion: ClipboardList,
  gente: Users,
  logistica: Truck,
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

function getCapabilityColor(val: number) {
  if (val >= 90) return "bg-green-500 text-white";
  if (val >= 70) return "bg-green-400 text-slate-800";
  if (val >= 50) return "bg-yellow-400 text-slate-800";
  if (val >= 30) return "bg-orange-500 text-white";
  return "bg-red-500 text-white";
}

function normalize(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function PhysicalBoard({ operadores }: { operadores: (Operator & { autonomyScore: number })[] }) {
  const [search, setSearch] = useState("");

  // Keep original index for podium styling, filter by name
  const filtered = useMemo(() => {
    const indexed = operadores.map((op, idx) => ({ op, originalIdx: idx }));
    if (!search.trim()) return indexed;
    const q = normalize(search.trim());
    return indexed.filter(({ op }) => normalize(op.nombre).includes(q));
  }, [operadores, search]);

  return (
    <div className="w-full space-y-3">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar operador por nombre…"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-[#1a4491] focus:outline-none focus:ring-2 focus:ring-[#1a4491]/20 transition-colors"
        />
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-md">
      <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[#1a4491] text-xs font-bold text-white uppercase tracking-wider">
            <th className="border-b border-r border-slate-300 p-3 w-64">OPERADOR</th>
            <th className="border-b border-r border-slate-300 p-3 w-40 text-center">EQUIPO AUTONOMO</th>
            <th className="border-b border-r border-slate-300 p-3 w-48 text-center">CAPABILITIES</th>
            <th className="border-b border-r border-slate-300 p-3 w-48">MULTI-HABILIDAD</th>
            <th className="border-b border-r border-slate-300 p-3 w-40">CHAMPIONS</th>
            <th className="border-b border-r border-slate-300 p-3 w-32 text-center">ATO</th>
            <th className="border-b border-r border-slate-300 p-3 w-64">IPs ASIGNADOS</th>
            <th className="border-b border-r border-slate-300 p-3 w-40">PRE REQUISITOS</th>
            <th className="border-b p-3 w-32 text-center">NIVEL AUTONOMIA</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(({ op, originalIdx }, visIdx) => {
            const auto5 = ((op.autonomyScore / 100) * 5).toFixed(2);
            const idx = originalIdx;
            
            let isExpired = false;
            if (op.lastAssessmentDate) {
               const assessment = new Date(op.lastAssessmentDate);
               const now = new Date();
               const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
               if (assessment < threeMonthsAgo) {
                 isExpired = true;
               }
            }
            
            const baseBg = visIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50";
            
            // Podium row styles for top 3 operators
            const podiumStyles: Record<number, string> = {
              0: "bg-[#fef9c3]/60 hover:bg-[#fef3c7] border-l-4 border-l-[#f59e0b] transition-colors", // 🥇 Gold
              1: "bg-[#f1f5f9]/80 hover:bg-[#e2e8f0] border-l-4 border-l-[#94a3b8] transition-colors", // 🥈 Silver
              2: "bg-[#fed7aa]/40 hover:bg-[#fde68a]/50 border-l-4 border-l-[#d97706] transition-colors", // 🥉 Bronze
            };

            const rowClass = isExpired 
              ? "bg-red-50 hover:bg-red-100/80 transition-colors border-l-4 border-l-red-500"
              : podiumStyles[idx] ?? cn("transition hover:bg-slate-50 border-l-4 border-l-transparent", baseBg);

            return (
              <tr key={op.id} className={rowClass}>
                
                {/* 1. OPERADOR */}
                <td className="border-b border-r border-slate-200 p-3 align-middle">
                  <div className="flex items-center gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="focus:outline-none focus:ring-2 focus:ring-[#1a4491] rounded-md transition-transform hover:scale-105 active:scale-95">
                          <Avatar className="h-12 w-12 shrink-0 rounded-md shadow-sm border border-slate-200">
                            <AvatarImage src={`/fotos/${op.nombre.trim()}.jpeg?v=1`} alt={op.nombre} className="object-cover" />
                            <AvatarFallback className="rounded-md bg-gradient-to-br from-[#1a4491] to-[#2c65cc] text-lg font-bold text-white">
                              {initials(op.nombre.trim())}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm sm:max-w-md bg-slate-50 p-6 rounded-xl border-slate-200 flex flex-col items-center">
                        <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-200 shadow-inner flex items-center justify-center">
                          <img 
                            src={`/fotos/${op.nombre.trim()}.jpeg?v=1`} 
                            alt={op.nombre} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              // If image fails to load, replace with initials
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                              if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }} 
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-[#1a4491] to-[#2c65cc] text-6xl font-black text-white hidden items-center justify-center">
                            {initials(op.nombre.trim())}
                          </div>
                        </div>
                        <div className="text-center mt-4 space-y-1">
                          <DialogTitle className="text-2xl font-black text-[#1a4491] leading-tight">{op.nombre}</DialogTitle>
                          <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest">{op.puesto}</DialogDescription>
                          {op.lider && <p className="text-xs font-semibold text-slate-400 mt-2">Líder: {op.lider}</p>}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate text-sm font-bold text-slate-800">
                        {idx < 3 && <span className="text-base">{["🥇", "🥈", "🥉"][idx]}</span>}
                        {op.nombre}
                        {isExpired && (
                          <div className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[8px] font-bold text-red-700 uppercase tracking-wider" title={`Última evaluación: ${op.lastAssessmentDate}`}>
                            <AlertTriangle className="h-2.5 w-2.5" />
                            +3 Meses
                          </div>
                        )}
                      </div>
                      <div className="truncate text-[10px] font-semibold text-slate-500">{op.puesto}</div>
                      {op.lider && (
                        <div className="mt-1.5 flex">
                          <div className={cn("px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md border", getLeaderColor(op.lider))}>
                            Líder: {op.lider}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* 1.5 EQUIPO AUTONOMO */}
                <td className="border-b border-r border-slate-200 p-3 align-middle text-center">
                  <div className="text-[10px] font-bold text-[#1a4491] uppercase">
                    {op.equipoAutonomo || <span className="text-slate-400 italic font-normal">Sin Equipo</span>}
                  </div>
                </td>

                {/* 2. CAPABILITIES */}
                <td className="border-b border-r border-slate-200 p-2 align-middle">
                  <div className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Driver's License</span>
                      <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", getCapabilityColor(op.basico))}>
                        {Math.round(op.basico)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Intermediate</span>
                      <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", getCapabilityColor(op.intermedio))}>
                        {Math.round(op.intermedio)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Advanced</span>
                      <span className={cn("px-2 py-0.5 rounded font-bold tabular-nums min-w-[36px] text-center shadow-sm", getCapabilityColor(op.avanzado))}>
                        {Math.round(op.avanzado)}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 3. MULTI-HABILIDAD */}
                <td className="border-b border-r border-slate-200 p-2 align-middle">
                  <div className="flex flex-col gap-1.5">
                    {op.equipos && op.equipos.length > 0 ? (
                      op.equipos.slice(0, 4).map((eq, i) => (
                        <div key={i} className="rounded bg-sky-400 px-2 py-1 text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 leading-none">
                          <Wrench className="h-3 w-3 opacity-75" />
                          <span className="truncate">{eq.toUpperCase()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 italic">Sin equipos</div>
                    )}
                  </div>
                </td>

                {/* 4. CO-CHAMPION */}
                <td className="border-b border-r border-slate-200 p-2 align-middle">
                  <div className="flex flex-col gap-1.5">
                    {op.champions && op.champions.length > 0 ? (
                      op.champions.map((c) => {
                        const Icon = championIcon[c];
                        const cfg = championColors[c];
                        // Map colors to match physical board more closely
                        let bg = "bg-slate-200 text-slate-700";
                        if (c === "seguridad") bg = "bg-orange-500 text-white";
                        if (c === "calidad") bg = "bg-purple-600 text-white";
                        if (c === "ambiental") bg = "bg-green-600 text-white";
                        if (c === "mantenimiento") bg = "bg-blue-600 text-white";
                        if (c === "gestion") bg = "bg-purple-400 text-white";
                        if (c === "gente") bg = "bg-pink-500 text-white";
                        if (c === "logistica") bg = "bg-slate-500 text-white";

                        return (
                          <div key={c} className={cn("flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold uppercase shadow-sm leading-none", bg)}>
                            <Icon className="h-3 w-3" />
                            {c}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-slate-400 italic">No asignado</div>
                    )}
                  </div>
                </td>

                {/* 5. ATO (Mocked to match image) */}
                <td className="border-b border-r border-slate-200 p-2 align-middle text-center">
                  <div className="mx-auto flex w-full max-w-[100px] flex-col overflow-hidden rounded border border-[#1a4491] shadow-sm">
                    <div className="bg-[#1a4491] py-0.5 text-[10px] font-bold text-white uppercase">ATO</div>
                    <div className="flex h-8 items-center justify-center bg-slate-200 text-lg font-black text-slate-800">
                      {(op.nombre.length % 8) + 1}
                    </div>
                    <div className="bg-sky-200 py-0.5 text-[8px] font-bold text-[#1a4491] uppercase truncate px-1">
                      Territorio Safety
                    </div>
                  </div>
                </td>

                {/* 6. IPs ASIGNADOS (Mocked) */}
                <td className="border-b border-r border-slate-200 p-2 align-middle">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[9px] font-bold text-slate-500">PRODUCTIVIDAD</span>
                      <div className="flex-1 rounded bg-sky-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm truncate">
                        Consumo de energía / OEE
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[9px] font-bold text-slate-500">CALIDAD</span>
                      <div className="flex-1 rounded bg-sky-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm truncate">
                        Control de variables
                      </div>
                    </div>
                  </div>
                </td>

                {/* 7. PRE REQUISITOS (Mocked) */}
                <td className="border-b border-r border-slate-200 p-2 align-middle">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-600">
                    <div className="flex items-center gap-1"><Check className="h-3 w-3 text-slate-300" /> WVD</div>
                    <div className="flex items-center gap-1"><Check className="h-3 w-3 text-slate-300" /> ACADIA</div>
                    <div className="flex items-center gap-1"><Check className="h-3 w-3 text-slate-300" /> CORREO</div>
                    <div className="flex items-center gap-1"><Check className="h-3 w-3 text-slate-300" /> MANGYVER</div>
                    <div className="flex items-center gap-1"><Check className="h-3 w-3 text-slate-300" /> SAP</div>
                    <div className="flex items-center gap-1"><Check className="h-3 w-3 text-slate-300" /> MES</div>
                    <div className="flex items-center gap-1"><Check className="h-3 w-3 text-slate-300" /> IAL</div>
                    <div className="flex items-center gap-1"><Check className="h-3 w-3 text-slate-300" /> ETO</div>
                  </div>
                </td>

                {/* 8. NIVEL AUTONOMIA */}
                <td className="border-b p-3 align-middle text-center">
                  <div className="mx-auto flex w-16 flex-col items-center justify-center overflow-hidden rounded border border-[#1a4491] shadow-sm">
                    <div className="w-full bg-[#1a4491] py-1 text-center text-[10px] font-bold leading-tight text-white uppercase">
                      NIVEL<br/>AUTONOMIA
                    </div>
                    <div className="flex w-full items-center justify-center bg-white py-1.5 text-xl font-black text-[#1a4491]">
                      {auto5}
                    </div>
                  </div>
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
