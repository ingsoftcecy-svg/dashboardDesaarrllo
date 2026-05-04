import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { Status } from "@/data/zeus";

export function StatusIcon({ status }: { status: Status }) {
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (status === "warn") return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  return <XCircle className="h-5 w-5 text-red-600" />;
}

export function statusLabel(status: Status) {
  return status === "ok" ? "En meta" : status === "warn" ? "Atención" : "Desviado";
}
