import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function backupFirestoreGuias() {
  console.log("📦 Iniciando RESPALDO DE SEGURIDAD de evaluaciones_guias_tecnicas desde Firestore...");

  const colRef = collection(db, "evaluaciones_guias_tecnicas");
  const snap = await getDocs(colRef);

  const backupData = {};
  snap.forEach(docSnap => {
    backupData[docSnap.id] = docSnap.data();
  });

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup_evaluaciones_guias_tecnicas_${timestampStr}.json`;
  const latestBackupFileName = `backup_evaluaciones_guias_tecnicas_LATEST.json`;

  const backupPath = path.join(__dirname, '..', backupFileName);
  const latestBackupPath = path.join(__dirname, '..', latestBackupFileName);

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  fs.writeFileSync(latestBackupPath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`✅ RESPALDO COMPLETADO EXITOSAMENTE!`);
  console.log(`   Documentos respaldados: ${Object.keys(backupData).length}`);
  console.log(`   Archivo 1: ${backupFileName}`);
  console.log(`   Archivo 2: ${latestBackupFileName}`);
  process.exit(0);
}

backupFirestoreGuias().catch(err => {
  console.error("❌ Error creando el respaldo:", err);
  process.exit(1);
});
