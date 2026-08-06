import { useState, useEffect, useMemo } from "react";
import { ClipboardList, Search, Sparkles, X, Pencil, Trash2 } from "lucide-react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { STRINGS } from "./constants";
import { getKpiForPi, getOperatorDefaultIps, KPI_COLOR_THEMES, DEFAULT_KPI_THEME } from "@/data/ips_cocimientos_helper";
import generatedBanks from "@/data/generated_ip_banks.json";

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
  const [global_ips, set_global_ips] = useState<{pi: string, kpi: string}[]>([]);
  const [assigned_ips, set_assigned_ips] = useState<string[]>([]);
  // Estado para guardar las IPs de cada miembro del equipo por ID
  const [team_member_ips, set_team_member_ips] = useState<Record<string, string[]>>({});
  const [new_ip_input, set_new_ip_input] = useState("");
  const [new_kpi_input, set_new_kpi_input] = useState("");
  const [search_term, set_search_term] = useState("");
  const [current_config_doc, set_current_config_doc] = useState("ips");
  const [adding_ip_to_kpi, set_adding_ip_to_kpi] = useState<string | null>(null);
  const [quick_ip_input, set_quick_ip_input] = useState("");
  const [editing_ip_name, set_editing_ip_name] = useState<string | null>(null);
  const [editing_ip_input, set_editing_ip_input] = useState("");
  const [editing_kpi_name, set_editing_kpi_name] = useState<string | null>(null);
  const [editing_kpi_input, set_editing_kpi_input] = useState("");

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

    let configDoc = "ips";
    if (isCocimientos) configDoc = "ips_cocimientos";
    else if (isBloqueFrio) configDoc = "ips_bloque_frio";
    
    set_current_config_doc(configDoc);

    let unsubscribe_global: (() => void) | null = null;
    unsubscribe_global = onSnapshot(doc(db, "config", configDoc), (snapshot) => {
      if (snapshot.exists()) {
        const rawList = snapshot.data().list || [];
        const mappedList = rawList.map((item: any) => {
          if (typeof item === 'string') return { pi: item, kpi: '' };
          return item;
        });
        set_global_ips(mappedList);
      } else {
        set_global_ips([]);
      }
    });
    
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
      return rawList;
    };

    const defaultExcelAssignments = getOperatorDefaultIps(operator_name);
    const doc_ref = doc(db, "operator_ips", operator_id);

    const unsubscribe_operator = onSnapshot(doc_ref, async (snapshot) => {
      if (snapshot.exists() && snapshot.data().hasManualOverride && snapshot.data().assigned) {
        const rawAssigned = snapshot.data().assigned || [];
        set_assigned_ips(rawAssigned);
      } else if (defaultExcelAssignments && defaultExcelAssignments.length > 0) {
        const defaultPiList = defaultExcelAssignments.map(item => item.pi);
        set_assigned_ips(defaultPiList);
      } else if (snapshot.exists() && snapshot.data().assigned && snapshot.data().assigned.length > 0) {
        const rawAssigned = snapshot.data().assigned || [];
        set_assigned_ips(rawAssigned);
      } else {
        set_assigned_ips([]);
      }
    });
    
    return () => { 
      if (unsubscribe_global) unsubscribe_global(); 
      unsubscribe_operator(); 
    };
  }, [operator_id, operator_name]);

  useEffect(() => {
    if (!team_members || team_members.length === 0) {
      set_team_member_ips({});
      return;
    }

    const unsubscribes = team_members.map(member => 
      onSnapshot(doc(db, "operator_ips", member.id), (snapshot) => {
        let assigned: string[] = [];
        if (snapshot.exists() && snapshot.data().hasManualOverride && snapshot.data().assigned) {
          assigned = snapshot.data().assigned;
        } else {
          // Si no tiene override, usar sus defaults de excel
          const defaultExcel = getOperatorDefaultIps(member.name);
          if (defaultExcel && defaultExcel.length > 0) {
            assigned = defaultExcel.map(item => item.pi);
          } else if (snapshot.exists() && snapshot.data().assigned) {
            assigned = snapshot.data().assigned;
          }
        }
        set_team_member_ips(prev => ({
          ...prev,
          [member.id]: assigned
        }));
      })
    );

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [team_members]);

  const team_ips = useMemo(() => {
    const allIps = Object.values(team_member_ips).flat();
    return [...new Set(allIps)];
  }, [team_member_ips]);

  const toggle_assignment = async (ip_address: string) => {
    if (!usuario) return; // Solo usuarios autenticados pueden editar IPs
    const next_assignments = assigned_ips.includes(ip_address) 
      ? assigned_ips.filter(ip => ip !== ip_address) 
      : [...assigned_ips, ip_address];
      
    set_assigned_ips(next_assignments);
    await setDoc(
      doc(db, "operator_ips", operator_id), 
      { assigned: next_assignments, operatorName: operator_name, hasManualOverride: true }, 
      { merge: true }
    );
  };

  const add_global_ip = async () => {
    if (!new_ip_input) return;
    const ipName = new_ip_input.trim();
    const newItem = { pi: ipName, kpi: new_kpi_input.trim() };
    
    // Check if it already exists in the global list, if not add it
    if (!global_ips.some(g => g.pi.toLowerCase() === ipName.toLowerCase())) {
        const next_global_list = [...global_ips, newItem];
        await setDoc(doc(db, "config", current_config_doc), { list: next_global_list }, { merge: true });
    }

    // Automatically assign to operator
    if (!assigned_ips.includes(ipName)) {
        const next_assignments = [...assigned_ips, ipName];
        set_assigned_ips(next_assignments);
        await setDoc(
          doc(db, "operator_ips", operator_id), 
          { assigned: next_assignments, operatorName: operator_name, hasManualOverride: true }, 
          { merge: true }
        );
    }

    set_new_ip_input("");
    set_new_kpi_input("");
  };

  const handle_quick_add = async (kpi: string) => {
    if (!quick_ip_input) {
      set_adding_ip_to_kpi(null);
      return;
    }
    const ipName = quick_ip_input.trim();
    if (!ipName) {
      set_adding_ip_to_kpi(null);
      return;
    }

    const newItem = { pi: ipName, kpi: kpi === "IP" ? "" : kpi };
    
    if (!global_ips.some(g => g.pi.toLowerCase() === ipName.toLowerCase())) {
        const next_global_list = [...global_ips, newItem];
        await setDoc(doc(db, "config", current_config_doc), { list: next_global_list }, { merge: true });
    }

    if (!assigned_ips.includes(ipName)) {
        const next_assignments = [...assigned_ips, ipName];
        set_assigned_ips(next_assignments);
        await setDoc(
          doc(db, "operator_ips", operator_id), 
          { assigned: next_assignments, operatorName: operator_name, hasManualOverride: true }, 
          { merge: true }
        );
    }
    
    set_quick_ip_input("");
    set_adding_ip_to_kpi(null);
  };

  const handle_create_kpi = async () => {
    const finalName = new_kpi_input.trim();
    if (!finalName) return;

    const next_global_list = [...global_ips, { pi: `__empty_${Date.now()}__`, kpi: finalName }];
    await setDoc(doc(db, "config", current_config_doc), { list: next_global_list }, { merge: true });
    set_new_kpi_input("");
  };

  const handle_edit_save = async (oldName: string, newName: string) => {
    const finalName = newName.trim();
    if (!finalName || finalName === oldName) {
       set_editing_ip_name(null);
       return;
    }

    const next_global_list = global_ips.map(ip => 
      ip.pi === oldName ? { ...ip, pi: finalName } : ip
    );
    await setDoc(doc(db, "config", current_config_doc), { list: next_global_list }, { merge: true });

    if (assigned_ips.includes(oldName)) {
       const next_assignments = assigned_ips.map(ip => ip === oldName ? finalName : ip);
       set_assigned_ips(next_assignments);
       await setDoc(
         doc(db, "operator_ips", operator_id), 
         { assigned: next_assignments, operatorName: operator_name, hasManualOverride: true }, 
         { merge: true }
       );
    }

    set_editing_ip_name(null);
  };

  const handle_kpi_edit = async (oldKpi: string, newKpi: string) => {
    const finalNew = newKpi.trim();
    if (!finalNew || finalNew === oldKpi) {
       set_editing_kpi_name(null);
       return;
    }
    const next_global_list = global_ips.map(item => {
      let itemKpi = item.kpi;
      if (!itemKpi) {
         const kpiInfo = getKpiForPi(item.pi);
         if (kpiInfo?.kpi) itemKpi = kpiInfo.kpi;
         else itemKpi = "IP";
      }
      
      if (itemKpi === oldKpi) {
         return { ...item, kpi: finalNew };
      }
      return item;
    });

    await setDoc(doc(db, "config", current_config_doc), { list: next_global_list }, { merge: true });
    set_editing_kpi_name(null);
  };

  const handle_kpi_delete = async (kpi: string) => {
    if (!window.confirm(`¿Seguro que quieres eliminar el KPI "${kpi}" y TODAS sus IPs asociadas del banco global?`)) return;
    
    const next_global_list = global_ips.filter(item => {
      let itemKpi = item.kpi;
      if (!itemKpi) {
         const kpiInfo = getKpiForPi(item.pi);
         if (kpiInfo?.kpi) itemKpi = kpiInfo.kpi;
         else itemKpi = "IP";
      }
      return itemKpi !== kpi;
    });

    await setDoc(doc(db, "config", current_config_doc), { list: next_global_list }, { merge: true });
  };

  const handle_key_down = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handle_create_kpi();
    }
  };

  const remove_global_ip = async (ip_address: string) => {
    const next_global_list = global_ips.filter(ip => ip.pi !== ip_address);
    await setDoc(doc(db, "config", current_config_doc), { list: next_global_list }, { merge: true });
  };

  const populate_bank_from_defaults = async () => {
    const defaults = current_config_doc === "ips_cocimientos" ? generatedBanks.ips_cocimientos :
                     current_config_doc === "ips_bloque_frio" ? generatedBanks.ips_bloque_frio : [];
    if (defaults.length > 0) {
      await setDoc(doc(db, "config", current_config_doc), { list: defaults }, { merge: true });
    }
  };

  const filtered_global_ips = global_ips
    .filter(ip => !assigned_ips.includes(ip.pi))
    .filter(ip => ip.pi.toLowerCase().includes(search_term.toLowerCase()))
    .sort((a, b) => a.pi.localeCompare(b.pi));

  const suggestions = team_ips.filter(ip => !assigned_ips.includes(ip));
  const filtered_suggestions = suggestions
    .filter(ip => ip.toLowerCase().includes(search_term.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const sorted_assigned_ips = [...assigned_ips].sort((a, b) => a.localeCompare(b));

  const groupedAssignedIps = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ip of sorted_assigned_ips) {
      let kpi = "IP";
      const globalIpObj = global_ips.find(g => g.pi === ip);
      if (globalIpObj && globalIpObj.kpi) {
        kpi = globalIpObj.kpi;
      } else {
        const kpiInfo = getKpiForPi(ip);
        if (kpiInfo?.kpi) kpi = kpiInfo.kpi;
      }

      if (!map.has(kpi)) {
        map.set(kpi, []);
      }
      map.get(kpi)!.push(ip);
    }

    const groups: { kpi: string; ips: string[] }[] = [];
    for (const [kpi, ips] of map.entries()) {
      groups.push({ kpi, ips });
    }
    return groups;
  }, [sorted_assigned_ips, global_ips]);

  const groupedGlobalIps = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ipObj of filtered_global_ips) {
      let kpi = "IP";
      if (ipObj.kpi) {
        kpi = ipObj.kpi;
      } else {
        const kpiInfo = getKpiForPi(ipObj.pi);
        if (kpiInfo?.kpi) kpi = kpiInfo.kpi;
      }

      if (!map.has(kpi)) {
        map.set(kpi, []);
      }
      if (!ipObj.pi.startsWith("__empty_")) {
        map.get(kpi)!.push(ipObj.pi);
      }
    }

    const groups: { kpi: string; ips: string[] }[] = [];
    for (const [kpi, ips] of map.entries()) {
      groups.push({ kpi, ips });
    }
    return groups.sort((a, b) => a.kpi.localeCompare(b.kpi));
  }, [filtered_global_ips]);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex flex-col gap-1.5 w-full">
        {groupedAssignedIps.map(({ kpi, ips }) => {
          const isSinKpi = kpi === "IP";
          const theme = (!isSinKpi && KPI_COLOR_THEMES[kpi]) || DEFAULT_KPI_THEME;

          return (
            <div 
              key={kpi} 
              className={cn(
                "rounded-lg border p-1.5 shadow-xs flex flex-col gap-1 transition-all w-full",
                theme.bg,
                theme.border
              )}
            >
              <div className="flex items-center justify-between gap-1 w-full border-b border-slate-200/40 pb-1">
                {isSinKpi ? (
                  <span className="px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider bg-slate-500 text-white">
                    IP
                  </span>
                ) : (
                  <span 
                    className={cn("px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider truncate max-w-[130px]", theme.kpiBg, theme.kpiText)}
                    title={kpi}
                  >
                    {kpi}
                  </span>
                )}
                {ips.length > 1 && (
                  <span className={cn("text-[8px] font-bold opacity-70", theme.text)}>
                    {ips.length} PIs
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {ips.map(ip_address => (
                  <div key={ip_address} className="flex items-center justify-between gap-1 group/item">
                    <span className={cn("text-[9.5px] font-bold leading-tight break-words", theme.text)}>
                      {ips.length > 1 ? `• ${ip_address}` : ip_address}
                    </span>
                    {puedeEditar && (
                      <button 
                        onClick={() => toggle_assignment(ip_address)} 
                        className="text-slate-400 hover:text-red-600 font-bold text-xs leading-none px-0.5 cursor-pointer opacity-70 group-hover/item:opacity-100"
                        title="Quitar IP"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">IPs Asignadas al Operador</h4>
                {sorted_assigned_ips.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-2">No hay IPs asignadas actualmente.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-1 custom-scrollbar">
                    {sorted_assigned_ips
                      .filter(ip => ip.toLowerCase().includes(search_term.toLowerCase()))
                      .map(ip_address => {
                      const globalIpObj = global_ips.find(g => g.pi === ip_address);
                      let kpiName = globalIpObj?.kpi;
                      if (!kpiName) {
                        const kpiInfo = getKpiForPi(ip_address);
                        kpiName = kpiInfo?.kpi || "";
                      }

                      return (
                        <button
                          key={ip_address}
                          onClick={() => toggle_assignment(ip_address)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer shadow-xs flex items-center gap-2 border",
                            "bg-[#1a4491] text-white border-blue-900 shadow-blue-900/20 hover:bg-red-600 hover:border-red-700"
                          )}
                          title="Clic para remover"
                        >
                          {kpiName && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase shrink-0",
                              "bg-white/20 text-white"
                            )}>
                              {kpiName}
                            </span>
                          )}
                          <span className="truncate">{ip_address}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            {filtered_suggestions.length > 0 && (
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 shadow-sm mt-4">
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

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase text-slate-400">{STRINGS.GLOBAL_BANK_SUBTITLE}</h4>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="text"
                    placeholder="Nuevo KPI..."
                    value={new_kpi_input}
                    onChange={e => set_new_kpi_input(e.target.value)}
                    onKeyDown={handle_key_down}
                    className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-500 w-[120px]"
                  />
                  <button
                    onClick={handle_create_kpi}
                    className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    + KPI
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto p-1 custom-scrollbar">
                {groupedGlobalIps.map(({ kpi, ips }) => {
                  const isSinKpi = kpi === "IP";
                  const theme = (!isSinKpi && KPI_COLOR_THEMES[kpi]) || DEFAULT_KPI_THEME;
                  const isEditingKpi = editing_kpi_name === kpi;

                  return (
                    <div key={kpi} className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center gap-2 group/kpi">
                        {isEditingKpi ? (
                          <div className="flex gap-1 items-center bg-blue-50 rounded px-1 py-0.5 border border-blue-200 shadow-sm animate-in fade-in zoom-in duration-200">
                            <input 
                               type="text" 
                               value={editing_kpi_input}
                               onChange={e => set_editing_kpi_input(e.target.value)}
                               onKeyDown={e => { 
                                 if(e.key === 'Enter') handle_kpi_edit(kpi, editing_kpi_input); 
                                 else if(e.key === 'Escape') set_editing_kpi_name(null); 
                               }}
                               autoFocus
                               placeholder="Nombre del KPI..."
                               className="px-1 text-[9.5px] font-bold w-[120px] bg-transparent outline-none text-blue-900"
                            />
                            <button 
                              onClick={() => handle_kpi_edit(kpi, editing_kpi_input)} 
                              className="text-[10px] text-blue-600 hover:text-blue-700 font-black px-1.5 hover:bg-blue-100 rounded cursor-pointer"
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 shadow-sm", isSinKpi ? "bg-slate-500 text-white" : theme.kpiBg + " " + theme.kpiText)}>
                            {kpi}
                          </span>
                        )}
                        <div className="h-px bg-slate-200/60 flex-1" />
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover/kpi:opacity-100 transition-opacity">
                          {!isSinKpi && (
                            <>
                              <button 
                                onClick={() => { 
                                  set_editing_kpi_name(kpi); 
                                  set_editing_kpi_input(kpi); 
                                }}
                                className="w-5 h-5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors"
                                title="Editar nombre del KPI"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button 
                                onClick={() => handle_kpi_delete(kpi)}
                                className="w-5 h-5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 flex items-center justify-center cursor-pointer transition-colors"
                                title="Eliminar este KPI y todas sus IPs"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => {
                              if (adding_ip_to_kpi === kpi) {
                                set_adding_ip_to_kpi(null);
                              } else {
                                set_adding_ip_to_kpi(kpi);
                                set_quick_ip_input("");
                              }
                            }}
                            className="w-5 h-5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold text-xs cursor-pointer shadow-sm transition-colors ml-1"
                            title="Agregar nueva IP a este KPI"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {ips.length === 0 && !adding_ip_to_kpi && (
                         <div className="pl-2 text-[9px] text-slate-400 italic">No hay IPs en este KPI.</div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {ips.map(ip_address => {
                          const isEditing = editing_ip_name === ip_address;
                          
                          if (isEditing) {
                            return (
                              <div key={ip_address} className="flex gap-1 items-center bg-blue-50 rounded-lg pr-1 border border-blue-200 shadow-sm animate-in fade-in zoom-in duration-200">
                                <input 
                                  type="text" 
                                  value={editing_ip_input}
                                  onChange={e => set_editing_ip_input(e.target.value)}
                                  onKeyDown={e => { 
                                    if(e.key === 'Enter') handle_edit_save(ip_address, editing_ip_input); 
                                    else if(e.key === 'Escape') set_editing_ip_name(null); 
                                  }}
                                  autoFocus
                                  className="px-2 py-1 text-[9.5px] font-bold w-[130px] bg-transparent outline-none text-blue-900"
                                />
                                <button 
                                  onClick={() => handle_edit_save(ip_address, editing_ip_input)} 
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-black px-1.5 py-0.5 hover:bg-blue-100 rounded cursor-pointer"
                                  title="Guardar cambios (Enter)"
                                >
                                  ✓
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={ip_address} 
                              className={cn(
                                "group/ip flex items-stretch rounded-lg border shadow-xs transition-all",
                                "bg-slate-50 border-slate-200 hover:border-amber-400 hover:bg-amber-50"
                              )}
                            >
                              <button
                                onClick={() => toggle_assignment(ip_address)}
                                className="px-2.5 py-1.5 text-[9.5px] font-bold uppercase cursor-pointer text-slate-700 group-hover/ip:text-amber-900 outline-none flex-1 text-left"
                                title="Clic para asignar al operador"
                              >
                                {ip_address}
                              </button>
                              <div className="flex items-stretch opacity-0 group-hover/ip:opacity-100 transition-opacity border-l border-slate-200/60 group-hover/ip:border-amber-200 overflow-hidden">
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    set_editing_ip_name(ip_address); 
                                    set_editing_ip_input(ip_address); 
                                  }}
                                  className="px-1.5 hover:bg-blue-100 text-blue-600 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Editar nombre"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(window.confirm(`¿Seguro que quieres eliminar "${ip_address}" del banco global?`)) {
                                      remove_global_ip(ip_address); 
                                    }
                                  }}
                                  className="px-1.5 hover:bg-red-100 text-red-600 transition-colors flex items-center justify-center cursor-pointer border-l border-slate-200/60 group-hover/ip:border-amber-200"
                                  title="Eliminar del banco"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {adding_ip_to_kpi === kpi && (
                          <div className="flex gap-1 items-center bg-emerald-50 rounded-lg pr-1 border border-emerald-200 shadow-sm animate-in fade-in zoom-in duration-200">
                            <input 
                               type="text" 
                               value={quick_ip_input}
                               onChange={e => set_quick_ip_input(e.target.value)}
                               onKeyDown={e => { 
                                 if(e.key === 'Enter') handle_quick_add(kpi); 
                                 else if(e.key === 'Escape') set_adding_ip_to_kpi(null); 
                               }}
                               autoFocus
                               placeholder="Nueva IP..."
                               className="px-2 py-1 text-[9.5px] font-bold w-[130px] bg-transparent outline-none text-emerald-900 placeholder:text-emerald-300"
                            />
                            <button 
                              onClick={() => handle_quick_add(kpi)} 
                              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-black px-1.5 py-0.5 hover:bg-emerald-100 rounded cursor-pointer"
                              title="Guardar (Enter)"
                            >
                              ✓
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filtered_global_ips.length === 0 && (
                  <div className="flex flex-col gap-2 items-start px-1 mt-2">
                    <p className="text-xs text-slate-400 italic">No hay IPs disponibles en el banco del área.</p>
                    <button 
                      onClick={populate_bank_from_defaults}
                      className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors shadow-sm cursor-pointer"
                    >
                      Poblar Banco con Histórico
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
