import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, deleteField } from 'firebase/firestore';
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

async function run() {
  console.log("Reading operators...");
  const operatorsData = fs.readFileSync(path.resolve(__dirname, '../public/operators.json'), 'utf8');
  const operators = JSON.parse(operatorsData);

  const mantenimientoOps = operators.filter(o => (o.area || '').toLowerCase().includes('mantenimiento'));
  console.log(`Found ${mantenimientoOps.length} operators in Mantenimiento.`);

  let i = 0;
  for (const op of mantenimientoOps) {
    i++;
    console.log(`[${i}/${mantenimientoOps.length}] Reverting assignments for ${op.nombre} (${op.id})...`);
    const docRef = doc(db, "operator_ips", op.id);
    try {
      await updateDoc(docRef, { 
        assigned: deleteField(),
        hasManualOverride: false 
      });
    } catch (e) {
      // If the document doesn't exist, it means they already have the default values anyway.
      console.log(`- Document didn't exist or already reverted for ${op.nombre}, skipping...`);
    }
  }

  console.log("\nNote: El banco global (config/ips) fue vaciado en el script anterior. No se puede restaurar mágicamente a menos que lo repobles con el botón desde la interfaz.");

  console.log("Done! Exiting.");
  process.exit(0);
}

run().catch(console.error);
