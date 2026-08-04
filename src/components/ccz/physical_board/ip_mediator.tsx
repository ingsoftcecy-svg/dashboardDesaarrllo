import { useState, useEffect } from "react";
import { ClipboardList, Search, Sparkles, X } from "lucide-react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { STRINGS, BANCO_IPS_COCIMIENTOS } from "./constants";

interface IpMediatorProps {
  operator_id: string;
  operator_name: string;
  team_members: { id: string, name: string }[];
  puedeEditar?: boolean; // Nueva prop para controlar la edición
  area?: string;
}

export function IpMediator({ operator_id, operator_name, team_members, puedeEditar, area }: IpMediatorProps) {
  const usuario = useAuth();
// Solo los usuarios autenticados pueden editar
  const [global_ips, set_global_ips] = useState<string[]>([]);
  const [assigned_ips, set_assigned_ips] = useState<string[]>([]);
  const [team_ips, set_team_ips] = useState<string[]>([]);
  const [new_ip_input, set_new_ip_input] = useState("");
  const [search_term, set_search_term] = useState("");

  useEffect(() => {
    const areaLower = (area || "").toLowerCase();
    const isCocimientos = 
      areaLower.includes("warm") || 
      areaLower.includes("cocimiento") ||
      areaLower.includes("cuchillas") ||
      areaLower.includes("eac") ||
      areaLower.includes("eabf") ||
      areaLower.includes("bpre") ||
      areaLower.includes("molienda") ||
      areaLower.includes("guardianes");

    const isBloqueFrio = 
      areaLower.includes("cold") || 
      areaLower.includes("frio") || 
      areaLower.includes("frío") ||
      areaLower.includes("bravos") ||
      areaLower.includes("fuertes") ||
      areaLower.includes("reyes") ||
      areaLower.includes("loros");

    let unsubscribe_global: (() => void) | null = null;
    if (isCocimientos) {
      set_global_ips(BANCO_IPS_COCIMIENTOS);
    } else {
      unsubscribe_global = onSnapshot(doc(db, "config", "ips"), (snapshot) => {
        if (snapshot.exists()) {
          set_global_ips(snapshot.data().list || []);
        }
      });
    }
    
    const getAlternativeIds = (id: string): string[] => {
      const translations: Record<string, string[]> = {
        "32173442": ["32043900"],
        "32043900": ["32173442", "32045469"],
        "32145333": ["32044316"],
        "32044316": ["32145333"],
        "32043835": ["32145333"],
        "32045469": ["32043900"],
        "32043301": ["32043739"],
        "32043739": ["32043301", "32045769"],
        "32043861": ["32043835"],
        "32044301": ["32043861"],
        "32045769": ["32044319", "32043739"],
        "32044319": ["32045769"],
      };
      return translations[id] || [];
    };

    const filterCocimientosIps = (rawList: string[]) => {
      if (!isCocimientos) return rawList;
      return rawList.filter(ip => 
        BANCO_IPS_COCIMIENTOS.some(bancoIp => 
          bancoIp.toLowerCase().trim() === ip.toLowerCase().trim()
        )
      );
    };

    const doc_ref = doc(db, "operator_ips", operator_id);
    const unsubscribe_operator = onSnapshot(doc_ref, async (snapshot) => {
      if (snapshot.exists()) {
        const rawAssigned = snapshot.data().assigned || [];
        set_assigned_ips(filterCocimientosIps(rawAssigned));
      } else {
        const altIds = getAlternativeIds(operator_id);
        for (const altId of altIds) {
          try {
            const altDocRef = doc(db, "operator_ips", altId);
            const altSnapshot = await getDoc(altDocRef);
            if (altSnapshot.exists()) {
              const data = altSnapshot.data();
              const rawAssigned = data.assigned || [];
              set_assigned_ips(filterCocimientosIps(rawAssigned));
              
              // Solo migrar si hay sesión activa
              if (usuario) {
                const cleanAssignedToMigrate = filterCocimientosIps(rawAssigned);
                await setDoc(doc_ref, {
                  ...data,
                  assigned: cleanAssignedToMigrate,
                  operatorName: operator_name,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
                console.log(`Migrated operator_ips from ${altId} to ${operator_id}`);
              }
              break;
            }
          } catch (err) {
            console.error(err);
          }
        }
      }
    });
    
    return () => { 
      if (unsubscribe_global) unsubscribe_global(); 
      unsubscribe_operator(); 
    };
  }, [operator_id, operator_name]);

  useEffect(() => {
    // LECTURA de IPs del equipo: permitida sin sesión
    if (!team_members || team_members.length === 0) {
      set_team_ips([]);
      return;
    }

    const unsubscribes = team_members.map(member => 
      onSnapshot(doc(db, "operator_ips", member.id), (snapshot) => {
        if (snapshot.exists()) {
          const assigned = snapshot.data().assigned || [];
          set_team_ips(prev => [...new Set([...prev, ...assigned])]);
        }
      })
    );

    return () => unsubscribes.forEach(unsub => unsub());
  }, [team_members]);

  const toggle_assignment = async (ip_address: string) => {
    if (!usuario) return; // Solo usuarios autenticados pueden editar IPs
    const next_assignments = assigned_ips.includes(ip_address) 
      ? assigned_ips.filter(ip => ip !== ip_address) 
      : [...assigned_ips, ip_address];
      
    set_assigned_ips(next_assignments);
    await setDoc(
      doc(db, "operator_ips", operator_id), 
      { assigned: next_assignments, operatorName: operator_name }, 
      { merge: true }
    );
  };

  const add_global_ip = async () => {
    if (!new_ip_input) return;
    const next_global_list = [...global_ips, new_ip_input];
    await setDoc(doc(db, "config", "ips"), { list: next_global_list });
    set_new_ip_input("");
  };

  const handle_key_down = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      add_global_ip();
    }
  };

  const remove_global_ip = async (ip_address: string) => {
    const next_global_list = global_ips.filter(ip => ip !== ip_address);
    await setDoc(doc(db, "config", "ips"), { list: next_global_list });
  };

  const filtered_ips = global_ips
    .filter(ip => ip.toLowerCase().includes(search_term.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const suggestions = team_ips.filter(ip => !assigned_ips.includes(ip));
  const filtered_suggestions = suggestions
    .filter(ip => ip.toLowerCase().includes(search_term.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const sorted_assigned_ips = [...assigned_ips].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {sorted_assigned_ips.map(ip_address => (
          <div key={ip_address} className="rounded bg-sky-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm flex items-center gap-1 group">
            {ip_address}
            {puedeEditar && (
              <button onClick={() => toggle_assignment(ip_address)} className="hover:text-red-200">×</button>
            )}
          </div>
        ))}
      </div>
    
      <Dialog>
        <DialogTrigger asChild>
          <button
            disabled={!puedeEditar}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors",
              puedeEditar 
                ? "bg-[#1a4491] text-white hover:bg-blue-600"
                : "bg-[#1a4491] text-white cursor-default pointer-events-none"
            )}
            title={STRINGS.MANAGE_IPS_TITLE} 
          >
            <ClipboardList className="h-3.5 w-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl sm:max-w-5xl bg-white p-6 rounded-2xl border-none shadow-2xl max-h-[92vh] flex flex-col overflow-y-auto custom-scrollbar">
          <DialogTitle>{STRINGS.MANAGE_IPS_TITLE} - {operator_name}</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar IP..."
              value={search_term}
              onChange={(e) => set_search_term(e.target.value)}
              className="w-full pl-8 pr-10 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-[#1a4491] transition-all"
            />
            {search_term && (
              <button
                onClick={() => set_search_term("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="space-y-5 py-4">
            {filtered_suggestions.length > 0 && (
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 shadow-sm">
                <h4 className="text-[10px] font-black uppercase text-amber-600 mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> {STRINGS.TEAM_SUGGESTIONS || "Sugerencias de tu equipo"}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {filtered_suggestions.map(ip_address => (
                    <button
                      key={ip_address}
                      onClick={() => toggle_assignment(ip_address)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-white text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <span className="text-amber-500 font-black text-xs">+</span> {ip_address}
                    </button>
                  ))}
                </div>
              </div>
            )}

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">{STRINGS.SELECT_IPS_SUBTITLE}</h4>
                <div className="flex flex-wrap gap-2 max-h-[260px] overflow-y-auto p-1 custom-scrollbar">
                  {filtered_ips.map(ip_address => {
                    const isSelected = assigned_ips.includes(ip_address);
                    const isCocimientosIp = BANCO_IPS_COCIMIENTOS.includes(ip_address);

                    return (
                      <button
                        key={ip_address}
                        onClick={() => toggle_assignment(ip_address)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer shadow-xs flex items-center gap-1.5 border",
                          isSelected
                            ? "bg-[#1a4491] text-white border-blue-900 shadow-blue-900/20 scale-105"
                            : isCocimientosIp
                            ? "bg-gradient-to-r from-amber-50 to-orange-50 text-slate-800 border-amber-300 hover:border-amber-400 hover:bg-amber-100 hover:scale-105 font-extrabold"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        )}
                      >
                        {isCocimientosIp && <Sparkles className="h-3 w-3 text-amber-500 shrink-0 animate-pulse" />}
                        <span>{ip_address}</span>
                        {isCocimientosIp && (
                          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black bg-amber-500 text-white uppercase tracking-wider shadow-xs">
                            COCIMIENTOS
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">{STRINGS.GLOBAL_LIST_SUBTITLE}</h4>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={new_ip_input}
                  onChange={(e) => set_new_ip_input(e.target.value)}
                  placeholder="Nueva IP..." 
                  className="flex-1 text-xs border rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
                  onKeyDown={handle_key_down}
                />
                <button 
                  onClick={add_global_ip}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  {STRINGS.ADD_BUTTON}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {filtered_ips.map(ip_address => (
                  <div key={ip_address} className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-2 rounded-lg text-xs font-semibold">
                    <span className="truncate">{ip_address}</span>
                    <button onClick={() => remove_global_ip(ip_address)} className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase ml-2 cursor-pointer">
                      {STRINGS.REMOVE_BUTTON}
                    </button>
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
