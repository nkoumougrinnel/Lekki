/**
 * Partage depuis le téléphone : la feuille de partage native (WhatsApp, Telegram…) quand elle
 * existe, sinon copie du lien. Le lien ouvre Lekki sur le document ; seuls les membres de
 * l'espace peuvent le lire.
 */
import { toast } from "sonner";
import type { DriveFile } from "@/types/lekki";
import { prettyName } from "@/lib/studentDocs";

export function documentLink(fileId: string): string {
  return `${window.location.origin}/?doc=${encodeURIComponent(fileId)}`; // lu par lib/pendingLinks
}

export async function shareText(title: string, text: string, url?: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return; // l'étudiant a annulé
    }
  }
  try {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
    toast.success("Copié. Colle-le dans WhatsApp.");
  } catch {
    toast.info(url ?? text);
  }
}

export function shareDocument(file: Pick<DriveFile, "id" | "name">): Promise<void> {
  const title = prettyName(file.name);
  return shareText(title, `« ${title} » sur Lekki`, documentLink(file.id));
}
