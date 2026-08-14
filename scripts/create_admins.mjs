import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB7mdxoIdv04sA_2aoVKkzp-1k_TLj8Hw0",
  authDomain: "preview-bbe71.firebaseapp.com",
  projectId: "preview-bbe71",
  storageBucket: "preview-bbe71.firebasestorage.app",
  messagingSenderId: "171653395226",
  appId: "1:171653395226:web:8c54c619d7ce9aa1bcf2a3",
};

const app = initializeApp(firebaseConfig, 'AdminCreatorApp');
const auth = getAuth(app);
const db = getFirestore(app);

const admins = [
  "luismanuel.garcia@ab-inbev.com",
  "miguel.riveram@gmail.com.mx",
  "ivan.rojero@gmail.com.mx",
  "obed.calvillo@ab-inbev.com"
];

const tempPassword = "Temporal123!";

async function createAdmins() {
  for (const email of admins) {
    try {
      console.log(`Creating user: ${email}...`);
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      const user = userCredential.user;

      await setDoc(doc(db, 'usuarios', user.uid), {
        email: user.email,
        rol: "admin",
        requiresPasswordChange: true,
        createdAt: new Date().toISOString(),
      });
      
      console.log(`Successfully created admin: ${email}`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`User ${email} already exists.`);
      } else {
        console.error(`Error creating ${email}:`, error);
      }
    }
  }
  
  process.exit(0);
}

createAdmins();
