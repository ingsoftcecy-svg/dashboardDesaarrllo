import { useState, useEffect } from "react";
import { Maximize, Minimize } from "lucide-react";
import { STRINGS } from "./constants";

export function FullscreenButton() {
  const [is_fullscreen, set_is_fullscreen] = useState(false);

  useEffect(() => {
    const handle_fullscreen_change = () => {
      set_is_fullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handle_fullscreen_change);
    return () => {
      document.removeEventListener("fullscreenchange", handle_fullscreen_change);
    };
  }, []);

  const toggle_fullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(error => {
        console.error(`Error attempting to enable full-screen mode: ${error.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <button
      onClick={toggle_fullscreen}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white transition-all hover:bg-slate-900 hover:scale-105 active:scale-95 shadow-md shadow-slate-900/20"
      title={is_fullscreen ? STRINGS.EXIT_FULLSCREEN : STRINGS.ENTER_FULLSCREEN}
    >
      {is_fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
    </button>
  );
}
