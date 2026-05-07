import { Trophy, Crown, Medal, Award, Sparkles, Star } from "lucide-react";
import type { Podium } from "@/data/zeus";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { motion } from "framer-motion";
import { cn, getLeaderColor } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  podio: Podium[];
  logros: string[];
  excelenciaEquipo: number;
}

const podiumOrder = [0, 1, 2, 3, 4]; // 1st to 5th linear order

const places = [
  { icon: Crown, color: "from-yellow-400 to-yellow-500", text: "text-yellow-900", label: "1°", height: "h-28" },
  { icon: Medal, color: "from-slate-300 to-slate-400", text: "text-slate-800", label: "2°", height: "h-24" },
  { icon: Award, color: "from-amber-600 to-amber-700", text: "text-amber-50", label: "3°", height: "h-20" },
  { icon: Star, color: "from-blue-400 to-blue-500", text: "text-blue-50", label: "4°", height: "h-16" },
  { icon: Sparkles, color: "from-purple-400 to-purple-500", text: "text-purple-50", label: "5°", height: "h-12" },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("");
}

export function ExcellenceCard({ podio, logros, excelenciaEquipo }: Props) {
  return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className="flex h-full flex-col rounded-xl border border-white/40 bg-white/70 backdrop-blur-md shadow-xl transition hover:shadow-lg"
    >
      <header className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-3 text-white">
        <Trophy className="h-5 w-5 text-yellow-400" />
        <div>
          <h2 className="text-sm font-bold">ChingOwners</h2>
          <p className="text-[10px] text-blue-200">Los reconocimientos más chingones</p>
        </div>
      </header>

      <div className="p-3">
        {/* Podium Top 5 */}
        <div className="flex items-end justify-center gap-1.5">
          {podiumOrder.map((idx) => {
            const p = podio[idx];
            if (!p) return null;
            const cfg = places[idx];
            const Icon = cfg.icon;
            return (
              <div key={idx} className="flex flex-1 flex-col items-center">
                <div className="relative mb-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="focus:outline-none transition-transform hover:scale-105 active:scale-95">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-md ring-2 ring-white/50 bg-gradient-to-br from-blue-700 to-blue-900">
                          <AvatarImage src={`/fotos/${p.nombre.trim()}.jpeg?t=${Date.now()}`} className="object-cover" />
                          <AvatarFallback className="text-sm font-bold text-white">
                            {initials(p.nombre)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
                      <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center">
                        <img 
                          src={`/fotos/${p.nombre.trim()}.jpeg?t=${Date.now()}`} 
                          alt={p.nombre} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.nextElementSibling) {
                              (target.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1a4491] to-[#2c65cc] text-6xl font-black text-white hidden items-center justify-center">
                          {initials(p.nombre)}
                        </div>
                      </div>
                      <div className="text-center mt-4 space-y-1">
                        <DialogTitle className="text-2xl font-black text-[#1a4491] leading-tight uppercase">{p.nombre}</DialogTitle>
                        <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest">{p.puesto}</DialogDescription>
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                          <Icon className="h-4 w-4" />
                          {cfg.label} Lugar
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-blue-900 shadow z-10 pointer-events-none">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-center text-[11px] font-semibold leading-tight text-slate-800">
                  {p.nombre}
                </div>
                <div className="text-center text-[9px] text-slate-500 line-clamp-1" title={p.puesto}>{p.puesto}</div>
                {p.lider && (
                  <div className="mt-1 flex justify-center">
                    <div className={cn("px-1 py-0.5 text-[8px] font-bold uppercase rounded border text-center line-clamp-1", getLeaderColor(p.lider))} title={`Líder: ${p.lider}`}>
                      Líder: {p.lider}
                    </div>
                  </div>
                )}
                <div
                  className={`mt-1 flex w-full flex-col items-center justify-end rounded-t-lg bg-gradient-to-b ${cfg.color} ${cfg.height} px-1 py-1 ${cfg.text} shadow-inner`}
                >
                  <span className="text-lg font-black drop-shadow-sm">{cfg.label}</span>
                  <span className="text-[10px] font-bold opacity-90">{p.excelencia}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Achievements */}
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
            Logros de la semana
          </div>
          <ul className="space-y-1.5">
            {logros.map((l) => (
              <li
                key={l}
                className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 transition hover:border-yellow-300 hover:bg-yellow-50"
              >
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-bold text-blue-900">
                  ★
                </span>
                {l}
              </li>
            ))}
          </ul>
        </div>

        {/* Team excellence radial */}
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Excelencia del equipo
              </div>
              <div className="text-2xl font-bold text-blue-900">{excelenciaEquipo}%</div>
              <div className="text-[10px] text-slate-500">vs. meta 90%</div>
            </div>
            <div className="h-24 w-24">
              <ResponsiveContainer>
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="100%"
                  data={[{ name: "x", value: excelenciaEquipo, fill: "#facc15" }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: "#e2e8f0" }} dataKey="value" cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
