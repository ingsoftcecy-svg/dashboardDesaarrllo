import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import{useAuth} from '@/lib/auth';
import { PRE_REQUISITES_LIST } from "./constants";

interface PreReqEditorProps {
  operator_id: string;
  operator_name: string;
  team_name: string;
  puedeEditar?: boolean; // Nueva prop para controlar la edición
}

export function PreReqEditor({ operator_id, operator_name, team_name, puedeEditar = false }: PreReqEditorProps) {
  const usuario = useAuth();
  const [checked_items, set_checked_items] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`prereqs_${operator_id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    // LECTURA: se permite aunque no haya sesión (datos públicos del tablero)
    const document_reference = doc(db, "prerequisitos", operator_id);
    
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

    const unsubscribe = onSnapshot(
      document_reference, 
      async (document_snapshot) => {
        if (document_snapshot.exists()) {
          const data = document_snapshot.data();
          const reqs_only = { ...data };
          delete reqs_only.operatorName;
          delete reqs_only.teamName;
          
          set_checked_items(reqs_only as Record<string, boolean>);
          localStorage.setItem(`prereqs_${operator_id}`, JSON.stringify(reqs_only));
        } else {
          const altIds = getAlternativeIds(operator_id);
          for (const altId of altIds) {
            try {
              const altDocRef = doc(db, "prerequisitos", altId);
              const altSnapshot = await getDoc(altDocRef);
              if (altSnapshot.exists()) {
                const data = altSnapshot.data();
                const reqs_only = { ...data };
                delete reqs_only.operatorName;
                delete reqs_only.teamName;
                
                set_checked_items(reqs_only as Record<string, boolean>);
                localStorage.setItem(`prereqs_${operator_id}`, JSON.stringify(reqs_only));
                
                // Solo migrar si hay sesión activa
                if (usuario) {
                  await setDoc(document_reference, {
                    ...data,
                    operatorName: operator_name,
                    teamName: team_name
                  }, { merge: true });
                  console.log(`Migrated prereqs from ${altId} to ${operator_id}`);
                }
                break;
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      }, 
      (error) => {
        console.error(`Firestore listener error for ${operator_name}:`, error);
      }
    );
    return () => unsubscribe();
  }, [operator_id, operator_name]);

  const toggle_requirement = async (requirement: string) => {
    if (!puedeEditar) return; // Seguridad adicional para evitar cambios si no se puede editar
    try {
      const next_state = !checked_items[requirement];
      set_checked_items(previous => ({ ...previous, [requirement]: next_state }));
      
      const document_reference = doc(db, "prerequisitos", operator_id);
      await setDoc(document_reference, {
        [requirement]: next_state,
        operatorName: operator_name,
        teamName: team_name
      }, { merge: true });
    } catch (error) {
      console.error("Error updating Firestore:", error);
      try {
        const stored = localStorage.getItem(`prereqs_${operator_id}`);
        const current = stored ? JSON.parse(stored) : {};
        localStorage.setItem(`prereqs_${operator_id}`, JSON.stringify({ 
          ...current, 
          [requirement]: !checked_items[requirement] 
        }));
      } catch (e) {
        console.error("LocalStorage fallback failed:", e);
      }
    }
  };

  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[9.5px] font-semibold text-slate-600 min-w-0 w-full">
      {PRE_REQUISITES_LIST.map((requirement) => (
        <button
          key={requirement}
          onClick={() => toggle_requirement(requirement)}
          className={cn(
            "flex items-center gap-1 focus:outline-none hover:bg-slate-100 p-0.5 rounded transition-colors text-left w-full min-w-0 truncate",
            puedeEditar 
              ? "hover:bg-slate-100 cursor-pointer"
              : "cursor-default opacity-75"
          )}
        >
          <div className={cn(
            "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border transition-all",
            checked_items[requirement]
              ? "bg-[#1a4491] border-[#1a4491] text-white"
              : "border-slate-300 bg-white"
          )}>
            {checked_items[requirement] && <Check className="h-2 w-2" strokeWidth={3} />}
          </div>
          <span className={cn(
            "truncate select-none",
            !puedeEditar && checked_items[requirement] ? "text-slate-500" : ""
          )}>
            {requirement}
          </span>
        </button>
      ))}
    </div>
  );
}
