/**
 * Choisir des fichiers dans son propre Google Drive avec le Google Picker.
 *
 * Portée « drive.file » : Lekki n'obtient l'accès qu'aux fichiers que l'étudiant choisit,
 * jamais au reste de son Drive. Le jeton est remis au serveur pour cet import seulement.
 */
import type { GoogleDriveConfig } from "@/lib/api";

const SCOPE = "https://www.googleapis.com/auth/drive.file";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

const loaded = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  if (!loaded.has(src)) {
    loaded.set(
      src,
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
          loaded.delete(src);
          reject(new Error("Impossible de joindre Google. Vérifie ta connexion."));
        };
        document.head.appendChild(script);
      })
    );
  }
  return loaded.get(src)!;
}

async function loadPicker(): Promise<void> {
  await Promise.all([
    loadScript("https://accounts.google.com/gsi/client"),
    loadScript("https://apis.google.com/js/api.js"),
  ]);
  await new Promise<void>((resolve, reject) =>
    window.gapi.load("picker", { callback: resolve, onerror: () => reject(new Error("Google Picker indisponible.")) })
  );
}

function requestToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error === "access_denied" ? "Accès refusé." : "Connexion Google annulée."));
      },
      error_callback: () => reject(new Error("Connexion Google annulée.")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export interface PickedFiles {
  accessToken: string;
  fileIds: string[];
}

/** Ouvre la connexion Google puis le Picker. `null` si l'étudiant ferme sans rien choisir. */
export async function pickDriveFiles(config: GoogleDriveConfig): Promise<PickedFiles | null> {
  if (!config.client_id || !config.api_key) throw new Error("Google Drive n'est pas configuré.");
  await loadPicker();
  const accessToken = await requestToken(config.client_id);
  const google = window.google;

  return new Promise((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)
      .setMimeTypes(
        [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/vnd.google-apps.document",
          "application/vnd.google-apps.presentation",
          "text/plain",
          "text/markdown",
          "image/jpeg",
          "image/png",
        ].join(",")
      );
    let builder = new google.picker.PickerBuilder()
      .addView(view)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(accessToken)
      .setDeveloperKey(config.api_key)
      .setLocale("fr")
      .setTitle("Choisis les documents à importer dans Lekki")
      .setCallback((data: any) => {
        const action = data[google.picker.Response.ACTION];
        if (action === google.picker.Action.PICKED) {
          const docs = data[google.picker.Response.DOCUMENTS] || [];
          resolve({ accessToken, fileIds: docs.map((doc: any) => doc[google.picker.Document.ID]) });
        } else if (action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      });
    if (config.app_id) builder = builder.setAppId(config.app_id);
    if (window.innerWidth < 640) builder = builder.setSize(window.innerWidth - 16, window.innerHeight - 80);
    builder.build().setVisible(true);
  });
}
