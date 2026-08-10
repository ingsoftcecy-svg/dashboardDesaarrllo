import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function check() {
  const catalogSnap = await getDoc(doc(db, "config_dashboard", "catalogos_fijos"));
  if (catalogSnap.exists()) {
    const data = catalogSnap.data();
    console.log("eac length:", data.eac?.length);
    console.log("eabf length:", data.eabf?.length);
  } else {
    console.log("Document does not exist!");
  }
  process.exit(0);
}

check();
