const { readFileSync } = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

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
  console.error('4. Ejecuta de nuevo: node scripts/admin_fix.cjs');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'preview-bbe71',
});

const auth = getAuth();
const db = getFirestore();

const USERS_TO_DELETE = [
  'luismanuel.garcia@ab-inbev.com',
  'obed.calvillo@ab-inbev.com',
];

const RESTORE_ADMINS = [
  'ingsoftcecy@gmail.com',
  'adminelaboracion@gmail.com',
  'jorge.garciag@ab-inbev.com',
  'alberto.pinales@ab-inbev.com',
  'jesus.villarreal@ab-inbev.com'
];

async function run() {
  console.log('🔧 Iniciando operaciones de administración CJS...\n');

  // 1. Restaurar rol admin de los administradores oficiales
  console.log(`📋 Restaurando roles de administración para los usuarios autorizados...`);
  for (const email of RESTORE_ADMINS) {
    try {
      const userRecord = await auth.getUserByEmail(email);
      await db.collection('usuarios').doc(userRecord.uid).set({
        email: email,
        rol: 'admin',
        requiresPasswordChange: false,
      }, { merge: true });
      console.log(`  ✅ Rol admin asegurado/restaurado para ${email} (UID: ${userRecord.uid})`);
    } catch (e) {
      console.error(`  ❌ Error con ${email}:`, e.message);
    }
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
