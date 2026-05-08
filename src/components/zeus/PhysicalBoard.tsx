import { useState, useMemo } from "react";
import { Check, ShieldAlert, BadgeCheck, Leaf, Wrench, AlertTriangle, Search, ClipboardList, Users, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { championColors, type ChampionKey, type Operator } from "@/data/zeus";
import { cn, getLeaderColor } from "@/lib/utils";
import { useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

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

const PRE_REQS = ["WVD", "ACADIA", "CORREO", "MANGYVER", "SAP", "CORE", "IAL", "ETO"];

function OperatorAvatar({ name }: { name: string }) {
  const [src, setSrc] = useState(`/fotos/${name.trim()}.jpeg?t=${Date.now()}`);

  return (
    <Avatar className="h-12 w-12 shrink-0 rounded-md shadow-sm border border-slate-200">
      <AvatarImage 
        src={src} 
        alt={name} 
        className="object-cover"
        onError={() => {
          if (src.includes('.jpeg')) {
            setSrc(`/fotos/${name.trim()}.png?t=${Date.now()}`);
          }
        }}
      />
      <AvatarFallback className="rounded-md bg-gradient-to-br from-[#1a4491] to-[#2c65cc] text-lg font-bold text-white">
        {name.split(" ").map(p => p[0]).slice(0, 2).join("")}
      </AvatarFallback>
    </Avatar>
  );
}

function PreReqEditor({ operatorId, operatorName, teamName }: { operatorId: string; operatorName: string; teamName: string }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`prereqs_${operatorId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const docRef = doc(db, "prerequisitos", operatorId);
    console.log(`Setting up Firestore listener for ${operatorName} (${operatorId})`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`Received data for ${operatorName}:`, data);
        const reqsOnly = { ...data };
        delete reqsOnly.operatorName;
        delete reqsOnly.teamName;
        setChecked(reqsOnly as Record<string, boolean>);
        // Update local cache
        localStorage.setItem(`prereqs_${operatorId}`, JSON.stringify(reqsOnly));
      } else {
        console.log(`No document found for ${operatorName} in Firestore`);
      }
    }, (error) => {
      console.error(`Firestore listener error for ${operatorName}:`, error);
    });
    return () => unsubscribe();
  }, [operatorId, operatorName]);

  const toggle = async (req: string) => {
    try {
      const nextState = !checked[req];
      console.log(`Toggling ${req} for ${operatorName} (${operatorId}) to ${nextState}`);
      
      setChecked(prev => ({ ...prev, [req]: nextState }));
      
      const docRef = doc(db, "prerequisitos", operatorId);
      await setDoc(docRef, {
        [req]: nextState,
        operatorName,
        teamName
      }, { merge: true });
      console.log("Firestore update successful");
    } catch (error) {
      console.error("Error updating Firestore:", error);
      // Fallback to localStorage for immediate feedback if Firestore fails
      try {
        const stored = localStorage.getItem(`prereqs_${operatorId}`);
        const current = stored ? JSON.parse(stored) : {};
        localStorage.setItem(`prereqs_${operatorId}`, JSON.stringify({ ...current, [req]: !checked[req] }));
      } catch (e) {
        console.error("LocalStorage fallback failed:", e);
      }
    }
  };

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-600">
      {PRE_REQS.map((req) => (
        <button
          key={req}
          onClick={() => toggle(req)}
          className="flex items-center gap-1.5 focus:outline-none hover:bg-slate-100 p-0.5 rounded transition-colors text-left"
        >
          <div className={cn(
            "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border",
            checked[req] ? "bg-[#1a4491] border-[#1a4491] text-white" : "border-slate-300 bg-white"
          )}>
            {checked[req] && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
          </div>
          {req}
        </button>
      ))}
    </div>
  );
}

function IPMediator({ operatorId, operatorName }: { operatorId: string; operatorName: string }) {
  const [globalIps, setGlobalIps] = useState<string[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);

  useEffect(() => {
    // Load global list
    const unsubGlobal = onSnapshot(doc(db, "config", "ips"), (s) => {
      if (s.exists()) setGlobalIps(s.data().list || []);
    });
    // Load operator assignments
    const unsubOp = onSnapshot(doc(db, "operator_ips", operatorId), (s) => {
      if (s.exists()) setAssigned(s.data().assigned || []);
    });
    return () => { unsubGlobal(); unsubOp(); };
  }, [operatorId]);

  const toggle = async (ip: string) => {
    const next = assigned.includes(ip) ? assigned.filter(i => i !== ip) : [...assigned, ip];
    setAssigned(next);
    await setDoc(doc(db, "operator_ips", operatorId), { assigned: next, operatorName }, { merge: true });
  };

  const addGlobal = async (newIp: string) => {
    const next = [...globalIps, newIp];
    await setDoc(doc(db, "config", "ips"), { list: next });
  };

  const removeGlobal = async (ip: string) => {
    const next = globalIps.filter(i => i !== ip);
    await setDoc(doc(db, "config", "ips"), { list: next });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {assigned.map(ip => (
          <div key={ip} className="rounded bg-sky-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm flex items-center gap-1 group">
            {ip}
            <button onClick={() => toggle(ip)} className="hover:text-red-200">×</button>
          </div>
        ))}
      </div>
      
      <Dialog>
        <DialogTrigger asChild>
          <button className="h-6 w-6 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center transition-colors shadow-sm border border-sky-200" title="Gestionar IPs">
            <ClipboardList className="h-3.5 w-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogTitle>Gestionar IPs - {operatorName}</DialogTitle>
          <div className="space-y-4 py-4">
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Seleccionar IPs para el operador</h4>
              <div className="flex flex-wrap gap-2">
                {globalIps.map(ip => (
                  <button
                    key={ip}
                    onClick={() => toggle(ip)}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase transition-all",
                      assigned.includes(ip) ? "bg-[#1a4491] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {ip}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Administrar Lista Global (Para todos)</h4>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  id="newIpInput"
                  placeholder="Nueva IP..." 
                  className="flex-1 text-xs border rounded px-2 py-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      if (input.value) { addGlobal(input.value); input.value = ''; }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('newIpInput') as HTMLInputElement;
                    if (input.value) { addGlobal(input.value); input.value = ''; }
                  }}
                  className="bg-green-600 text-white text-[10px] px-2 py-1 rounded font-bold"
                >AÑADIR</button>
              </div>
              <div className="space-y-1">
                {globalIps.map(ip => (
                  <div key={ip} className="flex items-center justify-between bg-slate-50 p-1.5 rounded text-[10px] font-medium">
                    {ip}
                    <button onClick={() => removeGlobal(ip)} className="text-red-500 hover:text-red-700 font-bold">ELIMINAR</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PhysicalBoard({ operadores }: { operadores: (Operator & { autonomyScore: number })[] }) {
  const [search, setSearch] = useState("");

  // Keep original index for podium styling, filter by name, team or leader
  const filtered = useMemo(() => {
    const indexed = operadores.map((op, idx) => ({ op, originalIdx: idx }));
    if (!search.trim()) return indexed;
    const q = normalize(search.trim());
    return indexed.filter(({ op }) => 
      normalize(op.nombre).includes(q) || 
      normalize(op.equipoAutonomo || "").includes(q) ||
      normalize(op.lider || "").includes(q)
    );
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
          placeholder="Buscar por operador, equipo o líder…"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-[#1a4491] focus:outline-none focus:ring-2 focus:ring-[#1a4491]/20 transition-colors"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl border border-white/40 bg-white/60 backdrop-blur-md shadow-xl"
      >
      <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-30">
          <tr className="bg-[#1a4491] text-xs font-bold text-white uppercase tracking-wider">
            <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-16 text-center z-30">#</th>
            <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-64 z-30">OPERADOR</th>
            <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-40 text-center z-30">EQUIPO AUTONOMO</th>
            <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-48 text-center z-30">CAPABILITIES</th>
            <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-48 z-30">MULTI-HABILIDAD</th>
            <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-40 z-30">CHAMPIONS</th>
            <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-32 text-center z-30">ATO</th>
            <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-64 z-30">IPs ASIGNADOS</th>
            <th className="sticky top-0 bg-[#1a4491] border-b border-r border-slate-300 p-3 w-40 z-30">PRE REQUISITOS</th>
            <th className="sticky top-0 bg-[#1a4491] border-b p-3 w-32 text-center z-30">NIVEL AUTONOMIA</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(({ op, originalIdx }, visIdx) => {
            const auto5 = ((op.autonomyScore / 100) * 4).toFixed(2);
            
            let isExpired = false;
            if (op.lastAssessmentDate) {
               const assessment = new Date(op.lastAssessmentDate);
               const now = new Date();
               const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
               if (assessment < twoMonthsAgo) {
                 isExpired = true;
               }
            }
            
            // Podium row styles for top 3 operators
            const podiumStyles: Record<number, string> = {
              0: "bg-[#fef9c3]/60 hover:bg-[#fef3c7] border-l-4 border-l-[#f59e0b]", 
              1: "bg-[#f1f5f9]/80 hover:bg-[#e2e8f0] border-l-4 border-l-[#94a3b8]", 
              2: "bg-[#fed7aa]/40 hover:bg-[#fde68a]/50 border-l-4 border-l-[#d97706]",
              3: "bg-blue-50/50 hover:bg-blue-100/80 border-l-4 border-l-blue-400",
              4: "bg-purple-50/50 hover:bg-purple-100/80 border-l-4 border-l-purple-400",
            };

            const rowClass = isExpired 
              ? "bg-red-50/50 hover:bg-red-100/80 border-l-4 border-l-red-500"
              : podiumStyles[originalIdx] ?? cn("border-l-4 border-l-transparent", visIdx % 2 === 0 ? "bg-white/40" : "bg-slate-50/30");

            return (
              <motion.tr 
                key={op.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: visIdx * 0.03 }}
                className={cn("group transition-colors", rowClass)}
              >
                
                {/* 0. RANKING */}
                <td className="border-b border-r border-slate-200/50 p-3 text-center align-middle font-black text-slate-400">
                  {originalIdx + 1}
                </td>
                
                {/* 1. OPERADOR */}
                <td className="border-b border-r border-slate-200/50 p-3 align-middle">
                  <div className="flex items-center gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="focus:outline-none focus:ring-2 focus:ring-[#1a4491] rounded-md transition-transform hover:scale-105 active:scale-95">
                          <OperatorAvatar name={op.nombre} />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm sm:max-w-md bg-slate-50 p-6 rounded-xl border-slate-200 flex flex-col items-center">
                        <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-200 shadow-inner flex items-center justify-center">
                          <img 
                            src={`/fotos/${op.nombre.trim()}.jpeg?t=${Date.now()}`} 
                            alt={op.nombre} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              if (!target.src.includes('.png')) {
                                target.src = `/fotos/${op.nombre.trim()}.png?t=${Date.now()}`;
                                return;
                              }
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
                        {originalIdx < 5 && <span className="text-base">{["🥇", "🥈", "🥉", "⭐", "✨"][originalIdx]}</span>}
                        {op.nombre}
                        {isExpired && (
                          <div className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[8px] font-bold text-red-700 uppercase tracking-wider" title={`Última evaluación: ${op.lastAssessmentDate}`}>
                            <AlertTriangle className="h-2.5 w-2.5" />
                            +2 Meses
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
                <td className="border-b border-r border-slate-200/50 p-3 align-middle text-center">
                  {op.equipoAutonomo ? (
                    <div className="flex flex-col items-center gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-center p-1 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#1a4491]">
                            <img 
                              src={`/logos/${op.equipoAutonomo.trim().toUpperCase()}.png`} 
                              alt={op.equipoAutonomo}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                 const target = e.currentTarget as HTMLImageElement;
                                 target.style.display = 'none';
                                 if (target.parentElement) {
                                   target.parentElement.innerHTML = '<div class="text-[8px] font-bold text-slate-400">LOGO</div>';
                                 }
                              }}
                            />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm sm:max-w-md bg-white p-6 rounded-2xl border-none shadow-2xl flex flex-col items-center">
                          <div className="w-full aspect-square flex items-center justify-center p-4">
                            <img 
                              src={`/logos/${op.equipoAutonomo.trim().toUpperCase()}.png`} 
                              alt={op.equipoAutonomo}
                              className="max-h-full max-w-full object-contain drop-shadow-xl"
                            />
                          </div>
                          <div className="text-center mt-4">
                            <DialogTitle className="text-2xl font-black text-[#1a4491] uppercase tracking-tight">{op.equipoAutonomo}</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Logo Oficial del Equipo</DialogDescription>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <div className="text-[9px] font-bold text-[#1a4491] uppercase leading-tight max-w-[100px] truncate">
                        {op.equipoAutonomo}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic font-normal text-[10px]">Sin Equipo</span>
                  )}
                </td>

                {/* 2. CAPABILITIES */}
                <td className="border-b border-r border-slate-200/50 p-2 align-middle">
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
                <td className="border-b border-r border-slate-200/50 p-2 align-middle">
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
                <td className="border-b border-r border-slate-200/50 p-2 align-middle">
                  <div className="flex flex-col gap-1.5">
                    {op.champions && op.champions.length > 0 ? (
                      op.champions.map((c) => {
                        const Icon = championIcon[c];
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

                {/* 5. ATO */}
                <td className="border-b border-r border-slate-200/50 p-2 align-middle text-center">
                  <div className="mx-auto flex w-full max-w-[100px] flex-col overflow-hidden rounded border border-[#1a4491] shadow-sm">
                    <div className="bg-[#1a4491] py-0.5 text-[10px] font-bold text-white uppercase">ATO</div>
                    <div className="flex h-8 items-center justify-center bg-slate-200 text-lg font-black text-slate-800">
                      {op.ato ?? 4}
                    </div>
                    <div className="bg-sky-200 py-0.5 text-[8px] font-bold text-[#1a4491] uppercase truncate px-1">
                      Territorio Safety
                    </div>
                  </div>
                </td>

                {/* 6. IPs ASIGNADOS */}
                <td className="border-b border-r border-slate-200/50 p-2 align-middle">
                  <IPMediator operatorId={op.id} operatorName={op.nombre} />
                </td>

                {/* 7. PRE REQUISITOS */}
                <td className="border-b border-r border-slate-200/50 p-2 align-middle">
                  <PreReqEditor operatorId={op.id} operatorName={op.nombre} teamName={op.equipoAutonomo || "Sin Equipo"} />
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

              </motion.tr>
            );
          })}
        </tbody>
      </table>
      </motion.div>
    </div>
  );
}
