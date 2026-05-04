import { systemColors, type SystemKey } from "@/data/zeus";
import { cn } from "@/lib/utils";

export function SystemBadge({ system }: { system: SystemKey }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
        systemColors[system],
      )}
    >
      {system}
    </span>
  );
}
