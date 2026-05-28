// src/lib/uploadExcel.ts
import * as XLSX from 'xlsx';
import { db } from './firebase'; // Nos aseguramos de importar la 'db' que acabas de exportar
import { doc, setDoc } from 'firebase/firestore';

interface GuardarHistoricoParams {
  file: File;
  mes_anio: string;      // Formato esperado: "2026-05" (si se prefiere semántica mensual)
  tipoArchivo: 'datos_skap' | 'base_equipos' | 'eac' | 'eabf' | 'bpre'; 
}

export const procesarYGuardarExcel = ({ file, mes_anio, tipoArchivo }: GuardarHistoricoParams): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        // Leemos el archivo Excel con SheetJS
        const workbook = XLSX.read(data, { type: 'binary' });

        // Tomamos la primera pestaña/hoja del libro de Excel
        const primeraHojaName = workbook.SheetNames[0];
        const hojaMatriz = workbook.Sheets[primeraHojaName];

        // Convertimos las filas y columnas a un formato JSON limpio (Array de objetos)
        const datosJson = XLSX.utils.sheet_to_json(hojaMatriz);

        // Apuntamos al documento del mes en la colección de históricos
        const docRef = doc(db, "historicos_excel", mes_anio);

        // Guardamos o actualizamos en Firestore usando merge: true
        await setDoc(docRef, {
          mes_anio: mes_anio,
          ultima_actualizacion: new Date().toISOString(),
          [tipoArchivo]: datosJson // Esto guarda dinámicamente el arreglo bajo la clave del archivo correspondiente
        }, { merge: true });

        resolve();
      } catch (error) {
        console.error("Error al procesar el archivo Excel:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};