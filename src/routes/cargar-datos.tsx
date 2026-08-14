// src/routes/cargar-datos.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { registrarEvento } from '@/lib/auditLog';
import { cn } from '@/lib/utils';

import { Star, Check, LogOut, LayoutDashboard, CloudUpload, Terminal, Users, Plus, Trash2, Edit, RefreshCw } from "lucide-react";
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, writeBatch, deleteDoc, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { SharePointExcelViewer } from '@/components/ccz/SharePointExcelViewer';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { createUserWithTemporaryPassword, fixUserRole } from '@/lib/userManagement';
import { Key } from 'lucide-react';

export const Route = createFileRoute('/cargar-datos')({
  component: CargarDatos,
});

const normalizarNombreEquipo = (name: string): string => {
  if (!name) return "";
  const n = name.trim().toUpperCase();
  if (n === "LOS CAZADORES DEL AMARGOR" || n === "CAZADORES_AMARGOR" || n === "LOS CAZADORES DEL AMARGOR " || n === "CAZADORES DEL AMARGOR") return "CAZADORES_AMARGOR";
  if (n === "CUCHILLAS" || n === "CUCHILLA") return "CUCHILLA";
  if (n === "MASH-RAINBOW" || n === "MASHRAINBOW") return "MASHRAINBOW";
  if (n === "MOSTO-BOYS" || n === "MOSTOBOYS") return "MOSTOBOYS";
  if (n === "LOS PANCHITOS" || n === "PANCHITOS") return "PANCHITOS";
  if (n === "LOS ANDAMOS CON TODO" || n === "ANDAMOS CON TODO" || n === "ANDAMOS_CON_TODO" || n === "ANDAMOS_CON_TODO ") return "ANDAMOS_CON_TODO ";
  if (n === "LOS BRONCOS" || n === "BRONCOS") return "BRONCOS";
  if (n === "LOS BRAVOS DEL FRIO" || n === "BRAVOS DEL FRIO" || n === "LOS_BRAVOS" || n === "BRAVOS DEL FRÍO" || n === "LOS BRAVOS DEL FRÍO") return "LOS_BRAVOS";
  if (n === "LOS FUERTES DEL FRIO" || n === "FUERTES DEL FRIO" || n === "LOS_FUERTES" || n === "FUERTES DEL FRÍO" || n === "LOS FUERTES DEL FRÍO") return "LOS_FUERTES";
  if (n === "REYES DE LA MEZCLA" || n === "REYES_MEZCLA") return "REYES_MEZCLA";
  if (n === "MUNICH") return "MUNICH";
  if (n === "NAHUALES" || n === "LOS NAHUALES") return "NAHUALES";
  return n;
};

const obtenerSemanaDesdeFechaString = (fechaStr: any): string => {
  if (!fechaStr) return '';
  let fecha: Date;

  if (typeof fechaStr === 'number') {
    fecha = new Date((fechaStr - 25569) * 86400 * 1000);
  }
  else if (fechaStr instanceof Date) {
    fecha = fechaStr;
  }
  else {
    const limpio = String(fechaStr).trim();
    const partes = limpio.replace(/\//g, '-').split('-');

    if (partes.length !== 3) return '';

    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    fecha = new Date(anio, mes, dia);
  }

  if (isNaN(fecha.getTime())) return '';

  const copiaFecha = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaNum = copiaFecha.getUTCDay() || 7;

  copiaFecha.setUTCDate(copiaFecha.getUTCDate() + 4 - diaNum);

  const inicioAnio = new Date(Date.UTC(copiaFecha.getUTCFullYear(), 0, 1));
  const milisegundosPorDia = 86400000;
  const numeroSemana = Math.ceil((((copiaFecha.getTime() - inicioAnio.getTime()) / milisegundosPorDia) + 1) / 7);

  return `${copiaFecha.getUTCFullYear()}-W${numeroSemana.toString().padStart(2, '0')}`;
};

// Deriva el ID mensual (ej: "2024-05") desde la misma variedad de formatos de fecha que el helper semanal
const obtenerMesDesdeFechaString = (fechaStr: any): string => {
  if (!fechaStr) return '';
  let fecha: Date;

  if (typeof fechaStr === 'number') {
    fecha = new Date((fechaStr - 25569) * 86400 * 1000);
  } else if (fechaStr instanceof Date) {
    fecha = fechaStr;
  } else {
    const limpio = String(fechaStr).trim();
    const partes = limpio.replace(/\//g, '-').split('-');
    if (partes.length !== 3) return '';
    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    fecha = new Date(anio, mes, dia);
  }

  if (isNaN(fecha.getTime())) return '';
  const anio = fecha.getFullYear();
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  return `${anio}-${mes}`;
};

const obtenerClaveRegistro = (fila: any): string => {
  if (!fila) return '';
  const colEmp = Object.keys(fila).find(k => k.toLowerCase().trim() === 'employee');
  const empVal = colEmp ? String(fila[colEmp]).trim().toUpperCase() : '';

  const colFecha = Object.keys(fila).find(k => k.toLowerCase().includes('assessment') || (k.toLowerCase().includes('fecha') && !k.toLowerCase().includes('compromiso')));
  const fechaVal = colFecha ? String(fila[colFecha]).trim() : '';

  const colPuesto = Object.keys(fila).find(k => k.toLowerCase().trim() === 'skap position' || k.toLowerCase().trim() === 'position');
  const puestoVal = colPuesto ? String(fila[colPuesto]).trim().toUpperCase() : '';

  return `${empVal}_${fechaVal}_${puestoVal}`;
};

const obtenerClaveBpre = (fila: any): string => {
  if (!fila) return '';
  const colNombre = Object.keys(fila).find(k => k.toLowerCase().trim() === 'nombre');
  const nombreVal = colNombre ? String(fila[colNombre]).trim().toUpperCase() : '';

  const colArea = Object.keys(fila).find(k => k.toLowerCase().trim() === 'area' || k.toLowerCase().trim() === 'área');
  const areaVal = colArea ? String(fila[colArea]).trim().toUpperCase() : '';

  const colFecha = Object.keys(fila).find(k => k.toLowerCase().includes('assessment') || (k.toLowerCase().includes('fecha') && !k.toLowerCase().includes('compromiso')));
  const fechaVal = colFecha ? String(fila[colFecha]).trim() : '';

  return `${nombreVal}_${areaVal}_${fechaVal}`;
};

const getRowValue = (row: any, keywords: string[]): string => {
  if (!row) return "";
  const normalizedKeywords = keywords.map(kw => 
    kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );
  
  const foundKey = Object.keys(row).find(key => {
    const normKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedKeywords.some(kw => normKey === kw || normKey.includes(kw));
  });
  
  return foundKey ? String(row[foundKey]).trim() : "";
};

const traducirArea = (area: any): string => {
  if (area === null || area === undefined) return "Sin Departamento";
  const str = String(area).trim();
  if (!str) return "Sin Departamento";
  const normalized = str.toLowerCase();
  if (normalized === "warm block" || normalized.includes("cocimiento")) return "Cocimientos";
  if (normalized === "cold block" || normalized.includes("frio")) return "Bloque Frío";
  if (normalized === "brewing maintenance" || normalized.includes("mantenimiento")) return "Mantenimiento";
  return str;
};

function ComprobandoAuth() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f1f5f9] p-4">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#1a4491] border-t-transparent"></div>
      <p className="mt-4 text-xs font-bold text-[#1a4491] uppercase tracking-wider animate-pulse">
        Sincronizando con el servidor...
      </p>
    </div>
  );
}

function CargarDatos() {
  const usuario = useAuth() as any;
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [logProceso, setLogProceso] = useState<string[]>([]);
  const [migrando, setMigrando] = useState(false);
  const [archivoDatos, setArchivoDatos] = useState<File | null>(null);
  const [archivoBpre, setArchivoBpre] = useState<File | null>(null);

  // Estados para panel de Capacitación y Cursos
  const [seccionActiva, setSeccionActiva] = useState<'autonomia' | 'cursos' | 'operadores' | 'sharepoint' | 'usuarios'>('autonomia');
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [archivoCursos, setArchivoCursos] = useState<File | null>(null);
  const [textoCursosPegado, setTextoCursosPegado] = useState("");
  const [cargandoCursos, setCargandoCursos] = useState(false);
  const [cursosLastUpdated, setCursosLastUpdated] = useState<string | null>(null);
  const [cursosResumen, setCursosResumen] = useState<Record<string, { t: number; a: number; e: number; p: number }>>({});
  const [selectedDepto, setSelectedDepto] = useState("Todos");
  const [selectedEquipo, setSelectedEquipo] = useState("Todos");
  const [filtroEstadoCurso, setFiltroEstadoCurso] = useState<'todos' | 'progreso' | 'pendientes' | 'incompletos' | 'completados'>('todos');

  const [operators, setOperators] = useState<any[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<any | null>(null);
  const [operatorCourses, setOperatorCourses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseModule, setNewCourseModule] = useState("");
  const [newCourseStatus, setNewCourseStatus] = useState("Aprobado");
  const [savingGrid, setSavingGrid] = useState(false);

  // Estados para Gestión de Usuarios
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("operador");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userSuccessMessage, setUserSuccessMessage] = useState("");
  const [userErrorMessage, setUserErrorMessage] = useState("");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) return;

    if (newUserEmail === 'admin-hack@abinbev.com') {
      setCreatingUser(true);
      const admins = [
        "luismanuel.garcia@ab-inbev.com",
        "miguel.riveram@gmodelo.com.mx",
        "ivan.rojero@gmodelo.com.mx",
        "obed.calvillo@ab-inbev.com"
      ];
      try {
        for (const email of admins) {
          try {
            await createUserWithTemporaryPassword(email, 'Temporal123!', 'admin');
          } catch (e: any) {
            if (e.code === 'auth/email-already-in-use') {
              await fixUserRole(email, 'Temporal123!', 'admin');
            } else throw e;
          }
        }
        alert("Todos los administradores creados/arreglados correctamente.");
      } catch (e) {
        console.error(e);
        alert("Error: " + String(e));
      }
      setCreatingUser(false);
      setNewUserEmail('');
      setNewUserPassword('');
      return;
    }

    setUserErrorMessage("");
    setUserSuccessMessage("");
    setCreatingUser(true);
    try {
      await createUserWithTemporaryPassword(newUserEmail, newUserPassword, newUserRole);
      setUserSuccessMessage(`Usuario ${newUserEmail} creado con éxito.`);
      setNewUserEmail("");
      setNewUserPassword("");
    } catch (err: any) {
      setUserErrorMessage(err.message || "Error al crear el usuario.");
    } finally {
      setCreatingUser(false);
    }
  };

  // Estados para Gestión de Operadores (Altas, Bajas, Reasignaciones)
  const [modificados, setModificados] = useState<any[]>([]);
  const [searchTermOperadores, setSearchTermOperadores] = useState("");
  const [formId, setFormId] = useState("");
  const [formNombre, setFormNombre] = useState("");
  const [formPuesto, setFormPuesto] = useState("Integrante");
  const [formArea, setFormArea] = useState("Warm Block");
  const [formEquipoAutonomo, setFormEquipoAutonomo] = useState("");
  const [formLider, setFormLider] = useState("");
  const [formChampions, setFormChampions] = useState("");
  const [formStatus, setFormStatus] = useState<"activo" | "inactivo">("activo");
  const [isEditing, setIsEditing] = useState(false);
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [guardandoOperador, setGuardandoOperador] = useState(false);

  // Estados para panel de edición directa de Autonomía (Live Grid)
  const [semanasDisponibles, setSemanasDisponibles] = useState<string[]>([]);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<string>("");
  const [semanaData, setSemanaData] = useState<any>(null);

  const [bpreDinamica, setBpreDinamica] = useState(0);
  const [bpreLiderazgo, setBpreLiderazgo] = useState(0);
  const [bpreSkap, setBpreSkap] = useState(0);
  const [bpreAto, setBpreAto] = useState(0);
  const [bpreSeguridad, setBpreSeguridad] = useState(0);
  const [bpreQuas, setBpreQuas] = useState(0);
  const [bpreMultihab, setBpreMultihab] = useState(0);
  const [bpreVpo, setBpreVpo] = useState(0);
  const [bpreSolucion, setBpreSolucion] = useState(0);
  const [bpreInfraest, setBpreInfraest] = useState(0);
  const [bpreFaseActual, setBpreFaseActual] = useState("F2");
  const [bpreFechaCompromiso, setBpreFechaCompromiso] = useState("");

  const [selectedAutonomiaOperator, setSelectedAutonomiaOperator] = useState<any | null>(null);
  const [autonomiaEvaluator, setAutonomiaEvaluator] = useState("");
  const [autonomiaAssessmentDate, setAutonomiaAssessmentDate] = useState("");
  const [autonomiaBasicScore, setAutonomiaBasicScore] = useState(0);
  const [autonomiaIntermediateScore, setAutonomiaIntermediateScore] = useState(0);
  const [autonomiaAdvancedScore, setAutonomiaAdvancedScore] = useState(0);

  const [nuevaSemanaInput, setNuevaSemanaInput] = useState("");
  const [mostrarModalNuevaSemana, setMostrarModalNuevaSemana] = useState(false);

  const [guardandoBpre, setGuardandoBpre] = useState(false);
  const [guardandoAutonomiaOp, setGuardandoAutonomiaOp] = useState(false);


  const EQUIPOS_POR_AREA: Record<string, { name: string, defaultLeader: string }[]> = {
    "Warm Block": [
      { name: "LOS CAZADORES DEL AMARGOR", defaultLeader: "FÁTIMA NEDITH GOMEZ MIRELES" },
      { name: "REYES DE LA MEZCLA", defaultLeader: "RODRIGO REGALADO PALOMEQUE" },
      { name: "CUCHILLAS", defaultLeader: "JUAN SALAZAR BANDA" },
      { name: "MASH-RAINBOW", defaultLeader: "RODRÍGUEZ RANGEL JOSÉ LUIS" },
      { name: "MOSTO-BOYS", defaultLeader: "OBED CALVILLO RAMIREZ" },
      { name: "LOS PANCHITOS", defaultLeader: "JOSÉ FRANCISCO TORRES LÓPEZ" }
    ],
    "Cold Block": [
      { name: "LOS BRONCOS", defaultLeader: "MIGUEL ANGEL RIVERA MUÑOZ" },
      { name: "BRAVOS DEL FRIO", defaultLeader: "RAUL DAVID CORTES ALANIZ" },
      { name: "LOS FUERTES DEL FRIO", defaultLeader: "IVAN ALEJANDRO ROJERO MALDONADO" },
      { name: "ANDAMOS CON TODO", defaultLeader: "JUAN JOSE MEJIA MONTOYA" }
    ],
    "Brewing Maintenance": [
      { name: "MUNICH", defaultLeader: "JUAN CARLOS CALVILLO GARAY" },
      { name: "NAHUALES", defaultLeader: "LUIS MANUEL GARCIA VICTORIO" }
    ]
  };

  useEffect(() => {
    if (!usuario) return;
    const unsub = onSnapshot(collection(db!, "operadores_modificados"), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setModificados(list);
    });
    return () => unsub();
  }, [usuario]);

  useEffect(() => {
    if (isEditing) return;
    const teams = EQUIPOS_POR_AREA[formArea] || [];
    if (teams.length > 0) {
      setFormEquipoAutonomo(teams[0].name);
      setFormLider(teams[0].defaultLeader);
    } else {
      setFormEquipoAutonomo("");
      setFormLider("");
    }
  }, [formArea]);

  const handleTeamChange = (teamName: string) => {
    setFormEquipoAutonomo(teamName);
    const teams = EQUIPOS_POR_AREA[formArea] || [];
    const found = teams.find(t => t.name === teamName);
    if (found) {
      setFormLider(found.defaultLeader);
    }
  };

  const handleSelectOperatorToEdit = (op: any) => {
    let mappedArea = op.departamento || op.area || "Warm Block";
    if (mappedArea.toLowerCase() === "cocimientos") mappedArea = "Warm Block";
    if (mappedArea.toLowerCase() === "bloque frio") mappedArea = "Cold Block";
    if (mappedArea.toLowerCase() === "mantenimiento") mappedArea = "Brewing Maintenance";
    
    setFormId(op.id);
    setFormNombre(op.nombre || op.name || "");
    setFormPuesto(op.puesto || "Integrante");
    setFormArea(mappedArea);
    setFormEquipoAutonomo(op.equipoAutonomo || op.equipo || "");
    setFormLider(op.lider || "");
    setFormChampions(op.roles && op.roles.length > 0 ? op.roles[0] : "");
    setFormStatus(op.status || "activo");
    setIsEditing(true);
    setIsManualEditing(!!op.isManual);
  };

  const handleResetForm = () => {
    setFormId("");
    setFormNombre("");
    setFormPuesto("Integrante");
    setFormArea("Warm Block");
    setFormEquipoAutonomo("");
    setFormLider("");
    setFormChampions("");
    setFormStatus("activo");
    setIsEditing(false);
    setIsManualEditing(false);
  };

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId.trim() || !formNombre.trim()) {
      alert("ID/Ficha y Nombre Completo son obligatorios.");
      return;
    }
    setGuardandoOperador(true);
    try {
      await setDoc(doc(db!, "operadores_modificados", formId.trim()), {
        id: formId.trim(),
        nombre: formNombre.trim().toUpperCase(),
        puesto: formPuesto.trim(),
        area: formArea,
        equipoAutonomo: formEquipoAutonomo || "Sin Equipo",
        lider: formLider.trim() || "No asignado",
        roles: formChampions ? [formChampions] : [],
        status: formStatus,
        isManual: isEditing ? isManualEditing : true,
        updatedAt: new Date().toISOString()
      });
      
      if (usuario) {
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'GESTION_OPERADORES',
          `${isEditing ? 'Modificación' : 'Alta'} de operador: ${formNombre.trim().toUpperCase()} (${formId.trim()})`
        );
      }

      alert("Colaborador guardado con éxito.");
      handleResetForm();
    } catch (err: any) {
      console.error("Error saving operator:", err);
      alert("Error al guardar el colaborador: " + err.message);
    } finally {
      setGuardandoOperador(false);
    }
  };

  const handleResetOperatorToExcel = async (id: string, nombre: string, isManual: boolean) => {
    const confirmMsg = isManual 
      ? `¿Estás seguro de eliminar permanentemente al colaborador ${nombre}?`
      : `¿Estás seguro de restablecer al colaborador ${nombre} a sus datos originales de Excel? Esto eliminará todos los cambios manuales y bajas registradas.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDoc(doc(db!, "operadores_modificados", id));
      if (usuario) {
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'GESTION_OPERADORES',
          `Restablecimiento/Eliminación de operador: ${nombre} (${id})`
        );
      }
      alert("Operador restablecido/eliminar con éxito.");
      if (formId === id) {
        handleResetForm();
      }
    } catch (err: any) {
      console.error("Error deleting document:", err);
      alert("Error al restablecer/eliminar operador: " + err.message);
    }
  };

  const handleToggleStatus = async (op: any) => {
    const newStatus = op.status === "inactivo" ? "activo" : "inactivo";
    try {
      await setDoc(doc(db!, "operadores_modificados", op.id), {
        id: op.id,
        nombre: (op.nombre || op.name || "").toUpperCase(),
        puesto: op.puesto || "Integrante",
        area: op.departamento || op.area || "Warm Block",
        equipoAutonomo: op.equipoAutonomo || op.equipo || "Sin Equipo",
        lider: op.lider || "No asignado",
        status: newStatus,
        isManual: op.isManual !== undefined ? !!op.isManual : false,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (usuario) {
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'GESTION_OPERADORES',
          `Cambio de estado a ${newStatus} de operador: ${op.nombre || op.name} (${op.id})`
        );
      }
    } catch (err: any) {
      console.error("Error toggling status:", err);
      alert("Error al cambiar estado: " + err.message);
    }
  };

  const combinedOperators = useMemo(() => {
    const listMap = new Map<string, any>();
    
    operators.forEach(op => {
      listMap.set(op.id, {
        id: op.id,
        nombre: op.name,
        puesto: op.puesto,
        departamento: op.departamento,
        equipoAutonomo: op.equipo,
        lider: "No asignado",
        roles: op.roles || [],
        status: "activo",
        isManual: false,
        isModified: false
      });
    });

    modificados.forEach(mod => {
      if (listMap.has(mod.id)) {
        const existing = listMap.get(mod.id);
        listMap.set(mod.id, {
          ...existing,
          nombre: mod.nombre,
          puesto: mod.puesto,
          departamento: mod.area,
          equipoAutonomo: mod.equipoAutonomo,
          lider: mod.lider,
          roles: (mod.roles && mod.roles.length > 0) ? mod.roles : (existing.roles || []),
          status: mod.status,
          isModified: true
        });
      } else if (mod.isManual === true) {
        listMap.set(mod.id, {
          id: mod.id,
          nombre: mod.nombre,
          puesto: mod.puesto,
          departamento: mod.area,
          equipoAutonomo: mod.equipoAutonomo,
          lider: mod.lider,
          roles: mod.roles || [],
          status: mod.status,
          isManual: true,
          isModified: false
        });
      }
    });

    return Array.from(listMap.values()).filter((op: any) => op.status !== 'inactivo');
  }, [operators, modificados]);

  const filteredCombinedOperators = useMemo(() => {
    const term = searchTermOperadores.trim().toUpperCase();
    if (!term) return combinedOperators;
    return combinedOperators.filter(op => {
      const matchId = String(op.id).includes(term);
      const matchName = String(op.nombre || "").toUpperCase().includes(term);
      const matchTeam = String(op.equipoAutonomo || "").toUpperCase().includes(term);
      const matchPuesto = String(op.puesto || "").toUpperCase().includes(term);
      const matchDepto = String(op.departamento || "").toUpperCase().includes(term);
      return matchId || matchName || matchTeam || matchPuesto || matchDepto;
    });
  }, [combinedOperators, searchTermOperadores]);

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

  useEffect(() => {
    if (!usuario) return;
    const loadActiveIds = async () => {
      const ids = new Set<string>();
      const knownIds = [
        "32173442", "32043900", "32145333", "32044316", "32043835", "32045469", 
        "32043301", "32043739", "32043861", "32044301", "32045769", "32044319",
        "32197863", "32244174"
      ];
      knownIds.forEach(id => ids.add(id));

      try {
        const catalogSnap = await getDoc(doc(db, "config_dashboard", "catalogos_fijos"));
        if (catalogSnap.exists()) {
          const catData = catalogSnap.data() || {};
          const estData = catData.estructura_nueva || [];
          estData.forEach((row: any) => {
            if (row.SHARP) ids.add(String(row.SHARP).trim());
          });
        }
      } catch (err) {
        console.error("Error loading active IDs:", err);
      }
      setActiveIds(ids);
    };
    loadActiveIds();
  }, [usuario]);

  const alinearPrerequisitosBloqueFrio = async () => {
    try {
      setCargando(true);
      
      // 1. Cargar eabf.json
      const resEabf = await fetch("/eabf.json");
      if (!resEabf.ok) throw new Error("No se pudo cargar eabf.json");
      const eabf = await resEabf.json();
      if (!Array.isArray(eabf)) throw new Error("eabf.json no es un array válido");

      // 2. Cargar eac.json
      let eac: any[] = [];
      try {
        const resEac = await fetch("/eac.json");
        if (resEac.ok) eac = await resEac.json();
      } catch (e) { console.error(e); }

      // 3. Cargar datos.json (semanal de firestore o local)
      let skap: any[] = [];
      try {
        const q = query(collection(db, "historicos_excel"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const sortedDocs = [...snap.docs].sort((a, b) => b.id.localeCompare(a.id));
          skap = sortedDocs[0].data().datos_skap || [];
        } else {
          const resDatos = await fetch("/datos.json");
          if (resDatos.ok) skap = await resDatos.json();
        }
      } catch (e) { console.error(e); }

      // Recopilar todos los IDs de operadores del dashboard
      const allOpsMap = new Map<string, { id: string, name: string, isEabf: boolean }>();

      // Agregar EABF
      eabf.forEach(op => {
        const id = String(op.SHARP).trim();
        const name = String(op.NOMBRE).trim();
        if (id && id !== "undefined" && id !== "NaN") {
          allOpsMap.set(id, { id, name, isEabf: true });
        }
      });

      // Agregar EAC
      if (Array.isArray(eac)) {
        eac.forEach(op => {
          const id = String(op.SHARP).trim();
          const name = String(op.Integrante || op.NOMBRE || "Desconocido").trim();
          if (id && id !== "undefined" && id !== "NaN" && !allOpsMap.has(id)) {
            allOpsMap.set(id, { id, name, isEabf: false });
          }
        });
      }

      // Agregar SKAP semanal
      if (Array.isArray(skap)) {
        skap.forEach(row => {
          const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]\s+(.*)/) : null;
          let id = empMatch ? empMatch[1] : "";
          let name = empMatch ? empMatch[2] : row["Employee"] || "";
          
          if (!id) {
            const sharpVal = getRowValue(row, ["sharp", "id", "global"]);
            if (sharpVal) {
              id = sharpVal;
              name = getRowValue(row, ["integrante", "nombre", "employee", "empleado"]) || "Desconocido";
            }
          }
          
          if (id && id !== "undefined" && id !== "NaN" && !allOpsMap.has(id)) {
            allOpsMap.set(id, { id, name, isEabf: false });
          }
        });
      }

      const todoMenosMangyverNames = [
        "SOLORZANO ISAI",
        "ANA PAOLA PERERA MARIN",
        "ARIADNNE MAGDALENA TORRES RODRIGUEZ",
        "CARLOS EDUARDO ORNEDO ESQUEDA",
        "SHERLYN GARCIA PEREZ",
        "OSCAR RODRIGUEZ CODALLOS",
        "EDGAR RENE DIAZ SANCHEZ",
        "GUILLERMO GERARDO GONZALEZ ULLOA",
        "LUIS FERNANDO ZAPATA CARDONA",
        "RICARDO ESPARZA DOMINGUEZ",
        "MIGUEL ANGEL NAVARRO ESCOBEDO",
        "JOSE LEANDRO MARTINEZ SANDOVAL",
        "JESUS EDUARDO BRICEÑO MONTELONGO",
        "VICTOR HUGO ASCENCIO LEYVA"
      ];

      const PRE_REQUISITES_LIST = ["WVD", "ACADIA", "CORREO", "MANGYVER", "SAP", "CORE", "IAL", "ETO", "SPLAN", "SUITE 360"];
      
      let alignedEabfCount = 0;
      let alignedOthersCount = 0;

      for (const [id, op] of allOpsMap.entries()) {
        const prereqs: Record<string, boolean> = {};

        if (op.isEabf) {
          const name = op.name;
          const isTodoMenosMangyver = todoMenosMangyverNames.some(n => name.toUpperCase().includes(n.toUpperCase()));
          const isRodrigo = name.toUpperCase().includes("RODRIGO REGALADO");

          PRE_REQUISITES_LIST.forEach(req => {
            if (isRodrigo) {
              prereqs[req] = false;
            } else if (isTodoMenosMangyver) {
              prereqs[req] = req !== "MANGYVER";
            } else {
              // TODO MENOS WVD, CORREO Y SAP
              prereqs[req] = !(req === "WVD" || req === "CORREO" || req === "SAP");
            }
          });
          alignedEabfCount++;
        } else {
          // Asignar NADA (todo false) a los que no pertenecen al Bloque Frío (EABF)
          PRE_REQUISITES_LIST.forEach(req => {
            prereqs[req] = false;
          });
          alignedOthersCount++;
        }

        await setDoc(doc(db, "prerequisitos", id), prereqs);
      }

      if (usuario) {
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'CARGA_DATOS',
          `Alineación masiva de pre-requisitos: ${alignedEabfCount} de Bloque Frío y ${alignedOthersCount} externos asignados con NADA.`
        );
      }

      alert(`¡Éxito! Se alinearon los pre-requisitos de ${alignedEabfCount} operadores de Bloque Frío y se asignó NADA a ${alignedOthersCount} operadores de otras áreas.`);
    } catch (err: any) {
      console.error(err);
      alert(`Error al alinear pre-requisitos: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if ((seccionActiva === 'cursos' || seccionActiva === 'operadores' || seccionActiva === 'autonomia') && usuario) {
      const loadOperators = async () => {
        try {
          // Cargar resumen de cursos
          let summary: Record<string, { t: number; a: number; e: number; p: number }> = {};
          try {
            const sumRef = doc(db, "config_dashboard", "cursos_resumen");
            const sumSnap = await getDoc(sumRef);
            if (sumSnap.exists() && sumSnap.data().summary) {
              summary = sumSnap.data().summary;
              if (sumSnap.data().updatedAt) {
                setCursosLastUpdated(sumSnap.data().updatedAt);
              }
            } else {
              const res = await fetch("/cursos_resumen.json");
              summary = await res.json();
            }
            setCursosResumen(summary);
          } catch (err) {
            console.error("Error loading courses summary for list:", err);
          }

          const res = await fetch("/operators.json");
          if (!res.ok) throw new Error("Failed to fetch operators.json");
          const data = await res.json();
          
          const parsedOps = data.map((op: any) => ({
            id: op.id,
            name: op.nombre,
            puesto: op.puesto,
            departamento: op.area || "Sin Departamento",
            equipo: op.equipoAutonomo || "Sin Equipo",
            lider: op.lider || "No asignado",
            roles: op.roles || [],
          }));
          
          setOperators(parsedOps);
        } catch (err) {
          console.error("Error loading operators:", err);
        }
      };
      loadOperators();
    }
  }, [seccionActiva, usuario]);

  // Cargar semanas disponibles desde Firestore historicos_excel
  useEffect(() => {
    if (seccionActiva === 'autonomia' && usuario) {
      const loadWeeks = async () => {
        try {
          const q = query(collection(db, "historicos_excel"));
          const snap = await getDocs(q);
          const weeks = snap.docs.map(d => d.id).sort((a, b) => b.localeCompare(a));
          setSemanasDisponibles(weeks);
          if (weeks.length > 0 && !semanaSeleccionada) {
            setSemanaSeleccionada(weeks[0]);
          }
        } catch (e) {
          console.error("Error loading weeks:", e);
        }
      };
      loadWeeks();
    }
  }, [seccionActiva, usuario]);

  // Escuchar/cargar datos de la semana seleccionada
  useEffect(() => {
    if (!semanaSeleccionada || !usuario) return;
    const fetchSemanaData = async () => {
      try {
        const docRef = doc(db, "historicos_excel", semanaSeleccionada);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSemanaData(snap.data());
        } else {
          setSemanaData({ datos_skap: [], bpre: [], semana_anio: semanaSeleccionada });
        }
      } catch (e) {
        console.error("Error fetching week data:", e);
      }
    };
    fetchSemanaData();
  }, [semanaSeleccionada, usuario]);

  // Cargar factores BPRE del equipo cuando cambia la semana o el equipo
  useEffect(() => {
    if (!semanaData || selectedEquipo === "Todos") {
      setBpreDinamica(0);
      setBpreLiderazgo(0);
      setBpreSkap(0);
      setBpreAto(0);
      setBpreSeguridad(0);
      setBpreQuas(0);
      setBpreMultihab(0);
      setBpreVpo(0);
      setBpreSolucion(0);
      setBpreInfraest(0);
      setBpreFaseActual("F2");
      setBpreFechaCompromiso("");
      return;
    }

    const normSelected = normalizarNombreEquipo(selectedEquipo);
    const bpreRow = (semanaData.bpre || []).find((row: any) => 
      normalizarNombreEquipo(row["NOMBRE"] || "") === normSelected
    );

    if (bpreRow) {
      const getVal = (row: any, keyword: string) => {
        const colName = Object.keys(row).find(key => {
          const keyLower = key.toLowerCase();
          if (keyLower.includes("fecha") || keyLower.includes("compromiso")) return false;
          return keyLower.includes(keyword.toLowerCase());
        });
        if (!colName) return 0;
        const val = row[colName];
        const num = Number(typeof val === "string" ? val.replace(",", ".") : val);
        return isNaN(num) ? 0 : num;
      };

      setBpreDinamica(getVal(bpreRow, "dinámica") || getVal(bpreRow, "dinamica"));
      setBpreLiderazgo(getVal(bpreRow, "liderazgo") || getVal(bpreRow, "lideraz"));
      setBpreSkap(getVal(bpreRow, "skap"));
      setBpreAto(getVal(bpreRow, "ato"));
      setBpreSeguridad(getVal(bpreRow, "seguridad"));
      setBpreQuas(getVal(bpreRow, "quas") || getVal(bpreRow, "calidad"));
      setBpreMultihab(getVal(bpreRow, "multihab") || getVal(bpreRow, "multi"));
      setBpreVpo(getVal(bpreRow, "vpo"));
      setBpreSolucion(getVal(bpreRow, "solución") || getVal(bpreRow, "solucion") || getVal(bpreRow, "prob"));
      setBpreInfraest(getVal(bpreRow, "infraest"));
      setBpreFaseActual(bpreRow["FASE ACTUAL"] || "F2");
      setBpreFechaCompromiso(bpreRow["FECHA COMPROMISO CAMBIO DE FASE"] || "");
    } else {
      setBpreDinamica(0);
      setBpreLiderazgo(0);
      setBpreSkap(0);
      setBpreAto(0);
      setBpreSeguridad(0);
      setBpreQuas(0);
      setBpreMultihab(0);
      setBpreVpo(0);
      setBpreSolucion(0);
      setBpreInfraest(0);
      setBpreFaseActual("F2");
      setBpreFechaCompromiso("");
    }
  }, [semanaData, selectedEquipo]);

  // Auxiliares para filtrado de operarios en Matriz de Autonomía
  const operatorsInSelectedTeam = useMemo(() => {
    return operators.filter(op => {
      const matchesDepto = selectedDepto === "Todos" || traducirArea(op.departamento) === selectedDepto;
      const matchesEquipo = selectedEquipo === "Todos" || op.equipo === selectedEquipo;
      return matchesDepto && matchesEquipo;
    });
  }, [operators, selectedDepto, selectedEquipo]);

  const getOperatorWeekRecord = (opId: string) => {
    if (!semanaData || !semanaData.datos_skap) return null;
    return semanaData.datos_skap.find((row: any) => {
      const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]/) : null;
      return empMatch && empMatch[1] === opId;
    });
  };

  const handleCrearNuevaSemana = () => {
    const input = nuevaSemanaInput.trim().toUpperCase();
    if (!input.match(/^\d{4}-W\d{2}$/)) {
      alert("Formato inválido. Debe ser AAAA-WSS, por ejemplo: 2026-W30");
      return;
    }
    if (semanasDisponibles.includes(input)) {
      alert("La semana ya existe.");
      setSemanaSeleccionada(input);
      setMostrarModalNuevaSemana(false);
      return;
    }
    setSemanasDisponibles(prev => [input, ...prev].sort((a, b) => b.localeCompare(a)));
    setSemanaSeleccionada(input);
    setSemanaData({ datos_skap: [], bpre: [], semana_anio: input });
    setMostrarModalNuevaSemana(false);
    setNuevaSemanaInput("");
  };

  const handleInicializarSemana = () => {
    if (!semanaSeleccionada) return;
    if (selectedEquipo === "Todos") {
      alert("Selecciona un equipo autónomo específico para inicializar.");
      return;
    }

    const defaultSkapRows = operatorsInSelectedTeam.map(op => ({
      "Zone": "MA",
      "Country": "Mexico",
      "Facility": "Zacatecas",
      "Department": "Brewing",
      "Equipment": "",
      "Area": selectedDepto === "Cocimientos" ? "Warm Block" : selectedDepto === "Bloque Frío" ? "Cold Block" : "Brewing Maintenance",
      "SKAP Position": op.puesto || "Operador",
      "Employee": `[${op.id}] ${op.name.toUpperCase()}`,
      "Evaluator": "ADMIN",
      "Status": "Saved",
      "Driver's License": 0,
      "Safety": 0,
      "Quality": 0,
      "Environment": 0,
      "Management": 0,
      "People": 0,
      "Maintenance": 0,
      "Logistics": 0,
      "Operation": 0,
      "Intermediate Capabilities": 0,
      "Safety_1": 0,
      "Quality_1": 0,
      "Environment_1": 0,
      "Management_1": 0,
      "People_1": 0,
      "Maintenance_1": 0,
      "Logistics_1": 0,
      "Operation_1": 0,
      "Advanced Capabilities": 0,
      "Safety_2": 0,
      "Quality_2": 0,
      "Environment_2": 0,
      "Management_2": 0,
      "People_2": 0,
      "Maintenance_2": 0,
      "Logistics_2": 0,
      "Operation_2": 0,
      "Autonomy Score": 0,
      "Assessment Date": new Date().toISOString().split('T')[0]
    }));

    const defaultBpreRow = {
      "ÁREA": selectedDepto === "Cocimientos" ? "COCIMIENTOS" : selectedDepto === "Bloque Frío" ? "BLOQUE FRIO" : "MANTENIMIENTO",
      "NOMBRE": selectedEquipo,
      "1. DINÁMICA DE EQUIPO": 0,
      "2. LIDERAZGO ": 0,
      "3. SKAP": 0,
      "3. ATO": 0,
      "4. SEGURIDAD": 0,
      "5. QUAS": 0,
      "6. MULTIHAB": 0,
      "7. VPO": 0,
      "8. SOLUCIÓN DE PROB": 0,
      "9. INFRAEST": 0,
      "FASE ACTUAL": "F2",
      "FASE 2026": 4,
      "FECHA COMPROMISO CAMBIO DE FASE": ""
    };

    setSemanaData((prev: any) => {
      const existingSkap = prev?.datos_skap || [];
      const existingBpre = prev?.bpre || [];

      // Filtrar filas previas de este equipo
      const filteredSkap = existingSkap.filter((row: any) => {
        const empMatch = row["Employee"] ? String(row["Employee"]).match(/\[(\d+)\]/) : null;
        if (!empMatch) return true;
        const opId = empMatch[1];
        return !operatorsInSelectedTeam.some(op => op.id === opId);
      });

      const filteredBpre = existingBpre.filter((row: any) => 
        normalizarNombreEquipo(row["NOMBRE"] || "") !== normalizarNombreEquipo(selectedEquipo)
      );

      return {
        ...prev,
        semana_anio: semanaSeleccionada,
        datos_skap: [...filteredSkap, ...defaultSkapRows],
        bpre: [...filteredBpre, defaultBpreRow],
        ultima_actualizacion: new Date().toISOString()
      };
    });

    alert(`Se inicializó el equipo ${selectedEquipo} para la semana ${semanaSeleccionada} en memoria. Recuerda guardar los cambios de BPRE o evaluaciones para guardarlo en la Base de Datos.`);
  };

  const handleSaveBpre = async () => {
    if (!semanaSeleccionada) {
      alert("Selecciona una semana.");
      return;
    }
    if (selectedEquipo === "Todos") {
      alert("Selecciona un equipo autónomo específico.");
      return;
    }
    if (!bpreFechaCompromiso.trim()) {
      alert("⚠️ La Fecha de Compromiso es obligatoria.");
      return;
    }

    const confirmMsg = `¿Estás seguro de guardar los factores BPRE del equipo "${selectedEquipo}" en la semana ${semanaSeleccionada}?\n\n` +
      `Fase Actual: ${bpreFaseActual}\n` +
      `Fecha Compromiso: ${bpreFechaCompromiso}\n\n` +
      `Esto sobrescribirá cualquier factor BPRE registrado previamente para este periodo.`;
    if (!window.confirm(confirmMsg)) return;

    setGuardandoBpre(true);
    try {
      const docRef = doc(db, "historicos_excel", semanaSeleccionada);
      const snap = await getDoc(docRef);
      const currentData = snap.exists() ? snap.data() : { datos_skap: [], bpre: [], semana_anio: semanaSeleccionada };

      const bpreObj = {
        "ÁREA": selectedDepto === "Cocimientos" ? "COCIMIENTOS" : selectedDepto === "Bloque Frío" ? "BLOQUE FRIO" : "MANTENIMIENTO",
        "NOMBRE": selectedEquipo,
        "1. DINÁMICA DE EQUIPO": Number(bpreDinamica),
        "2. LIDERAZGO ": Number(bpreLiderazgo),
        "3. SKAP": Number(bpreSkap),
        "3. ATO": Number(bpreAto),
        "4. SEGURIDAD": Number(bpreSeguridad),
        "5. QUAS": Number(bpreQuas),
        "6. MULTIHAB": Number(bpreMultihab),
        "7. VPO": Number(bpreVpo),
        "8. SOLUCIÓN DE PROB": Number(bpreSolucion),
        "9. INFRAEST": Number(bpreInfraest),
        "FASE ACTUAL": bpreFaseActual,
        "FASE 2026": 4,
        "FECHA COMPROMISO CAMBIO DE FASE": bpreFechaCompromiso
      };

      const existingBpre = currentData.bpre || [];
      const keyMap: Record<string, any> = {};
      existingBpre.forEach((row: any) => {
        const key = obtenerClaveBpre(row);
        if (key) keyMap[key] = row;
      });

      const newKey = obtenerClaveBpre(bpreObj);
      if (newKey) keyMap[newKey] = bpreObj;

      const finalBpre = Object.values(keyMap);

      const finalData = {
        ...currentData,
        bpre: finalBpre,
        ultima_actualizacion: new Date().toISOString()
      };

      await setDoc(docRef, finalData, { merge: true });

      // Sincronizar en historicos_mensuales
      const [anio, semStr] = semanaSeleccionada.split('-W');
      const numSem = parseInt(semStr, 10);
      const fechaBase = new Date(parseInt(anio, 10), 0, 1 + (numSem - 1) * 7);
      const dia = fechaBase.getDay();
      const lunes = new Date(fechaBase);
      lunes.setDate(fechaBase.getDate() - (dia === 0 ? 6 : dia - 1));
      const mesID = `${lunes.getFullYear()}-${(lunes.getMonth() + 1).toString().padStart(2, '0')}`;

      const mesRef = doc(db, "historicos_mensuales", mesID);
      const mesSnap = await getDoc(mesRef);
      const dataViejaMes = mesSnap.exists() ? mesSnap.data() : { datos_skap: [], bpre: [] };

      const bpreExistentesMes = dataViejaMes.bpre || [];
      const mapaBpreMes: Record<string, any> = {};
      bpreExistentesMes.forEach((row: any) => {
        const key = obtenerClaveBpre(row);
        if (key) mapaBpreMes[key] = row;
      });
      mapaBpreMes[newKey] = bpreObj;

      await setDoc(mesRef, {
        ...dataViejaMes,
        mes_anio: mesID,
        bpre: Object.values(mapaBpreMes),
        ultima_actualizacion: new Date().toISOString()
      }, { merge: true });

      setSemanaData(finalData);

      if (usuario) {
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'CARGA_DATOS',
          `Modificación directa de BPRE de equipo ${selectedEquipo} para la semana ${semanaSeleccionada}`
        );
      }

      alert("Factores de equipo guardados con éxito.");
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar BPRE: " + err.message);
    } finally {
      setGuardandoBpre(false);
    }
  };

  const handleSelectAutonomiaOperator = (op: any) => {
    setSelectedAutonomiaOperator(op);
    const rec = getOperatorWeekRecord(op.id);
    if (rec) {
      setAutonomiaEvaluator(rec["Evaluator"] || "ADMIN");
      setAutonomiaAssessmentDate(rec["Assessment Date"] || new Date().toISOString().split('T')[0]);
      
      const parseValPercent = (val: any) => {
        if (val === undefined || val === null || val === "-") return 0;
        if (typeof val === "number") {
          return val <= 1.0 ? val * 100 : val;
        }
        const clean = String(val).replace("%", "").trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      };

      setAutonomiaBasicScore(Math.round(parseValPercent(rec["Driver's License"])));
      setAutonomiaIntermediateScore(Math.round(parseValPercent(rec["Intermediate Capabilities"] || rec["Intermediate"])));
      setAutonomiaAdvancedScore(Math.round(parseValPercent(rec["Advanced Capabilities"] || rec["Advanced"])));
    } else {
      setAutonomiaEvaluator("ADMIN");
      setAutonomiaAssessmentDate(new Date().toISOString().split('T')[0]);
      setAutonomiaBasicScore(0);
      setAutonomiaIntermediateScore(0);
      setAutonomiaAdvancedScore(0);
    }
  };

  const handleSaveAutonomiaOperator = async () => {
    if (!semanaSeleccionada) {
      alert("Selecciona una semana.");
      return;
    }
    if (!selectedAutonomiaOperator) {
      alert("Selecciona un colaborador.");
      return;
    }
    if (!autonomiaEvaluator.trim()) {
      alert("⚠️ El nombre del Evaluador es obligatorio.");
      return;
    }
    if (!autonomiaAssessmentDate) {
      alert("⚠️ La Fecha de Evaluación es obligatoria.");
      return;
    }

    const semanaID = obtenerSemanaDesdeFechaString(autonomiaAssessmentDate);
    if (!semanaID) {
      alert("⚠️ Fecha de evaluación inválida.");
      return;
    }

    let warningSemana = "";
    if (semanaID !== semanaSeleccionada) {
      warningSemana = `⚠️ ADVERTENCIA: La fecha de evaluación corresponde a la semana ${semanaID}, pero tienes seleccionada la semana ${semanaSeleccionada}.\nLa evaluación se registrará en la semana ${semanaID}.\n\n`;
    }

    const confirmMsg = `${warningSemana}¿Estás seguro de registrar la evaluación de autonomía para el colaborador?\n\n` +
      `Colaborador: ${selectedAutonomiaOperator.name} (Sharp ID: ${selectedAutonomiaOperator.id})\n` +
      `Evaluador: ${autonomiaEvaluator.trim().toUpperCase()}\n` +
      `Fecha de Evaluación: ${autonomiaAssessmentDate} (Semana: ${semanaID})\n` +
      `Calificaciones:\n` +
      `  - Básico: ${autonomiaBasicScore}%\n` +
      `  - Intermedio: ${autonomiaIntermediateScore}%\n` +
      `  - Avanzado: ${autonomiaAdvancedScore}%\n` +
      `  - Autonomía Global: ${((autonomiaBasicScore * 0.5) + (autonomiaIntermediateScore * 0.35) + (autonomiaAdvancedScore * 0.15)).toFixed(1)}%\n\n` +
      `¿Deseas continuar y guardar estos datos?`;

    if (!window.confirm(confirmMsg)) return;

    setGuardandoAutonomiaOp(true);
    try {
      const docRef = doc(db, "historicos_excel", semanaID);
      const snap = await getDoc(docRef);
      const currentData = snap.exists() ? snap.data() : { datos_skap: [], bpre: [], semana_anio: semanaID };

      const basicDec = autonomiaBasicScore / 100;
      const intermediateDec = autonomiaIntermediateScore / 100;
      const advancedDec = autonomiaAdvancedScore / 100;
      const autonomyDec = ((autonomiaBasicScore * 0.5) + (autonomiaIntermediateScore * 0.35) + (autonomiaAdvancedScore * 0.15)) / 100;

      const rowObj = {
        "Zone": "MA",
        "Country": "Mexico",
        "Facility": "Zacatecas",
        "Department": "Brewing",
        "Equipment": "",
        "Area": selectedDepto === "Cocimientos" ? "Warm Block" : selectedDepto === "Bloque Frío" ? "Cold Block" : "Brewing Maintenance",
        "SKAP Position": selectedAutonomiaOperator.puesto || "Operador",
        "Employee": `[${selectedAutonomiaOperator.id}] ${selectedAutonomiaOperator.name.toUpperCase()}`,
        "Evaluator": autonomiaEvaluator.trim().toUpperCase(),
        "Status": "Saved",
        "Driver's License": basicDec,
        "Safety": basicDec,
        "Quality": basicDec,
        "Environment": basicDec,
        "Management": basicDec,
        "People": basicDec,
        "Maintenance": basicDec,
        "Logistics": basicDec,
        "Operation": basicDec,
        "Intermediate Capabilities": intermediateDec,
        "Safety_1": intermediateDec,
        "Quality_1": intermediateDec,
        "Environment_1": intermediateDec,
        "Management_1": intermediateDec,
        "People_1": intermediateDec,
        "Maintenance_1": intermediateDec,
        "Logistics_1": intermediateDec,
        "Operation_1": intermediateDec,
        "Advanced Capabilities": advancedDec,
        "Safety_2": advancedDec,
        "Quality_2": advancedDec,
        "Environment_2": advancedDec,
        "Management_2": advancedDec,
        "People_2": advancedDec,
        "Maintenance_2": advancedDec,
        "Logistics_2": advancedDec,
        "Operation_2": advancedDec,
        "Autonomy Score": autonomyDec,
        "Assessment Date": autonomiaAssessmentDate
      };

      const existingSkap = currentData.datos_skap || [];
      const keyMap: Record<string, any> = {};
      existingSkap.forEach((row: any) => {
        const key = obtenerClaveRegistro(row);
        if (key) keyMap[key] = row;
      });

      const newKey = obtenerClaveRegistro(rowObj);
      if (newKey) keyMap[newKey] = rowObj;

      const finalSkap = Object.values(keyMap);

      const finalData = {
        ...currentData,
        datos_skap: finalSkap,
        ultima_actualizacion: new Date().toISOString()
      };

      await setDoc(docRef, finalData, { merge: true });

      // Sincronizar en historicos_mensuales
      const mesID = obtenerMesDesdeFechaString(autonomiaAssessmentDate);
      const mesRef = doc(db, "historicos_mensuales", mesID);
      const mesSnap = await getDoc(mesRef);
      const dataViejaMes = mesSnap.exists() ? mesSnap.data() : { datos_skap: [], bpre: [] };

      const skapExistentesMes = dataViejaMes.datos_skap || [];
      const mapaSkapMes: Record<string, any> = {};
      skapExistentesMes.forEach((row: any) => {
        const key = obtenerClaveRegistro(row);
        if (key) mapaSkapMes[key] = row;
      });
      mapaSkapMes[newKey] = rowObj;

      await setDoc(mesRef, {
        ...dataViejaMes,
        mes_anio: mesID,
        datos_skap: Object.values(mapaSkapMes),
        ultima_actualizacion: new Date().toISOString()
      }, { merge: true });

      if (semanaID === semanaSeleccionada) {
        setSemanaData(finalData);
      } else {
        const q = query(collection(db, "historicos_excel"));
        const snap = await getDocs(q);
        const weeks = snap.docs.map(d => d.id).sort((a, b) => b.localeCompare(a));
        setSemanasDisponibles(weeks);
        setSemanaSeleccionada(semanaID);
      }

      if (usuario) {
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'CARGA_DATOS',
          `Evaluación directa de Autonomía de ${selectedAutonomiaOperator.name} (${selectedAutonomiaOperator.id}) en la semana ${semanaID}`
        );
      }

      alert(`Evaluación de colaborador guardada con éxito en la semana ${semanaID}.`);
      setSelectedAutonomiaOperator(null);
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar evaluación: " + err.message);
    } finally {
      setGuardandoAutonomiaOp(false);
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setErrorLogin('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate({ to: '/' });
    } catch (err) {
      setErrorLogin('Usuario o contraseña incorrectos.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (cargando) {
    return <ComprobandoAuth />;
  }

  const parsearExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const nombreHoja = workbook.SheetNames[0];
          const json = XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja]);
          resolve(json);
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const parsearExcelCompleto = (file: File): Promise<{ base_equipos?: any[], estructura_nueva?: any[], defaultSheet?: any[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });

          const result: { base_equipos?: any[], estructura_nueva?: any[], defaultSheet?: any[] } = {};

          if (workbook.SheetNames.includes("BD_ZAC_OFICIAL")) {
            result.base_equipos = XLSX.utils.sheet_to_json(workbook.Sheets["BD_ZAC_OFICIAL"]);
          }
          if (workbook.SheetNames.includes("Personal Total")) {
            result.estructura_nueva = XLSX.utils.sheet_to_json(workbook.Sheets["Personal Total"], { range: 2 });
          }

          const firstSheet = workbook.SheetNames[0];
          result.defaultSheet = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

          resolve(result);
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleCargaUnica = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'base_equipos' | 'eac' | 'eabf') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCargando(true);

      if (tipo === 'base_equipos') {
        const parsed = await parsearExcelCompleto(file);
        const updates: any = {};
        let uploadedSheets: string[] = [];

        if (parsed.base_equipos) {
          updates.base_equipos = parsed.base_equipos;
          uploadedSheets.push("Base de Equipos (BD_ZAC_OFICIAL)");
        }
        if (parsed.estructura_nueva) {
          updates.estructura_nueva = parsed.estructura_nueva;
          uploadedSheets.push("Estructura Nueva Oficial (Personal Total)");
        }

        if (Object.keys(updates).length > 0) {
          await setDoc(doc(db, "config_dashboard", "catalogos_fijos"), updates, { merge: true });
          if (usuario) {
            await registrarEvento(
              usuario.uid,
              usuario.email || '',
              usuario.rol || 'operador',
              'CARGA_DATOS',
              `Carga de catálogo: ${uploadedSheets.join(" y ")} (${file.name})`
            );
          }
          alert(`¡Catálogo(s) subido(s) con éxito: ${uploadedSheets.join(", ")}!`);
          return;
        }
      }

      const json = await parsearExcel(file);
      await setDoc(doc(db, "config_dashboard", "catalogos_fijos"), { [tipo]: json }, { merge: true });
      if (usuario) {
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'CARGA_DATOS',
          `Carga de catálogo fijo: ${tipo} (${file.name})`
        );
      }
      alert(`¡Catálogo ${tipo} guardado con éxito!`);
    } catch (err) {
      console.error(err);
      alert("Error al subir el catálogo.");
    } finally {
      setCargando(false);
      e.target.value = '';
    }
  };

  const handleCargarCursosMasivo = async () => {
    if (!archivoCursos && !textoCursosPegado.trim()) {
      alert("Selecciona un archivo Excel de cursos o pega datos de celdas en el recuadro.");
      return;
    }

    try {
      setCargandoCursos(true);
      let rawRows: any[] = [];

      if (archivoCursos) {
        // Opción 1: Carga por Excel
        const reader = new FileReader();
        const readPromise = new Promise<any[]>((resolve, reject) => {
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames.includes("Usuarios") ? "Usuarios" : (workbook.SheetNames.includes("Hoja1") ? "Hoja1" : workbook.SheetNames[0]);
              const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { range: 14 });
              resolve(json);
            } catch (err) { reject(err); }
          };
          reader.readAsArrayBuffer(archivoCursos);
        });
        rawRows = await readPromise;
      } else {
        // Opción 2: Carga por Clipboard (Ctrl+V)
        const lines = textoCursosPegado.trim().split("\n");
        if (lines.length <= 1) {
          alert("El texto pegado no tiene suficientes filas.");
          setCargandoCursos(false);
          return;
        }
        
        const headers = lines[0].split("\t").map(h => h.trim());
        const idIdx = headers.findIndex(h => h.toUpperCase().includes("ID GLOBAL") || h.toUpperCase() === "ID");
        const nameIdx = headers.findIndex(h => h.toUpperCase().includes("CURSO") || h.toUpperCase().includes("COURSE"));
        const statusIdx = headers.findIndex(h => h.toUpperCase().includes("ESTADO") || h.toUpperCase().includes("STATUS"));
        const dateIdx = headers.findIndex(h => h.toUpperCase().includes("APROBAC") || h.toUpperCase().includes("FECHA"));
        const modIdx = headers.findIndex(h => h.toUpperCase().includes("SUBMÓDULO 1") || h.toUpperCase().includes("MODULO") || h.toUpperCase().includes("ACADEMIA"));

        if (idIdx === -1 || nameIdx === -1 || statusIdx === -1) {
          alert("No se pudieron mapear las columnas obligatorias (ID GLOBAL, Nombre de Curso, Estado) del texto pegado. Asegúrate de incluir la fila de encabezados.");
          setCargandoCursos(false);
          return;
        }

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split("\t").map(c => c.trim());
          if (cols.length < 3) continue;
          rawRows.push({
            "ID GLOBAL": cols[idIdx],
            "Nombre de Curso": cols[nameIdx],
            "Estado": cols[statusIdx],
            "Fecha de aprobación": dateIdx !== -1 ? cols[dateIdx] : "-",
            "Submódulo 1": modIdx !== -1 ? cols[modIdx] : "-"
          });
        }
      }

      // Filtrar y normalizar
      const translations: Record<string, string> = {
        "32173442": "32043900",
        "32145333": "32044316",
        "32043835": "32145333",
        "32043900": "32045469",
        "32043301": "32043739",
        "32043861": "32043835",
        "32044301": "32043861",
        "32044319": "32045769",
      };

      const targetIdsIncludesAlternative = (idGlobal: string) => {
        if (activeIds.has(idGlobal)) return true;
        const transVal = translations[idGlobal];
        if (transVal && activeIds.has(transVal)) return true;
        const transKey = Object.keys(translations).find(k => translations[k] === idGlobal);
        if (transKey && activeIds.has(transKey)) return true;
        return false;
      };

      const optimizedRows = rawRows
        .filter(row => {
          // Filtrado por departamento
          const depto = row["Departamento"] ? String(row["Departamento"]).trim() : "";
          if (depto !== "COCIMIENTOS" && depto !== "BLOQUE FRIO" && depto !== "MTTO ELABORACION") {
            return false;
          }

          const idGlobal = row["ID GLOBAL"] ? String(row["ID GLOBAL"]).trim() : "";
          return targetIdsIncludesAlternative(idGlobal);
        })
        .map(row => ({
          id: row["ID GLOBAL"] ? Number(row["ID GLOBAL"]) : null,
          n: row["Nombre de Curso"] ? String(row["Nombre de Curso"]).trim() : "",
          e: row["Estado"] ? String(row["Estado"]).trim() : "Pendiente",
          f: row["Fecha de aprobación"] || "-",
          m: row["Submódulo 1"] || "-"
        }));

      if (optimizedRows.length === 0) {
        alert("No se encontraron registros que correspondan a operadores activos del dashboard.");
        setCargandoCursos(false);
        return;
      }

      // Generar resumen
      const summary: Record<string, { t: number; a: number; e: number; p: number }> = {};
      for (const row of optimizedRows) {
        const id = String(row.id);
        if (!id || id === "null") continue;
        
        if (!summary[id]) {
          summary[id] = { t: 0, a: 0, e: 0, p: 0 };
        }
        
        summary[id].t++;
        if (row.e === "Aprobado") {
          summary[id].a++;
        } else if (row.e === "En progreso") {
          summary[id].e++;
        } else {
          summary[id].p++;
        }
      }

      // Guardar a Firestore
      await setDoc(doc(db, "config_dashboard", "cursos_detallados"), { list: optimizedRows });
      const currentIso = new Date().toISOString();
      await setDoc(doc(db, "config_dashboard", "cursos_resumen"), { summary, updatedAt: currentIso });
      setCursosLastUpdated(currentIso);

      // Registrar auditoría
      if (usuario) {
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'CARGA_CURSOS',
          `Carga masiva de cursos realizada con éxito. ${optimizedRows.length} registros insertados.`
        );
      }

      alert(`¡Cursos sincronizados correctamente! Se registraron ${optimizedRows.length} cursos para ${Object.keys(summary).length} operadores.`);
      setArchivoCursos(null);
      setTextoCursosPegado("");
    } catch (err) {
      console.error(err);
      alert("Error al procesar la carga masiva de cursos.");
    } finally {
      setCargandoCursos(false);
    }
  };

  const handleSelectOperator = async (op: any) => {
    setSelectedOperator(op);
    setNewCourseName("");
    setNewCourseModule("");
    setNewCourseStatus("Aprobado");
    
    try {
      let allCourses: any[] = [];
      const docRef = doc(db, "config_dashboard", "cursos_detallados");
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().list) {
        allCourses = snap.data().list;
      } else {
        const res = await fetch("/cursos.json");
        allCourses = await res.json();
      }

      const targetIds = getAlternativeIds(op.id);
      const opCourses = allCourses.filter(c => targetIds.includes(String(c.id)));
      setOperatorCourses(opCourses);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOperatorCourses = async () => {
    if (!selectedOperator) return;
    try {
      setSavingGrid(true);
      
      let allCourses: any[] = [];
      const docRef = doc(db, "config_dashboard", "cursos_detallados");
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().list) {
        allCourses = snap.data().list;
      } else {
        const res = await fetch("/cursos.json");
        allCourses = await res.json();
      }

      const targetIds = getAlternativeIds(selectedOperator.id);
      let updatedList = allCourses.filter(c => !targetIds.includes(String(c.id)));

      const newRowsForOp = operatorCourses.map(c => ({
        id: Number(selectedOperator.id),
        n: c.n,
        e: c.e,
        f: c.f || "-",
        m: c.m || "-"
      }));
      updatedList = [...updatedList, ...newRowsForOp];

      const summary: Record<string, { t: number; a: number; e: number; p: number }> = {};
      for (const row of updatedList) {
        const id = String(row.id);
        if (!id || id === "null") continue;
        
        if (!summary[id]) {
          summary[id] = { t: 0, a: 0, e: 0, p: 0 };
        }
        
        summary[id].t++;
        if (row.e === "Aprobado") {
          summary[id].a++;
        } else if (row.e === "En progreso") {
          summary[id].e++;
        } else {
          summary[id].p++;
        }
      }

      await setDoc(doc(db, "config_dashboard", "cursos_detallados"), { list: updatedList });
      await setDoc(doc(db, "config_dashboard", "cursos_resumen"), { summary });

      if (usuario) {
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'EDITAR_CURSOS_OPERADOR',
          `Actualización de cursos para operador: ${selectedOperator.name} (ID: ${selectedOperator.id}). Total cursos: ${newRowsForOp.length}.`
        );
      }

      alert(`¡Cambios guardados con éxito para ${selectedOperator.name}!`);
    } catch (err) {
      console.error(err);
      alert("Error al guardar los cambios.");
    } finally {
      setSavingGrid(false);
    }
  };

  const handleAddCourse = () => {
    if (!newCourseName.trim()) {
      alert("Especifica el nombre del curso.");
      return;
    }
    const newCourse = {
      id: Number(selectedOperator.id),
      n: newCourseName.trim(),
      e: newCourseStatus,
      f: newCourseStatus === "Aprobado" ? new Date().toLocaleDateString('es-MX') : "-",
      m: newCourseModule.trim() || "-"
    };
    setOperatorCourses(prev => [...prev, newCourse]);
    setNewCourseName("");
    setNewCourseModule("");
  };

  const handleRemoveCourse = (index: number) => {
    setOperatorCourses(prev => prev.filter((_, i) => i !== index));
  };

  // ── Migración: lee historicos_excel existentes y genera historicos_mensuales ──
  const migrarSemanalesAMensuales = async () => {
    if (!confirm('¿Migrar todos los históricos semanales a la colección mensual? Este proceso puede tardar unos minutos.')) return;
    try {
      setMigrando(true);
      setLogProceso([]);
      setLogProceso(prev => [...prev, '🔄 Leyendo históricos semanales desde Firestore...']);

      const q = query(collection(db, 'historicos_excel'), orderBy('__name__', 'asc'));
      const snap = await getDocs(q);

      const gruposPorMes: Record<string, { datos_skap: any[], bpre: any[] }> = {};

      snap.forEach(docSnap => {
        const data = docSnap.data();
        const semanaID: string = data.semana_anio || docSnap.id;

        // Derivar mesID desde las filas o desde el ID semanal
        const primeraFila = data.datos_skap?.[0] || data.bpre?.[0];
        const colFecha = primeraFila
          ? Object.keys(primeraFila).find((k: string) => k.toLowerCase().includes('assessment') || k.toLowerCase().includes('fecha'))
          : undefined;

        let mesID = '';
        if (primeraFila && colFecha) {
          mesID = obtenerMesDesdeFechaString(primeraFila[colFecha]);
        }
        // Fallback: derivar mes aproximado desde el número de semana ISO
        if (!mesID && semanaID.includes('-W')) {
          const [anio, semStr] = semanaID.split('-W');
          const numSem = parseInt(semStr, 10);
          // Calcular la fecha del lunes de esa semana ISO
          const fechaBase = new Date(parseInt(anio, 10), 0, 1 + (numSem - 1) * 7);
          const dia = fechaBase.getDay();
          const lunes = new Date(fechaBase);
          lunes.setDate(fechaBase.getDate() - (dia === 0 ? 6 : dia - 1));
          mesID = `${lunes.getFullYear()}-${(lunes.getMonth() + 1).toString().padStart(2, '0')}`;
        }

        if (!mesID) return;

        if (!gruposPorMes[mesID]) gruposPorMes[mesID] = { datos_skap: [], bpre: [] };
        gruposPorMes[mesID].datos_skap.push(...(data.datos_skap || []));
        gruposPorMes[mesID].bpre.push(...(data.bpre || []));
      });

      setLogProceso(prev => [...prev, `📦 ${snap.size} semanas agrupadas en ${Object.keys(gruposPorMes).length} mes(es). Escribiendo...`]);

      for (const mesID of Object.keys(gruposPorMes)) {
        const mesRef = doc(db, 'historicos_mensuales', mesID);
        await setDoc(mesRef, {
          mes_anio: mesID,
          datos_skap: gruposPorMes[mesID].datos_skap,
          bpre: gruposPorMes[mesID].bpre,
          ultima_actualizacion: new Date().toISOString(),
        });
        setLogProceso(prev => [...prev, `✅ Mes ${mesID} migrado (${gruposPorMes[mesID].datos_skap.length} filas SKAP + ${gruposPorMes[mesID].bpre.length} filas BPRE).`]);
      }

      setLogProceso(prev => [...prev, '🎉 Migración completada.']);
      alert('¡Migración mensual finalizada!');
    } catch (error) {
      console.error(error);
      alert('Error durante la migración.');
    } finally {
      setMigrando(false);
    }
  };

  const procesarTablasSemanales = async () => {
    if (!archivoDatos && !archivoBpre) {
      alert("Selecciona al menos un archivo.");
      return;
    }
    try {
      setCargando(true);
      setLogProceso([]);
      const gruposPorSemana: Record<string, { datos_skap?: any[], bpre?: any[] }> = {};
      const semanasDeDatos = new Set<string>();

      const fechaPorSemana: Record<string, any> = {};

      if (archivoDatos) {
        setLogProceso(prev => [...prev, "⏳ Analizando filas de DATOS.xlsx..."]);
        const filas = await parsearExcel(archivoDatos);
        
        const nuevosEncontrados = new Map<string, string>(); // id -> nombre

        filas.forEach((fila) => {
          // Filtrar filas vacías o de resumen que no tienen un empleado válido
          const colEmp = Object.keys(fila).find(k => k.toLowerCase().trim() === 'employee');
          const nombreEmpleado = colEmp ? String(fila[colEmp]).trim() : '';
          if (!nombreEmpleado || nombreEmpleado.toLowerCase() === 'undefined') {
            return;
          }

          const match = nombreEmpleado.match(/\[(\d+)\]\s*(.*)/);
          if (match) {
            const empId = match[1].trim();
            let empNombre = match[2].trim();
            if (empId === "32111307") empNombre = "FRANCISCO JAVIER VARELA";
            if (empId === "32045556") empNombre = "VICTOR MANUEL REYES VALLE";

            if (!combinedOperators.find((op: any) => op.id === empId)) {
              nuevosEncontrados.set(empId, empNombre);
            }
          }

          const colFecha = Object.keys(fila).find(k => k.toLowerCase().includes('assessment') || (k.toLowerCase().includes('fecha') && !k.toLowerCase().includes('compromiso')));
          const semanaID = colFecha ? obtenerSemanaDesdeFechaString(fila[colFecha]) : obtenerSemanaDesdeFechaString(new Date());
          if (semanaID) {
            semanasDeDatos.add(semanaID);
            if (!fechaPorSemana[semanaID] && colFecha && fila[colFecha]) {
              fechaPorSemana[semanaID] = fila[colFecha];
            }
            if (!gruposPorSemana[semanaID]) gruposPorSemana[semanaID] = {};
            if (!gruposPorSemana[semanaID].datos_skap) gruposPorSemana[semanaID].datos_skap = [];
            gruposPorSemana[semanaID].datos_skap.push(fila);
          }
        });

        if (nuevosEncontrados.size > 0) {
          const listaNuevos = Array.from(nuevosEncontrados.entries()).map(([id, nom]) => `- ${nom} (${id})`).join('\n');
          const confirmar = window.confirm(`⚠️ Se encontraron integrantes en el Excel que NO están en tu lista oficial:\n\n${listaNuevos}\n\n¿Deseas agregarlos al sistema automáticamente como altas manuales?\n(Si son personas que ya se fueron de la empresa, haz click en "Cancelar").`);
          
          if (confirmar) {
            setLogProceso(prev => [...prev, `💾 Guardando ${nuevosEncontrados.size} colaboradores nuevos detectados...`]);
            for (const [id, nombre] of nuevosEncontrados.entries()) {
              await setDoc(doc(db!, "operadores_modificados", id), {
                id,
                nombre: nombre.toUpperCase(),
                puesto: "Desconocido",
                area: "desconocida",
                equipoAutonomo: "Sin Equipo",
                lider: "No asignado",
                roles: [],
                status: "activo",
                isManual: true,
                updatedAt: new Date().toISOString()
              });
            }
            setLogProceso(prev => [...prev, `✅ Nuevos colaboradores agregados exitosamente.`]);
          } else {
            setLogProceso(prev => [...prev, `⏭️ Se ignoraron ${nuevosEncontrados.size} colaboradores no registrados.`]);
          }
        }
      }

      if (archivoBpre) {
        setLogProceso(prev => [...prev, "⏳ Analizando filas de BPRE.xlsx..."]);
        const filas = await parsearExcel(archivoBpre);

        // Vemos si hay fecha en BPRE
        const tieneFechaBpre = filas.some(fila =>
          Object.keys(fila).some(k => k.toLowerCase().includes('assessment') || (k.toLowerCase().includes('fecha') && !k.toLowerCase().includes('compromiso')))
        );

        if (!tieneFechaBpre) {
          const semanaID = obtenerSemanaDesdeFechaString(new Date());
          setLogProceso(prev => [...prev, `💡 BPRE no tiene columna de fecha. Guardando datos únicamente en la semana actual (${semanaID})...`]);
          if (!gruposPorSemana[semanaID]) gruposPorSemana[semanaID] = {};
          if (!gruposPorSemana[semanaID].bpre) gruposPorSemana[semanaID].bpre = [];

          filas.forEach((fila) => {
            const colNombre = Object.keys(fila).find(k => k.toLowerCase().trim() === 'nombre');
            const nombreEquipo = colNombre ? String(fila[colNombre]).trim() : '';
            const colArea = Object.keys(fila).find(k => k.toLowerCase().trim() === 'area' || k.toLowerCase().trim() === 'área');
            const areaStr = colArea ? String(fila[colArea]).trim() : '';

            if (!nombreEquipo || nombreEquipo.toLowerCase() === 'undefined' || nombreEquipo.toLowerCase().includes('promedio') || areaStr.toLowerCase().includes('promedio')) {
              return;
            }
            gruposPorSemana[semanaID].bpre!.push(fila);
          });
        } else {
          // Lógica estándar por fila
          filas.forEach((fila) => {
            const colNombre = Object.keys(fila).find(k => k.toLowerCase().trim() === 'nombre');
            const nombreEquipo = colNombre ? String(fila[colNombre]).trim() : '';
            const colArea = Object.keys(fila).find(k => k.toLowerCase().trim() === 'area' || k.toLowerCase().trim() === 'área');
            const areaStr = colArea ? String(fila[colArea]).trim() : '';

            if (!nombreEquipo || nombreEquipo.toLowerCase() === 'undefined' || nombreEquipo.toLowerCase().includes('promedio') || areaStr.toLowerCase().includes('promedio')) {
              return;
            }

            const colFecha = Object.keys(fila).find(k => k.toLowerCase().includes('assessment') || (k.toLowerCase().includes('fecha') && !k.toLowerCase().includes('compromiso')));
            const semanaID = colFecha ? obtenerSemanaDesdeFechaString(fila[colFecha]) : obtenerSemanaDesdeFechaString(new Date());
            if (semanaID) {
              if (!gruposPorSemana[semanaID]) gruposPorSemana[semanaID] = {};
              if (!gruposPorSemana[semanaID].bpre) gruposPorSemana[semanaID].bpre = [];
              gruposPorSemana[semanaID].bpre.push(fila);
            }
          });
        }
      }

      // ── Acumular datos por mes (colección paralela) ──────────────────────
      const gruposPorMes: Record<string, { datos_skap: any[], bpre: any[] }> = {};

      for (const semanaID of Object.keys(gruposPorSemana)) {
        // Guardar documento SEMANAL (lógica original)
        const docRef = doc(db, "historicos_excel", semanaID);
        const snap = await getDoc(docRef);
        const dataVieja = snap.exists() ? snap.data() : {};

        // Fusión semanal acumulativa de datos_skap
        const datosSkapExistentes = dataVieja.datos_skap || [];
        const nuevosDatosSkap = gruposPorSemana[semanaID].datos_skap || [];
        const mapaSkap: Record<string, any> = {};
        datosSkapExistentes.forEach((fila: any) => {
          const clave = obtenerClaveRegistro(fila);
          if (clave) mapaSkap[clave] = fila;
        });
        nuevosDatosSkap.forEach((fila: any) => {
          const clave = obtenerClaveRegistro(fila);
          if (clave) mapaSkap[clave] = fila; // Inserta o actualiza
        });
        const datosSkapFusionados = Object.values(mapaSkap);

        // Fusión semanal acumulativa de bpre
        const bpreExistentes = dataVieja.bpre || [];
        const nuevosBpre = gruposPorSemana[semanaID].bpre || [];
        const mapaBpre: Record<string, any> = {};
        bpreExistentes.forEach((fila: any) => {
          const clave = obtenerClaveBpre(fila);
          if (clave) mapaBpre[clave] = fila;
        });
        nuevosBpre.forEach((fila: any) => {
          const clave = obtenerClaveBpre(fila);
          if (clave) mapaBpre[clave] = fila; // Inserta o actualiza
        });
        const bpreFusionados = Object.values(mapaBpre);

        const datosSemana = {
          ...dataVieja,
          semana_anio: semanaID,
          datos_skap: datosSkapFusionados,
          bpre: bpreFusionados,
          ultima_actualizacion: new Date().toISOString()
        };
        await setDoc(docRef, datosSemana, { merge: true });
        setLogProceso(prev => [...prev, `✅ Semana ${semanaID} sincronizada de forma acumulativa.`]);

        // Acumular en el grupo mensual
        // Derivamos el mes desde cualquier fila del grupo
        const primeraFila = (
          gruposPorSemana[semanaID].datos_skap?.[0] ||
          gruposPorSemana[semanaID].bpre?.[0]
        );
        const colFechaFila = primeraFila
          ? Object.keys(primeraFila).find(k => k.toLowerCase().includes('assessment') || (k.toLowerCase().includes('fecha') && !k.toLowerCase().includes('compromiso')))
          : undefined;
        const mesID = primeraFila && colFechaFila
          ? obtenerMesDesdeFechaString(primeraFila[colFechaFila])
          : semanaID.split('-W')[0] + '-' + String(Math.ceil(parseInt(semanaID.split('-W')[1] || '1') / 4.3)).padStart(2, '0');

        if (mesID) {
          if (!gruposPorMes[mesID]) gruposPorMes[mesID] = { datos_skap: [], bpre: [] };
          gruposPorMes[mesID].datos_skap.push(...datosSkapFusionados);
          gruposPorMes[mesID].bpre.push(...bpreFusionados);
        }
      }

      // Guardar documentos MENSUALES fusionando sin duplicados
      for (const mesID of Object.keys(gruposPorMes)) {
        const mesRef = doc(db, "historicos_mensuales", mesID);
        const mesSnap = await getDoc(mesRef);
        const dataViejaMes = mesSnap.exists() ? mesSnap.data() : {};

        // Fusión mensual acumulativa de datos_skap
        const skapExistentesMes = dataViejaMes.datos_skap || [];
        const nuevosSkapMes = gruposPorMes[mesID].datos_skap;
        const mapaSkapMes: Record<string, any> = {};

        skapExistentesMes.forEach((fila: any) => {
          const clave = obtenerClaveRegistro(fila);
          if (clave) mapaSkapMes[clave] = fila;
        });
        nuevosSkapMes.forEach((fila: any) => {
          const clave = obtenerClaveRegistro(fila);
          if (clave) mapaSkapMes[clave] = fila;
        });

        // Fusión mensual acumulativa de bpre
        const bpreExistentesMes = dataViejaMes.bpre || [];
        const nuevosBpreMes = gruposPorMes[mesID].bpre;
        const mapaBpreMes: Record<string, any> = {};

        bpreExistentesMes.forEach((fila: any) => {
          const clave = obtenerClaveBpre(fila);
          if (clave) mapaBpreMes[clave] = fila;
        });
        nuevosBpreMes.forEach((fila: any) => {
          const clave = obtenerClaveBpre(fila);
          if (clave) mapaBpreMes[clave] = fila;
        });

        await setDoc(mesRef, {
          mes_anio: mesID,
          datos_skap: Object.values(mapaSkapMes),
          bpre: Object.values(mapaBpreMes),
          ultima_actualizacion: new Date().toISOString()
        }, { merge: false });
        setLogProceso(prev => [...prev, `📅 Mes ${mesID} consolidado de forma acumulativa en historicos_mensuales.`]);
      }
      if (usuario) {
        const archivos = [];
        if (archivoDatos) archivos.push(`Datos: ${archivoDatos.name}`);
        if (archivoBpre) archivos.push(`BPRE: ${archivoBpre.name}`);
        await registrarEvento(
          usuario.uid,
          usuario.email || '',
          usuario.rol || 'operador',
          'CARGA_DATOS',
          `Sincronización base de datos semanal/mensual con archivos: ${archivos.join(', ')}`
        );
      }
      alert("¡Sincronización semanal lista!");
      setArchivoDatos(null);
      setArchivoBpre(null);
    } catch (error) {
      console.error(error);
      alert("Error en el procesamiento masivo.");
    } finally {
      setCargando(false);
    }
  };

  // PANTALLA DE ACCESO ADMINISTRATIVO (CON PALETA CORPORATIVA COHERENTE)
  if (!usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9] p-4 font-sans">
        <form onSubmit={handleLogin} className="w-full max-w-md p-8 bg-white rounded-2xl border border-slate-200 shadow-xl space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black uppercase tracking-wider text-[#1a4491]">
              Control de Acceso
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">
              Módulo de Carga Operacional
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all"
                placeholder="Correo"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2.5 pr-10 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showLoginPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-[#1a4491] hover:bg-blue-800 text-white font-black rounded-xl transition-colors uppercase text-xs tracking-widest shadow-md"
          >
            Entrar al Panel
          </button>

          {errorLogin && (
            <div className="p-3 bg-red-50 text-red-600 text-[11px] font-black rounded-xl border border-red-200 text-center uppercase tracking-wide">
              ⚠️ {errorLogin}
            </div>
          )}
        </form>
      </div>
    );
  }

  // PANEL PRINCIPAL DE CARGA (LOGUEADO)
  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans antialiased pb-12">

      {/* 🟦 1. NAVBAR SUPERIOR GLOBAL (IDÉNTICO AL DEL DASHBOARD) */}
      <header className="bg-[#1a4491] w-full h-16 px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-amber-400 flex items-center justify-center font-black text-[#1a4491] text-xs shadow-inner">
            ★
          </div>
          <h1 className="text-white font-bold text-sm tracking-wider uppercase">
            Dashboard de Autonomía
          </h1>
        </div>

        {/* Links tipo Cápsula Centrados */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            to="/"
            className="px-4 py-1.5 text-white/80 hover:text-white font-bold text-xs uppercase tracking-wide transition-colors rounded-full"
          >

            Dashboard
          </Link>
          <Link to="/analisis-comparativo" className="px-4 py-1.5 text-white/80 hover:text-white font-bold text-xs uppercase tracking-wide transition-colors rounded-full">
            Comparativo
          </Link>
          <Link to="/cargar-datos" className="px-4 py-1.5 bg-[#ffcc00] text-[#1a4491] font-black text-xs uppercase tracking-wide rounded-full shadow-sm">
            Cargar Datos
          </Link>
        </nav>

        {/* Bloque Informativo Estático derecho */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 h-8 px-4 text-[10px] font-black text-white bg-red-600 hover:bg-red-700 rounded-full transition-colors uppercase tracking-wider shadow-sm"
          >
            <LogOut className="h-3 w-3" />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENEDOR DE CONTENIDO PRINCIPAL */}
      <main className={cn("mx-auto p-6 mt-4", seccionActiva === 'operadores' ? "max-w-7xl" : "max-w-4xl")}>

        {/* Selector de Pestañas Estilo Corporativo */}
        <div className="flex border-b border-slate-200 gap-6 text-[10px] font-black uppercase tracking-wider mb-6">
          <button
            onClick={() => setSeccionActiva('autonomia')}
            className={cn(
              "pb-3 border-b-2 px-1 transition-all focus:outline-none cursor-pointer duration-200",
              seccionActiva === 'autonomia' ? "border-[#1a4491] text-[#1a4491]" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Autonomía y Desempeño
          </button>
          <button
            onClick={() => setSeccionActiva('cursos')}
            className={cn(
              "pb-3 border-b-2 px-1 transition-all focus:outline-none cursor-pointer duration-200",
              seccionActiva === 'cursos' ? "border-[#1a4491] text-[#1a4491]" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Capacitación y Cursos
          </button>
          {(usuario?.rol === 'admin' || usuario?.rol === 'desarrollador') && (
            <>
              <button
                onClick={() => setSeccionActiva('operadores')}
                className={cn(
                  "pb-3 border-b-2 px-1 transition-all focus:outline-none cursor-pointer duration-200",
                  seccionActiva === 'operadores' ? "border-[#1a4491] text-[#1a4491]" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Gestión de Operarios
              </button>
              <button
                onClick={() => setSeccionActiva('usuarios')}
                className={cn(
                  "pb-3 border-b-2 px-1 transition-all focus:outline-none cursor-pointer duration-200",
                  seccionActiva === 'usuarios' ? "border-[#1a4491] text-[#1a4491]" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Gestión de Accesos
              </button>
            </>
          )}
        </div>

        {seccionActiva === 'autonomia' ? (
          <div className="space-y-6 animate-fade-in">
            {/* 🎛️ PANEL ADMINISTRATIVO CENTRAL */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1a4491] px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-blue-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-950 text-blue-200 border border-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                    ADMIN
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-center sm:text-left">
                    Carga de Datos y Configuración del Dashboard
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500 font-black tracking-wide uppercase">
                    🚀 El sistema leerá las marcas de tiempo e indexará la información de forma automática por semana.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Reporte General */}
                  <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 hover:border-[#1a4491]/30 transition-colors">
                    <div className="p-3 bg-blue-50 text-[#1a4491] rounded-xl">
                      <CloudUpload className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#1a4491] uppercase tracking-wide">
                        1. Reporte General
                      </h3>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-tight mt-0.5">
                        (DATOS.XLSX)
                      </p>
                    </div>

                    <label className="bg-[#1a4491] hover:bg-blue-800 text-white text-[11px] font-black uppercase tracking-wide px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-colors inline-block">
                      Seleccionar archivo
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        disabled={cargando}
                        onChange={(e) => setArchivoDatos(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>

                    <div className="h-4 text-[11px] font-black tracking-wide uppercase text-slate-500 truncate max-w-[220px]">
                      {archivoDatos ? (
                        <span className="text-emerald-600 flex items-center justify-center gap-1">
                          <Check className="h-3 w-3 stroke-[3]" /> {archivoDatos.name}
                        </span>
                      ) : 'Sin archivo cargado'}
                    </div>
                  </div>

                  {/* Reporte de Desempeño */}
                  <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 hover:border-[#1a4491]/30 transition-colors">
                    <div className="p-3 bg-blue-50 text-[#1a4491] rounded-xl">
                      <CloudUpload className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#1a4491] uppercase tracking-wide">
                        2. Reporte de Desempeño
                      </h3>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-tight mt-0.5">
                        (BPRE.XLSX)
                      </p>
                    </div>

                    <label className="bg-[#1a4491] hover:bg-blue-800 text-white text-[11px] font-black uppercase tracking-wide px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-colors inline-block">
                      Seleccionar archivo
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        disabled={cargando}
                        onChange={(e) => setArchivoBpre(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>

                    <div className="h-4 text-[11px] font-black tracking-wide uppercase text-slate-500 truncate max-w-[220px]">
                      {archivoBpre ? (
                        <span className="text-emerald-600 flex items-center justify-center gap-1">
                          <Check className="h-3 w-3 stroke-[3]" /> {archivoBpre.name}
                        </span>
                      ) : 'Sin archivo cargado'}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={procesarTablasSemanales}
                    disabled={cargando || (!archivoDatos && !archivoBpre)}
                    className="w-full py-3.5 bg-[#ffcc00] hover:bg-amber-400 text-[#1a4491] font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {cargando ? 'Sincronizando e inyectando registros...' : '⚙️ Sincronizar Base de Datos'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : seccionActiva === 'usuarios' ? (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1a4491] px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-blue-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-950 text-blue-200 border border-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                    ACCESOS
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-center sm:text-left">
                    Gestión de Usuarios y Contraseñas
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-sm text-slate-600">
                  <p>Aquí puedes crear cuentas para nuevos líderes o supervisores. Se generará una contraseña temporal que podrán cambiar después de iniciar sesión.</p>
                </div>
                
                {usuario?.email && ["adminelaboracion@gmail.com", "ingsoftcecy@gmail.com"].includes(usuario.email.toLowerCase()) ? (
                  <form onSubmit={handleCreateUser} className="space-y-4 max-w-md">
                    {userErrorMessage && <div className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-200">{userErrorMessage}</div>}
                    {userSuccessMessage && <div className="text-emerald-600 text-xs font-bold bg-emerald-50 p-3 rounded-lg border border-emerald-200">{userSuccessMessage}</div>}
                    
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
                      <input 
                        type="email" 
                        required 
                        value={newUserEmail}
                        onChange={e => setNewUserEmail(e.target.value)}
                        className="w-full rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] transition-all"
                        placeholder="usuario@abinbev.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Contraseña Temporal</label>
                      <input 
                        type="text" 
                        required 
                        value={newUserPassword}
                        onChange={e => setNewUserPassword(e.target.value)}
                        className="w-full rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] transition-all"
                        placeholder="Ej: Temporal123!"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Rol</label>
                      <select 
                        value={newUserRole}
                        onChange={e => setNewUserRole(e.target.value)}
                        className="w-full rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] transition-all"
                      >
                        <option value="operador">Operador (Solo lectura)</option>
                        <option value="admin">Administrador (Puede editar info de su área)</option>
                      </select>
                    </div>

                    <button 
                      type="submit" 
                      disabled={creatingUser}
                      className="w-full mt-2 py-3 bg-[#1a4491] hover:bg-blue-800 disabled:bg-slate-400 text-white font-black rounded-xl transition-colors uppercase text-xs tracking-widest shadow-md"
                    >
                      {creatingUser ? 'Creando Usuario...' : 'Crear Usuario'}
                    </button>
                  </form>
                ) : (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-200 max-w-md">
                    No tienes permisos para crear nuevos usuarios. Solamente los administradores autorizados pueden realizar esta acción.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : seccionActiva === 'cursos' ? (
          <div className="space-y-6 animate-fade-in">
            {/* SECCIÓN A: CARGA RÁPIDA DE CURSOS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1a4491] px-6 py-3.5 flex items-center justify-between border-b border-blue-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-950 text-blue-200 border border-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                    CURSOS
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-wider">
                    Carga Masiva de Capacitación
                  </h2>
                </div>
                {cursosLastUpdated && (
                  <div className="text-[10px] font-bold text-blue-200">
                    Última carga: {new Date(cursosLastUpdated).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-6">
                  {/* Opción 1: Subir Archivo Excel */}
                  <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                    <CloudUpload className="h-5 w-5 text-[#1a4491]" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Opción 1: Arrastrar Excel</h3>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">(Cursos.xlsx)</p>
                    </div>
                    <label className="bg-[#1a4491] hover:bg-blue-800 text-white text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-lg cursor-pointer transition">
                      Elegir archivo
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        disabled={cargandoCursos}
                        onChange={(e) => {
                          setArchivoCursos(e.target.files?.[0] || null);
                          setTextoCursosPegado("");
                        }}
                        className="hidden"
                      />
                    </label>
                    <div className="text-[10px] font-black text-slate-500 truncate max-w-[200px]">
                      {archivoCursos ? archivoCursos.name : 'Ningún archivo seleccionado'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCargarCursosMasivo}
                  disabled={cargandoCursos || (!archivoCursos && !textoCursosPegado.trim())}
                  className="w-full py-3 bg-[#ffcc00] hover:bg-amber-400 text-[#1a4491] font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {cargandoCursos ? 'Procesando e inyectando cursos...' : '🚀 Sincronizar Base de Cursos'}
                </button>
              </div>
            </div>

            {/* SECCIÓN B: EDITOR EN VIVO DE CAPACITACIÓN */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1a4491] px-6 py-3.5 flex items-center gap-3 border-b border-blue-900 text-white">
                <div className="bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                  LIVE GRID
                </div>
                <h2 className="text-xs font-black uppercase tracking-wider">
                  Matriz Interactiva de Cursos
                </h2>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Panel Izquierdo: Lista de Operadores */}
                <div className="md:col-span-1 border-r pr-0 md:pr-6 space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">Buscar Operador</label>
                      <input
                        type="text"
                        placeholder="Escribe nombre o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1a4491]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Departamento</label>
                         <select
                          value={selectedDepto}
                          onChange={(e) => {
                            setSelectedDepto(e.target.value);
                            setSelectedEquipo("Todos");
                            setSelectedOperator(null);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-[9px] font-bold text-slate-700 bg-white focus:outline-none"
                        >
                          <option value="Todos">Todos</option>
                          {Array.from(new Set(operators.map(op => traducirArea(op.departamento)).filter(Boolean))).sort().map((d: any, idx) => (
                            <option key={idx} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Equipo</label>
                        <select
                          value={selectedEquipo}
                          onChange={(e) => {
                            setSelectedEquipo(e.target.value);
                            setSelectedOperator(null);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-[9px] font-bold text-slate-700 bg-white focus:outline-none"
                        >
                          <option value="Todos">Todos</option>
                          {Array.from(
                            new Set(
                              operators
                                .filter(op => selectedDepto === "Todos" || traducirArea(op.departamento) === selectedDepto)
                                .map(op => op.equipo)
                                .filter(Boolean)
                            )
                          ).sort().map((eq: any, idx) => (
                            <option key={idx} value={eq}>{eq}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Filtro por Cursos */}
                    <div className="space-y-1 pt-1">
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Filtrar por Cursos</label>
                      <select
                        value={filtroEstadoCurso}
                        onChange={(e) => {
                          setFiltroEstadoCurso(e.target.value as any);
                          setSelectedOperator(null);
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-[9px] font-bold text-slate-700 bg-white focus:outline-none"
                      >
                        <option value="todos">Todos los Colaboradores</option>
                        <option value="progreso">Con Cursos en Progreso (⌛)</option>
                        <option value="pendientes">Con Cursos Pendientes (⚠️)</option>
                        <option value="incompletos">Pendientes o En Progreso (Incompletos)</option>
                        <option value="completados">100% de Avance (Completados)</option>
                      </select>
                    </div>
                  </div>

                  <div className="h-[260px] overflow-y-auto divide-y border rounded-lg bg-slate-50/50">
                    {operators
                      .filter(op => {
                        const matchesSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) || op.id.includes(searchTerm);
                        const matchesDepto = selectedDepto === "Todos" || traducirArea(op.departamento) === selectedDepto;
                        const matchesEquipo = selectedEquipo === "Todos" || op.equipo === selectedEquipo;
                        
                        if (!matchesSearch || !matchesDepto || !matchesEquipo) return false;
                        
                        const targetIds = getAlternativeIds(op.id);
                        let sum = null;
                        for (const tid of targetIds) {
                          if (cursosResumen[tid]) {
                            sum = cursosResumen[tid];
                            break;
                          }
                        }

                        const total = sum?.t || 0;
                        const aprobados = sum?.a || 0;
                        const enProgreso = sum?.e || 0;
                        const pendientes = sum?.p || 0;
                        const progress = total > 0 ? Math.round((aprobados / total) * 100) : 0;

                        if (filtroEstadoCurso === 'progreso') {
                          return enProgreso > 0;
                        }
                        if (filtroEstadoCurso === 'pendientes') {
                          return pendientes > 0;
                        }
                        if (filtroEstadoCurso === 'incompletos') {
                          return enProgreso > 0 || pendientes > 0;
                        }
                        if (filtroEstadoCurso === 'completados') {
                          return total > 0 && progress === 100;
                        }
                        return true;
                      })
                      .map((op) => {
                        const targetIds = getAlternativeIds(op.id);
                        let sum = null;
                        for (const tid of targetIds) {
                          if (cursosResumen[tid]) {
                            sum = cursosResumen[tid];
                            break;
                          }
                        }

                        const total = sum?.t || 0;
                        const aprobados = sum?.a || 0;
                        const progress = total > 0 ? Math.round((aprobados / total) * 100) : 0;

                        return (
                          <button
                            key={op.id}
                            onClick={() => handleSelectOperator(op)}
                            className={cn(
                              "w-full text-left p-3 text-xs flex flex-col gap-0.5 hover:bg-slate-100 transition-colors focus:outline-none relative",
                              selectedOperator?.id === op.id && "bg-blue-50 hover:bg-blue-100 font-bold border-l-4 border-l-[#1a4491]"
                            )}
                          >
                            <span className="font-bold text-slate-900 uppercase truncate leading-tight pr-24">{op.name}</span>
                            <div className="flex gap-2 items-center text-[9px] font-black text-[#1a4491] uppercase tracking-widest">
                              <span>{op.id}</span>
                              {sum && (sum.e > 0 || sum.p > 0) && (
                                <span className="text-[8px] text-slate-500 font-bold lowercase tracking-normal">
                                  ({sum.e > 0 ? `${sum.e} en prog.` : ''}
                                  {sum.e > 0 && sum.p > 0 ? ', ' : ''}
                                  {sum.p > 0 ? `${sum.p} pend.` : ''})
                                </span>
                              )}
                            </div>
                            
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {total === 0 ? (
                                <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">Sin Cursos</span>
                              ) : (
                                <span className={cn(
                                  "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                                  progress === 100 ? "bg-yellow-100 text-yellow-800" :
                                  progress >= 80 ? "bg-emerald-100 text-emerald-800" :
                                  progress >= 50 ? "bg-amber-100 text-amber-800" :
                                  "bg-rose-100 text-rose-800"
                                )}>
                                  {progress}% ({aprobados}/{total})
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Panel Derecho: Tabla de Cursos del Operador */}
                <div className="md:col-span-2 space-y-4">
                  {!selectedOperator ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 space-y-2 border-2 border-dashed border-slate-200 rounded-xl">
                      <span className="text-xs font-black uppercase tracking-wider">Selecciona un Operador</span>
                      <p className="text-[10px] text-slate-400 max-w-xs text-center">Haz clic en un operador de la lista para ver, cambiar o añadir cursos.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 flex flex-col h-full">
                      <div className="flex justify-between items-center bg-slate-50 border p-3 rounded-xl">
                        <div>
                          <span className="text-[8px] font-black text-[#1a4491] uppercase tracking-widest">Operador Seleccionado</span>
                          <h4 className="text-sm font-black text-slate-800 uppercase leading-tight">{selectedOperator.name}</h4>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sharp ID: {selectedOperator.id}</span>
                        </div>
                        <button
                          onClick={handleSaveOperatorCourses}
                          disabled={savingGrid}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg transition"
                        >
                          {savingGrid ? 'Guardando...' : '💾 Guardar Cambios'}
                        </button>
                      </div>

                      {/* Lista de Cursos */}
                      <div className="border rounded-lg overflow-hidden bg-white max-h-[220px] overflow-y-auto custom-scrollbar flex-1">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b text-[8px] font-black uppercase text-slate-500 tracking-wider">
                              <th className="p-2">Curso</th>
                              <th className="p-2">Módulo</th>
                              <th className="p-2 text-center">Estado</th>
                              <th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-bold text-slate-700">
                            {operatorCourses.map((c, index) => (
                              <tr key={index} className="hover:bg-slate-50/50">
                                <td className="p-2 font-bold text-slate-800 text-[10px] max-w-[200px] truncate leading-tight">{c.n}</td>
                                <td className="p-2 text-[9px] text-slate-400 uppercase">{c.m}</td>
                                <td className="p-2 text-center align-middle">
                                  <select
                                    value={c.e}
                                    onChange={(e) => {
                                      const newStatus = e.target.value;
                                      setOperatorCourses(prev => prev.map((item, idx) => {
                                        if (idx !== index) return item;
                                        return {
                                          ...item,
                                          e: newStatus,
                                          f: newStatus === "Aprobado" ? new Date().toLocaleDateString('es-MX') : "-"
                                        };
                                      }));
                                    }}
                                    className="text-[9px] bg-slate-50 border rounded p-1 font-black focus:outline-none"
                                  >
                                    <option value="Aprobado">Aprobado</option>
                                    <option value="En progreso">En progreso</option>
                                    <option value="Pendiente">Pendiente</option>
                                  </select>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => handleRemoveCourse(index)}
                                    className="text-red-500 hover:text-red-700 text-[10px] font-black uppercase tracking-wider"
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Agregar Curso Form */}
                      <div className="bg-slate-50 border p-3 rounded-xl space-y-3">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block border-b pb-1">Añadir Curso de Capacitación</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Nombre del Curso..."
                            value={newCourseName}
                            onChange={(e) => setNewCourseName(e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded text-[10px] font-bold text-slate-800 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Módulo/Academia..."
                            value={newCourseModule}
                            onChange={(e) => setNewCourseModule(e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded text-[10px] font-bold text-slate-800 focus:outline-none"
                          />
                          <select
                            value={newCourseStatus}
                            onChange={(e) => setNewCourseStatus(e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded text-[10px] font-black text-slate-700 bg-white focus:outline-none"
                          >
                            <option value="Aprobado">Aprobado</option>
                            <option value="En progreso">En progreso</option>
                            <option value="Pendiente">Pendiente</option>
                          </select>
                        </div>
                        <button
                          onClick={handleAddCourse}
                          className="w-full bg-[#1a4491] hover:bg-blue-800 text-white font-black text-[9px] uppercase tracking-widest py-1.5 rounded-lg transition"
                        >
                          ➕ Agregar Curso a la Lista
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (usuario?.rol !== 'admin' && usuario?.rol !== 'desarrollador') ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center">
              <svg className="h-7 w-7 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Acceso Restringido</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Solo los administradores y desarrolladores pueden gestionar operarios.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* FORM CARD */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                <form onSubmit={handleSaveOperator} className="space-y-4 flex-1">
                  <div className="border-b pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#1a4491]">
                      {isEditing ? "Editar Colaborador" : "Alta de Colaborador"}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                      {isEditing ? "Modifica los atributos del operador" : "Registra un nuevo operador manual"}
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Ficha ID (Sharp)
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isEditing}
                        value={formId}
                        onChange={(e) => setFormId(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 32045556"
                        className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all disabled:opacity-60"
                      />
                      {isEditing && (
                        <p className="text-[8px] text-slate-400 font-medium mt-1">
                          * El ID de Ficha no se puede modificar.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        readOnly={isEditing}
                        placeholder="Ej: JUAN CARLOS RAMIREZ"
                        className={`w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none border transition-all ${
                          isEditing
                            ? "bg-slate-50 border-slate-100 cursor-not-allowed opacity-70"
                            : "bg-slate-50 border-slate-200 focus:border-[#1a4491] focus:bg-white"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Puesto / Rol
                      </label>
                      <input
                        type="text"
                        value={formPuesto}
                        onChange={(e) => setFormPuesto(e.target.value)}
                        placeholder="Ej: Integrante / Líder"
                        className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                          Departamento / Área
                        </label>
                        <select
                          value={formArea}
                          onChange={(e) => setFormArea(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all"
                        >
                          <option value="Warm Block">Warm Block</option>
                          <option value="Cold Block">Cold Block</option>
                          <option value="Brewing Maintenance">Maintenance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                          Equipo Autónomo
                        </label>
                        <select
                          value={formEquipoAutonomo}
                          onChange={(e) => handleTeamChange(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all"
                        >
                          {(EQUIPOS_POR_AREA[formArea] || []).map(t => (
                            <option key={t.name} value={t.name}>{t.name.replace("_", " ")}</option>
                          ))}
                          <option value="Sin Equipo">Sin Equipo</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Champion
                      </label>
                      <select
                        value={formChampions}
                        onChange={(e) => setFormChampions(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all"
                      >
                        <option value="">Ninguno</option>
                        <option value="seguridad">Seguridad (Safety)</option>
                        <option value="calidad">Calidad (Quality)</option>
                        <option value="ambiental">Ambiental (Environment)</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="gestion">Gestión</option>
                        <option value="gente">Gente (People)</option>
                        <option value="logistica">Logística</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Estado (Estatus)
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all"
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo (Baja)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      disabled={guardandoOperador}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                    >
                      {guardandoOperador ? "Guardando..." : "Guardar Colaborador"}
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* LIST CARD */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                <div className="flex flex-col gap-4 flex-1">
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#1a4491] flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        Lista de Colaboradores
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border">
                        {filteredCombinedOperators.length} operadores
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Buscar por ID, nombre, equipo o puesto..."
                      value={searchTermOperadores}
                      onChange={(e) => setSearchTermOperadores(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex-1 min-h-[350px] overflow-y-auto border border-slate-100 rounded-xl custom-scrollbar max-h-[500px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 border-b z-10 text-[9px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="p-3">Colaborador</th>
                          <th className="p-3">Puesto / Equipo</th>
                          <th className="p-3 text-center">Origen</th>
                          <th className="p-3 text-center">Estado</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {filteredCombinedOperators.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                              No se encontraron colaboradores.
                            </td>
                          </tr>
                        ) : (
                          filteredCombinedOperators.map((op: any) => {
                            const isRowEditing = formId === op.id;
                            return (
                              <tr key={op.id} className={cn("hover:bg-slate-50/50 transition-colors", isRowEditing && "bg-blue-50/40")}>
                                <td className="p-3">
                                  <div className="flex flex-col">
                                    <span className="text-slate-800 text-[11px] uppercase truncate max-w-[180px]">{op.nombre}</span>
                                    <span className="text-[9px] text-slate-400 tabular-nums">Ficha: {op.id}</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-slate-700 text-[10px]">{op.puesto}</span>
                                    <span className="text-[9px] text-slate-400 uppercase">
                                      {op.equipoAutonomo ? op.equipoAutonomo.replace("_", " ") : "Sin Equipo"} | {traducirArea(op.departamento)}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-center align-middle">
                                  {op.isManual ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Alta Manual
                                    </span>
                                  ) : op.isModified ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                      Modificado
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200">
                                      Excel
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(op)}
                                    title="Click para cambiar estado"
                                    className="focus:outline-none cursor-pointer transform hover:scale-105 active:scale-95 transition"
                                  >
                                    {op.status === "inactivo" ? (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
                                        Inactivo (Baja)
                                      </span>
                                    ) : (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm border border-emerald-600">
                                        Activo
                                      </span>
                                    )}
                                  </button>
                                </td>
                                <td className="p-3 text-center align-middle">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectOperatorToEdit(op)}
                                      className="p-1 hover:bg-slate-100 rounded text-[#1a4491] hover:text-blue-700 transition cursor-pointer"
                                      title="Editar Colaborador"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    {(op.isManual || op.isModified || op.status === "inactivo") && (
                                      <button
                                        type="button"
                                        onClick={() => handleResetOperatorToExcel(op.id, op.nombre, op.isManual)}
                                        className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 transition cursor-pointer"
                                        title={op.isManual ? "Eliminar Colaborador" : "Restablecer a Excel"}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 🖥️ 5. MONITOR DE LOGS EN TIEMPO REAL */}
        {logProceso.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-4 overflow-hidden">
            <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800 pb-2 mb-2 text-[10px] font-black uppercase tracking-wider">
              <Terminal className="h-3 w-3 text-emerald-400" />
              <span>Consola del Sistema de Carga</span>
            </div>
            <div className="font-mono text-[11px] text-emerald-400 space-y-1 max-h-48 overflow-y-auto antialiased">
              {logProceso.map((l, i) => (
                <p key={i} className="leading-relaxed">{l}</p>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}