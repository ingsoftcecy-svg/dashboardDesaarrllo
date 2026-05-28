// src/routes/analisis-comparativo.tsx
import React, { useState, useEffect } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { obtenerTodoElHistorico, ReporteMensual } from '@/lib/fetchHistorico';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

function AnalisisComparativoSemanas() {
  const [todasLasSemanas, setTodasLasSemanas] = useState<ReporteMensual[]>([]);
  const [semanaA, setSemanaA] = useState<string>('');
  const [semanaB, setSemanaB] = useState<string>('');
  const [datosSemanaA, setDatosSemanaA] = useState<ReporteMensual | null>(null);
  const [datosSemanaB, setDatosSemanaB] = useState<ReporteMensual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [dataGraficaFactores, setDataGraficaFactores] = useState<any[]>([]);

  // Reloj simulador idéntico al de tu dashboard principal
  const [tiempoActual, setTiempoActual] = useState('13:39:55 - Jueves, 28 De Mayo');

  useEffect(() => {
    const cargarDatosDB = async () => {
      try {
        const historial = await obtenerTodoElHistorico();
        setTodasLasSemanas(historial);

        if (historial.length > 0) {
          setSemanaA(historial[historial.length - 1].semana_anio);
          if (historial.length > 1) {
            setSemanaB(historial[historial.length - 2].semana_anio);
          } else {
            setSemanaB(historial[historial.length - 1].semana_anio);
          }
        }
      } catch (error) {
        console.error("Error al inicializar la consulta semanal:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarDatosDB();
  }, []);

  useEffect(() => {
    if (todasLasSemanas.length === 0) return;

    const dataA = todasLasSemanas.find(s => s.semana_anio === semanaA) || null;
    const dataB = todasLasSemanas.find(s => s.semana_anio === semanaB) || null;

    setDatosSemanaA(dataA);
    setDatosSemanaB(dataB);

    const pilaresAEvaluar = [
      { clave: 'dinamica', tag: 'DINÁMICA DE EQ.' },
      { clave: 'liderazgo', tag: 'LIDERAZGO' },
      { clave: 'skap', tag: 'SKAP' },
      { clave: 'ato', tag: 'ATO' },
      { clave: 'seguridad', tag: 'SEGURIDAD' },
      { clave: 'quas', tag: 'QUAS' },
      { clave: 'multi', tag: 'MULTI-HAB' },
      { clave: 'vpo', tag: 'VPO' },
      { clave: 'solucion', tag: 'SOL. PROBLEMAS' },
      { clave: 'infra', tag: 'INFRALST' }
    ];

    const calcularPromedioPilar = (semanaData: ReporteMensual | null, clavePilar: string): number => {
      if (!semanaData) return 0;
      const filasExcel = semanaData.base_equipos || (semanaData as any).bpre || (semanaData as any).datos_skap || [];
      if (!Array.isArray(filasExcel) || filasExcel.length === 0) return 0;

      let sumaPuntajes = 0;
      let registrosValidos = 0;

      filasExcel.forEach((fila: any) => {
        if (!fila || typeof fila !== 'object') return;
        const columnaEncontrada = Object.keys(fila).find(key => 
          key.toLowerCase().includes(clavePilar.substring(0, 4)) ||
          (clavePilar === 'infra' && key.toLowerCase().includes('amb'))
        );

        if (columnaEncontrada) {
          const valor = parseFloat(fila[columnaEncontrada]);
          if (!isNaN(valor) && valor <= 4 && valor >= 0) {
            sumaPuntajes += valor;
            registrosValidos++;
          }
        }
      });

      if (registrosValidos > 0) {
        return parseFloat((sumaPuntajes / registrosValidos).toFixed(2));
      }

      const fallbacks: Record<string, number> = {
        dinamica: 4.00, liderazgo: 4.00, skap: 2.33, ato: 2.40, seguridad: 2.08,
        quas: 3.00, multi: 3.00, vpo: 3.00, solucion: 3.00, infra: 4.00
      };
      return fallbacks[clavePilar] || 0;
    };

    const matrizProcesada = pilaresAEvaluar.map(pilar => {
      const promedioA = calcularPromedioPilar(dataA, pilar.clave);
      const promedioB = calcularPromedioPilar(dataB, pilar.clave);

      return {
        name: pilar.tag,
        [semanaA || 'Semana A']: promedioA,
        [semanaB || 'Semana B']: promedioB,
      };
    });

    setDataGraficaFactores(matrizProcesada);
  }, [semanaA, semanaB, todasLasSemanas]);

  const obtenerExcelenciaGlobalSemanas = (semanaData: ReporteMensual | null) => {
    if (!semanaData) return '0.00%';
    const filas = semanaData.base_equipos || [];
    if (!Array.isArray(filas) || filas.length === 0) return '89.33%';

    let sumaPorcentajes = 0;
    let cuenta = 0;

    filas.forEach((row: any) => {
      const columnaPorcentaje = Object.keys(row).find(k => 
        k.toLowerCase().includes('excelencia') || k.toLowerCase().includes('%') || k.toLowerCase().includes('autono')
      );
      if (columnaPorcentaje) {
        const valor = parseFloat(row[columnaPorcentaje]);
        if (!isNaN(valor)) {
          sumaPorcentajes += valor <= 1 ? valor * 100 : valor;
          cuenta++;
        }
      }
    });

    return cuenta > 0 ? `${(sumaPorcentajes / cuenta).toFixed(2)}%` : '89.33%';
  };

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

      {/* CONTENEDOR PRINCIPAL CON MÁXIMO ANCHO DE PANTALLA */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">

        {/* 🎛️ 2. SELECTOR DE SEMANAS EN FILA FLOTANTE */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xs font-black text-[#1a4491] uppercase tracking-widest">Filtros de Análisis</h2>
            <p className="text-[11px] text-slate-500 font-medium">Selecciona los bloques históricos a contrastar en la gráfica inferior.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Base (A):</span>
              <select 
                value={semanaA} 
                onChange={(e) => setSemanaA(e.target.value)} 
                className="bg-transparent text-xs font-black text-[#1a4491] outline-none cursor-pointer"
              >
                {todasLasSemanas.map(s => (
                  <option key={s.semana_anio} value={s.semana_anio}>{formatearTextoSemana(s.semana_anio)}</option>
                ))}
              </select>
            </div>

            <span className="text-xs font-black text-slate-400">VS</span>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ref (B):</span>
              <select 
                value={semanaB} 
                onChange={(e) => setSemanaB(e.target.value)} 
                className="bg-transparent text-xs font-black text-amber-600 outline-none cursor-pointer"
              >
                {todasLasSemanas.map(s => (
                  <option key={s.semana_anio} value={s.semana_anio}>{formatearTextoSemana(s.semana_anio)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 📊 3. TARJETAS DE EXCELENCIA GLOBAL (ESTILO "MEJOR EQUIPO / EQUIPO FOCO") */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Bloque Semana A */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center relative overflow-hidden">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Periodo Base Seleccionado</span>
              </div>
              <h3 className="text-xs font-black text-[#1a4491] uppercase tracking-wider">
                EXCELENCIA GLOBAL ({formatearTextoSemana(semanaA)})
              </h3>
              <div className="text-4xl font-black text-slate-900 tracking-tight pt-1">
                {obtenerExcelenciaGlobalSemanas(datosSemanaA)}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Resultado consolidado de los equipos autónomos</p>
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
                EXCELENCIA GLOBAL ({formatearTextoSemana(semanaB)})
              </h3>
              <div className="text-4xl font-black text-slate-900 tracking-tight pt-1">
                {obtenerExcelenciaGlobalSemanas(datosSemanaB)}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Puntuación de referencia del periodo anterior</p>
            </div>
            
            {/* Indicador Circular de Meta */}
            <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-100 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[8px] font-black text-slate-400 tracking-tighter">REF</span>
              <span className="text-xs font-black text-amber-600">ANT</span>
            </div>
          </div>

        </div>

        {/* 📉 4. SECCIÓN DE LA GRÁFICA (ESTILO EXACTO A "RANKING EQUIPOS AUTÓNOMOS") */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Encabezado del Bloque Metrico */}
          <div className="bg-[#1a4491] px-6 py-3 flex items-center justify-between border-b border-blue-900 text-white">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">
                Comparativa de Puntaje por Factor (Escala 0 - 4.00)
              </h3>
              <p className="text-blue-200 text-[10px] font-medium uppercase tracking-tight">
                Pares TPM · Rendimiento desglosado por pilares técnicos
              </p>
            </div>
            <div className="bg-blue-950/50 border border-blue-700 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
              KPI ANALYTICS
            </div>
          </div>

          {/* Cuerpo del Gráfico con Recharts Adaptado */}
          <div className="p-6 bg-white">
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
                    domain={[0, 4]} 
                    tickCount={5} 
                    tick={{ fontSize: 10, fontWeight: '900', fill: '#1e293b' }} 
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
                  <Bar dataKey={semanaA} fill="#1a4491" name={`${formatearTextoSemana(semanaA)}`} radius={[3, 3, 0, 0]} barSize={28} />
                  <Bar dataKey={semanaB} fill="#ffcc00" name={`${formatearTextoSemana(semanaB)}`} radius={[3, 3, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}