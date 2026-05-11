import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { get_initials } from "./utils";

interface LeaderAvatarProps {
  leader?: string;
  is_best: boolean;
  is_worst: boolean;
}

export function LeaderAvatar({ leader, is_best, is_worst }: LeaderAvatarProps) {
  const [image_src, set_image_src] = useState(`/fotos/${leader?.trim()}.jpeg?t=${Date.now()}`);
  
  const handle_image_error = () => {
    if (image_src.includes('.jpeg')) {
      set_image_src(`/fotos/${leader?.trim()}.png?t=${Date.now()}`);
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
