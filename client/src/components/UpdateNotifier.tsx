import { useEffect } from "react";

export function UpdateNotifier() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && !refreshing) {
            if (navigator.serviceWorker.controller) {
              refreshing = true;
              if (
                window.confirm(
                  "Une nouvelle version de Lekki est disponible. Mettre à jour maintenant ?"
                )
              ) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            }
          }
        });
      });
    });
  }, []);

  return null;
}
