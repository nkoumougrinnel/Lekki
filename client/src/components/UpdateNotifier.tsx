import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";

export function UpdateNotifier() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (
          window.confirm(
            "Une nouvelle version de Lekki est disponible. Mettre à jour maintenant ?"
          )
        ) {
          void updateServiceWorker(true);
        }
      },
    });
  }, []);

  return null;
}
