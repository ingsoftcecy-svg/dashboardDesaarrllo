import { useState, useEffect } from "react";
import { Operator } from "@/data/ccz";

export function useOperators() {
  const [operators, setOperators] = useState<Record<string, Partial<Operator>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/operators.json?t=${timestamp}`);
        const data = await res.json();
        
        const opsMap: Record<string, Partial<Operator>> = {};
        data.forEach((op: any) => {
          opsMap[op.id] = {
            id: op.id,
            nombre: op.nombre,
            puesto: op.puesto,
            equipoAutonomo: op.equipoAutonomo,
            lider: op.lider,
            // Fallbacks for other expected fields if needed
            roles: op.roles || [],
          };
        });
        
        setOperators(opsMap);
      } catch (err) {
        console.error("Error loading centralized operators:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOperators();
  }, []);

  return { operators, loading };
}
