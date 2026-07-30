import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Check, CheckSquare, Square, ChevronDown, ChevronRight, ShieldCheck, Clock } from "lucide-react";

interface GuiasEditorDialogProps {
  operator: {
    id: string;
    nombre: string;
    puesto?: string;
    guiasActiveLevel?: "L6" | "L7" | "L8";
    guiasProgress?: number;
    guiasL6Progress?: number;
    guiasL7Progress?: number;
    guiasL8Progress?: number;
  };
  puedeEditar?: boolean;
}

export function GuiasEditorDialog({ operator }: GuiasEditorDialogProps) {
  const [activeLevel, setActiveLevel] = useState<"L6" | "L7" | "L8">(operator.guiasActiveLevel || "L6");
  const [importedData, setImportedData] = useState<any>(null);
  const [firestoreData, setFirestoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  // Cargar evaluación oficial desde Firestore (evaluaciones_guias_tecnicas)
  useEffect(() => {
    if (!operator || !operator.id) return;
    setLoading(true);

    const docRef = doc(db, "evaluaciones_guias_tecnicas", String(operator.id));
    getDoc(docRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setFirestoreData(data);
          if (data.evaluationsJson) {
            try {
              const parsed = JSON.parse(data.evaluationsJson);
              setImportedData(parsed);
            } catch (e) {
              console.error("Error parsing evaluationsJson:", e);
            }
          }
        }
      })
      .catch((err) => {
        console.warn("Error fetching guias data for operator:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [operator.id]);

  // Reset collapsed categories on level change
  useEffect(() => {
    setExpandedCategories({});
  }, [activeLevel]);

  // Determinar tipoGuia: COMPETENTE vs MEJORADO
  const tipoGuia = useMemo(() => {
    const opName = (importedData?.nombre || operator.nombre || "").toUpperCase();
    const fileStr = ((importedData?.subcarpeta || "") + " " + (importedData?.archivo || "")).toUpperCase();

    if (opName.includes("COMPETENTE") || fileStr.includes("COMPETENTE")) {
      return "COMPETENTE";
    }
    if (importedData?.tipoGuia === "COMPETENTE" || firestoreData?.tipoGuia === "COMPETENTE") {
      return "COMPETENTE";
    }
    if (opName.includes("MEJORADO") || fileStr.includes("MEJORADO") || importedData?.tipoGuia === "MEJORADO" || firestoreData?.tipoGuia === "MEJORADO") {
      return "MEJORADO";
    }
    return "COMPETENTE";
  }, [importedData, firestoreData, operator.nombre]);

  // Nombre limpio sin sufijo COMPETENTE / MEJORADO
  const cleanNombre = useMemo(() => {
    const rawName = importedData?.nombre || operator.nombre || "";
    return rawName.replace(/\s+(COMPETENTE|MEJORADO)$/i, "").trim();
  }, [importedData, operator.nombre]);

  // Datos del nivel activo desde el JSON importado de OneDrive
  const activeLevelData = useMemo(() => {
    if (!importedData || !importedData.niveles) return null;
    return importedData.niveles[activeLevel] || null;
  }, [importedData, activeLevel]);

  // Filtrar ÚNICAMENTE categorías que tengan al menos 1 habilidad aprobada / evaluada
  const evaluatedCategories = useMemo(() => {
    if (!activeLevelData || !activeLevelData.categorias) return [];
    return activeLevelData.categorias.filter((cat: any) => {
      const habs = cat.habilidades || [];
      const aprobadas = habs.filter((h: any) => h.marcado).length;
      return aprobadas > 0;
    });
  }, [activeLevelData]);

  // Porcentaje del nivel activo recalculado únicamente sobre las categorías que le corresponden al colaborador
  const levelPercentage = useMemo(() => {
    if (evaluatedCategories && evaluatedCategories.length > 0) {
      let totalHabs = 0;
      let aprobadas = 0;
      evaluatedCategories.forEach((cat: any) => {
        const habs = cat.habilidades || [];
        totalHabs += habs.length;
        aprobadas += habs.filter((h: any) => h.marcado).length;
      });
      if (totalHabs > 0) {
        return parseFloat(((aprobadas / totalHabs) * 100).toFixed(1));
      }
    }
    return 0;
  }, [evaluatedCategories]);

  const toggleCategory = (idx: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-xs font-bold text-slate-500">Cargando Guías Técnicas sincronizadas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Guías Técnicas — {cleanNombre}
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              OneDrive Auto-Sync
            </span>
            {tipoGuia === "COMPETENTE" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300 uppercase tracking-tight">
                COMPETENTE (Solo L6)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300 uppercase tracking-tight">
                MEJORADO (L6, L7, L8)
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {operator.puesto || "Operador"} | Ficha SHARP: <span className="font-mono font-bold text-slate-700">{operator.id}</span>
            {importedData?.equipo && (
              <> | Equipo: <span className="font-bold text-emerald-700">{importedData.equipo}</span></>
            )}
          </p>
        </div>

        {/* Selector de Nivel */}
        <div className="flex rounded-xl bg-slate-100 p-1 border shadow-inner">
          {(["L6", "L7", "L8"] as const).map((lvl) => {
            const isDisabled = tipoGuia === "COMPETENTE" && (lvl === "L7" || lvl === "L8");
            return (
              <button
                key={lvl}
                disabled={isDisabled}
                onClick={() => !isDisabled && setActiveLevel(lvl)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-xs font-black transition-all cursor-pointer",
                  activeLevel === lvl
                    ? "bg-emerald-600 text-white shadow-md scale-105"
                    : isDisabled
                    ? "opacity-40 text-slate-400 cursor-not-allowed bg-slate-200/40"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
                )}
                title={isDisabled ? "Pestaña N/A para colaboradores Competente" : `Nivel ${lvl}`}
              >
                {lvl} {isDisabled && "(N/A)"}
              </button>
            );
          })}
        </div>
      </div>

      {/* PROGRESO EN NIVEL ACTIVO */}
      <div className="my-4 flex flex-col gap-2 bg-gradient-to-r from-slate-900 to-slate-850 p-4 rounded-2xl border border-slate-800 text-white shadow-xl">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            PROGRESO OFICIAL Nivel {activeLevel}
          </span>
          <span className="text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-mono font-extrabold shadow">
            {levelPercentage}% COMPETENTE
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden shadow-inner border border-slate-700 p-0.5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out shadow-lg"
            style={{ width: `${levelPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* CONTENIDO DE CATEGORÍAS & HABILIDADES EVALUADAS */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {evaluatedCategories && evaluatedCategories.length > 0 ? (
          evaluatedCategories.map((catItem: any, idx: number) => {
            const isExpanded = !!expandedCategories[idx]; // Plegado/cerrado por defecto
            const habilidades = catItem.habilidades || [];
            const aprobadas = habilidades.filter((h: any) => h.marcado).length;
            const pctVal = catItem.porcentajeOficial || "0%";

            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                {/* Categoría Encabezado */}
                <button
                  onClick={() => toggleCategory(idx)}
                  className="w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between transition-colors border-b border-slate-100 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 pr-2">
                    <span className="p-1 rounded-lg bg-slate-200/70 text-slate-700">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                      {catItem.categoria}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-slate-500">
                      {aprobadas} / {habilidades.length}
                    </span>
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-xs border",
                        parseFloat(pctVal) > 0
                          ? "bg-emerald-600 text-white border-emerald-700"
                          : "bg-slate-100 text-slate-400 border-slate-200"
                      )}
                    >
                      {pctVal}
                    </span>
                  </div>
                </button>

                {/* Sub-Habilidades Evaluadas */}
                {isExpanded && (
                  <div className="p-3 bg-white divide-y divide-slate-100">
                    {habilidades.map((hab: any, hIdx: number) => (
                      <div
                        key={hIdx}
                        className={cn(
                          "py-2.5 px-3 flex items-start gap-3 rounded-xl transition-colors text-xs font-medium",
                          hab.marcado ? "bg-emerald-50/40 text-slate-800" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <span className="mt-0.5 shrink-0">
                          {hab.marcado ? (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-emerald-600 text-white shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md border border-slate-300 bg-slate-50 text-slate-300">
                              <Square className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </span>
                        <span className="leading-relaxed flex-1">
                          {hab.habilidad}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2">
            <Clock className="w-8 h-8 text-slate-400" />
            <p className="text-xs font-bold text-slate-600">
              No hay habilidades evaluadas en el nivel {activeLevel} para este colaborador.
            </p>
            <p className="text-[11px] text-slate-400">
              El nivel activo {activeLevel} se actualizará automáticamente cuando se registre en OneDrive.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
