/**
 * Liens reçus sur WhatsApp : « /?doc=ID » (un document) et « /?join=CODE » (rejoindre un espace).
 * L'étudiant n'est pas forcément connecté quand il touche le lien : on garde la demande le temps
 * de la connexion ou de l'inscription, puis l'app la traite une fois dans l'espace de travail.
 */
const DOC_KEY = "lekki_pending_doc";
const JOIN_KEY = "lekki_pending_join";

export function capturePendingLinks(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const doc = params.get("doc");
    const join = params.get("join");
    if (doc) sessionStorage.setItem(DOC_KEY, doc);
    if (join) sessionStorage.setItem(JOIN_KEY, join.trim().toUpperCase());
    if (doc || join) {
      params.delete("doc");
      params.delete("join");
      const rest = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
  } catch {
    // sessionStorage indisponible (navigation privée stricte) : le lien ouvre simplement l'app.
  }
}

function take(key: string): string | null {
  try {
    const value = sessionStorage.getItem(key);
    if (value) sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}

export const takePendingDoc = () => take(DOC_KEY);
export const takePendingJoin = () => take(JOIN_KEY);

export function hasPendingJoin(): boolean {
  try {
    return Boolean(sessionStorage.getItem(JOIN_KEY));
  } catch {
    return false;
  }
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/register?join=${encodeURIComponent(code)}`;
}
