/**
 * Script de administración Firebase
 * Borrar usuarios: luismanuel.garcia@ab-inbev.com, obed.calvillo@ab-inbev.com
 * Restaurar rol admin: ingsoftcecy@gmail.com
 * 
 * INSTRUCCIONES:
 * 1. Ve a https://console.firebase.google.com/project/preview-bbe71/settings/serviceaccounts/adminsdk
 * 2. Haz clic en "Generar nueva clave privada"
 * 3. Guarda el archivo JSON descargado en esta carpeta como "serviceAccountKey.json"
 * 4. Ejecuta: node scripts/admin_fix.mjs
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// Verificar que existe el archivo de credenciales
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
} catch (e) {
  console.error('❌ No se encontró serviceAccountKey.json');
  console.error('');
  console.error('Pasos:');
  console.error('1. Ve a: https://console.firebase.google.com/project/preview-bbe71/settings/serviceaccounts/adminsdk');
  console.error('2. Clic en "Generar nueva clave privada"');
  console.error('3. Guarda el JSON descargado aquí como: serviceAccountKey.json');
  console.error('4. Ejecuta de nuevo: node scripts/admin_fix.mjs');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'preview-bbe71',
});

const auth = admin.auth();
const db = admin.firestore();

const USERS_TO_DELETE = [
  'luismanuel.garcia@ab-inbev.com',
  'obed.calvillo@ab-inbev.com',
];

const RESTORE_ADMIN = 'ingsoftcecy@gmail.com';

async function run() {
  console.log('🔧 Iniciando operaciones de administración...\n');

  // 1. Restaurar rol admin de ingsoftcecy@gmail.com
  console.log(`📋 Restaurando rol admin para: ${RESTORE_ADMIN}`);
  try {
    const userRecord = await auth.getUserByEmail(RESTORE_ADMIN);
    await db.collection('usuarios').doc(userRecord.uid).set({
      email: RESTORE_ADMIN,
      rol: 'admin',
      requiresPasswordChange: false,
    }, { merge: true });
    console.log(`  ✅ Rol admin restaurado para ${RESTORE_ADMIN} (UID: ${userRecord.uid})`);
  } catch (e) {
    console.error(`  ❌ Error con ${RESTORE_ADMIN}:`, e.message);
  }

  // 2. Borrar usuarios de Auth + Firestore
  console.log('\n🗑️  Borrando usuarios...');
  for (const email of USERS_TO_DELETE) {
    console.log(`  Borrando: ${email}`);
    try {
      const userRecord = await auth.getUserByEmail(email);
      const uid = userRecord.uid;
      
      // Borrar de Firestore
      await db.collection('usuarios').doc(uid).delete();
      console.log(`    ✅ Documento Firestore borrado`);
      
      // Borrar de Auth
      await auth.deleteUser(uid);
      console.log(`    ✅ Usuario Auth borrado`);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        console.log(`    ℹ️ Usuario no encontrado (ya fue borrado o nunca existió)`);
      } else {
        console.error(`    ❌ Error:`, e.message);
      }
    }
  }

  console.log('\n✅ Operaciones completadas.');
  process.exit(0);
}

run().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
