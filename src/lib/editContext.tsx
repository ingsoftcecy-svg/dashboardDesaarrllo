import { createContext, useContext } from "react";
import { useAuth } from "@/lib/auth";

const EditContext = createContext<boolean>(false);

export function EditProvider({ children }: { children: React.ReactNode }) {
  const usuario = useAuth();
  const puedeEditar = usuario?.rol === 'admin';
  
  return (
    <EditContext.Provider value={!!puedeEditar}>
      {children}
    </EditContext.Provider>
  );
}
export const useEditMode = () => useContext(EditContext);