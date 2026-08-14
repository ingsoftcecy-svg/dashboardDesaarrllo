import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';

export async function createUserWithTemporaryPassword(email: string, tempPassword: string, role: string = 'operador') {
  let secondaryApp;
  try {
    secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
  } catch (err: any) {
    if (err.code === 'app/duplicate-app') {
      const { getApp } = await import('firebase/app');
      secondaryApp = getApp('SecondaryApp');
    } else {
      throw err;
    }
  }
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
    const user = userCredential.user;

    // Create the user document in Firestore with the assigned role
    await setDoc(doc(db, 'usuarios', user.uid), {
      email: user.email,
      rol: role,
      requiresPasswordChange: true,
      createdAt: new Date().toISOString(),
    });

    // Sign out the secondary app and delete the instance to clean up
    await secondaryAuth.signOut();
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function fixUserRole(email: string, tempPassword: string, role: string = 'admin') {
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  let secondaryApp;
  try {
    secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
  } catch (err: any) {
    if (err.code === 'app/duplicate-app') {
      const { getApp } = await import('firebase/app');
      secondaryApp = getApp('SecondaryApp');
    } else {
      throw err;
    }
  }
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await signInWithEmailAndPassword(secondaryAuth, email, tempPassword);
    const user = userCredential.user;

    await setDoc(doc(db, 'usuarios', user.uid), {
      email: user.email,
      rol: role,
      requiresPasswordChange: true,
      createdAt: new Date().toISOString(),
    });

    await secondaryAuth.signOut();
    return user;
  } catch (error) {
    console.error('Error fixing user role:', error);
    throw error;
  }
}
