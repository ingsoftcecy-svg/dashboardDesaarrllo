import { useState, useEffect } from "react";

interface AtoEditorProps {
  operator_id: string;
  operator_name: string;
  initial_ato: number;
  puedeEditar?: boolean;
}

export function AtoEditor({ operator_id, operator_name, initial_ato, puedeEditar = false }: AtoEditorProps) {
  const [ato_value, set_ato_value] = useState(initial_ato);

  useEffect(() => {
    set_ato_value(initial_ato);
  }, [initial_ato]);

  return (
    <div className="mx-auto flex w-full max-w-[100px] flex-col overflow-hidden rounded border border-[#1a4491] shadow-sm select-none">
      <div className="bg-[#1a4491] py-0.5 text-[10px] font-bold text-white uppercase text-center">
        ATO
      </div>
      <div className="flex h-10 items-center justify-center bg-slate-200 text-lg font-black text-slate-800">
        {ato_value}
      </div>
    </div>
  );
}
