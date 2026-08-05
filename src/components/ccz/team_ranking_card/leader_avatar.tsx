import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { get_initials } from "./utils";

interface LeaderAvatarProps {
  leader?: string;
  is_best: boolean;
  is_worst: boolean;
}

export function LeaderAvatar({ leader, is_best, is_worst }: LeaderAvatarProps) {
  const [image_src, set_image_src] = useState("");
  const [fallback_index, set_fallback_index] = useState(0);

  const get_fallbacks = (name: string): string[] => {
    const clean = name.trim();
    if (!clean) return [];
    
    const parts = clean.split(/\s+/);
    const list: string[] = [];

    // 1. Full name
    list.push(`${clean}.webp`);
    list.push(`${clean}.jpeg`);
    list.push(`${clean}.png`);

    if (parts.length >= 3) {
      // 2. Omit second surname (last word)
      const omitLast = parts.slice(0, -1).join(" ");
      list.push(`${omitLast}.webp`);
      list.push(`${omitLast}.jpeg`);
      list.push(`${omitLast}.png`);
    }

    if (parts.length >= 4) {
      // 3. First name + First surname (e.g. "RAUL DAVID CORTES ALANIZ" -> "RAUL CORTES")
      const firstAndThird = `${parts[0]} ${parts[2]}`;
      list.push(`${firstAndThird}.webp`);
      list.push(`${firstAndThird}.jpeg`);
      list.push(`${firstAndThird}.png`);
    }

    if (parts.length >= 2) {
      // 4. First name + Second word
      const firstTwo = `${parts[0]} ${parts[1]}`;
      list.push(`${firstTwo}.webp`);
      list.push(`${firstTwo}.jpeg`);
      list.push(`${firstTwo}.png`);
      
      // 5. First + Last
      const firstAndLast = `${parts[0]} ${parts[parts.length - 1]}`;
      list.push(`${firstAndLast}.webp`);
      list.push(`${firstAndLast}.jpeg`);
      list.push(`${firstAndLast}.png`);
    }

    return list.map(filename => `/fotos/${filename}?t=${Date.now()}`);
  };

  const fallbacks = leader ? get_fallbacks(leader) : [];

  useEffect(() => {
    if (fallbacks.length > 0) {
      set_image_src(fallbacks[0]);
      set_fallback_index(0);
    } else {
      set_image_src("");
    }
  }, [leader]);

  const handle_image_error = () => {
    const nextIndex = fallback_index + 1;
    if (nextIndex < fallbacks.length) {
      set_fallback_index(nextIndex);
      set_image_src(fallbacks[nextIndex]);
    }
  };

  return (
    <Avatar className={cn(
      "h-8 w-8 border shadow-sm",
      is_best ? "border-yellow-400/50" : is_worst ? "border-rose-400/50" : "border-slate-200"
    )}>
      <AvatarImage 
        src={image_src} 
        className="object-cover"
        onError={handle_image_error}
      />
      <AvatarFallback className={cn(
        "text-[10px] font-bold text-white",
        is_best ? "bg-yellow-500" : is_worst ? "bg-rose-500" : "bg-slate-400"
      )}>
        {get_initials(leader || "NA")}
      </AvatarFallback>
    </Avatar>
  );
}
