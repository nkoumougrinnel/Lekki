import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Prévient quand le réseau tombe : on lit ce qui est déjà sur le téléphone, l'IA attend. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="flex shrink-0 items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-xs text-amber-200">
      <WifiOff className="h-3.5 w-3.5" />
      Hors ligne : les documents déjà ouverts restent lisibles. L’IA reviendra avec le réseau.
    </div>
  );
}
