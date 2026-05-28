import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // 🛠️ Importamos las herramientas para consultar la BD
import { auth, db } from './firebase'; // Asegúrate de exportar 'auth' y 'db' desde tu firebase.ts

interface ExtendedUser extends User {
  rol?: string;
}

const AuthContext = createContext<ExtendedUser | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escucha los cambios de sesión
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 🔍 1. Vamos a Firestore a buscar el documento de este usuario usando su UID
          const userDocRef = doc(db, "usuarios", firebaseUser.uid);
          const userDocSnapshot = await getDoc(userDocRef);

          const usuarioConRol: ExtendedUser = { ...firebaseUser };

          if (userDocSnapshot.exists()) {
            const data = userDocSnapshot.data();
            // 🛡️ 2. Le asignamos el rol que tenga guardado en la base de datos ('admin', 'lider', etc.)
            usuarioConRol.rol = data.rol || 'operador'; 
          } else {
            // Si el usuario está registrado en Auth pero no tiene documento en la BD
            usuarioConRol.rol = 'operador'; 
          }

          setUsuario(usuarioConRol);
        } catch (error) {
          console.error("Error al obtener el rol desde Firestore:", error);
          // Si algo falla, lo dejamos como operador por seguridad
          setUsuario({ ...firebaseUser, rol: 'operador' }); 
        }
      } else {
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