// src/lib/fetchHistorico.ts
import { db } from './firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export interface ReporteMensual {
  semana_anio: string;        // Cambiado a semántica mensual -> Ej: "2026-05" (si actúa como ID mensual)
  ultima_actualizacion: string;
  datos_skap?: any[];         // Datos demográficos y niveles de operadores de DATOS.xlsx
  bpre?: any[];               // Factores de autonomía (Escala 0-4) y % de excelencia de BPRE.xlsx
  base_equipos?: any[];
}

/**
 * Recupera todos los registros históricos de la base de datos NoSQL
 * ordenados cronológicamente por identificador de mes.
 */
export const obtenerTodoElHistorico = async (): Promise<ReporteMensual[]> => {
  try {
    const historicosRef = collection(db, "historicos_excel");
    
    // Ordenamos por el ID del documento ("__name__") para mantener la secuencia de meses automáticos
    const q = query(historicosRef, orderBy("__name__", "asc"));
    const querySnapshot = await getDocs(q);
    
    const historial: ReporteMensual[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      historial.push({
        // Si el documento no trae mapeado un campo interno, usamos el ID del documento de Firestore (ej: "2026-05")
        semana_anio: data.semana_anio || data.semana_anio || doc.id,
        ultima_actualizacion: data.ultima_actualizacion || new Date().toISOString(),
        ...data
      } as ReporteMensual);
    });
    
    console.log(`📦 Histórico Mensual Sincronizado (${historial.length} meses encontrados).`);
    return historial; 
  } catch (error) {
    console.error("Error al extraer el histórico mensual desde Firestore:", error);
    throw error;
  }
};