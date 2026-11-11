/**
 * Documents gardés sur le téléphone.
 *
 * Le service worker (voir vite.config.ts, runtimeCaching) garde chaque document ouvert dans le
 * cache « lekki-documents » : le rouvrir ne consomme plus de données, et il reste lisible sans
 * réseau. « Garder hors ligne » ne fait que l'ouvrir en arrière-plan pour le mettre en cache.
 * Le jeton dans l'adresse change à chaque session : on compare donc sans les paramètres.
 */
import { fileUrl } from "@/lib/api";

export const DOCUMENTS_CACHE = "lekki-documents";
export const API_CACHE = "lekki-api";

const supported = () => typeof window !== "undefined" && "caches" in window;

function readUrl(fileId: string): string {
  return fileUrl(`/drive/files/${fileId}/preview`);
}

export async function isAvailableOffline(fileId: string): Promise<boolean> {
  if (!supported()) return false;
  try {
    const cache = await caches.open(DOCUMENTS_CACHE);
    return Boolean(await cache.match(readUrl(fileId), { ignoreSearch: true }));
  } catch {
    return false;
  }
}

/** Télécharge le document pour qu'il soit lisible sans réseau. */
export async function keepOffline(fileId: string): Promise<void> {
  if (!supported()) throw new Error("Ce navigateur ne peut pas garder de documents hors ligne.");
  const url = readUrl(fileId);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Téléchargement impossible. Vérifie ta connexion.");
  const copy = response.clone();
  await response.arrayBuffer(); // le service worker l'enregistre au passage
  if (!(await isAvailableOffline(fileId))) {
    // Pas de service worker actif (app non installée, première visite) : on le range nous-mêmes.
    await (await caches.open(DOCUMENTS_CACHE)).put(url, copy);
  }
}

/** À la déconnexion : rien d'un compte ne doit rester sur un téléphone partagé. */
export async function clearOfflineData(): Promise<void> {
  if (!supported()) return;
  await Promise.all([caches.delete(DOCUMENTS_CACHE), caches.delete(API_CACHE)]).catch(() => undefined);
}
