import { useState, useEffect } from "react";
import { Star, Check } from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import{useAuth} from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MultiSkillEditorProps {
  operator_id: string;
  operator_name: string;
  equipos: string[];
  puedeEditar?: boolean; // Nueva prop para controlar la edición
}



export function MultiSkillEditor({ operator_id, operator_name, equipos, puedeEditar = false }: MultiSkillEditorProps) {
  const usuario = useAuth();
  const [config, set_config] = useState<{ primary?: string }>(() => {
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

  const save_config = async (primary: string | undefined) => {
    if (!puedeEditar) return; // Seguridad adicional para evitar cambios si no se puede editar
    set_is_saving(true);
    const new_config = { primary };
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

  const sorted_equipos = [...equipos].sort((a, b) => {
    if (a === config.primary) return -1;
    if (b === config.primary) return 1;
    return 0;
  });

  return (
    <Dialog>
      <DialogTrigger asChild>

        <button className={cn(
          "flex flex-col gap-1.5 w-full hover:bg-slate-100 p-1 rounded transition-colors text-left group",
          puedeEditar ? "cursor-pointer" : "cursor-default opacity-75"
        )}>
          {sorted_equipos.length > 0 ? (
            sorted_equipos.slice(0, 4).map((eq, i) => {
              const is_primary = config.primary === eq || (equipos.length === 1);
              return (
                <div 
                  key={i} 
                  className={cn(
                    "rounded px-2 py-1 text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 leading-none transition-all",
                    is_primary 
                      ? "bg-yellow-500 scale-105 shadow-md" 
                      : "bg-blue-500 opacity-90"
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
          {puedeEditar && (
            <div className="hidden group-hover:block text-[8px] text-blue-500 font-bold mt-1 uppercase text-center w-full">Configurar Principal</div>
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
                ? `Define la habilidad principal de ${operator_name}.` 
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

        <div className="mt-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. Seleccionar Principal</h4>
          <div className="grid grid-cols-1 gap-2">
            {equipos.map((eq) => (
              <button
                key={eq}
                disabled={!puedeEditar}
                onClick={() => save_config(eq)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  config.primary === eq 
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" 
                    : "border-slate-200 hover:border-slate-300 bg-white",
                  puedeEditar ? "hover:border-slate-300 cursor-pointer" : "cursor-default opacity-75"
                )}
              >
                <span className="text-sm font-bold text-slate-700">{eq}</span>
                {config.primary === eq && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
