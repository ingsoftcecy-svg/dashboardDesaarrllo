// src/routes/configurar-plantilla.tsx
import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export const Route = createFileRoute('/configurar-plantilla')({
  component: ConfigurarPlantilla,
});

const parsearExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const nombreHoja = workbook.SheetNames[0];
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja]);
        resolve(json);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

function ConfigurarPlantilla() {
  const [catBaseEquipos, setCatBaseEquipos] = useState<File | null>(null);
  const [catEabf, setCatEabf] = useState<File | null>(null);
  const [catEac, setCatEac] = useState<File | null>(null);
  
  const [cargando, setCargando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const procesarYCrearMaestro = async () => {
  if (!catBaseEquipos || !catEabf || !catEac) {
    alert("Por favor, selecciona los 3 archivos estáticos para poder armar la base relacional.");
    return;
  }

  try {
    setCargando(true);
    setLogs(["⏳ Iniciando procesamiento de catálogos fijos..."]);

    const diccionarioMaestro: Record<string, { sharp: string; nombre: string; equipo: string; area: string }> = {};

    // 1. PASO UNO: Leer EABF (Donde están los nombres y celdas/equipos de los operadores)
    setLogs(prev => [...prev, "⏳ Leyendo EABF (Personal y Celdas)..."]);
    const filasEabf = await parsearExcel(catEabf);
    filasEabf.forEach(fila => {
      const colSharp = Object.keys(fila).find(k => k.toLowerCase().includes('sharp') || k.toLowerCase().includes('id') || k.toLowerCase().includes('ficha'));
      const colNombre = Object.keys(fila).find(k => k.toLowerCase().includes('nombre') || k.toLowerCase().includes('operario') || k.toLowerCase().includes('empleado'));
      const colEquipo = Object.keys(fila).find(k => k.toLowerCase().includes('equipo') || k.toLowerCase().includes('team') || k.toLowerCase().includes('celda') || k.toLowerCase().includes('grupo'));

      if (colSharp && fila[colSharp]) {
        const sharpID = String(fila[colSharp]).trim();
        const nombreNorm = colNombre && fila[colNombre] ? String(fila[colNombre]).trim().toUpperCase() : 'DESCONOCIDO';
        const equipoNorm = colEquipo && fila[colEquipo] ? String(fila[colEquipo]).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'SIN EQUIPO';

        diccionarioMaestro[sharpID] = {
          sharp: sharpID,
          nombre: nombreNorm,
          equipo: equipoNorm, // Asigna su equipo o celda real del archivo de personal
          area: 'GENERAL'
        };
      }
    });

    // 2. PASO DOS: Mapear la Base de Equipos Autónomos para saber qué Área le corresponde a cada Equipo
    setLogs(prev => [...prev, "⏳ Mapeando relaciones de Equipos Autónomos con Áreas..."]);
    const filasEquipos = await parsearExcel(catBaseEquipos);
    const mapaEquipoAreaAux: Record<string, string> = {};
    
    filasEquipos.forEach(fila => {
      const colEquipo = Object.keys(fila).find(k => k.toLowerCase().includes('equipo') || k.toLowerCase().includes('team') || k.toLowerCase().includes('celda'));
      const colArea = Object.keys(fila).find(k => k.toLowerCase().includes('area') || k.toLowerCase().includes('dep') || k.toLowerCase().includes('gerencia'));
      
      if (colEquipo && colArea && fila[colEquipo] && fila[colArea]) {
        const eq = String(fila[colEquipo]).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const ar = String(fila[colArea]).trim().toUpperCase();
        mapaEquipoAreaAux[eq] = ar;
      }
    });

    // 3. PASO TRES: Cruzar EAC (Puestos) para rescatar áreas faltantes sin destruir el equipo asignado
    setLogs(prev => [...prev, "⏳ Complementando áreas con EAC..."]);
    const filasEac = await parsearExcel(catEac);
    filasEac.forEach(fila => {
      const colSharp = Object.keys(fila).find(k => k.toLowerCase().includes('sharp') || k.toLowerCase().includes('id') || k.toLowerCase().includes('ficha'));
      const colArea = Object.keys(fila).find(k => k.toLowerCase().includes('area') || k.toLowerCase().includes('dep'));
      
      if (colSharp && fila[colSharp]) {
        const sharpID = String(fila[colSharp]).trim();
        const areaNorm = colArea && fila[colArea] ? String(fila[colArea]).trim().toUpperCase() : 'GENERAL';
        
        if (diccionarioMaestro[sharpID]) {
          // Si ya existe de EABF, solo actualizamos el área si sigue en GENERAL
          if (diccionarioMaestro[sharpID].area === 'GENERAL') {
            diccionarioMaestro[sharpID].area = areaNorm;
          }
        } else {
          // Si no existía en EABF por alguna razón, se añade
          diccionarioMaestro[sharpID] = { sharp: sharpID, nombre: 'DESCONOCIDO', equipo: 'SIN EQUIPO', area: areaNorm };
        }
      }
    });

    // 4. PASO CUATRO: Asegurar consistencia cruzada final (Si el operario tiene equipo asignado, hereda el área del equipo)
    Object.keys(diccionarioMaestro).forEach(sharp => {
      const op = diccionarioMaestro[sharp];
      if (op.equipo !== 'SIN EQUIPO' && mapaEquipoAreaAux[op.equipo]) {
        op.area = mapaEquipoAreaAux[op.equipo];
      }
    });

    // Guardar en Firestore
    await setDoc(doc(db, "config_estructura", "maestro_operarios"), {
      operarios: diccionarioMaestro,
      ultima_actualizacion: new Date().toISOString()
    });

    setLogs(prev => [...prev, `✅ ¡Módulo Maestro guardado con éxito! ${Object.keys(diccionarioMaestro).length} operarios indexados.`]);
    alert("Maestro actualizado correctamente.");
  } catch (err) {
    console.error(err);
    setLogs(prev => [...prev, "❌ Error al compilar los catálogos fijos."]);
  } finally {
    setCargando(false);
  }
};

  return (
    <div className="p-6 min-h-screen bg-[#0f172a] text-white space-y-6 flex flex-col justify-center items-center">
      <div className="w-full max-w-2xl bg-[#1e293b] p-6 rounded-xl border border-slate-800 shadow-xl space-y-6">
        
        <div className="bg-[#0f172a] p-4 rounded-lg border border-emerald-900/40 text-center">
          <h1 className="text-base font-black uppercase tracking-wider text-emerald-400">🛡️ Configuración Única de Estructura de Planta</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase">Sube estos archivos solo una vez por periodo o cuando cambie el plantel oficial.</p>
        </div>

        <div className="space-y-4">
          {/* Base Equipos */}
          <div className="bg-[#0f172a]/40 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase">1. Base Equipos Autónomos CCZ</p>
              <p className="text-[10px] text-slate-500 max-w-[350px] truncate">{catBaseEquipos ? catBaseEquipos.name : "No seleccionado"}</p>
            </div>
            <label className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-[11px] font-black uppercase cursor-pointer transition-colors">
              Buscar
              <input type="file" accept=".xlsx" onChange={(e) => setCatBaseEquipos(e.target.files?.[0] || null)} className="hidden" />
            </label>
          </div>

          {/* EABF */}
          <div className="bg-[#0f172a]/40 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase">2. EABF (Líderes y Operadores)</p>
              <p className="text-[10px] text-slate-500 max-w-[350px] truncate">{catEabf ? catEabf.name : "No seleccionado"}</p>
            </div>
            <label className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-[11px] font-black uppercase cursor-pointer transition-colors">
              Buscar
              <input type="file" accept=".xlsx" onChange={(e) => setCatEabf(e.target.files?.[0] || null)} className="hidden" />
            </label>
          </div>

          {/* EAC */}
          <div className="bg-[#0f172a]/40 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase">3. EAC (Puestos de Trabajo)</p>
              <p className="text-[10px] text-slate-500 max-w-[350px] truncate">{catEac ? catEac.name : "No seleccionado"}</p>
            </div>
            <label className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-[11px] font-black uppercase cursor-pointer transition-colors">
              Buscar
              <input type="file" accept=".xlsx" onChange={(e) => setCatEac(e.target.files?.[0] || null)} className="hidden" />
            </label>
          </div>
        </div>

        <button 
          onClick={procesarYCrearMaestro}
          disabled={cargando}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs py-3 rounded-lg tracking-wider transition-all disabled:opacity-40"
        >
          {cargando ? "⏳ Unificando y Enlazando Relaciones..." : "🔒 Compilar y Guardar Estructura Fija"}
        </button>

        {logs.length > 0 && (
          <div className="bg-[#020617] p-4 rounded-lg font-mono text-[11px] text-emerald-400 space-y-1 max-h-[150px] overflow-y-auto uppercase border border-slate-800">
            {logs.map((log, index) => <p key={index}>{log}</p>)}
          </div>
        )}

      </div>
    </div>
  );
}