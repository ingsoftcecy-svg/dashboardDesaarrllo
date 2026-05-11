import { useState, useEffect } from "react";
import { ClipboardList } from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { STRINGS } from "./constants";

interface IpMediatorProps {
  operator_id: string;
  operator_name: string;
}

export function IpMediator({ operator_id, operator_name }: IpMediatorProps) {
  const [global_ips, set_global_ips] = useState<string[]>([]);
  const [assigned_ips, set_assigned_ips] = useState<string[]>([]);
  const [new_ip_input, set_new_ip_input] = useState("");

  useEffect(() => {
    const unsubscribe_global = onSnapshot(doc(db, "config", "ips"), (snapshot) => {
      if (snapshot.exists()) {
        set_global_ips(snapshot.data().list || []);
      }
    });
    
    const unsubscribe_operator = onSnapshot(doc(db, "operator_ips", operator_id), (snapshot) => {
      if (snapshot.exists()) {
        set_assigned_ips(snapshot.data().assigned || []);
      }
    });
    
    return () => { 
      unsubscribe_global(); 
      unsubscribe_operator(); 
    };
  }, [operator_id]);

  const toggle_assignment = async (ip_address: string) => {
    const next_assignments = assigned_ips.includes(ip_address) 
      ? assigned_ips.filter(ip => ip !== ip_address) 
      : [...assigned_ips, ip_address];
      
    set_assigned_ips(next_assignments);
    await setDoc(
      doc(db, "operator_ips", operator_id), 
      { assigned: next_assignments, operatorName: operator_name }, 
      { merge: true }
    );
  };

  const add_global_ip = async () => {
    if (!new_ip_input) return;
    const next_global_list = [...global_ips, new_ip_input];
    await setDoc(doc(db, "config", "ips"), { list: next_global_list });
    set_new_ip_input("");
  };

  const handle_key_down = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      add_global_ip();
    }
  };

  const remove_global_ip = async (ip_address: string) => {
    const next_global_list = global_ips.filter(ip => ip !== ip_address);
    await setDoc(doc(db, "config", "ips"), { list: next_global_list });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {assigned_ips.map(ip_address => (
          <div key={ip_address} className="rounded bg-sky-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm flex items-center gap-1 group">
            {ip_address}
            <button onClick={() => toggle_assignment(ip_address)} className="hover:text-red-200">×</button>
          </div>
        ))}
      </div>
      
      <Dialog>
        <DialogTrigger asChild>
          <button className="h-6 w-6 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center transition-colors shadow-sm border border-sky-200" title={STRINGS.MANAGE_IPS_TITLE}>
            <ClipboardList className="h-3.5 w-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogTitle>{STRINGS.MANAGE_IPS_TITLE} - {operator_name}</DialogTitle>
          <div className="space-y-4 py-4">
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">{STRINGS.SELECT_IPS_SUBTITLE}</h4>
              <div className="flex flex-wrap gap-2">
                {global_ips.map(ip_address => (
                  <button
                    key={ip_address}
                    onClick={() => toggle_assignment(ip_address)}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase transition-all",
                      assigned_ips.includes(ip_address) ? "bg-[#1a4491] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {ip_address}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">{STRINGS.GLOBAL_LIST_SUBTITLE}</h4>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={new_ip_input}
                  onChange={(e) => set_new_ip_input(e.target.value)}
                  placeholder="Nueva IP..." 
                  className="flex-1 text-xs border rounded px-2 py-1"
                  onKeyDown={handle_key_down}
                />
                <button 
                  onClick={add_global_ip}
                  className="bg-green-600 text-white text-[10px] px-2 py-1 rounded font-bold"
                >
                  {STRINGS.ADD_BUTTON}
                </button>
              </div>
              <div className="space-y-1">
                {global_ips.map(ip_address => (
                  <div key={ip_address} className="flex items-center justify-between bg-slate-50 p-1.5 rounded text-[10px] font-medium">
                    {ip_address}
                    <button onClick={() => remove_global_ip(ip_address)} className="text-red-500 hover:text-red-700 font-bold">
                      {STRINGS.REMOVE_BUTTON}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
