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

async function uploadOperators() {
  const publicDir = path.join(__dirname, '..', 'public');
  const operatorsPath = path.join(publicDir, 'operators.json');
  const cursosPath = path.join(publicDir, 'cursos_resumen.json');
  const guiasPath = path.join(publicDir, 'guias_tecnicas.json');

  if (!fs.existsSync(operatorsPath)) {
    console.error("❌ operators.json no encontrado. Ejecuta 'npm run build' primero.");
    process.exit(1);
  }

  const operators = JSON.parse(fs.readFileSync(operatorsPath, 'utf-8'));
  const cursos = fs.existsSync(cursosPath) ? JSON.parse(fs.readFileSync(cursosPath, 'utf-8')) : {};
  const guias = fs.existsSync(guiasPath) ? JSON.parse(fs.readFileSync(guiasPath, 'utf-8')) : {};

  console.log(`📦 Encontrados ${operators.length} operadores. Fusionando cursos y subiendo a Firebase...`);

  let count = 0;
  for (const op of operators) {
    // Merge courses into operator
    if (cursos[op.id]) {
      op.cursos = cursos[op.id];
    }

    const docRef = doc(db, "operators", op.id);
    await setDoc(docRef, op, { merge: true });
    count++;
    if (count % 25 === 0) console.log(`  Subidos ${count}/${operators.length}...`);
  }

  console.log(`✅ ¡Éxito! ${count} operadores subidos a Firebase correctamente.`);

  // Subir guías técnicas
  if (Object.keys(guias).length > 0) {
    console.log(`📚 Subiendo catálogo de Guías Técnicas a config_dashboard/guias_tecnicas...`);
    try {
      const guiasRef = doc(db, "config_dashboard", "guias_tecnicas");
      await setDoc(guiasRef, { catalogo: guias }, { merge: true });
      console.log(`✅ Guías Técnicas subidas exitosamente.`);
    } catch (e) {
      console.error("❌ Error subiendo guías técnicas (revisa los permisos en config_dashboard):", e.message);
    }
  }

  process.exit(0);
}

uploadOperators().catch(err => {
  console.error("❌ Error subiendo a Firebase:", err);
  process.exit(1);
});
