declare module "virtual:pwa-register" {
  export function registerSW(options?: {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (sw: ServiceWorkerRegistration | undefined, offlineReady: boolean) => void;
    onRegisterError?: (err: any) => void;
  }): (reloadPage?: boolean) => Promise<void>;
}
