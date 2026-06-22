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

// Interfaz para documentos de la colección historicos_mensuales
export interface ReporteMes {
  mes_anio: string;           // Ej: "2024-05"
  ultima_actualizacion: string;
  datos_skap?: any[];
  bpre?: any[];
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
    
    return historial;
  } catch (error) {
    console.error("Error al extraer el histórico mensual desde Firestore:", error);
    throw error;
  }
};

/**
 * Recupera todos los registros de la colección mensual (historicos_mensuales)
 * ordenados cronológicamente por ID de mes (ej: "2024-05").
 */
export const obtenerTodoElHistoricoMensual = async (): Promise<ReporteMes[]> => {
  try {
    const mensualRef = collection(db, "historicos_mensuales");
    const q = query(mensualRef, orderBy("__name__", "asc"));
    const querySnapshot = await getDocs(q);

    const historial: ReporteMes[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      historial.push({
        mes_anio: data.mes_anio || doc.id,
        ultima_actualizacion: data.ultima_actualizacion || new Date().toISOString(),
        datos_skap: data.datos_skap || [],
        bpre: data.bpre || [],
      } as ReporteMes);
    });

    return historial;
  } catch (error) {
    console.error("Error al extraer el histórico mensual desde Firestore:", error);
    throw error;
  }
};