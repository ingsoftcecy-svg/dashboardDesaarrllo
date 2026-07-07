import React, { useState, useEffect } from "react";
import { Search, BookOpen, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface Course {
  name: string;
  estado: string;
  fechaAprobacion?: string;
  modulo?: string;
}

interface OperatorCoursesDialogProps {
  operatorName: string;
  operatorId: string;
}

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
  const list = translations[id] || [];
  return [id, ...list];
};

export function OperatorCoursesDialog({ operatorName, operatorId }: OperatorCoursesDialogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        let allCourses: any[] = [];
        
        try {
          const coursesDocRef = doc(db, "config_dashboard", "cursos_detallados");
          const coursesDocSnap = await getDoc(coursesDocRef);
          if (coursesDocSnap.exists() && coursesDocSnap.data().list) {
            allCourses = coursesDocSnap.data().list;
            console.log("Loaded courses details from Firestore.");
          } else {
            const res = await fetch("/cursos.json");
            allCourses = await res.json();
            console.log("Loaded courses details from local fallback.");
          }
        } catch (e) {
          console.error("Error fetching courses details from Firestore, trying local fallback:", e);
          try {
            const res = await fetch("/cursos.json");
            allCourses = await res.json();
          } catch (err) {
            console.error("Local fallback for courses details failed:", err);
          }
        }

        const targetIds = getAlternativeIds(operatorId);
        
        const filtered = allCourses
          .filter(c => {
            const idGlobal = c.id ? String(c.id).trim() : "";
            return targetIds.includes(idGlobal);
          })
          .map(c => ({
            name: c.n || "Sin nombre",
            estado: c.e || "Pendiente",
            fechaAprobacion: c.f !== "-" ? c.f : undefined,
            modulo: c.m !== "-" ? c.m : undefined
          }));

        setCourses(filtered);
      } catch (err) {
        console.error("Error loading courses for dialog:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [operatorId]);

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.modulo && c.modulo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = courses.reduce((acc, c) => {
    if (c.estado === "Aprobado") acc.aprobados++;
    else if (c.estado === "En progreso") acc.enProgreso++;
    else acc.pendientes++;
    return acc;
  }, { aprobados: 0, enProgreso: 0, pendientes: 0 });

  return (
    <div className="flex flex-col text-slate-800 h-full max-h-[80vh] overflow-hidden">
      <DialogHeader className="border-b pb-4 mb-4">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
          <BookOpen className="h-4 w-4 text-[#1a4491]" />
          <span>Detalle de Capacitación</span>
        </div>
        <DialogTitle className="text-xl font-black text-[#1a4491] leading-tight uppercase mt-1">
          {operatorName}
        </DialogTitle>
        
        {/* Estadísticas rápidas */}
        {!loading && courses.length > 0 && (
          <div className="flex gap-3 mt-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1 text-center shrink-0">
              <span className="block text-[8px] font-black text-emerald-600 uppercase tracking-wider">Aprobados</span>
              <span className="text-sm font-black text-emerald-800">{stats.aprobados}</span>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1 text-center shrink-0">
              <span className="block text-[8px] font-black text-blue-600 uppercase tracking-wider">En Progreso</span>
              <span className="text-sm font-black text-blue-800">{stats.enProgreso}</span>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-1 text-center shrink-0">
              <span className="block text-[8px] font-black text-rose-600 uppercase tracking-wider">Pendientes</span>
              <span className="text-sm font-black text-rose-800">{stats.pendientes}</span>
            </div>
          </div>
        )}
      </DialogHeader>

      {/* Buscador */}
      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar curso por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1a4491] focus:border-[#1a4491] transition"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1a4491] border-t-transparent" />
          <span className="text-[10px] font-black text-[#1a4491] uppercase tracking-widest animate-pulse">Cargando cursos...</span>
        </div>
      ) : courses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 space-y-1.5 border border-dashed rounded-xl">
          <AlertCircle className="h-8 w-8 text-slate-300" />
          <span className="text-xs font-black uppercase tracking-wider">Sin Cursos Registrados</span>
          <span className="text-[10px] text-slate-400 text-center max-w-xs font-medium">No se encontraron asignaciones de capacitación para este operador.</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div className="rounded-xl border overflow-hidden bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-500 tracking-wider sticky top-0 border-b">
                  <th className="p-3">Curso</th>
                  <th className="p-3">Módulo</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Fecha Aprobación</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-700">
                {filteredCourses.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 leading-snug">{c.name}</td>
                    <td className="p-3 text-[10px] text-slate-500 uppercase leading-snug">{c.modulo || "-"}</td>
                    <td className="p-3 text-center align-middle">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        c.estado === "Aprobado" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        c.estado === "En progreso" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                        "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}>
                        {c.estado === "Aprobado" && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {c.estado === "En progreso" && <Clock className="h-2.5 w-2.5" />}
                        {c.estado}
                      </span>
                    </td>
                    <td className="p-3 text-center text-[10px] text-slate-500 whitespace-nowrap">{c.fechaAprobacion || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
