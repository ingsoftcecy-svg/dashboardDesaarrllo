import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LeaderComboboxProps {
  value: string;
  onChange: (value: string) => void;
  operadores: any[];
}

export function LeaderCombobox({ value, onChange, operadores }: LeaderComboboxProps) {
  const [open, setOpen] = useState(false);

  // Extract unique operator names, ensuring no duplicates and filtering out empty names
  const uniqueNames = Array.from(new Set((operadores || []).map(op => op.nombre))).filter(Boolean);
  
  const options = uniqueNames.map(name => ({
    value: name,
    label: name,
  }));

  // Also include the current value if it's not in the list (e.g., loaded from static data but not in operators)
  if (value && value !== "N/A" && !uniqueNames.includes(value)) {
    options.unshift({ value, label: value });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[160px] h-6 px-2 justify-between text-[10px] text-slate-800 bg-white"
        >
          <span className="truncate">{value || "Buscar..."}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar empleado..." className="text-xs h-8" />
          <CommandList>
            <CommandEmpty className="text-xs py-2 text-center text-slate-500">Sin resultados.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="text-xs py-1 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3 text-emerald-600",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
