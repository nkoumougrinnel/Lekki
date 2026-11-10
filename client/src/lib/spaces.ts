/**
 * Un espace est une promo, un club, un groupe d'étude ou autre chose. Le type choisi à la
 * création est porté par l'icône ; il règle le vocabulaire et ce que l'accueil met en avant.
 */
import type { Workspace } from "@/types/lekki";

export type SpaceKind = "promo" | "club" | "groupe" | "autre" | "perso";

export interface SpaceWording {
  kind: SpaceKind;
  /** Les cours et la révision ont-ils un sens ici ? (pas pour un club) */
  study: boolean;
  headline: [string, string];
  askPlaceholder: string;
  invite: string;
  inviteToast: string;
  wiki: string;
  startTitle: string;
  importText: string;
  inviteText: string;
}

export function spaceKind(workspace: Workspace | null | undefined): SpaceKind {
  if (!workspace) return "perso";
  if (workspace.academic || workspace.icon === "GraduationCap") return "promo";
  if (workspace.icon === "Users") return "club";
  if (workspace.icon === "BookMarked") return "groupe";
  return "autre";
}

const STUDY = {
  study: true,
  headline: ["Que révises-tu", "aujourd’hui ?"] as [string, string],
  askPlaceholder: "Pose une question sur tes cours, TD ou anciens sujets…",
  wiki: "Wiki de révision",
  importText: "Cours, TD, anciens sujets : choisis un dossier entier, ses sous-dossiers sont conservés.",
};

const WORDING: Record<SpaceKind, SpaceWording> = {
  promo: {
    ...STUDY,
    kind: "promo",
    invite: "Inviter ma promo",
    inviteToast: "Colle-le dans le groupe WhatsApp de la promo.",
    startTitle: "Lance l’espace de ta promo en 3 étapes",
    inviteText: "Partage le code d’invitation dans le groupe WhatsApp de la promo.",
  },
  groupe: {
    ...STUDY,
    kind: "groupe",
    invite: "Inviter mon groupe",
    inviteToast: "Envoie-le aux membres du groupe.",
    startTitle: "Lance ton groupe d’étude en 3 étapes",
    inviteText: "Envoie le code d’invitation aux camarades avec qui tu révises.",
  },
  perso: {
    ...STUDY,
    kind: "perso",
    invite: "Créer un espace",
    inviteToast: "",
    startTitle: "Commence en 3 étapes",
    inviteText: "Crée l’espace de ta promo ou rejoins-le avec un code.",
  },
  club: {
    kind: "club",
    study: false,
    headline: ["Que cherches-tu", "aujourd’hui ?"],
    askPlaceholder: "Pose une question sur les documents du club…",
    invite: "Inviter les membres",
    inviteToast: "Colle-le dans le groupe WhatsApp du club.",
    wiki: "Wiki du club",
    startTitle: "Lance l’espace du club en 3 étapes",
    importText: "Statuts, comptes rendus, projets, passations : choisis un dossier entier, ses sous-dossiers sont conservés.",
    inviteText: "Partage le code d’invitation dans le groupe WhatsApp du club.",
  },
  autre: {
    kind: "autre",
    study: false,
    headline: ["Que cherches-tu", "aujourd’hui ?"],
    askPlaceholder: "Pose une question sur les documents de l’espace…",
    invite: "Inviter des membres",
    inviteToast: "Envoie-le aux personnes à inviter.",
    wiki: "Wiki",
    startTitle: "Lance cet espace en 3 étapes",
    importText: "Choisis un dossier entier : ses sous-dossiers sont conservés.",
    inviteText: "Partage le code d’invitation avec les personnes concernées.",
  },
};

export function spaceWording(workspace: Workspace | null | undefined): SpaceWording {
  return WORDING[spaceKind(workspace)];
}
