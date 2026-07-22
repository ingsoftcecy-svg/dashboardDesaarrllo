import { useState, useEffect, useMemo } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Check, X, Clipboard, Save, Info, CheckSquare, Square, ChevronDown, ChevronRight } from "lucide-react";
import { STRINGS } from "./constants";

interface GuiasEditorDialogProps {
  operator: {
    id: string;
    nombre: string;
    puesto?: string;
    guiasActiveLevel?: "L6" | "L7" | "L8";
    guiasProgress?: number;
    guiasEvaluations?: Record<string, { checked: boolean[] }>;
  };
  puedeEditar: boolean;
}

export function GuiasEditorDialog({ operator, puedeEditar }: GuiasEditorDialogProps) {
  const [catalog, setCatalog] = useState<any>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [activeLevel, setActiveLevel] = useState<"L6" | "L7" | "L8">("L6");
  const [evaluations, setEvaluations] = useState<Record<string, { checked: boolean[] }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Importer state
  const [showImporter, setShowImporter] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importPreview, setImportPreview] = useState<{ total: number; checked: number } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});



  // Load catalog
  useEffect(() => {
    setLoadingCatalog(true);
    fetch(`/guias_tecnicas.json?t=${new Date().getTime()}`)
      .then((res) => res.json())
      .then((data) => {
        setCatalog(data);
        setLoadingCatalog(false);
      })
      .catch((err) => {
        console.error("Error fetching catalog:", err);
        setLoadingCatalog(false);
      });
  }, []);

  // Reset collapsed categories on level change
  useEffect(() => {
    setExpandedCategories({});
  }, [activeLevel]);

  // Initialize active level and evaluations from operator
  useEffect(() => {
    if (operator.guiasActiveLevel) {
      setActiveLevel(operator.guiasActiveLevel);
    }
    if (operator.guiasEvaluations) {
      setEvaluations(JSON.parse(JSON.stringify(operator.guiasEvaluations)));
    } else {
      setEvaluations({});
    }
  }, [operator]);

  // Compute stats for current level
  const currentSkillsList = useMemo(() => {
    if (!catalog || !catalog[activeLevel]) return [];
    return catalog[activeLevel];
  }, [catalog, activeLevel]);

  const flatSkillsCount = useMemo(() => {
    let count = 0;
    currentSkillsList.forEach((cat: any) => {
      count += (cat.skills || []).length;
    });
    return count;
  }, [currentSkillsList]);

  const currentCheckedArray = useMemo(() => {
    const levelEval = evaluations[activeLevel] || { checked: [] };
    const checked = [...(levelEval.checked || [])];
    // Fill up to flatSkillsCount
    while (checked.length < flatSkillsCount) {
      checked.push(false);
    }
    return checked;
  }, [evaluations, activeLevel, flatSkillsCount]);

  const checkedCount = useMemo(() => {
    return currentCheckedArray.filter(Boolean).length;
  }, [currentCheckedArray]);

  const progressPercentage = useMemo(() => {
    if (flatSkillsCount === 0) return 0;
    return (checkedCount / flatSkillsCount) * 100;
  }, [checkedCount, flatSkillsCount]);

  // Handle single check toggle
  const handleToggleCheck = (index: number) => {
    if (!puedeEditar) return;
    setEvaluations((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[activeLevel]) {
        copy[activeLevel] = { checked: [] };
      }
      const checkedArr = [...currentCheckedArray];
      checkedArr[index] = !checkedArr[index];
      copy[activeLevel].checked = checkedArr;
      return copy;
    });
  };

  // Toggle all checks inside a specific category
  const handleToggleCategory = (categoryIndex: number, forceValue: boolean) => {
    if (!puedeEditar) return;
    
    // Find skill indices that belong to this category
    let startIdx = 0;
    for (let i = 0; i < categoryIndex; i++) {
      startIdx += (currentSkillsList[i]?.skills || []).length;
    }
    const catSkillsCount = (currentSkillsList[categoryIndex]?.skills || []).length;

    setEvaluations((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[activeLevel]) {
        copy[activeLevel] = { checked: [] };
      }
      const checkedArr = [...currentCheckedArray];
      for (let k = 0; k < catSkillsCount; k++) {
        checkedArr[startIdx + k] = forceValue;
      }
      copy[activeLevel].checked = checkedArr;
      return copy;
    });
  };

  // Toggle all checks for the entire active level
  const handleToggleAll = (forceValue: boolean) => {
    if (!puedeEditar) return;
    setEvaluations((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[activeLevel]) {
        copy[activeLevel] = { checked: [] };
      }
      copy[activeLevel].checked = Array(flatSkillsCount).fill(forceValue);
      return copy;
    });
  };

  const toggleCollapse = (catIdx: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catIdx]: !prev[catIdx]
    }));
  };

  // Handle Paste parsing
  const handlePasteChange = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setImportPreview(null);
      return;
    }

    const lines = text.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    const parsed = lines.map((line) => {
      const clean = line.trim().toLowerCase();
      if (!clean || clean === "0" || clean === "no" || clean === "-" || clean === "novice" || clean === "in training") {
        return false;
      }
      return true;
    });

    const yesCount = parsed.filter(Boolean).length;
    setImportPreview({
      total: parsed.length,
      checked: yesCount,
    });
  };

  // Apply parsed clipboard column to current checklist
  const handleApplyImport = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    const parsed = lines.map((line) => {
      const clean = line.trim().toLowerCase();
      if (!clean || clean === "0" || clean === "no" || clean === "-" || clean === "novice" || clean === "in training") {
        return false;
      }
      return true;
    });

    setEvaluations((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[activeLevel]) {
        copy[activeLevel] = { checked: [] };
      }
      
      const newChecked = [...currentCheckedArray];
      // Mapear 1 a 1 hasta la longitud máxima de habilidades
      for (let i = 0; i < flatSkillsCount; i++) {
        if (i < parsed.length) {
          newChecked[i] = parsed[i];
        } else {
          newChecked[i] = false;
        }
      }

      copy[activeLevel].checked = newChecked;
      return copy;
    });

    setPasteText("");
    setImportPreview(null);
    setShowImporter(false);
  };

  // Save evaluations to Firestore
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const docRef = doc(db, "evaluaciones_guias_tecnicas", operator.id);
      await setDoc(
        docRef,
        {
          activeLevel,
          evaluations,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Error saving evaluations to Firestore:", e);
      alert("Error al guardar las evaluaciones. Por favor intente de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingCatalog) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm font-semibold text-slate-500">Cargando guías técnicas...</p>
      </div>
    );
  }

  // Calculate global start indices for displaying skills in groups
  let globalSkillCounter = 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            Guías Técnicas - {operator.nombre}
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            {operator.puesto || "Operador"} | ID: {operator.id}
          </p>
        </div>
        
        {/* Selector de Nivel */}
        <div className="flex rounded-lg bg-slate-100 p-1 border shadow-inner">
          {(["L6", "L7", "L8"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActiveLevel(lvl)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer",
                activeLevel === lvl
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* METRIC DETAILS & ACTIONS */}
      <div className="my-4 grid grid-cols-1 md:grid-cols-3 items-center gap-4 bg-slate-50 p-4 rounded-xl border">
        {/* Progress gauge bar */}
        <div className="md:col-span-2 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span>PROGRESO EN NIVEL {activeLevel}</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {checkedCount} de {flatSkillsCount} completadas ({progressPercentage.toFixed(2)}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner border border-slate-300/40">
            <div
              className="bg-emerald-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Action Button Panel */}
        <div className="flex justify-end gap-2">
          {puedeEditar && (
            <>
              {/* Temporariamente oculto
              <button
                onClick={() => handleToggleAll(checkedCount < flatSkillsCount)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors"
              >
                {checkedCount < flatSkillsCount ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                    Marcar Todo {activeLevel}
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5 text-slate-400" />
                    Desmarcar Todo {activeLevel}
                  </>
                )}
              </button>
              */}

              <button
                onClick={() => setShowImporter(!showImporter)}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors shadow-sm",
                  showImporter
                    ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                )}
              >
                <Clipboard className="h-4 w-4" />
                Cargador Clipboard
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-md cursor-pointer disabled:opacity-50",
                  saveSuccess && "bg-yellow-500 hover:bg-yellow-600"
                )}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Guardando..." : saveSuccess ? "¡Guardado!" : "Guardar Cambios"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* CLIPBOARD LOADER INNER ACCORDION PANE */}
      {showImporter && puedeEditar && (
        <div className="mb-4 bg-emerald-50/50 border border-emerald-200/60 p-4 rounded-xl flex flex-col gap-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <Info className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-800 leading-relaxed">
              <span className="font-bold">Instrucciones del Cargador Inteligente:</span>
              <p className="mt-0.5">
                Copia una columna completa de checks desde tu archivo Excel de evaluación y pégala abajo.
                Los valores correspondientes a celdas no vacías (como "1", "x", "Certified") se interpretarán como marcados.
                El mapeo es correlativo (1 a 1 de arriba a abajo) según las preguntas de {activeLevel}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <textarea
              value={pasteText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="Pega la columna aquí..."
              rows={4}
              className="md:col-span-2 w-full p-2 text-xs border rounded-lg bg-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-inner"
            />
            <div className="bg-white border rounded-lg p-3 flex flex-col justify-between shadow-sm">
              <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Mapeo Detectado</span>
                {importPreview ? (
                  <>
                    <p>Habilidades en nivel: <span className="font-bold text-slate-800">{flatSkillsCount}</span></p>
                    <p>Líneas pegadas: <span className="font-bold text-slate-800">{importPreview.total}</span></p>
                    <p>Marcados (SI): <span className="font-bold text-emerald-600">{importPreview.checked}</span></p>
                  </>
                ) : (
                  <p className="italic text-slate-400">Ningún dato detectado aún.</p>
                )}
              </div>
              <button
                disabled={!importPreview || importPreview.total === 0}
                onClick={handleApplyImport}
                className="w-full mt-2 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold shadow hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Aplicar al Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKLIST MATRIX CONTENT SECTION */}
      <div className="flex-1 overflow-y-auto pr-1 max-h-[55vh] custom-scrollbar border rounded-xl bg-slate-50/50 p-4">
        {currentSkillsList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 italic">No hay preguntas cargadas para el nivel {activeLevel}.</div>
        ) : (
          <div className="flex flex-col gap-6">
            {currentSkillsList.map((cat: any, catIdx: number) => {
              const skills: string[] = cat.skills || [];
              const catSkillsCount = skills.length;
              
              // Calculate category checked count
              const catStartIdx = globalSkillCounter;
              globalSkillCounter += catSkillsCount; // advance counter
              
              const catCheckedCount = currentCheckedArray
                .slice(catStartIdx, catStartIdx + catSkillsCount)
                .filter(Boolean).length;

              const isAllChecked = catCheckedCount === catSkillsCount;
              const isSomeChecked = catCheckedCount > 0 && catCheckedCount < catSkillsCount;

              const catPercentage = catSkillsCount > 0 ? (catCheckedCount / catSkillsCount) * 100 : 0;

              const isExpanded = !!expandedCategories[catIdx];
              const isCollapsed = !isExpanded;

              return (
                <div key={cat.category + catIdx} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                  {/* Category Header */}
                  <div className={cn("bg-slate-100 px-4 py-3 flex items-center justify-between transition-colors", !isCollapsed && "border-b")}>
                    <div 
                      onClick={() => toggleCollapse(catIdx)}
                      className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                      )}
                      <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                        {cat.category}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                        {catCheckedCount} / {catSkillsCount}
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 bg-emerald-600 text-white rounded-md shadow-sm">
                        {catPercentage.toFixed(1)}%
                      </span>
                    </div>

                    {/* Check/Uncheck all buttons */}
                    {puedeEditar && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleCategory(catIdx, true)}
                          title="Marcar todo en esta categoría"
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-200/50 rounded transition-colors cursor-pointer"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleCategory(catIdx, false)}
                          title="Desmarcar todo en esta categoría"
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-200/50 rounded transition-colors cursor-pointer"
                        >
                          <Square className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Skills Grid */}
                  {!isCollapsed && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {skills.map((skill, skillIdx) => {
                        const absoluteIdx = catStartIdx + skillIdx;
                        const isChecked = currentCheckedArray[absoluteIdx] || false;

                        return (
                          <div
                            key={absoluteIdx}
                            onClick={() => puedeEditar && handleToggleCheck(absoluteIdx)}
                            className={cn(
                              "flex items-start gap-3 p-2.5 rounded-lg border transition-all select-none",
                              puedeEditar ? "cursor-pointer hover:bg-slate-50" : "",
                              isChecked
                                ? "bg-emerald-50/40 border-emerald-200 text-emerald-950 font-medium"
                                : "border-slate-100 hover:border-slate-200 bg-slate-50/20 text-slate-600"
                            )}
                          >
                            {/* Checked Icon */}
                            <div className="mt-0.5 shrink-0">
                              {isChecked ? (
                                <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-emerald-500 text-white shadow-sm border border-emerald-600">
                                  <Check className="h-3 w-3 stroke-[3]" />
                                </div>
                              ) : (
                                <div className={cn(
                                  "h-4.5 w-4.5 rounded bg-white shadow-inner border border-slate-300",
                                  puedeEditar && "group-hover:border-emerald-300"
                                )}></div>
                              )}
                            </div>

                            <div className="text-xs leading-tight">
                              <span className="font-bold text-slate-400 mr-1.5">
                                {(absoluteIdx + 1).toString().padStart(2, "0")}
                              </span>
                              {skill}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER NOTICE */}
      {!puedeEditar && (
        <div className="flex justify-end items-center border-t mt-4 pt-3 text-[10px] text-slate-400 font-medium">
          <span className="text-rose-500 font-bold uppercase tracking-wider">Modo Lectura (Sin Permisos)</span>
        </div>
      )}
    </div>
  );
}
