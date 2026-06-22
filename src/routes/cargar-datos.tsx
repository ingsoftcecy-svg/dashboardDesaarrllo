// src/routes/cargar-datos.tsx
import React, { useState, useEffect } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { registrarEvento } from '@/lib/auditLog';

import { Star, Check, LogOut, LayoutDashboard, CloudUpload, Terminal } from "lucide-react";
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, writeBatch } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import * as XLSX from 'xlsx';

export const Route = createFileRoute('/cargar-datos')({
  component: CargarDatos,
});

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
    const mes  = parseInt(partes[1], 10) - 1;
    const dia  = parseInt(partes[2], 10);
    fecha = new Date(anio, mes, dia);
  }

  if (isNaN(fecha.getTime())) return '';
  const anio = fecha.getFullYear();
  const mes  = (fecha.getMonth() + 1).toString().padStart(2, '0');
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  const [cargando, setCargando] = useState(false);
  const [logProceso, setLogProceso] = useState<string[]>([]);
  const [migrando, setMigrando] = useState(false);
  const [archivoDatos, setArchivoDatos] = useState<File | null>(null);
  const [archivoBpre, setArchivoBpre] = useState<File | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setErrorLogin('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
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

  const handleCargaUnica = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'base_equipos' | 'eac' | 'eabf') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCargando(true);
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
      alert("Error al subir el catálogo.");
    } finally {
      setCargando(false);
      e.target.value = '';
    }
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
        filas.forEach((fila) => {
          // Filtrar filas vacías o de resumen que no tienen un empleado válido
          const colEmp = Object.keys(fila).find(k => k.toLowerCase().trim() === 'employee');
          const nombreEmpleado = colEmp ? String(fila[colEmp]).trim() : '';
          if (!nombreEmpleado || nombreEmpleado.toLowerCase() === 'undefined') {
            return;
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
      <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9] p-4 font-sans select-none">
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
                placeholder="usuario@planta.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-[#1a4491] focus:bg-white transition-all"
                placeholder="••••••••"
                required
              />
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
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans antialiased pb-12 select-none">
      
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
                
                Modificar Datos
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
      <main className="max-w-4xl mx-auto p-6 space-y-6 mt-4">

        {/* 🎛️ 2. PANEL ADMINISTRATIVO CENTRAL */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Encabezado Industrial de la Tarjeta */}
          <div className="bg-[#1a4491] px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-blue-900 text-white">
            <div className="flex items-center gap-3">
              <div className="bg-blue-950 text-blue-200 border border-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                ADMIN
              </div>
              <h2 className="text-xs font-black uppercase tracking-wider text-center sm:text-left">
                Carga de Datos y Configuración del Dashboard
              </h2>
            </div>
            
            {/* Acciones Superiores Estilo Cápsula */}
            
          </div>

          {/* Cuerpo de Carga */}
          <div className="p-6 space-y-6">
            
            {/* Banner Informativo */}
            <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-center">
              <p className="text-[10px] text-slate-500 font-black tracking-wide uppercase">
                🚀 El sistema leerá las marcas de tiempo e indexará la información de forma automática por semana.
              </p>
            </div>
            
            {/* 📁 Grid de Zonas de Carga de Archivos */}
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

            {/* ⚡ BOTÓN ACCIONADOR SEMANAL */}
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

        {/* 💻 3. ACCIONES COMPLEMENTARIAS / CARGAS ÚNICAS DE CATÁLOGOS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-[#1a4491] uppercase tracking-wider">Cargas Administrativas Especiales</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Actualización directa de estructuras fijas globales</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer text-center">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wide mb-1">Base Equipos</span>
              <input type="file" accept=".xlsx,.xls" disabled={cargando} onChange={(e) => handleCargaUnica(e, 'base_equipos')} className="text-[9px] w-full text-slate-400 max-w-[150px]" />
            </label>

            <label className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer text-center">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wide mb-1">Catálogo EAC</span>
              <input type="file" accept=".xlsx,.xls" disabled={cargando} onChange={(e) => handleCargaUnica(e, 'eac')} className="text-[9px] w-full text-slate-400 max-w-[150px]" />
            </label>

            <label className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer text-center">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wide mb-1">Catálogo EABF</span>
              <input type="file" accept=".xlsx,.xls" disabled={cargando} onChange={(e) => handleCargaUnica(e, 'eabf')} className="text-[9px] w-full text-slate-400 max-w-[150px]" />
            </label>
          </div>
        </div>

        {/* 📅 4. MIGRACIÓN DE SEMANAS → MESES */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-[#1a4491] uppercase tracking-wider">Migración de Históricos Mensuales</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              Convierte los datos semanales ya existentes en registros mensuales para las gráficas
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-700 font-bold uppercase tracking-wide">
            ⚠️ Ejecuta esto una sola vez para migrar los datos históricos. Las cargas nuevas se agrupan automáticamente.
          </div>
          <button
            onClick={migrarSemanalesAMensuales}
            disabled={migrando || cargando}
            className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {migrando ? (
              <><span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> Migrando datos...</>
            ) : (
              '🔄 Migrar Semanas → Histórico Mensual'
            )}
          </button>
        </div>

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