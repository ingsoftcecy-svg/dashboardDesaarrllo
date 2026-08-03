import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sliders, Save, RotateCcw, ShieldCheck } from "lucide-react";
import { FACTORS_LABELS } from "./constants";
import { cn } from "@/lib/utils";

interface BpreEditorDialogProps {
  teamKey: string;
  teamName: string;
  currentFactors: Record<string, number>;
  onSave?: (newFactors: Record<string, number>) => void;
  puedeEditar?: boolean;
  isGeneral?: boolean;
}

export function BpreEditorDialog({
  teamKey,
  teamName,
  currentFactors,
  onSave,
  puedeEditar = true,
  isGeneral = false,
}: BpreEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [factors, setFactors] = useState<Record<string, number>>(currentFactors);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setFactors(currentFactors);
  }, [currentFactors, open]);

  const handleSliderChange = (key: string, val: number) => {
    setFactors((prev) => ({
      ...prev,
      [key]: Math.min(4.0, Math.max(0.0, parseFloat(val.toFixed(2)))),
    }));
  };

  const handleReset = () => {
    setFactors(currentFactors);
  };

  const handleSave = async () => {
    if (isGeneral) return;
    setSaving(true);
    try {
      const docRef1 = doc(db, "evaluaciones_guias_tecnicas", `bpre_${teamKey}`);
      const docRef2 = doc(db, "bpre_factors", `bpre_${teamKey}`);

      const payload = {
        factors,
        teamKey,
        teamName,
        updatedAt: new Date().toISOString(),
      };

      await Promise.all([
        setDoc(docRef1, payload, { merge: true }),
        setDoc(docRef2, payload, { merge: true }),
      ]);

      if (onSave) onSave(factors);

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setOpen(false);
      }, 800);
    } catch (e) {
      console.error("Error al guardar factores BPRE:", e);
    } finally {
      setSaving(false);
    }
  };

  const esMantenimiento = teamName.toUpperCase().includes("MANTENIMIENTO") || 
                         teamName.toUpperCase().includes("TECH") || 
                         teamName.toUpperCase().includes("GUARDIANS") ||
                         teamName.toUpperCase().includes("MAINTENANCE");

  const isFactorNA = (key: string) => {
    if (!esMantenimiento) return false;
    const k = key.toLowerCase();
    return k === "ato" || k === "quas" || k === "multihab" || k === "multihabilidad";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          disabled={!puedeEditar || isGeneral}
          title={isGeneral ? "Selecciona un equipo específico para editar factores BPRE" : "Editar Factores BPRE del equipo"}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded bg-slate-800 text-slate-300 transition-all hover:bg-slate-700 hover:text-white focus:outline-none border border-slate-700 shadow-sm",
            (!puedeEditar || isGeneral) && "opacity-40 cursor-not-allowed hover:bg-slate-800 hover:text-slate-300"
          )}
        >
          <Sliders className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg bg-white p-6 rounded-2xl border-none shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center justify-between">
            <span>Editor BPRE — {teamName}</span>
          </DialogTitle>
          <p className="text-xs font-semibold text-slate-500">
            Ajusta los puntajes de autonomía BPRE (0.00 a 4.00) para este equipo.
            {esMantenimiento && " Los factores N/A para Mantenimiento están bloqueados."}
          </p>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {Object.entries(FACTORS_LABELS).map(([key, label]) => {
            const isNA = isFactorNA(key);
            const val = isNA ? 4.0 : (factors[key] !== undefined ? factors[key] : 2.0);
            return (
              <div key={key} className={cn(
                "flex flex-col gap-1.5 p-2.5 rounded-lg border transition-all",
                isNA ? "bg-slate-100 border-slate-300 opacity-75" : "bg-slate-50 border-slate-200/80"
              )}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    {label}
                    {isNA && (
                      <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase bg-slate-200 text-slate-600 border border-slate-300">
                        N/A (Exceptuado)
                      </span>
                    )}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    step="0.1"
                    disabled={isNA}
                    value={val}
                    onChange={(e) => handleSliderChange(key, parseFloat(e.target.value) || 0)}
                    className={cn(
                      "w-16 px-2 py-0.5 text-right font-mono font-bold border rounded text-xs outline-none",
                      isNA ? "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed" : "bg-white text-slate-800 border-slate-300 focus:ring-1 focus:ring-blue-500"
                    )}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="0.05"
                  disabled={isNA}
                  value={val}
                  onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                  className={cn(
                    "w-full h-1.5 rounded-lg appearance-none accent-blue-600",
                    isNA ? "bg-slate-300 cursor-not-allowed" : "bg-slate-200 cursor-pointer"
                  )}
                />
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4 flex items-center justify-between gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restablecer</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || savedSuccess}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all shadow-md",
                savedSuccess
                  ? "bg-emerald-600"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              )}
            >
              {savedSuccess ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
