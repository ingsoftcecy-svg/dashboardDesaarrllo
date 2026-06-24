import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { registrarEvento } from './auditLog';

interface ExtendedUser extends User {
  rol?: string;
}

const AuthContext = createContext<ExtendedUser | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs para acceder al estado actual sin recrear listeners
  const usuarioRef = useRef<ExtendedUser | null>(null);


  // ── Escuchar cambios de autenticación ─────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef      = doc(db, 'usuarios', firebaseUser.uid);
          const userDocSnapshot = await getDoc(userDocRef);
          const usuarioConRol: ExtendedUser = { ...firebaseUser };

          if (userDocSnapshot.exists()) {
            usuarioConRol.rol = userDocSnapshot.data().rol || 'operador';
          } else {
            usuarioConRol.rol = 'operador';
          }

          usuarioRef.current = usuarioConRol;
          setUsuario(usuarioConRol);

          // Registrar evento de LOGIN
          await registrarEvento(
            usuarioConRol.uid, usuarioConRol.email ?? '',
            usuarioConRol.rol ?? 'operador', 'LOGIN'
          );
        } catch (error) {
          console.error('Error al obtener el rol desde Firestore:', error);
          setUsuario({ ...firebaseUser, rol: 'operador' });
        }
      } else {
        usuarioRef.current = null;
        setUsuario(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b1329] text-white font-semibold">
        <div className="animate-pulse">Verificando credenciales...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={usuario}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}