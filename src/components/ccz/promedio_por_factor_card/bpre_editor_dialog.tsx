import { useState, useEffect, useMemo } from "react";
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
  currentFase?: string;
  currentFecha?: string;
  onSave?: (newFactors: Record<string, number>) => void;
  puedeEditar?: boolean;
  isGeneral?: boolean;
  children?: React.ReactNode;
}

export function BpreEditorDialog({
  teamKey,
  teamName,
  currentFactors,
  currentFase = "F2",
  currentFecha = "No definida",
  onSave,
  puedeEditar = true,
  isGeneral = false,
  teamOperators = [],
  children,
}: BpreEditorDialogProps & { teamOperators?: any[] }) {
  const [open, setOpen] = useState(false);
  const [factors, setFactors] = useState<Record<string, number>>(currentFactors);
  const [fechaCompromiso, setFechaCompromiso] = useState(currentFecha);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const esMantenimiento = teamName.toUpperCase().includes("MANTENIMIENTO") || 
                         teamName.toUpperCase().includes("TECH") || 
                         teamName.toUpperCase().includes("GUARDIANS") ||
                         teamName.toUpperCase().includes("MAINTENANCE") ||
                         teamName.toUpperCase().includes("MUNICH") ||
                         teamName.toUpperCase().includes("NAHUALES");

  const isFactorNA = (key: string) => {
    if (!esMantenimiento) return false;
    const k = key.toLowerCase();
    return k === "ato" || k === "quas" || k === "multihab" || k === "multihabilidad";
  };

  // Calcular la fase automáticamente como el menor factor, ignorando los N/A
  const computedFase = useMemo(() => {
    const validVals: number[] = [];
    Object.entries(factors).forEach(([key, val]) => {
      if (!isFactorNA(key) && val !== undefined && val !== null) {
        validVals.push(val);
      }
    });
    
    if (validVals.length === 0) return currentFase;
    return `F${Math.min(...validVals)}`;
  }, [factors, currentFase, esMantenimiento]);

  useEffect(() => {
    setFactors(currentFactors);
    setFechaCompromiso(currentFecha);
  }, [currentFactors, currentFase, currentFecha, open]);

  const handleSliderChange = (key: string, val: number) => {
    setFactors((prev) => ({
      ...prev,
      [key]: Math.min(4, Math.max(0, Math.round(val))),
    }));
  };

  const handleReset = () => {
    setFactors(currentFactors);
    setFechaCompromiso(currentFecha);
  };

  const handleSave = async () => {
    if (isGeneral) return;
    setSaving(true);
    try {
      const docRef1 = doc(db, "bpre_overrides", teamKey);

      const payload = {
        factors,
        faseActual: computedFase,
        fechaCompromiso,
        teamKey,
        teamName,
        updatedAt: new Date().toISOString(),
      };

      const updatePromises = [
        setDoc(docRef1, payload, { merge: true }),
      ];

      // Note: We leave ATO on operators untouched as the user requested individual ATO editing to be removed.
      // The ATO factor comes from the global BPRE matrix overrides now.

      await Promise.all(updatePromises);

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


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <button
            disabled={!puedeEditar || isGeneral}
            title={isGeneral ? "Selecciona un equipo específico para editar factores" : "Editar Factores del equipo"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded bg-slate-800 text-slate-300 transition-all hover:bg-slate-700 hover:text-white focus:outline-none border border-slate-700 shadow-sm",
              (!puedeEditar || isGeneral) && "opacity-40 cursor-not-allowed hover:bg-slate-800 hover:text-slate-300"
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg bg-white p-6 rounded-2xl border-none shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center justify-between">
            <span>Editor — {teamName}</span>
          </DialogTitle>
          <p className="text-xs font-semibold text-slate-500">
            Ajusta los puntajes de autonomía (0.00 a 4.00) para este equipo.
            {esMantenimiento && " Los factores N/A para Mantenimiento están bloqueados."}
          </p>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-100">
            <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
              <label className="text-xs font-bold text-blue-900">Fase Actual</label>
              <div className="px-2 py-1.5 text-sm font-bold border rounded bg-slate-100 text-slate-800 border-slate-300 flex items-center justify-between">
                <span>{computedFase}</span>
                <span className="text-[9px] text-slate-400 font-normal tracking-wide">(Calculada auto.)</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <label className="text-xs font-bold text-emerald-900">Fecha Cambio Fase</label>
              <select
                value={fechaCompromiso}
                onChange={(e) => setFechaCompromiso(e.target.value)}
                className="px-2 py-1.5 text-sm font-bold border rounded bg-white text-slate-800 border-emerald-200 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ENERO">ENERO</option>
                <option value="FEBRERO">FEBRERO</option>
                <option value="MARZO">MARZO</option>
                <option value="ABRIL">ABRIL</option>
                <option value="MAYO">MAYO</option>
                <option value="JUNIO">JUNIO</option>
                <option value="JULIO">JULIO</option>
                <option value="AGOSTO">AGOSTO</option>
                <option value="SEPTIEMBRE">SEPTIEMBRE</option>
                <option value="OCTUBRE">OCTUBRE</option>
                <option value="NOVIEMBRE">NOVIEMBRE</option>
                <option value="DICIEMBRE">DICIEMBRE</option>
                <option value="No definida">NO DEFINIDA</option>
                <option value="CUMPLIENDO">CUMPLIENDO...</option>
              </select>
            </div>
          </div>

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
                    step="1"
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
                  step="1"
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
