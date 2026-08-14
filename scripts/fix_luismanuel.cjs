const { readFileSync } = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

async function run() {
  const email = 'luismanuel.garcia@ab-inbev.com';
  console.log('Actualizando rol de: ' + email);
  try {
    const userRecord = await auth.getUserByEmail(email);
    await db.collection('usuarios').doc(userRecord.uid).set({
      email: email,
      rol: 'admin',
      requiresPasswordChange: true,
    }, { merge: true });
    console.log('✅ Rol actualizado a ADMIN para ' + email);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.log('ℹ️ Usuario no encontrado en Auth, buscando en Firestore...');
      const snap = await db.collection('usuarios').where('email', '==', email).get();
      if (!snap.empty) {
        await snap.docs[0].ref.set({ rol: 'admin' }, { merge: true });
        console.log('✅ Rol actualizado en Firestore');
      } else {
        console.log('❌ Usuario no encontrado en ningún lado');
      }
    } else {
      console.error('❌ Error:', e.message);
    }
  }
  process.exit(0);
}

run();
