// src/lib/auditLog.ts
// Módulo de auditoría: registra eventos de seguridad en Firestore.
// Los errores se capturan silenciosamente para no interrumpir el flujo principal.

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type TipoEvento =
  | 'LOGIN'
  | 'LOGOUT'
  | 'SESION_EXPIRADA'
  | 'CARGA_DATOS';

/**
 * Registra un evento de auditoría en la colección `audit_logs` de Firestore.
 * Solo los administradores pueden leer estos registros (ver firestore.rules).
 */
export const registrarEvento = async (
  uid: string,
  email: string,
  rol: string,
  tipo: TipoEvento,
  detalle?: string
): Promise<void> => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      uid,
      email,
      rol,
      tipo,
      detalle: detalle ?? '',
      timestamp: serverTimestamp(),
    });
  } catch {
    // Silencioso: el log nunca debe bloquear la operación del usuario
  }
};
