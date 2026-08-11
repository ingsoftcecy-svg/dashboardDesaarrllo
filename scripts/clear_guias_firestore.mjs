import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB7mdxoIdv04sA_2aoVKkzp-1k_TLj8Hw0",
  authDomain: "preview-bbe71.firebaseapp.com",
  projectId: "preview-bbe71",
  storageBucket: "preview-bbe71.firebasestorage.app",
  messagingSenderId: "171653395226",
  appId: "1:171653395226:web:8c54c619d7ce9aa1bcf2a3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearGuiasFirestore() {
  console.log("🧹 INICIANDO LIMPIEZA DE EVALUACIONES ANTERIORES EN FIRESTORE...");
  const collectionRef = collection(db, "evaluaciones_guias_tecnicas");
  const snap = await getDocs(collectionRef);

  console.log(`Total documentos encontrados a eliminar: ${snap.size}`);

  let deletedCount = 0;
  for (const docSnap of snap.docs) {
    await deleteDoc(doc(db, "evaluaciones_guias_tecnicas", docSnap.id));
    deletedCount++;
    console.log(`[ELIMINADO ${deletedCount}/${snap.size}] SHARP ID: ${docSnap.id}`);
  }

  console.log("✨ LIMPIEZA COMPLETADA: Se eliminaron todas las evaluaciones anteriores de Firestore.");
  console.log("💡 A partir de este momento la base de datos se ira poblando unicamente con las guias con Formato Nuevo (V2).");
}

clearGuiasFirestore().catch(console.error);
