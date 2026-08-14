const { readFileSync } = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const USERS_TO_DELETE = [
  'luismanuel.garcia@ab-inbev.com',
  'obed.calvillo@ab-inbev.com',
];

const RESTORE_ADMIN = 'ingsoftcecy@gmail.com';

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
} catch (e) {
  console.error('❌ No se encontró serviceAccountKey.json en la raíz del proyecto.');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

async function run() {
  console.log('🔧 Iniciando operaciones de administración...\n');

  // 1. Restaurar rol admin de ingsoftcecy@gmail.com
  console.log('📋 Restaurando rol admin para: ' + RESTORE_ADMIN);
  try {
    const userRecord = await auth.getUserByEmail(RESTORE_ADMIN);
    await db.collection('usuarios').doc(userRecord.uid).set({
      email: RESTORE_ADMIN,
      rol: 'admin',
      requiresPasswordChange: false,
    }, { merge: true });
    console.log('  ✅ Rol admin restaurado para ' + RESTORE_ADMIN + ' (UID: ' + userRecord.uid + ')');
  } catch (e) {
    console.error('  ❌ Error con ' + RESTORE_ADMIN + ':', e.message);
  }

  // 2. Borrar usuarios de Auth + Firestore
  console.log('\n🗑️  Borrando usuarios...');
  for (const email of USERS_TO_DELETE) {
    console.log('  Borrando: ' + email);
    try {
      const userRecord = await auth.getUserByEmail(email);
      const uid = userRecord.uid;
      
      await db.collection('usuarios').doc(uid).delete();
      console.log('    ✅ Documento Firestore borrado');
      
      await auth.deleteUser(uid);
      console.log('    ✅ Usuario Auth borrado');
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        console.log('    ℹ️ Usuario no encontrado (ya fue borrado o nunca existió)');
      } else {
        console.error('    ❌ Error:', e.message);
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
