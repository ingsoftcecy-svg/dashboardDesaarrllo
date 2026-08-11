import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function restoreFirestoreGuias() {
  const backupPath = path.join(__dirname, '..', 'backup_evaluaciones_guias_tecnicas_LATEST.json');
  
  if (!fs.existsSync(backupPath)) {
    console.error("❌ No se encontró el archivo de respaldo backup_evaluaciones_guias_tecnicas_LATEST.json!");
    process.exit(1);
  }

  console.log("🔄 RESTAURANDO EVALUACIONES DESDE EL RESPALDO...");
  const rawData = fs.readFileSync(backupPath, 'utf-8');
  const backupData = JSON.parse(rawData);

  let restoredCount = 0;
  for (const docId of Object.keys(backupData)) {
    const docData = backupData[docId];
    const docRef = doc(db, "evaluaciones_guias_tecnicas", docId);
    await setDoc(docRef, docData, { merge: true });
    restoredCount++;
    console.log(`[RESTAURADO ${restoredCount}/${Object.keys(backupData).length}] SHARP: ${docId}`);
  }

  console.log(`🎉 RESTAURACIÓN COMPLETADA! Se restauraron ${restoredCount} documentos intactos.`);
  process.exit(0);
}

restoreFirestoreGuias().catch(err => {
  console.error("❌ Error durante la restauración:", err);
  process.exit(1);
});
