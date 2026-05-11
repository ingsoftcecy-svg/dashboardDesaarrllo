import { useState, useEffect } from "react";
import { Star, Check } from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MultiSkillEditorProps {
  operator_id: string;
  operator_name: string;
  equipos: string[];
}

const COLORS = [
  { name: "Azul (Principal)", class: "bg-sky-500" },
  { name: "Dorado (Especial)", class: "bg-yellow-500" },
  { name: "Rojo (Crítico)", class: "bg-rose-500" },
  { name: "Verde (Soporte)", class: "bg-emerald-500" },
  { name: "Violeta (Técnico)", class: "bg-violet-500" },
  { name: "Gris (Secundario)", class: "bg-slate-400" },
];

export function MultiSkillEditor({ operator_id, operator_name, equipos }: MultiSkillEditorProps) {
  const [config, set_config] = useState<{ primary?: string; color_class?: string; secondary_color_class?: string }>(() => {
    try {
      const stored = localStorage.getItem(`mskill_${operator_id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const doc_ref = doc(db, "multi_habilidades", operator_id);
    const unsubscribe = onSnapshot(doc_ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        set_config(data);
        localStorage.setItem(`mskill_${operator_id}`, JSON.stringify(data));
      }
    });
    return () => unsubscribe();
  }, [operator_id]);

  const [is_saving, set_is_saving] = useState(false);

  const save_config = async (primary: string | undefined, color_class: string, secondary_color_class?: string) => {
    set_is_saving(true);
    const new_config = { 
      primary, 
      color_class, 
      secondary_color_class: secondary_color_class || config.secondary_color_class || "bg-slate-400" 
    };
    set_config(new_config);
    try {
      await setDoc(doc(db, "multi_habilidades", operator_id), {
        ...new_config,
        operatorName: operator_name,
        updatedAt: new Date().toISOString()
      });
      setTimeout(() => set_is_saving(false), 800);
    } catch (error) {
      console.error("Error saving multiskill config:", error);
      set_is_saving(false);
    }
  };

  const update_secondary_color = async (color: string) => {
    save_config(config.primary, config.color_class || "bg-yellow-500", color);
  };

  const sorted_equipos = [...equipos].sort((a, b) => {
    if (a === config.primary) return -1;
    if (b === config.primary) return 1;
    return 0;
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex flex-col gap-1.5 w-full hover:bg-slate-100 p-1 rounded transition-colors text-left group">
          {sorted_equipos.length > 0 ? (
            sorted_equipos.slice(0, 4).map((eq, i) => {
              const is_primary = config.primary === eq || (equipos.length === 1);
              return (
                <div 
                  key={i} 
                  className={cn(
                    "rounded px-2 py-1 text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 leading-none transition-all",
                    is_primary 
                      ? (config.color_class || "bg-yellow-500 scale-105 shadow-md") 
                      : (config.secondary_color_class || "bg-slate-400 opacity-60")
                  )}
                >
                  {is_primary && <Star className="h-3 w-3 fill-white" />}
                  <span className="truncate">{eq.toUpperCase()}</span>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-400 italic">Sin equipos</div>
          )}
          <div className="hidden group-hover:block text-[8px] text-blue-500 font-bold mt-1 uppercase text-center w-full">Configurar Colores</div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white p-6 rounded-xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-800">
              Personalizar Multihabilidad
            </DialogTitle>
            <p className="text-xs text-slate-500">Define la habilidad principal y los colores de {operator_name}.</p>
          </div>
          {is_saving && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 animate-pulse border border-emerald-100">
              <Check className="h-3 w-3" />
              Guardado
            </div>
          )}
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. Seleccionar Principal</h4>
            <div className="grid grid-cols-1 gap-2">
              {equipos.map((eq) => (
                <button
                  key={eq}
                  onClick={() => save_config(eq, config.color_class || "bg-yellow-500")}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    config.primary === eq 
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" 
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <span className="text-sm font-bold text-slate-700">{eq}</span>
                  {config.primary === eq && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Color Principal</h4>
              <div className="grid grid-cols-2 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.class}
                    onClick={() => save_config(config.primary, c.class)}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded border transition-all",
                      config.color_class === c.class ? "border-slate-800 bg-slate-50" : "border-slate-100"
                    )}
                  >
                    <div className={cn("h-3 w-3 rounded-full", c.class)} />
                    <span className="text-[9px] font-bold text-slate-600 uppercase truncate">{c.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Color Secundarias</h4>
              <div className="grid grid-cols-2 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.class}
                    onClick={() => update_secondary_color(c.class)}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded border transition-all",
                      config.secondary_color_class === c.class ? "border-slate-800 bg-slate-50" : "border-slate-100"
                    )}
                  >
                    <div className={cn("h-3 w-3 rounded-full", c.class)} />
                    <span className="text-[9px] font-bold text-slate-600 uppercase truncate">{c.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
