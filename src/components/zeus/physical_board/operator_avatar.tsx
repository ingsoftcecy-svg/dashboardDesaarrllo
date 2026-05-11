import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { get_initials } from "./utils";

interface OperatorAvatarProps {
  operator_name: string;
}

export function OperatorAvatar({ operator_name }: OperatorAvatarProps) {
  const [image_src, set_image_src] = useState(`/fotos/${operator_name.trim()}.jpeg?t=${Date.now()}`);

  const handle_image_error = () => {
    if (image_src.includes('.jpeg')) {
      set_image_src(`/fotos/${operator_name.trim()}.png?t=${Date.now()}`);
    }
  };

  return (
    <Avatar className="h-12 w-12 shrink-0 rounded-md shadow-sm border border-slate-200">
      <AvatarImage 
        src={image_src} 
        alt={operator_name} 
        className="object-cover"
        onError={handle_image_error}
      />
      <AvatarFallback className="rounded-md bg-gradient-to-br from-[#1a4491] to-[#2c65cc] text-lg font-bold text-white">
        {get_initials(operator_name)}
      </AvatarFallback>
    </Avatar>
  );
}
