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

  // ── Medidas de seguridad avanzadas (Anti-Copia, Anti-Inspección) ──
  useEffect(() => {
    // 1. Evitar copiar, cortar y menú contextual (clic derecho)
    const prevenirAccion = (e: Event) => {
      e.preventDefault();
    };
    
    document.addEventListener('copy', prevenirAccion);
    document.addEventListener('cut', prevenirAccion);
    document.addEventListener('contextmenu', prevenirAccion);

    // 2. Bloquear combinaciones de teclado de copiado y herramientas de desarrollo (F12, Ctrl+U, Ctrl+Shift+I, etc.)
    const handleKeydown = (e: KeyboardEvent) => {
      if (
        // Ctrl+C, Ctrl+X, Ctrl+U (ver código fuente)
        (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X' || e.key === 'u' || e.key === 'U')) ||
        // Ctrl+Shift+I (inspeccionar), Ctrl+Shift+J (consola), Ctrl+Shift+C (inspeccionar elemento)
        (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J' || e.key === 'c' || e.key === 'C')) ||
        // F12 (devtools)
        e.key === 'F12'
      ) {
        e.preventDefault();
      }

      // Intentar interceptar PrintScreen (Impr Pant)
      if (e.key === 'PrintScreen') {
        try {
          navigator.clipboard.writeText(''); // Limpia el portapapeles
        } catch (_) {}
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeydown, true);

    return () => {
      document.removeEventListener('copy', prevenirAccion);
      document.removeEventListener('cut', prevenirAccion);
      document.removeEventListener('contextmenu', prevenirAccion);
      window.removeEventListener('keydown', handleKeydown, true);
    };
  }, []);

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