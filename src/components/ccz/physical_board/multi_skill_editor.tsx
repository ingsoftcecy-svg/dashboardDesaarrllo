import { useState, useEffect } from "react";
import { Star, Check, Trash2, Plus } from "lucide-react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OPERATORS_MAX_SKILLS } from "@/data/ccz";

interface MultiSkillEditorProps {
  operator_id: string;
  operator_name: string;
  equipos: string[];
  puedeEditar?: boolean;
}

interface MultiSkillConfig {
  primary?: string;
  equipos?: string[];
}

const SUGGESTIONS = [
  "Técnico Eléctrico 2.0",
  "Técnico Eléctrico 1.0",
  "Técnico Mecánico 2.0",
  "Técnico Mecánico 1.0",
  "Técnico Multihabilidad",
  "Técnico Mecatrónico",
  "Operador de Cocimientos",
  "Operador de Bodegas",
  "Operador de Filtros",
  "Operador de Centrífugas",
  "Operador de Propagación",
  "Operador de Servicios",
  "Operador de Envase"
];

export function MultiSkillEditor({ operator_id, operator_name, equipos, puedeEditar = false }: MultiSkillEditorProps) {
  const usuario = useAuth();
  const [config, set_config] = useState<MultiSkillConfig>(() => {
    try {
      const stored = localStorage.getItem(`mskill_${operator_id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const doc_ref = doc(db, "multi_habilidades", operator_id);

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

    const unsubscribe = onSnapshot(doc_ref, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        set_config(data);
        localStorage.setItem(`mskill_${operator_id}`, JSON.stringify(data));
      } else {
        const altIds = getAlternativeIds(operator_id);
        for (const altId of altIds) {
          try {
            const altDocRef = doc(db, "multi_habilidades", altId);
            const altSnapshot = await getDoc(altDocRef);
            if (altSnapshot.exists()) {
              const data = altSnapshot.data();
              set_config(data);
              localStorage.setItem(`mskill_${operator_id}`, JSON.stringify(data));
              
              await setDoc(doc_ref, {
                ...data,
                operatorName: operator_name,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              console.log(`Migrated multi_habilidades from ${altId} to ${operator_id}`);
              break;
            }
          } catch (err) {
            console.error(err);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [operator_id, operator_name, usuario]);

  const [is_saving, set_is_saving] = useState(false);
  const [newSkillText, setNewSkillText] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState("");

  const masterEquipos = equipos && equipos.length > 0 ? equipos : [];
  let rawEquipos = config.equipos || equipos || [];

  if (masterEquipos.length > 0) {
    rawEquipos = [...rawEquipos].sort((a, b) => {
      const idxA = masterEquipos.findIndex(e => e.trim().toLowerCase() === a.trim().toLowerCase());
      const idxB = masterEquipos.findIndex(e => e.trim().toLowerCase() === b.trim().toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }

  const currentEquipos = rawEquipos;

  const save_config = async (primary: string | undefined, updatedEquipos: string[]) => {
    if (!puedeEditar) return;
    set_is_saving(true);

    let finalPrimary = primary;
    if (primary && !updatedEquipos.includes(primary)) {
      finalPrimary = updatedEquipos[0] || undefined;
    }
    if (!finalPrimary && updatedEquipos.length > 0) {
      finalPrimary = updatedEquipos[0];
    }

    const new_config = { 
      primary: finalPrimary,
      equipos: updatedEquipos
    };
    set_config(new_config);

    try {
      await setDoc(doc(db, "multi_habilidades", operator_id), {
        ...new_config,
        operatorName: operator_name,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setTimeout(() => set_is_saving(false), 800);
    } catch (error) {
      console.error("Error saving multiskill config:", error);
      set_is_saving(false);
    }
  };

  const handleAddSkill = async () => {
    if (!puedeEditar) return;
    const skillToAdd = newSkillText.trim() || selectedSuggestion.trim();
    if (!skillToAdd) return;

    if (currentEquipos.some(eq => eq.toLowerCase() === skillToAdd.toLowerCase())) {
      alert("Esta habilidad ya está agregada.");
      return;
    }

    const updatedEquipos = [...currentEquipos, skillToAdd];
    const newPrimary = config.primary || skillToAdd;

    await save_config(newPrimary, updatedEquipos);
    setNewSkillText("");
    setSelectedSuggestion("");
  };

  const handleDeleteSkill = async (skillToDelete: string) => {
    if (!puedeEditar) return;
    const updatedEquipos = currentEquipos.filter(eq => eq !== skillToDelete);
    let newPrimary = config.primary;
    if (config.primary === skillToDelete) {
      newPrimary = updatedEquipos[0] || undefined;
    }
    await save_config(newPrimary, updatedEquipos);
  };

  const sorted_equipos = [...currentEquipos].sort((a, b) => {
    if (config.primary) {
      if (a.toLowerCase() === config.primary.toLowerCase()) return -1;
      if (b.toLowerCase() === config.primary.toLowerCase()) return 1;
    }
    return 0;
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={cn(
          "flex flex-col gap-1 w-full hover:bg-slate-100 p-0.5 rounded transition-colors text-left group",
          puedeEditar ? "cursor-pointer" : "cursor-default opacity-75"
        )}>
          {sorted_equipos.length > 0 && (() => {
            const actual = sorted_equipos.length;
            const maxEq = OPERATORS_MAX_SKILLS[operator_id] || actual || 1;
            return (
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-wide mb-0">
                Nivel {actual}x{actual} / Máx: {maxEq}x{maxEq}
              </div>
            );
          })()}
          {sorted_equipos.length > 0 ? (
            sorted_equipos.slice(0, 4).map((eq, i) => {
              const is_primary = config.primary === eq || (currentEquipos.length === 1);
              return (
                <div 
                  key={i} 
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm flex items-center gap-1 leading-none transition-all",
                    is_primary 
                      ? "bg-yellow-500 scale-[1.02] shadow-sm" 
                      : "bg-blue-500 opacity-90"
                  )}
                >
                  {is_primary && <Star className="h-2.5 w-2.5 fill-white" />}
                  <span className="truncate">{eq.toUpperCase()}</span>
                </div>
              );
            })
          ) : (
            <div className="text-[10px] text-slate-400 italic">Sin equipos</div>
          )}
          {puedeEditar && (
            <div className="hidden group-hover:block text-[7.5px] text-blue-500 font-bold mt-0.5 uppercase text-center w-full">Configurar Multihabilidad</div>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white p-6 rounded-xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-800">
              Personalizar Multihabilidad
            </DialogTitle>
            <p className="text-xs text-slate-500">
              {puedeEditar  
                ? `Define las habilidades y la principal de ${operator_name}.` 
                : "No puedes editar esta configuración."
              }
            </p>
          </div>
          {is_saving && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 animate-pulse border border-emerald-100">
              <Check className="h-3 w-3" />
              Guardado
            </div>
          )}
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Habilidades del Operador</h4>
            <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {sorted_equipos.map((eq) => {
                const is_primary = config.primary === eq || (currentEquipos.length === 1);
                return (
                  <div
                    key={eq}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg border transition-all bg-slate-50/50 border-slate-200",
                      is_primary && "border-yellow-300 bg-yellow-50/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        disabled={!puedeEditar}
                        onClick={() => save_config(eq, currentEquipos)}
                        className={cn(
                          "focus:outline-none p-1 rounded hover:bg-slate-200 transition-colors",
                          !puedeEditar && "opacity-50"
                        )}
                        title="Marcar como Habilidad Principal"
                      >
                        <Star className={cn("h-4 w-4 transition-colors", is_primary ? "text-yellow-500 fill-yellow-500" : "text-slate-400")} />
                      </button>
                      <span className="text-xs font-bold text-slate-700">{eq}</span>
                    </div>

                    {puedeEditar && currentEquipos.length > 1 && (
                      <button
                        onClick={() => handleDeleteSkill(eq)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors"
                        title="Eliminar habilidad"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {puedeEditar && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Agregar Habilidad</h4>
              
              <div className="flex flex-col gap-2">
                <select
                  value={selectedSuggestion}
                  onChange={(e) => {
                    setSelectedSuggestion(e.target.value);
                    setNewSkillText("");
                  }}
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecciona del catálogo...</option>
                  {SUGGESTIONS.map(sug => (
                    <option key={sug} value={sug}>{sug}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="O escribe una personalizada..."
                    value={newSkillText}
                    onChange={(e) => {
                      setNewSkillText(e.target.value);
                      setSelectedSuggestion("");
                    }}
                    className="flex-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={handleAddSkill}
                    className="bg-[#1a4491] hover:bg-[#1a4491]/90 text-white rounded-lg px-3 py-2 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
