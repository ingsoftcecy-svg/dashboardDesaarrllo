import { useState, useEffect } from "react";
import { Check, Edit2 } from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AtoEditorProps {
  operator_id: string;
  operator_name: string;
  initial_ato: number;
}

export function AtoEditor({ operator_id, operator_name, initial_ato }: AtoEditorProps) {
  const [ato_value, set_ato_value] = useState(initial_ato);
  const [is_saving, set_is_saving] = useState(false);

  useEffect(() => {
    const doc_ref = doc(db, "config_operadores", operator_id);
    const unsubscribe = onSnapshot(doc_ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.ato !== undefined) {
          set_ato_value(data.ato);
        }
      }
    });
    return () => unsubscribe();
  }, [operator_id]);

  const update_ato = async (value: number) => {
    set_is_saving(true);
    set_ato_value(value);
    try {
      await setDoc(doc(db, "config_operadores", operator_id), {
        ato: value,
        operatorName: operator_name,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setTimeout(() => set_is_saving(false), 500);
    } catch (error) {
      console.error("Error updating ATO:", error);
      set_is_saving(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="group relative mx-auto flex w-full max-w-[100px] flex-col overflow-hidden rounded border border-[#1a4491] shadow-sm hover:border-blue-500 transition-colors">
          <div className="bg-[#1a4491] py-0.5 text-[10px] font-bold text-white uppercase group-hover:bg-blue-600">ATO</div>
          <div className="flex h-10 items-center justify-center bg-slate-200 text-lg font-black text-slate-800">
            {is_saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            ) : (
              ato_value
            )}
          </div>
          <div className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit2 className="h-2 w-2 text-blue-600" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2 bg-white" align="center">
        <div className="grid grid-cols-4 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((val) => (
            <button
              key={val}
              onClick={() => update_ato(val)}
              className={cn(
                "h-8 w-8 rounded text-xs font-bold transition-all",
                ato_value === val 
                  ? "bg-[#1a4491] text-white" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {val}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
