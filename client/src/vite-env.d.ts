declare module "virtual:pwa-register" {
  export function registerSW(options?: {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (sw: ServiceWorkerRegistration | undefined, offlineReady: boolean) => void;
    onRegisterError?: (err: any) => void;
  }): {
    needRefresh: { value: boolean };
    updateServiceWorker: (opts?: { reloadPage?: boolean }) => Promise<void>;
  };
}
