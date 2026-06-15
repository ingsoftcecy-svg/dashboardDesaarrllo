// src/routes/analisis-comparativo.tsx
import React, { useState, useEffect } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { obtenerTodoElHistorico, ReporteMensual, obtenerTodoElHistoricoMensual, ReporteMes } from '@/lib/fetchHistorico';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const Route = createFileRoute('/analisis-comparativo')({
  component: AnalisisComparativoSemanas,
});

const formatearTextoSemana = (idSemana: string): string => {
  if (!idSemana) return '';
  if (idSemana.includes('-W')) {
    const partes = idSemana.split('-W');
    return `Semana ${partes[1]}`;
  }
  if (idSemana.includes('-')) {
    const partes = idSemana.split('-');
    return `Semana ${partes[1]}`;
  }
  return idSemana;
};

const NOMBRES_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const formatearTextoMes = (idMes: string): string => {
  if (!idMes) return '';
  const [anio, mes] = idMes.split('-');
  const mesNum = parseInt(mes, 10) - 1;
  return `${NOMBRES_MESES[mesNum] || mes} ${anio}`;
};

// Elimina tildes/diacríticos para comparar columnas del Excel sin sensibilidad a acentos
const normalizar = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Las 8 categorías reales de habilidades de operarios en DATOS.xlsx (mapeadas en español e inglés)
const CATEGORIAS_OPERARIOS = [
  { clave: 'gente',       tag: 'GENTE',         alias: 'people' },
  { clave: 'gestion',     tag: 'GESTIÓN',       alias: 'management' },
  { clave: 'seguridad',   tag: 'SEGURIDAD',     alias: 'safety' },
  { clave: 'calidad',     tag: 'CALIDAD',       alias: 'quality' },
  { clave: 'ambiental',   tag: 'MEDIO AMB.',    alias: 'environment' },
  { clave: 'mantenimiento', tag: 'MANTENIMIENTO', alias: 'maintenance' },
  { clave: 'logistica',   tag: 'LOGÍSTICA',     alias: 'logistics' },
  { clave: 'operacion',   tag: 'OPERACIÓN',     alias: 'operation' },
];

// Los 10 pilares técnicos TPM de los equipos en BPRE.xlsx
const PILARES = [
  { clave: 'dinamica',  tag: 'DINÁMICA DE EQ.' },
  { clave: 'liderazgo', tag: 'LIDERAZGO'       },
  { clave: 'skap',      tag: 'SKAP'             },
  { clave: 'ato',       tag: 'ATO'              },
  { clave: 'seguridad', tag: 'SEGURIDAD'        },
  { clave: 'quas',      tag: 'QUAS'             },
  { clave: 'multi',     tag: 'MULTI-HAB'        },
  { clave: 'vpo',       tag: 'VPO'              },
  { clave: 'solucion',  tag: 'SOL. PROBLEMAS'   },
  { clave: 'infra',     tag: 'INFRALST'         },
];

const FALLBACKS: Record<string, number> = {
  dinamica: 4.00, liderazgo: 4.00, skap: 2.33, ato: 2.40, seguridad: 2.08,
  quas: 3.00, multi: 3.00, vpo: 3.00, solucion: 3.00, infra: 4.00,
};

// Calcula el promedio de avance de un operario (0-100%) para una categoría específica de DATOS.xlsx
const obtenerValorCategoriaOperario = (fila: any, alias: string): number | null => {
  if (!fila || typeof fila !== 'object') return null;
  const keys = Object.keys(fila);
  
  const parseVal = (val: any) => {
    if (val === undefined || val === null || val === '-') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const colBasic = keys.find(k => k.toLowerCase().trim() === alias.toLowerCase());
  const colInter = keys.find(k => k.toLowerCase().trim() === alias.toLowerCase() + '_1');
  const colAdvanced = keys.find(k => k.toLowerCase().trim() === alias.toLowerCase() + '_2');

  if (colBasic) {
    const vB = parseVal(fila[colBasic]);
    const vI = colInter ? parseVal(fila[colInter]) : 0;
    const vA = colAdvanced ? parseVal(fila[colAdvanced]) : 0;
    return parseFloat((((vB * 0.5) + (vI * 0.35) + (vA * 0.15)) * 100).toFixed(2));
  }

  return null;
};

// Obtiene la puntuación de un pilar (0-4.00) de una fila de BPRE.xlsx
const obtenerValorPilarBpre = (fila: any, clavePilar: string): number | null => {
  if (!fila || typeof fila !== 'object') return null;

  const colBpre = Object.keys(fila).find(k => {
    const kNorm = normalizar(k);
    const alias = clavePilar === 'dinamica' ? 'dinamica'
                : clavePilar === 'liderazgo' ? 'liderazgo'
                : clavePilar === 'skap' ? 'skap'
                : clavePilar === 'ato' ? 'ato'
                : clavePilar === 'seguridad' ? 'seguridad'
                : clavePilar === 'quas' ? 'quas'
                : clavePilar === 'multi' ? 'multihab'
                : clavePilar === 'vpo' ? 'vpo'
                : clavePilar === 'solucion' ? 'solucion de prob'
                : clavePilar === 'infra' ? 'infraest'
                : clavePilar;
    return kNorm.includes(alias);
  });

  if (colBpre) {
    const val = parseFloat(fila[colBpre]);
    return !isNaN(val) && val >= 0 && val <= 4 ? val : null;
  }
  return null;
};

const normalizarArea = (area: string): string => {
  const a = area.toLowerCase().trim();
  if (a.includes('cocimientos')) return 'COCIMIENTOS';
  if (a.includes('bloque') || a.includes('frio')) return 'BLOQUE FRIO';
  if (a.includes('mantenimiento')) return 'MANTENIMIENTO';
  return area.toUpperCase();
};

const obtenerPromedioArea = (filas: any[], areaNombre: string): number | null => {
  const filasFiltradas = filas.filter(f => {
    const colArea = Object.keys(f).find(k => k.toLowerCase().trim() === 'area' || k.toLowerCase().trim() === 'área');
    if (!colArea) return false;
    return normalizarArea(String(f[colArea])) === areaNombre;
  });
  if (filasFiltradas.length === 0) return null;

  let sumaTotal = 0, cuentaTotal = 0;
  filasFiltradas.forEach(fila => {
    PILARES.forEach(pilar => {
      const val = obtenerValorPilarBpre(fila, pilar.clave);
      if (val !== null) {
        sumaTotal += val;
        cuentaTotal++;
      }
    });
  });

  return cuentaTotal > 0 ? parseFloat((sumaTotal / cuentaTotal).toFixed(2)) : null;
};

function AnalisisComparativoSemanas() {
  const [todasLasSemanas, setTodasLasSemanas] = useState<ReporteMensual[]>([]);
  const [semanaA, setSemanaA] = useState<string>('');
  const [semanaB, setSemanaB] = useState<string>('');
  const [datosSemanaA, setDatosSemanaA] = useState<ReporteMensual | null>(null);
  const [datosSemanaB, setDatosSemanaB] = useState<ReporteMensual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [dataGraficaFactores, setDataGraficaFactores] = useState<any[]>([]);

  // Estados para las nuevas pestañas e interactividad de tendencias
  const [tabActiva, setTabActiva] = useState<'comparativa' | 'tendencias'>('comparativa');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string>('');
  const [listaEquipos, setListaEquipos] = useState<string[]>([]);

  // Toggle de modo de vista
  const [modoVista, setModoVista] = useState<'semanal' | 'mensual'>('semanal');
  const [todosLosMeses, setTodosLosMeses] = useState<ReporteMes[]>([]);
  const [mesA, setMesA] = useState<string>('');
  const [mesB, setMesB] = useState<string>('');
  const [mapaOperadorEquipo, setMapaOperadorEquipo] = useState<Record<string, string>>({});

  // Reloj simulador idéntico al de tu dashboard principal
  const [tiempoActual, setTiempoActual] = useState('13:39:55 - Jueves, 28 De Mayo');


  useEffect(() => {
    const cargarDatosDB = async () => {
      try {
        const [historial, historialMensual, catalogSnap] = await Promise.all([
          obtenerTodoElHistorico(),
          obtenerTodoElHistoricoMensual(),
          getDoc(doc(db, "config_dashboard", "catalogos_fijos")),
        ]);
        setTodasLasSemanas(historial);
        setTodosLosMeses(historialMensual);

        if (historial.length > 0) {
          setSemanaA(historial[historial.length - 1].semana_anio);
          if (historial.length > 1) {
            setSemanaB(historial[historial.length - 2].semana_anio);
          } else {
            setSemanaB(historial[historial.length - 1].semana_anio);
          }
        }
        if (historialMensual.length > 0) {
          setMesA(historialMensual[historialMensual.length - 1].mes_anio);
          setMesB(historialMensual.length > 1
            ? historialMensual[historialMensual.length - 2].mes_anio
            : historialMensual[historialMensual.length - 1].mes_anio
          );
        }

        const eaMap: Record<string, string> = {};
        if (catalogSnap.exists()) {
          const catData = catalogSnap.data();
          const eac = catData.eac || [];
          const eabf = catData.eabf || [];
          
          eac.forEach((row: any) => {
            if (row.SHARP) {
              eaMap[String(row.SHARP).trim()] = String(row["Nombre del Equipo"] || "").trim().toUpperCase();
            }
          });

          let lastEquipo = "";
          eabf.forEach((row: any) => {
            if (row["NUEVO EQUIPO "]) lastEquipo = String(row["NUEVO EQUIPO "]).trim().toUpperCase();
            if (row.SHARP) {
              eaMap[String(row.SHARP).trim()] = lastEquipo;
            }
          });
        }
        setMapaOperadorEquipo(eaMap);
      } catch (error) {
        console.error("Error al inicializar la consulta semanal:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarDatosDB();
  }, []);

  // Efecto secundario para extraer los nombres de los equipos disponibles del catálogo de operarios
  useEffect(() => {
    const equipos = new Set<string>();
    
    // Agregamos 'GENERAL' como primera opción por defecto
    equipos.add('GENERAL');
    
    Object.values(mapaOperadorEquipo).forEach(eq => {
      const nombreLimpio = String(eq).trim().toUpperCase();
      if (
        nombreLimpio && 
        nombreLimpio !== 'SIN EQUIPO' && 
        nombreLimpio !== 'SIN_EQUIPO' && 
        nombreLimpio !== 'BREWMAN' // Reemplazamos el equipo BREWMAN (sin datos) por la vista GENERAL
      ) {
        equipos.add(nombreLimpio);
      }
    });
    
    // Convertimos a array y ordenamos los nombres de los equipos
    const listaEquiposFiltrados = Array.from(equipos).filter(e => e !== 'GENERAL').sort();
    // Colocamos siempre 'GENERAL' al inicio
    const lista = ['GENERAL', ...listaEquiposFiltrados];
    
    setListaEquipos(lista);
    if (lista.length > 0 && (!equipoSeleccionado || !lista.includes(equipoSeleccionado))) {
      setEquipoSeleccionado(lista[0]);
    }
  }, [mapaOperadorEquipo, equipoSeleccionado]);

  const obtenerAutonomyScore = (row: any): number | null => {
    if (!row) return null;
    const col = Object.keys(row).find(k => 
      k.toLowerCase().includes('excelencia') || k.toLowerCase().includes('%') || k.toLowerCase().includes('autono')
    );
    if (!col) return null;
    const val = parseFloat(row[col]);
    if (isNaN(val)) return null;
    return val <= 1 ? val * 100 : val;
  };

  const obtenerPromedioAutonomiaArea = (filasSkap: any[], areaNombre: string): number | null => {
    if (!Array.isArray(filasSkap) || filasSkap.length === 0) return null;
    
    const filasFiltradas = filasSkap.filter(f => {
      const colArea = Object.keys(f).find(k => k.toLowerCase().trim() === 'area' || k.toLowerCase().trim() === 'área');
      if (!colArea) return false;
      const aVal = String(f[colArea]).toLowerCase().trim();
      if (areaNombre === 'COCIMIENTOS') return aVal.includes('warm') || aVal.includes('cocimiento');
      if (areaNombre === 'BLOQUE FRIO') return aVal.includes('cold') || aVal.includes('bloque') || aVal.includes('frio');
      if (areaNombre === 'MANTENIMIENTO') return aVal.includes('maintenance') || aVal.includes('mantenimiento');
      return false;
    });

    if (filasFiltradas.length === 0) return null;

    let suma = 0, cuenta = 0;
    filasFiltradas.forEach(row => {
      const score = obtenerAutonomyScore(row);
      if (score !== null) {
        suma += score;
        cuenta++;
      }
    });

    return cuenta > 0 ? parseFloat((suma / cuenta).toFixed(2)) : null;
  };

  const getTrendDataArea = () => {
    const periodos = modoVista === 'semanal' ? todasLasSemanas : todosLosMeses;
    return periodos.map(p => {
      const id = modoVista === 'semanal' ? (p as any).semana_anio : (p as any).mes_anio;
      const label = modoVista === 'semanal' ? formatearTextoSemana(id) : formatearTextoMes(id);
      
      const filasSkap = p.datos_skap || [];
      if (filasSkap.length === 0) {
        return {
          name: label,
          'COCIMIENTOS': null,
          'BLOQUE FRIO': null,
          'MANTENIMIENTO': null,
        };
      }
      
      const cocimientos = obtenerPromedioAutonomiaArea(filasSkap, 'COCIMIENTOS');
      const bloqueFrio = obtenerPromedioAutonomiaArea(filasSkap, 'BLOQUE FRIO');
      const mantenimiento = obtenerPromedioAutonomiaArea(filasSkap, 'MANTENIMIENTO');

      return {
        name: label,
        'COCIMIENTOS': cocimientos,
        'BLOQUE FRIO': bloqueFrio,
        'MANTENIMIENTO': mantenimiento,
      };
    });
  };

  const obtenerEquipoDeOperador = (row: any, eaMap: Record<string, string>): string => {
    if (!row) return 'SIN EQUIPO';
    const colEmp = Object.keys(row).find(k => k.toLowerCase().trim() === 'employee');
    const empVal = colEmp ? String(row[colEmp]).trim() : '';
    const match = empVal.match(/\[(\d+)\]/);
    if (match) {
      const id = match[1].trim();
      return eaMap[id] || 'SIN EQUIPO';
    }
    return 'SIN EQUIPO';
  };

  const getTrendDataEquipo = () => {
    if (!equipoSeleccionado) return [];
    const periodos = modoVista === 'semanal' ? todasLasSemanas : todosLosMeses;
    return periodos.map(p => {
      const id = modoVista === 'semanal' ? (p as any).semana_anio : (p as any).mes_anio;
      const label = modoVista === 'semanal' ? formatearTextoSemana(id) : formatearTextoMes(id);
      
      const filasSkap = p.datos_skap || [];
      
      // Si se selecciona 'GENERAL', tomamos todos los operadores (planta general).
      // Si no, filtramos por el equipo seleccionado.
      const operadoresDelEquipo = equipoSeleccionado.toUpperCase() === 'GENERAL'
        ? filasSkap
        : filasSkap.filter(op => 
            obtenerEquipoDeOperador(op, mapaOperadorEquipo).toLowerCase() === equipoSeleccionado.toLowerCase()
          );

      const dataPoint: any = { name: label };
      CATEGORIAS_OPERARIOS.forEach(cat => {
        if (operadoresDelEquipo.length === 0) {
          dataPoint[cat.tag] = null;
        } else {
          let suma = 0, validos = 0;
          operadoresDelEquipo.forEach(op => {
            const val = obtenerValorCategoriaOperario(op, cat.alias);
            if (val !== null) {
              suma += val;
              validos++;
            }
          });
          dataPoint[cat.tag] = validos > 0 ? parseFloat((suma / validos).toFixed(2)) : null;
        }
      });
      return dataPoint;
    });
  };

  const getTrendDataFases = () => {
    const periodos = modoVista === 'semanal' ? todasLasSemanas : todosLosMeses;
    
    // Las fases de los operadores son fijas del Nivel 1 al Nivel 4
    const listaFases = ['Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4'];

    const dataPoints = periodos.map(p => {
      const id = modoVista === 'semanal' ? (p as any).semana_anio : (p as any).mes_anio;
      const label = modoVista === 'semanal' ? formatearTextoSemana(id) : formatearTextoMes(id);
      
      const filasSkap = p.datos_skap || [];
      const conteo: Record<string, number> = {
        'Nivel 1': 0,
        'Nivel 2': 0,
        'Nivel 3': 0,
        'Nivel 4': 0,
      };

      filasSkap.forEach(row => {
        const score = obtenerAutonomyScore(row);
        if (score !== null) {
          if (score >= 87.5) {
            conteo['Nivel 4']++;
          } else if (score >= 62.5) {
            conteo['Nivel 3']++;
          } else if (score >= 37.5) {
            conteo['Nivel 2']++;
          } else {
            conteo['Nivel 1']++;
          }
        }
      });

      return {
        name: label,
        ...conteo
      };
    });

    return { dataPoints, listaFases };
  };

  useEffect(() => {
    // Guard: solo procesar en modo semanal
    if (modoVista !== 'semanal') return;
    if (todasLasSemanas.length === 0) return;

    const dataA = todasLasSemanas.find(s => s.semana_anio === semanaA) || null;
    const dataB = todasLasSemanas.find(s => s.semana_anio === semanaB) || null;

    setDatosSemanaA(dataA);
    setDatosSemanaB(dataB);

    const calcularPromedio = (datos: any, claveCategoria: string): number | null => {
      if (!datos) return null;
      const filas = datos.datos_skap || [];
      if (filas.length === 0) return null;
      const cat = CATEGORIAS_OPERARIOS.find(c => c.clave === claveCategoria);
      if (!cat) return null;

      let suma = 0, validos = 0;
      filas.forEach((fila: any) => {
        const val = obtenerValorCategoriaOperario(fila, cat.alias);
        if (val !== null) {
          suma += val;
          validos++;
        }
      });
      return validos > 0 ? parseFloat((suma / validos).toFixed(2)) : null;
    };

    const matriz = CATEGORIAS_OPERARIOS.map(cat => ({
      name: cat.tag,
      [semanaA || 'Semana A']: calcularPromedio(dataA, cat.clave),
      [semanaB || 'Semana B']: calcularPromedio(dataB, cat.clave),
    }));

    setDataGraficaFactores(matriz);
  }, [semanaA, semanaB, todasLasSemanas, modoVista]);

  // ── Efecto mensual: recalcula cuando cambia mes o modoVista
  useEffect(() => {
    if (modoVista !== 'mensual' || todosLosMeses.length === 0) return;

    const dataMesA = todosLosMeses.find(m => m.mes_anio === mesA) || null;
    const dataMesB = todosLosMeses.find(m => m.mes_anio === mesB) || null;

    const calcularPromedioMes = (datos: any, claveCategoria: string): number | null => {
      if (!datos) return null;
      const filas = datos.datos_skap || [];
      if (filas.length === 0) return null;
      const cat = CATEGORIAS_OPERARIOS.find(c => c.clave === claveCategoria);
      if (!cat) return null;

      let suma = 0, validos = 0;
      filas.forEach((fila: any) => {
        const val = obtenerValorCategoriaOperario(fila, cat.alias);
        if (val !== null) {
          suma += val;
          validos++;
        }
      });
      return validos > 0 ? parseFloat((suma / validos).toFixed(2)) : null;
    };

    const matriz = CATEGORIAS_OPERARIOS.map(cat => ({
      name: cat.tag,
      [mesA || 'Mes A']: calcularPromedioMes(dataMesA, cat.clave),
      [mesB || 'Mes B']: calcularPromedioMes(dataMesB, cat.clave),
    }));

    setDataGraficaFactores(matriz);
  }, [mesA, mesB, todosLosMeses, modoVista]);

  const obtenerExcelenciaGlobal = (semanaData: any): string => {
    if (!semanaData) return 'SIN REGISTROS';
    const filas = semanaData.datos_skap || [];
    if (!Array.isArray(filas) || filas.length === 0) return 'SIN REGISTROS';
    
    let suma = 0, cuenta = 0;
    filas.forEach((row: any) => {
      const score = obtenerAutonomyScore(row);
      if (score !== null) {
        suma += score;
        cuenta++;
      }
    });
    return cuenta > 0 ? `${(suma / cuenta).toFixed(2)}%` : 'SIN REGISTROS';
  };

  // Valores derivados según el modo activo
  const etiquetaA = modoVista === 'semanal' ? formatearTextoSemana(semanaA) : formatearTextoMes(mesA);
  const etiquetaB = modoVista === 'semanal' ? formatearTextoSemana(semanaB) : formatearTextoMes(mesB);
  const excelenciaA = modoVista === 'semanal'
    ? obtenerExcelenciaGlobal(datosSemanaA)
    : obtenerExcelenciaGlobal(todosLosMeses.find(m => m.mes_anio === mesA));
  const excelenciaB = modoVista === 'semanal'
    ? obtenerExcelenciaGlobal(datosSemanaB)
    : obtenerExcelenciaGlobal(todosLosMeses.find(m => m.mes_anio === mesB));
  const claveGraficaA = modoVista === 'semanal' ? semanaA : mesA;
  const claveGraficaB = modoVista === 'semanal' ? semanaB : mesB;

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f1f5f9]">
        <p className="text-[#1a4491] font-bold uppercase tracking-wider animate-pulse text-xs">Sincronizando Históricos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans antialiased pb-12 select-none">
      
      {/* 🟦 1. NAVBAR SUPERIOR COMPLETO (IDÉNTICO AL DEL DASHBOARD) */}
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
          <Link to="/" className="px-4 py-1.5 text-white/80 hover:text-white font-bold text-xs uppercase tracking-wide transition-colors rounded-full">
            General
          </Link>
          <Link to="/analisis-comparativo" className="px-4 py-1.5 bg-[#ffcc00] text-[#1a4491] font-black text-xs uppercase tracking-wide rounded-full shadow-sm">
            Comparativo
          </Link>
          <Link to="/cargar-datos" className="px-4 py-1.5 text-white/80 hover:text-white font-bold text-xs uppercase tracking-wide transition-colors rounded-full">
            Cargar Datos
          </Link>
        </nav>

        {/* Reloj a la derecha */}
        <div className="text-right text-white/90 font-medium text-[11px] tracking-tight hidden sm:block">
          <div className="font-bold text-amber-400">{tiempoActual.split(' - ')[0]}</div>
          <div className="text-[10px] opacity-75">{tiempoActual.split(' - ')[1]}</div>
        </div>
      </header>

      {/* 🧭 PESTAÑAS DE NAVEGACIÓN INTERNA */}
      <div className="max-w-7xl mx-auto px-6 mt-4 flex items-center justify-start border-b border-slate-200 gap-6">
        <button
          onClick={() => setTabActiva('comparativa')}
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            tabActiva === 'comparativa'
              ? 'border-[#1a4491] text-[#1a4491]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Comparativa A vs B
        </button>
        <button
          onClick={() => setTabActiva('tendencias')}
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            tabActiva === 'tendencias'
              ? 'border-[#ffcc00] text-[#1a4491]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Tendencias Históricas
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL CON MÁXIMO ANCHO DE PANTALLA */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">

        {/* 1. MODO COMPARATIVA A vs B */}
        {tabActiva === 'comparativa' && (
          <>
            {/* 🎛️ SELECTOR DE SEMANAS EN FILA FLOTANTE */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xs font-black text-[#1a4491] uppercase tracking-widest">Filtros de Análisis</h2>
                <p className="text-[11px] text-slate-500 font-medium">Selecciona los bloques históricos a contrastar en la gráfica inferior.</p>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                {/* Toggle Semanal / Mensual */}
                <div className="flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200">
                  <button
                    onClick={() => setModoVista('semanal')}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${
                      modoVista === 'semanal'
                        ? 'bg-[#1a4491] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Semanal
                  </button>
                  <button
                    onClick={() => setModoVista('mensual')}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${
                      modoVista === 'mensual'
                        ? 'bg-[#ffcc00] text-[#1a4491] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Mensual
                  </button>
                </div>

                {/* Selectores según modo */}
                {modoVista === 'semanal' ? (
                  <>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Base (A):</span>
                      <select value={semanaA} onChange={(e) => setSemanaA(e.target.value)} className="bg-transparent text-xs font-black text-[#1a4491] outline-none cursor-pointer">
                        {todasLasSemanas.map(s => (
                          <option key={s.semana_anio} value={s.semana_anio}>{formatearTextoSemana(s.semana_anio)}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-xs font-black text-slate-400">VS</span>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ref (B):</span>
                      <select value={semanaB} onChange={(e) => setSemanaB(e.target.value)} className="bg-transparent text-xs font-black text-amber-600 outline-none cursor-pointer">
                        {todasLasSemanas.map(s => (
                          <option key={s.semana_anio} value={s.semana_anio}>{formatearTextoSemana(s.semana_anio)}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mes (A):</span>
                      <select value={mesA} onChange={(e) => setMesA(e.target.value)} className="bg-transparent text-xs font-black text-[#1a4491] outline-none cursor-pointer">
                        {todosLosMeses.length === 0
                          ? <option value="">Sin datos mensuales</option>
                          : todosLosMeses.map(m => (
                              <option key={m.mes_anio} value={m.mes_anio}>{formatearTextoMes(m.mes_anio)}</option>
                            ))
                        }
                      </select>
                    </div>
                    <span className="text-xs font-black text-slate-400">VS</span>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mes (B):</span>
                      <select value={mesB} onChange={(e) => setMesB(e.target.value)} className="bg-transparent text-xs font-black text-amber-600 outline-none cursor-pointer">
                        {todosLosMeses.length === 0
                          ? <option value="">Sin datos mensuales</option>
                          : todosLosMeses.map(m => (
                              <option key={m.mes_anio} value={m.mes_anio}>{formatearTextoMes(m.mes_anio)}</option>
                            ))
                        }
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 📊 TARJETAS DE EXCELENCIA GLOBAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Bloque Semana A */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center relative overflow-hidden">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Periodo Base Seleccionado</span>
                  </div>
                  <h3 className="text-xs font-black text-[#1a4491] uppercase tracking-wider">
                    EXCELENCIA GLOBAL ({etiquetaA})
                  </h3>
                  <div className="text-4xl font-black text-slate-900 tracking-tight pt-1">
                    {excelenciaA}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {excelenciaA !== 'SIN REGISTROS' 
                      ? 'Resultado consolidado de los operadores' 
                      : 'No se encontraron registros de operarios para esta fecha'}
                  </p>
                </div>
                
                {/* Indicador Circular de Meta */}
                <div className="h-16 w-16 rounded-full bg-blue-50 border border-blue-100 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[8px] font-black text-slate-400 tracking-tighter">META</span>
                  <span className="text-xs font-black text-[#1a4491]">90.0%</span>
                </div>
              </div>

              {/* Bloque Semana B */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center relative overflow-hidden">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Histórico de Comparación</span>
                  </div>
                  <h3 className="text-xs font-black text-amber-600 uppercase tracking-wider">
                    EXCELENCIA GLOBAL ({etiquetaB})
                  </h3>
                  <div className="text-4xl font-black text-slate-900 tracking-tight pt-1">
                    {excelenciaB}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {excelenciaB !== 'SIN REGISTROS' 
                      ? 'Puntuación de referencia del periodo anterior' 
                      : 'No se encontraron registros de operarios para esta fecha'}
                  </p>
                </div>
                
                {/* Indicador Circular de Meta */}
                <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-100 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[8px] font-black text-slate-400 tracking-tighter">REF</span>
                  <span className="text-xs font-black text-amber-600">ANT</span>
                </div>
              </div>

            </div>

            {/* 📉 GRÁFICA COMPARATIVA DE PILARES */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              
              {/* Encabezado del Bloque Metrico */}
              <div className="bg-[#1a4491] px-6 py-3 flex items-center justify-between border-b border-blue-900 text-white">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Comparativa de Habilidades de Operarios (Escala 0 - 100%)
                  </h3>
                  <p className="text-blue-200 text-[10px] font-medium uppercase tracking-tight">
                    Habilidades reales de operadores desglosadas por categoría
                  </p>
                </div>
                <div className="bg-blue-950/50 border border-blue-700 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                  KPI ANALYTICS
                </div>
              </div>

              {/* Cuerpo del Gráfico con Recharts Adaptado */}
              <div className="p-6 bg-white">
                {/* Indicadores específicos de fechas sin registros (sin tapar el gráfico) */}
                <div className="flex flex-col gap-2 mb-4">
                  {excelenciaA === 'SIN REGISTROS' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] font-bold">
                      <span className="text-red-500">⚠️</span>
                      <span>No hay registros cargados para el periodo base: <strong>{etiquetaA}</strong>.</span>
                    </div>
                  )}
                  {excelenciaB === 'SIN REGISTROS' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-[11px] font-bold">
                      <span className="text-amber-500">⚠️</span>
                      <span>No hay registros cargados para el periodo de referencia: <strong>{etiquetaB}</strong>.</span>
                    </div>
                  )}
                </div>

                <div className="h-[420px] w-full text-[10px] font-black tracking-wide">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataGraficaFactores} margin={{ top: 15, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#475569" 
                        tick={{ fontSize: 9, fontWeight: '900', fill: '#1e293b' }} 
                      />
                      <YAxis 
                        stroke="#475569" 
                        domain={[0, 100]} 
                        tickCount={5} 
                        tick={{ fontSize: 10, fontWeight: '900', fill: '#1e293b' }} 
                        tickFormatter={val => `${val}%`}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(26, 68, 145, 0.02)' }}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#cbd5e1', 
                          borderRadius: '8px', 
                          color: '#1e293b',
                          fontSize: '11px',
                          fontWeight: '800',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '900', paddingTop: '15px', textTransform: 'uppercase' }} />
                      
                      {/* Barras con los colores reales corporativos */}
                      <Bar 
                        dataKey={claveGraficaA} 
                        fill="#1a4491" 
                        name={excelenciaA === 'SIN REGISTROS' ? `${etiquetaA} (Sin registros)` : etiquetaA} 
                        radius={[3, 3, 0, 0]} 
                        barSize={28} 
                      />
                      <Bar 
                        dataKey={claveGraficaB} 
                        fill="#ffcc00" 
                        name={excelenciaB === 'SIN REGISTROS' ? `${etiquetaB} (Sin registros)` : etiquetaB} 
                        radius={[3, 3, 0, 0]} 
                        barSize={28} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </>
        )}

        {/* 2. MODO TENDENCIAS HISTÓRICAS */}
        {tabActiva === 'tendencias' && (
          <div className="space-y-6">
            
            {/* 🎛️ FILTROS DE TENDENCIAS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xs font-black text-[#1a4491] uppercase tracking-widest">Tendencias Históricas</h2>
                <p className="text-[11px] text-slate-500 font-medium">Visualiza el avance cronológico general de la planta.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agrupación:</span>
                <div className="flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200">
                  <button
                    onClick={() => setModoVista('semanal')}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${
                      modoVista === 'semanal'
                        ? 'bg-[#1a4491] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Semanal
                  </button>
                  <button
                    onClick={() => setModoVista('mensual')}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${
                      modoVista === 'mensual'
                        ? 'bg-[#ffcc00] text-[#1a4491] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Mensual
                  </button>
                </div>
              </div>
            </div>

            {/* Fila superior: Área (Líneas) y Fases (Barras Apiladas) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Card 1: Desempeño Histórico por Área / Sector */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-[#1a4491] px-6 py-3.5 flex items-center justify-between border-b border-blue-900 text-white">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Autonomía Histórica por Área (%)
                    </h3>
                    <p className="text-blue-200 text-[10px] font-medium uppercase tracking-tight">
                      Promedio real de Autonomy Score (%) de operadores por departamento
                    </p>
                  </div>
                  <div className="bg-blue-950/50 border border-blue-700 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                    SECTORS
                  </div>
                </div>
                
                <div className="p-6 bg-white flex-1 min-h-[350px]">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={getTrendDataArea()} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: '900', fill: '#1e293b' }} />
                      <YAxis domain={[0, 100]} tickFormatter={val => `${val}%`} tickCount={6} tick={{ fontSize: 10, fontWeight: '900', fill: '#1e293b' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#cbd5e1', 
                          borderRadius: '8px', 
                          fontSize: '11px',
                          fontWeight: '800'
                        }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '900', paddingTop: '15px', textTransform: 'uppercase' }} />
                      
                      <Line type="monotone" dataKey="COCIMIENTOS" stroke="#1a4491" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="BLOQUE FRIO" stroke="#ffcc00" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="MANTENIMIENTO" stroke="#475569" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 2: Distribución Histórica de Fases de Autonomía */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-[#1a4491] px-6 py-3.5 flex items-center justify-between border-b border-blue-900 text-white">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Madurez de Operadores (Niveles)
                    </h3>
                    <p className="text-blue-200 text-[10px] font-medium uppercase tracking-tight">
                      Distribución acumulada de operadores por nivel de autonomía
                    </p>
                  </div>
                  <div className="bg-blue-950/50 border border-blue-700 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                    MATURITY
                  </div>
                </div>

                <div className="p-6 bg-white flex-1 min-h-[350px]">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={getTrendDataFases().dataPoints} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: '900', fill: '#1e293b' }} />
                      <YAxis tickCount={5} tick={{ fontSize: 10, fontWeight: '900', fill: '#1e293b' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#cbd5e1', 
                          borderRadius: '8px', 
                          fontSize: '11px',
                          fontWeight: '800'
                        }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '900', paddingTop: '15px', textTransform: 'uppercase' }} />
                      
                      {getTrendDataFases().listaFases.map((fase, i) => {
                        const coloresFases = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']; // Red (1), Amber (2), Blue (3), Green (4)
                        const color = coloresFases[i % coloresFases.length];
                        return (
                          <Bar 
                            key={fase} 
                            dataKey={fase} 
                            stackId="a" 
                            fill={color} 
                            name={fase} 
                            radius={[0, 0, 0, 0]}
                          />
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Fila inferior: Evolución del equipo seleccionado (Línea de 8 colores) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-[#1a4491] px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-blue-900 text-white">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Evolución Histórica por Equipo (%)
                  </h3>
                  <p className="text-blue-200 text-[10px] font-medium uppercase tracking-tight">
                    Auditoría del progreso de las 8 categorías reales de habilidades de operarios
                  </p>
                </div>
                
                {/* Selector de Equipo */}
                <div className="flex items-center gap-2 bg-blue-950/50 border border-blue-700 px-3 py-1.5 rounded-xl text-white">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-200">Equipo:</span>
                  <select 
                    value={equipoSeleccionado} 
                    onChange={(e) => setEquipoSeleccionado(e.target.value)} 
                    className="bg-transparent text-xs font-black outline-none cursor-pointer text-white"
                  >
                    {listaEquipos.length === 0
                      ? <option value="" className="bg-slate-800 text-white">No hay equipos</option>
                      : listaEquipos.map(eq => (
                          <option key={eq} value={eq} className="bg-slate-800 text-white font-bold">{eq}</option>
                        ))
                    }
                  </select>
                </div>
              </div>

              <div className="p-6 bg-white min-h-[420px]">
                {listaEquipos.length === 0 ? (
                  <div className="flex h-64 items-center justify-center">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Sin datos de equipos para graficar tendencias.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart data={getTrendDataEquipo()} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: '900', fill: '#1e293b' }} />
                      <YAxis domain={[0, 100]} tickFormatter={val => `${val}%`} tickCount={6} tick={{ fontSize: 10, fontWeight: '900', fill: '#1e293b' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#cbd5e1', 
                          borderRadius: '8px', 
                          fontSize: '11px',
                          fontWeight: '800'
                        }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', fontWeight: '900', paddingTop: '15px', textTransform: 'uppercase' }} />
                      
                      {CATEGORIAS_OPERARIOS.map((cat, i) => {
                        const coloresCategorias = [
                          '#1e3a8a', // Seguridad
                          '#3b82f6', // Calidad
                          '#f59e0b', // Medio ambiente
                          '#10b981', // Gestión
                          '#ef4444', // Gente
                          '#8b5cf6', // Mantenimiento
                          '#ec4899', // Logística
                          '#14b8a6', // Operación
                        ];
                        const color = coloresCategorias[i % coloresCategorias.length];
                        return (
                          <Line 
                            key={cat.tag} 
                            type="monotone" 
                            dataKey={cat.tag} 
                            stroke={color} 
                            strokeWidth={2.5}
                            activeDot={{ r: 5 }} 
                            dot={{ r: 2.5 }} 
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
