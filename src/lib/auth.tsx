import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { registrarEvento } from './auditLog';

// ── Configuración de inactividad ───────────────────────────────────────────
const INACTIVIDAD_LIMITE_MS  = 30 * 60 * 1000; // 30 min → cierre de sesión
const INACTIVIDAD_AVISO_MS   = 25 * 60 * 1000; // 25 min → mostrar advertencia
const INTERVALO_REVISION_MS  =  1 * 60 * 1000; // Revisar cada minuto

interface ExtendedUser extends User {
  rol?: string;
}

const AuthContext = createContext<ExtendedUser | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarAviso, setMostrarAviso] = useState(false);

  // Refs para acceder al estado actual sin recrear listeners
  const usuarioRef         = useRef<ExtendedUser | null>(null);
  const ultimaActividadRef = useRef<number>(Date.now());

  // ── Medidas de seguridad avanzadas (Anti-Copia, Anti-Inspección, Desenfoque en Blur) ──
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

    // 3. Ocultar/Difuminar la pantalla al perder el foco (evitar capturas con herramientas externas)
    const handleBlur = () => {
      document.body.style.filter = 'blur(25px)';
    };
    
    const handleFocus = () => {
      document.body.style.filter = 'none';
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('copy', prevenirAccion);
      document.removeEventListener('cut', prevenirAccion);
      document.removeEventListener('contextmenu', prevenirAccion);
      window.removeEventListener('keydown', handleKeydown, true);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // ── Cierre automático por inactividad ─────────────────────────────────
  useEffect(() => {
    // Registrar actividad solo en click y tecla (no mouse movement/scroll)
    const registrarActividad = () => {
      ultimaActividadRef.current = Date.now();
      setMostrarAviso(false);
    };
    window.addEventListener('click',   registrarActividad);
    window.addEventListener('keydown', registrarActividad);

    // Revisar inactividad cada minuto
    const intervalo = setInterval(async () => {
      if (!usuarioRef.current) return;

      const inactivo = Date.now() - ultimaActividadRef.current;

      if (inactivo >= INACTIVIDAD_LIMITE_MS) {
        const u = usuarioRef.current;
        await registrarEvento(
          u.uid, u.email ?? '', u.rol ?? 'operador',
          'SESION_EXPIRADA', 'Cierre automático por 30 min de inactividad'
        );
        setMostrarAviso(false);
        await signOut(auth);
      } else if (inactivo >= INACTIVIDAD_AVISO_MS) {
        setMostrarAviso(true);
      }
    }, INTERVALO_REVISION_MS);

    return () => {
      window.removeEventListener('click',   registrarActividad);
      window.removeEventListener('keydown', registrarActividad);
      clearInterval(intervalo);
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

          usuarioRef.current           = usuarioConRol;
          ultimaActividadRef.current   = Date.now(); // reiniciar timer al iniciar sesión
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
        setMostrarAviso(false);
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
      {/* Aviso de inactividad — aparece 5 min antes del cierre automático */}
      {mostrarAviso && usuario && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-400 text-amber-950 px-4 py-2.5 text-center text-sm font-bold shadow-lg">
          ⚠️ Tu sesión cerrará en 5 minutos por inactividad. Haz clic en cualquier lugar para continuar.
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}