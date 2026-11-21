/**
 * Mode démo : fait tourner tout le frontend sans backend.
 *
 * Activé par défaut en développement (`npm run dev`). Pour retrouver le vrai backend,
 * lancer `VITE_DEMO=false npm run dev`. En production, la démo est toujours désactivée.
 *
 * Toutes les requêtes interceptées dans `lib/api.ts` répondent à partir des données
 * ci-dessous : deux espaces, des cours/TD/sujets, des fiches wiki, l'IA, la révision.
 * N'importe quel identifiant et mot de passe ouvre la démo.
 */

export const DEMO_ENABLED =
  import.meta.env.DEV && (import.meta.env.VITE_DEMO as string | undefined) !== "false";

import type { DriveFolder, WikiStatus, Workspace } from "@/types/lekki";

export const DEMO_TOKEN = "demo-session";
export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "lekki";

interface DemoRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Record<string, any> | null;
}

export interface DemoResult {
  handled: boolean;
  data?: unknown;
}

// ── Données ──────────────────────────────────────────────────────────────────

const DEMO_USER = {
  id: "u-demo",
  username: DEMO_USERNAME,
  name: "Dan N.",
  email: "demo@lekki.io",
  role: "admin",
};

const STUDENTS = [
  DEMO_USER,
  { id: "u-2", username: "grinnel", name: "Grinnel Mbarga", email: "grinnel@lekki.io", role: "editor" },
  { id: "u-3", username: "aicha", name: "Aïcha Tchoumi", email: "aicha@lekki.io", role: "editor" },
  { id: "u-4", username: "samuel", name: "Samuel Ewane", email: "samuel@lekki.io", role: "reader" },
  { id: "u-5", username: "larissa", name: "Larissa Ngo", email: "larissa@lekki.io", role: "reader" },
];

const WORKSPACES: Workspace[] = [
  {
    id: "ws-itt2",
    name: "ITT2 · Informatique & Réseaux",
    description: "La promo ITT2-IR de SUP’PTIC, Yaoundé. Cours, TD, anciens sujets et fiches partagées.",
    owner_id: DEMO_USER.id,
    icon: "🎓",
    role: "owner",
    members_count: 42,
    academic: { program: "supptic-itt" as const, level: 2 as const, specialty: "IR" as const },
    created_at: "2026-09-12T08:00:00",
  },
  {
    id: "ws-club",
    name: "Club Robotique",
    description: "Projets Arduino, comptes-rendus de concours et docs techniques du club.",
    owner_id: "u-3",
    icon: "🤖",
    role: "member",
    members_count: 11,
    academic: null,
    created_at: "2026-10-02T10:30:00",
  },
];

const MEMBERS = STUDENTS.map((student, index) => ({
  id: `m-${index + 1}`,
  user_id: student.id,
  name: student.name,
  email: student.email,
  username: student.username,
  role: index === 0 ? "owner" : index === 1 ? "admin" : index === 2 ? "verifier" : "member",
  joined_at: "2026-09-12T08:05:00",
}));

const FOLDERS: DriveFolder[] = [
  { id: "f-ts", name: "TRAITEMENT DU SIGNAL", parent_id: null, owner_id: DEMO_USER.id, workspace_id: "ws-itt2", created_at: "2026-09-20T09:00:00" },
  { id: "f-antennes", name: "ANTENNES ET PROPAGATION", parent_id: null, owner_id: DEMO_USER.id, workspace_id: "ws-itt2", created_at: "2026-09-20T09:01:00" },
  { id: "f-proto", name: "PROTOCOLES RÉSEAUX", parent_id: null, owner_id: DEMO_USER.id, workspace_id: "ws-itt2", created_at: "2026-09-20T09:02:00" },
  { id: "f-secu", name: "SÉCURITÉ DES RÉSEAUX", parent_id: null, owner_id: DEMO_USER.id, workspace_id: "ws-itt2", created_at: "2026-09-20T09:03:00" },
  { id: "f-proba", name: "PROBABILITÉS ET STATISTIQUES", parent_id: null, owner_id: DEMO_USER.id, workspace_id: "ws-itt2", created_at: "2026-09-20T09:04:00" },
  { id: "f-bd", name: "BASES DE DONNÉES", parent_id: null, owner_id: DEMO_USER.id, workspace_id: "ws-itt2", created_at: "2026-09-20T09:05:00" },
  { id: "f-perso", name: "Mes fiches", parent_id: null, owner_id: DEMO_USER.id, workspace_id: null, created_at: "2026-10-01T18:00:00" },
  { id: "f-robot", name: "Arduino", parent_id: null, owner_id: "u-3", workspace_id: "ws-club", created_at: "2026-10-03T11:00:00" },
];

const TS_CONTENT = `# Traitement du signal — analyse spectrale

Le signal échantillonné est la suite \`x[n] = x(nT_e)\`. Le théorème de Shannon impose
\`F_e > 2 F_max\` : au-delà, les spectres se replient (repliement spectral).

## 1. Transformée de Fourier discrète

\`\`\`text
X[k] = Σ(n=0..N-1) x[n] · e^(-j·2πkn/N)
\`\`\`

La TFD est périodique de période N et symétrique pour un signal réel :
\`X[N-k] = X*[k]\`.

## 2. Fenêtrage

Tronquer un signal revient à le multiplier par une fenêtre rectangulaire, donc à
convoluer son spectre par un noyau de Dirichlet : les fuites spectrales apparaissent.
Les fenêtres de Hamming ou de Hanning réduisent ces lobes secondaires au prix d'une
résolution légèrement dégradée.

## 3. À retenir pour l'examen

- Un filtre anti-repliement analogique précède toujours le convertisseur.
- La résolution fréquentielle vaut \`F_e / N\`.
- Un signal périodique de période \`N\` a un spectre de raies aux multiples de \`F_e/N\`.
`;

const ANTENNES_CONTENT = `# Antennes — propagation et gain

## 1. Dipôle demi-onde

Longueur \`l = λ/2\`, impédance d'entrée ≈ 73 Ω, résistance de rayonnement 73 Ω.
Le diagramme de rayonnement dans le plan E est un tore : maximum à θ = 90°,
nulls dans l'axe du brin.

## 2. Gain et ouverture

\`G = 4π·A_e / λ²\`. Pour une antenne parabolique de diamètre D :
\`G ≈ 10·log10(η·(πD/λ)²)\`. Plus le gain est élevé, plus le lobe principal est étroit.

## 3. Bilan de liaison

\`P_r = P_e · G_e · G_r · (λ / 4πd)²\`. En dB, on retrouve l'affaiblissement en espace
libre \`L = 32,44 + 20·log10(f_MHz) + 20·log10(d_km)\`.

## 4. Exercices types

- Calculer la portée pour un seuil de sensibilité donné.
- Déterminer l'angle d'ouverture à −3 dB d'une parabole.
`;

const PROTO_CONTENT = `# Protocoles réseaux — de l'IP au transport

## 1. Couche réseau

IPv4 : adressage, masque, sous-réseaux (\`/24\` → 254 hôtes utiles).
Le routage se fait saut par saut, la table associe un préfixe à une interface
et une métrique. OSPF utilise le coût, BGP la politique.

## 2. Couche transport

TCP : poignée de main en trois temps (SYN, SYN-ACK, ACK), contrôle de flux par
fenêtre glissante, retransmission sur timeout. UDP : sans connexion, adapté au
temps réel et au DNS.

## 3. À retenir

- \`MTU\` Ethernet = 1500 octets ; la fragmentation coûte cher.
- Le port est un identifiant de multiplexage, pas une adresse.
- Un proxy inverse termine TCP puis ouvre une nouvelle connexion.
`;

const SECU_CONTENT = `# Sécurité des réseaux — TLS et pare-feu

## 1. TLS 1.3

Poignée de main en un aller-retour : ClientHello (key share), ServerHello + certificat,
puisFinished. Les suites obsolètes (RC4, CBC) ont disparu, la confidentialité persistante
est obligatoire.

## 2. Pare-feu et segmentation

Un pare-feu (*stateful*) suit les connexions établies. La DMZ isole les services exposés.
Le principe du moindre privilège s'applique aussi aux flux : deny par défaut, puis allow.

## 3. Attaques classiques

- **MITM** : contré par la validation stricte du certificat et HSTS.
- **ARP spoofing** : contré par DHCP snooping et des entrées ARP statiques.
- **DDoS** : volumétrique (saturation) ou applicatif (épuisement de connexions).
`;

const PROBA_CONTENT = `# Probabilités et statistiques — variables aléatoires

## 1. Lois usuelles

| Loi | Espérance | Variance |
| --- | --- | --- |
| Bernoulli(p) | p | p(1−p) |
| Binomiale(n,p) | np | np(1−p) |
| Poisson(λ) | λ | λ |
| Normale(μ,σ²) | μ | σ² |

## 2. Théorème central limite

La somme de \`n\` variables indépendantes et identiquement distribuées d'espérance μ
et d'écart-type σ tend vers une loi normale \`N(nμ, nσ²)\` : c'est ce qui justifie
les intervalles de confiance et les tests.

## 3. Estimation

Un estimateur sans biais vérifie \`E[θ̂] = θ\`. La variance d'échantillonnage de la
moyenne vaut \`σ²/n\`, d'où l'erreur type \`σ/√n\`.
`;

const BD_CONTENT = `# Bases de données — normalisation et SQL

## 1. Formes normales

- **1FN** : attributs atomiques.
- **2FN** : pas de dépendance partielle à une clé composée.
- **3FN** : pas de dépendance transitive entre attributs non clés.

## 2. Jointures

\`INNER JOIN\` garde les lignes appariées, \`LEFT JOIN\` conserve la table de gauche.
Un \`GROUP BY\` s'évalue après le \`WHERE\` et avant le \`HAVING\`.

## 3. Index

Un index B-tree accélère l'égalité et les plages, mais alourdit les écritures.
Sur une clé étrangère très filtrante, l'index est presque toujours rentable.
`;

interface DemoFileSeed {
  id: string;
  name: string;
  extension: "pdf" | "docx" | "pptx" | "txt" | "md" | "xlsx";
  folder_id: string | null;
  workspace_id: string | null;
  content: string;
  summary: string;
  pages: number;
  chapters: { number: string; title: string; page: number }[];
  starred?: boolean;
  deleted?: boolean;
  shared?: boolean;
  updated?: string;
}

const FILE_SEEDS: DemoFileSeed[] = [
  {
    id: "d-ts-cours",
    name: "TS_Cours_Analyse_spectrale.pdf",
    extension: "pdf",
    folder_id: "f-ts",
    workspace_id: "ws-itt2",
    content: TS_CONTENT,
    summary:
      "Cours complet sur l'échantillonnage, la TFD et le fenêtrage, avec les conditions de Shannon et les formules à retenir pour l'examen.",
    pages: 48,
    chapters: [
      { number: "1", title: "Signaux et échantillonnage", page: 3 },
      { number: "2", title: "Transformée de Fourier discrète", page: 14 },
      { number: "3", title: "Fenêtrage et fuites spectrales", page: 29 },
      { number: "4", title: "Exercices corrigés", page: 41 },
    ],
    starred: true,
    updated: "2026-11-12T14:20:00",
  },
  {
    id: "d-ts-exam",
    name: "TS_Examen_CL_2024.pdf",
    extension: "pdf",
    folder_id: "f-ts",
    workspace_id: "ws-itt2",
    content: TS_CONTENT,
    summary:
      "Sujet d'examen de traitement du signal, session de 2024, avec trois exercices : échantillonnage, filtrage numérique et TFD.",
    pages: 6,
    chapters: [
      { number: "1", title: "Exercice 1 — échantillonnage", page: 1 },
      { number: "2", title: "Exercice 2 — filtre RIF", page: 3 },
      { number: "3", title: "Exercice 3 — TFD", page: 5 },
    ],
    updated: "2026-10-28T09:10:00",
  },
  {
    id: "d-ts-corr",
    name: "TS_Corrigé_Examen_2024.pdf",
    extension: "pdf",
    folder_id: "f-ts",
    workspace_id: "ws-itt2",
    content: TS_CONTENT,
    summary: "Correction détaillée du sujet 2024, barème et erreurs fréquentes signalées.",
    pages: 8,
    chapters: [{ number: "1", title: "Corrigé et barème", page: 1 }],
    updated: "2026-10-29T18:40:00",
  },
  {
    id: "d-ts-td",
    name: "TS_TD3_Convolution.pdf",
    extension: "pdf",
    folder_id: "f-ts",
    workspace_id: "ws-itt2",
    content: TS_CONTENT,
    summary: "Série de TD sur la convolution discrète et le produit de convolution graphique.",
    pages: 4,
    chapters: [{ number: "1", title: "Convolution discrète", page: 1 }],
    updated: "2026-11-05T11:00:00",
  },
  {
    id: "d-ant-cours",
    name: "Antennes_Cours_Chap2_Propagation.pdf",
    extension: "pdf",
    folder_id: "f-antennes",
    workspace_id: "ws-itt2",
    content: ANTENNES_CONTENT,
    summary:
      "Chapitre 2 : dipôle demi-onde, gain, ouverture et bilan de liaison en espace libre.",
    pages: 36,
    chapters: [
      { number: "1", title: "Dipôle demi-onde", page: 4 },
      { number: "2", title: "Gain et ouverture", page: 15 },
      { number: "3", title: "Bilan de liaison", page: 25 },
    ],
    starred: true,
    updated: "2026-11-08T16:30:00",
  },
  {
    id: "d-ant-rat",
    name: "Antennes_RAT_CL_2023.pdf",
    extension: "pdf",
    folder_id: "f-antennes",
    workspace_id: "ws-itt2",
    content: ANTENNES_CONTENT,
    summary: "Ancien sujet de rattrapage 2023 sur le rayonnement des antennes et le gain d'une parabole.",
    pages: 5,
    chapters: [{ number: "1", title: "Sujet de rattrapage", page: 1 }],
    updated: "2026-10-15T08:20:00",
  },
  {
    id: "d-proto-cours",
    name: "Protocoles_reseaux_Cours_Chap4.pdf",
    extension: "pdf",
    folder_id: "f-proto",
    workspace_id: "ws-itt2",
    content: PROTO_CONTENT,
    summary:
      "Du routage IP au transport : sous-réseaux, OSPF/BGP, poignée de main TCP et multiplexage par port.",
    pages: 52,
    chapters: [
      { number: "1", title: "Adressage et routage", page: 3 },
      { number: "2", title: "TCP et UDP", page: 22 },
      { number: "3", title: "Multiplexage et proxies", page: 41 },
    ],
    updated: "2026-11-14T10:05:00",
  },
  {
    id: "d-proto-exam",
    name: "Protocoles_reseaux_Examen_2024.pdf",
    extension: "pdf",
    folder_id: "f-proto",
    workspace_id: "ws-itt2",
    content: PROTO_CONTENT,
    summary: "Sujet d'examen 2024 : découpage en sous-réseaux, table de routage et analyse d'une capture TCP.",
    pages: 7,
    chapters: [{ number: "1", title: "Énoncé", page: 1 }],
    updated: "2026-10-30T13:45:00",
  },
  {
    id: "d-root-planning",
    name: "Planning_S4_ITT2_2025_2026.pdf",
    extension: "pdf",
    folder_id: null,
    workspace_id: "ws-itt2",
    content: "# Planning du semestre 4\n\n- Semaines 1 à 4 : protocoles réseaux\n- Semaines 5 à 8 : sécurité des réseaux\n- Semaines 9 à 12 : commutation et signalisation\n",
    summary: "Calendrier des évaluations et des séances du semestre 4, avec les dates de CC et d'examens.",
    pages: 2,
    chapters: [{ number: "1", title: "Calendrier des évaluations", page: 1 }],
    updated: "2026-11-16T08:30:00",
  },
  {
    id: "d-root-annales",
    name: "Recueil_anciens_sujets_reseaux.pdf",
    extension: "pdf",
    folder_id: null,
    workspace_id: "ws-itt2",
    content: PROTO_CONTENT,
    summary: "Recueil des sujets réseaux 2022-2025, classés par session (normale et rattrapage).",
    pages: 64,
    chapters: [
      { number: "1", title: "Sujets 2022", page: 2 },
      { number: "2", title: "Sujets 2023", page: 18 },
      { number: "3", title: "Sujets 2024", page: 36 },
    ],
    updated: "2026-11-11T19:20:00",
  },
  {
    id: "d-secu-cc",
    name: "Securite_reseaux_CC_2025.pdf",
    extension: "pdf",
    folder_id: "f-secu",
    workspace_id: "ws-itt2",
    content: SECU_CONTENT,
    summary:
      "Contrôle continu 2025 sur TLS 1.3, la segmentation pare-feu et les attaques MITM/ARP spoofing.",
    pages: 4,
    chapters: [{ number: "1", title: "Questions de cours", page: 1 }],
    starred: true,
    updated: "2026-11-17T17:00:00",
  },
  {
    id: "d-proba-td",
    name: "Proba_stats_TD1_Lois_usuelles.pdf",
    extension: "pdf",
    folder_id: "f-proba",
    workspace_id: "ws-itt2",
    content: PROBA_CONTENT,
    summary: "TD 1 : lois usuelles, espérance, variance et premiers calculs de probabilités conditionnelles.",
    pages: 5,
    chapters: [{ number: "1", title: "Lois discrètes", page: 1 }],
    updated: "2026-10-10T09:30:00",
  },
  {
    id: "d-proba-exam",
    name: "Proba_stats_Examen_2024.pdf",
    extension: "pdf",
    folder_id: "f-proba",
    workspace_id: "ws-itt2",
    content: PROBA_CONTENT,
    summary: "Examen 2024 : théorème central limite, intervalles de confiance et estimateurs sans biais.",
    pages: 6,
    chapters: [{ number: "1", title: "Énoncé", page: 1 }],
    updated: "2026-10-22T15:15:00",
  },
  {
    id: "d-bd-cours",
    name: "Bases_de_donnees_Cours_Normalisation.pdf",
    extension: "pdf",
    folder_id: "f-bd",
    workspace_id: "ws-itt2",
    content: BD_CONTENT,
    summary:
      "Normalisation 1FN→3FN, jointures SQL et choix des index : l'essentiel pour concevoir un schéma propre.",
    pages: 31,
    chapters: [
      { number: "1", title: "Formes normales", page: 2 },
      { number: "2", title: "Jointures et agrégats", page: 16 },
      { number: "3", title: "Index", page: 25 },
    ],
    updated: "2026-11-02T12:00:00",
  },
  {
    id: "d-perso-fiche",
    name: "Fiche_revision_reseaux.md",
    extension: "md",
    folder_id: "f-perso",
    workspace_id: null,
    content: PROTO_CONTENT,
    summary: "Ma fiche personnelle de révision réseaux, condensée en une page.",
    pages: 1,
    chapters: [],
    updated: "2026-11-18T21:10:00",
  },
  {
    id: "d-trash",
    name: "TS_Brouillon_notes.pdf",
    extension: "pdf",
    folder_id: null,
    workspace_id: null,
    content: "",
    summary: "Brouillon supprimé.",
    pages: 2,
    chapters: [],
    deleted: true,
    updated: "2026-11-01T08:00:00",
  },
  {
    id: "d-shared",
    name: "Antennes_Sujet_ALT_2022.pdf",
    extension: "pdf",
    folder_id: "f-antennes",
    workspace_id: "ws-itt2",
    content: ANTENNES_CONTENT,
    summary: "Sujet ALT 2022 partagé par Aïcha avec toute la promo.",
    pages: 5,
    chapters: [{ number: "1", title: "Énoncé", page: 1 }],
    shared: true,
    updated: "2026-11-09T09:45:00",
  },
  {
    id: "d-robot",
    name: "Arduino_Cours_Servomoteurs.pdf",
    extension: "pdf",
    folder_id: "f-robot",
    workspace_id: "ws-club",
    content: "# Servomoteurs et PWM\n\nUn servomoteur se pilote avec un signal PWM de 50 Hz...\n",
    summary: "Support du club robotique sur le pilotage des servomoteurs en PWM.",
    pages: 12,
    chapters: [{ number: "1", title: "PWM et servomoteurs", page: 1 }],
    updated: "2026-10-20T18:00:00",
  },
];

const nowIso = "2026-11-19T10:00:00";

function seedToFile(seed: DemoFileSeed) {
  return {
    id: seed.id,
    name: seed.name,
    extension: seed.extension,
    size_bytes: 180_000 + seed.pages * 240_000,
    mime_type:
      seed.extension === "pdf"
        ? "application/pdf"
        : seed.extension === "md"
          ? "text/markdown"
          : "application/octet-stream",
    content: seed.content,
    structured_text: null,
    summary: seed.summary,
    thumbnail_path: null,
    owner_id: seed.shared ? "u-3" : seed.workspace_id === "ws-club" ? "u-3" : DEMO_USER.id,
    owner_name: seed.shared || seed.workspace_id === "ws-club" ? "Aïcha Tchoumi" : DEMO_USER.name,
    workspace_id: seed.workspace_id,
    folder_id: seed.folder_id,
    is_starred: Boolean(seed.starred),
    is_deleted: Boolean(seed.deleted),
    shared_with: seed.shared ? [DEMO_USER.id, "u-2", "u-4"] : [],
    created_at: "2026-09-25T10:00:00",
    updated_at: seed.updated || nowIso,
    page_count: seed.pages,
    content_unit: "pages" as const,
    indexed_chunks_count: seed.pages * 2,
    detected_chapters: seed.chapters,
    key_passages: seed.chapters.slice(0, 2).map((chapter) => ({
      label: `Chapitre ${chapter.number}`,
      location: `p. ${chapter.page}`,
      excerpt: chapter.title,
    })),
    linked_wiki_ids: [] as string[],
    is_owner: !seed.shared,
  };
}

const FILES = FILE_SEEDS.map(seedToFile);

interface DemoWikiSeed {
  id: string;
  title: string;
  content: string;
  category: string;
  topic: string;
  section: string;
  status: WikiStatus;
  view_count: number;
}

const WIKI_PAGES: DemoWikiSeed[] = [
  {
    id: "w-ts",
    title: "Échantillonnage et théorème de Shannon",
    content: `# Échantillonnage et théorème de Shannon

## L'idée en une phrase

Pour représenter un signal sans le déformer, il faut l'échantillonner au moins deux fois
plus vite que sa fréquence la plus haute.

## La condition

\`F_e > 2 · F_max\`. Si elle n'est pas respectée, les hautes fréquences se replient sur
les basses : c'est le **repliement spectral**, et il est irréversible.

## Ce qu'il faut savoir refaire

1. Tracer le spectre du signal échantillonné (peigne de périodes \`F_e\`).
2. Identifier la fréquence de repliement d'une sinusoïde mal échantillonnée.
3. Justifier le filtre anti-repliement placé avant le convertisseur.

> Vérifié par Aïcha après la séance de révision du 12 novembre.`,
    category: "cours",
    topic: "IT311 · Traitement du signal",
    section: "Fiches de révision",
    status: "verified",
    view_count: 128,
  },
  {
    id: "w-ts-tfd",
    title: "TFD : propriétés et pièges d'examen",
    content: `# TFD : propriétés et pièges d'examen

- Périodicité : \`X[k+N] = X[k]\`.
- Symétrie hermitienne pour un signal réel : \`X[N−k] = X*[k]\`.
- Résolution : \`Δf = F_e / N\`.

## Les trois erreurs qui coûtent des points

1. Oublier le facteur \`1/N\` dans la TFD inverse.
2. Confondre fuite spectrale (fenêtrage) et repliement (échantillonnage).
3. Lire une magnitude sans normaliser par le gain de la fenêtre.`,
    category: "methodes",
    topic: "IT311 · Traitement du signal",
    section: "Méthodes & pièges",
    status: "community",
    view_count: 64,
  },
  {
    id: "w-antennes",
    title: "Bilan de liaison : la formule et son usage",
    content: `# Bilan de liaison

\`P_r = P_e + G_e + G_r − L\`, avec \`L = 32,44 + 20 log f(MHz) + 20 log d(km)\`.

## Méthode en trois étapes

1. Calculer l'affaiblissement en espace libre.
2. Ajouter les gains des deux antennes.
3. Comparer à la sensibilité du récepteur pour trouver la portée.

## Remarque

Les pertes par câble et la marge de fading (souvent 10 à 20 dB) ne sont pas dans la
formule : il faut les retirer soi-même.`,
    category: "cours",
    topic: "IT312 · Antennes et propagation",
    section: "Fiches de révision",
    status: "verified",
    view_count: 97,
  },
  {
    id: "w-proto",
    title: "TCP vs UDP : choisir sans hésiter",
    content: `# TCP vs UDP

| Besoin | Choix | Pourquoi |
| --- | --- | --- |
| Fichier, API, web | TCP | ordre et retransmission |
| VoIP, jeu temps réel | UDP | la latence prime sur la perte |
| DNS | UDP (TCP en secours) | requête courte, une seule réponse |

## Poignée de main TCP

SYN → SYN-ACK → ACK. Toute réponse qui parle de « trois paquets » fait référence à ça.`,
    category: "syntheses",
    topic: "IT441 · Protocoles réseaux informatiques",
    section: "Synthèses de cours",
    status: "community",
    view_count: 152,
  },
  {
    id: "w-secu",
    title: "TLS 1.3 en dix lignes",
    content: `# TLS 1.3

- Un seul aller-retour pour la poignée de main.
- Confidentialité persistante obligatoire (ECDHE).
- Suites AEAD uniquement (AES-GCM, ChaCha20-Poly1305).
- Le certificat serveur est toujours vérifié : pas de « ignorer l'erreur ».

## Attaque à connaître

Le **MITM** n'est possible qu'avec un certificat non validé ou une autorité compromise.`,
    category: "cours",
    topic: "IT442 · Bases de la sécurité des réseaux et systèmes",
    section: "Fiches de révision",
    status: "draft",
    view_count: 31,
  },
];

const SEARCH_SOURCES = [
  {
    id: "src-ts",
    type: "document" as const,
    title: "TS_Cours_Analyse_spectrale.pdf",
    detail: "Traitement du signal",
    location: "Chapitre 1 — Signaux et échantillonnage · p. 3–13",
    page: 3,
    page_range: "3–13",
    chapter: "Signaux et échantillonnage",
    file_extension: "pdf" as const,
    excerpt:
      "Le théorème de Shannon impose Fe > 2·Fmax : au-delà, les spectres se replient et l'information est perdue.",
    score: 0.94,
  },
  {
    id: "src-wiki",
    type: "wiki" as const,
    title: "Échantillonnage et théorème de Shannon",
    detail: "Wiki · IT311",
    location: "Wiki / Traitement du signal / Fiches de révision",
    excerpt: "Pour représenter un signal sans le déformer, il faut l'échantillonner deux fois plus vite que sa fréquence la plus haute.",
    score: 0.88,
  },
  {
    id: "src-ant",
    type: "document" as const,
    title: "Antennes_Cours_Chap2_Propagation.pdf",
    detail: "Antennes et propagation",
    location: "Chapitre 2 — Gain et ouverture · p. 15–24",
    page: 15,
    page_range: "15–24",
    chapter: "Gain et ouverture",
    file_extension: "pdf" as const,
    excerpt: "G = 4π·Ae/λ². Pour une antenne parabolique, le gain croît comme le carré du diamètre.",
    score: 0.81,
  },
  {
    id: "src-proto",
    type: "document" as const,
    title: "Protocoles_reseaux_Cours_Chap4.pdf",
    detail: "Protocoles réseaux",
    location: "Chapitre 4 — TCP et UDP · p. 22–40",
    page: 22,
    page_range: "22–40",
    chapter: "TCP et UDP",
    file_extension: "pdf" as const,
    excerpt: "TCP garantit l'ordre et la retransmission, UDP privilégie la latence : le choix dépend du besoin applicatif.",
    score: 0.79,
  },
];

function answerFor(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("shannon") || q.includes("échantillonn") || q.includes("echantillonn")) {
    return `D'après le cours de traitement du signal, un signal doit être échantillonné à une fréquence **strictement supérieure au double de sa fréquence maximale** : \`Fe > 2·Fmax\`.

Si cette condition n'est pas respectée, les composantes hautes fréquences se replient sur les basses fréquences — c'est le **repliement spectral** — et l'information d'origine ne peut plus être reconstruite. C'est pourquoi un filtre anti-repliement analogique est toujours placé devant le convertisseur.

La résolution fréquentielle après TFD vaut \`Fe / N\` : augmenter N affine la résolution sans changer la condition de Shannon.`;
  }
  if (q.includes("antenne") || q.includes("liaison") || q.includes("gain")) {
    return `Le bilan de liaison s'écrit \`Pr = Pe + Ge + Gr − L\` en décibels, avec l'affaiblissement en espace libre :

\`L = 32,44 + 20·log10(f en MHz) + 20·log10(d en km)\`.

Pour une antenne parabolique, le gain vaut \`G ≈ 10·log10(η·(πD/λ)²)\` : il augmente avec le diamètre mais rétrécit le lobe principal. Pense à retirer les pertes de câble et la marge de fading avant de conclure sur la portée.`;
  }
  if (q.includes("tcp") || q.includes("udp") || q.includes("transport") || q.includes("protocole")) {
    return `**TCP** assure l'ordre, l'accusé de réception et la retransmission (poignée de main SYN / SYN-ACK / ACK) : c'est le bon choix pour le web, les fichiers et les API. **UDP** n'ouvre pas de connexion et ne retransmet pas : il convient au temps réel, au DNS et au streaming, où la latence compte plus que la perte d'un paquet.`;
  }
  if (q.includes("sécurit") || q.includes("securit") || q.includes("tls") || q.includes("mitm")) {
    return `TLS 1.3 réduit la poignée de main à un aller-retour, impose la confidentialité persistante (ECDHE) et n'accepte que des suites AEAD. La parade au MITM reste la **validation stricte du certificat** côté client, complétée par HSTS.`;
  }
  return `Voici ce que disent tes documents : la notion est traitée dans le cours **TS_Cours_Analyse_spectrale.pdf** (chapitre 1) et dans la fiche wiki **« Échantillonnage et théorème de Shannon »**.

En résumé : la condition \`Fe > 2·Fmax\` garantit une reconstruction sans repliement, la TFD donne une résolution \`Fe/N\`, et le fenêtrage échange des fuites spectrales contre de la résolution. Ouvre les sources à droite pour le détail page par page.`;
}

const QUIZ_QUESTIONS = [
  {
    question: "Quelle condition doit respecter la fréquence d'échantillonnage pour éviter le repliement spectral ?",
    choices: ["Fe > Fmax", "Fe > 2·Fmax", "Fe = Fmax / 2", "Fe < 2·Fmax"],
    answer_index: 1,
    answer: "Fe > 2·Fmax",
    explanation:
      "C'est le théorème de Shannon : il faut échantillonner strictement plus de deux fois la fréquence maximale du signal.",
    source_title: "TS_Cours_Analyse_spectrale.pdf",
  },
  {
    question: "Quelle est la résolution fréquentielle d'une TFD de N points échantillonnés à Fe ?",
    choices: ["Fe · N", "N / Fe", "Fe / N", "2·Fe / N"],
    answer_index: 2,
    answer: "Fe / N",
    explanation: "Les N points couvrent la bande [0, Fe[, chaque raie sépare donc Fe/N.",
    source_title: "TS_Cours_Analyse_spectrale.pdf",
  },
  {
    question: "Quel est l'affaiblissement en espace libre à 2 GHz sur 10 km ?",
    choices: ["≈ 108 dB", "≈ 118 dB", "≈ 128 dB", "≈ 138 dB"],
    answer_index: 1,
    answer: "≈ 118 dB",
    explanation:
      "L = 32,44 + 20·log10(2000) + 20·log10(10) ≈ 32,44 + 66,02 + 20 ≈ 118,5 dB.",
    source_title: "Antennes_Cours_Chap2_Propagation.pdf",
  },
  {
    question: "Combien d'allers-retours compte la poignée de main de TLS 1.3 ?",
    choices: ["Un", "Deux", "Trois", "Aucun"],
    answer_index: 0,
    answer: "Un",
    explanation:
      "TLS 1.3 ramène la poignée de main à un aller-retour grâce au key share envoyé dans le ClientHello.",
    source_title: "Securite_reseaux_CC_2025.pdf",
  },
];

// ── Routage ──────────────────────────────────────────────────────────────────

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fileScope(files: typeof FILES, query: URLSearchParams) {
  const scope = query.get("scope") || "all";
  const workspaceId = query.get("workspace_id");
  const folderId = query.get("folder_id");
  const search = (query.get("search") || "").toLowerCase();

  let list = files.filter((file) => (scope === "trash" ? file.is_deleted : !file.is_deleted));
  if (scope === "personal") list = list.filter((file) => !file.workspace_id);
  if (scope === "starred") list = list.filter((file) => file.is_starred);
  if (scope === "shared_with_me") list = list.filter((file) => file.shared_with.includes(DEMO_USER.id) && !file.is_owner);
  if (scope === "workspace" && workspaceId) list = list.filter((file) => file.workspace_id === workspaceId);
  if (scope === "all" && workspaceId) list = list.filter((file) => file.workspace_id === workspaceId);
  if (folderId !== null) list = list.filter((file) => (file.folder_id || "") === folderId);
  if (search) list = list.filter((file) => file.name.toLowerCase().includes(search));
  return list;
}

export function isDemoEnabled(): boolean {
  return DEMO_ENABLED;
}

/** Répond aux routes de l'API à partir des données de démonstration. */
export function handleDemoRequest(path: string, options: RequestInit = {}): DemoResult {
  if (!DEMO_ENABLED) return { handled: false };

  const method = (options.method || "GET").toUpperCase();
  const [pathname, search = ""] = path.split("?");
  const query = new URLSearchParams(search);
  let body: Record<string, unknown> | null = null;
  if (typeof options.body === "string") {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = null;
    }
  }
  const req: DemoRequest = { method, path: pathname, query, body };
  const route = matchRoute(req);
  return route;
}

function matchRoute(req: DemoRequest): DemoResult {
  const { method, path, query, body } = req;
  const ok = (data: unknown): DemoResult => ({ handled: true, data });

  // Auth
  if (path === "/auth/login" && method === "POST") {
    return ok({ user: DEMO_USER, access_token: DEMO_TOKEN });
  }
  if (path === "/auth/register" && method === "POST") {
    return ok({ user: DEMO_USER, access_token: DEMO_TOKEN });
  }
  if (path === "/auth/me") return ok(DEMO_USER);
  if (path === "/users") return ok(STUDENTS);

  // Workspaces
  if (path === "/workspaces" && method === "GET") return ok(WORKSPACES);
  if (path === "/workspaces" && method === "POST") {
    const created = {
      ...WORKSPACES[1],
      id: `ws-${Date.now()}`,
      name: String(body?.name || "Nouvel espace"),
      description: (body?.description as string) || null,
      icon: (body?.icon as string) || "📚",
      owner_id: DEMO_USER.id,
      role: "owner",
      academic: (body?.academic as (typeof WORKSPACES)[number]["academic"]) || null,
      members_count: 1,
    };
    WORKSPACES.push(created);
    return ok(created);
  }
  if (path === "/workspaces/join" && method === "POST") return ok(WORKSPACES[0]);
  const wsMatch = path.match(/^\/workspaces\/([^/]+)(\/.*)?$/);
  if (wsMatch) {
    const workspace = WORKSPACES.find((item) => item.id === wsMatch[1]) || WORKSPACES[0];
    const rest = wsMatch[2] || "";
    if (!rest) return ok(workspace);
    if (rest === "/members" && method === "GET") return ok(MEMBERS);
    if (rest === "/members" && method === "POST") return ok(MEMBERS[3]);
    if (rest.startsWith("/members/")) return ok(MEMBERS[3]);
    if (rest === "/join-code") return ok({ code: "LEKKI-ITT2" });
    if (rest === "/join-code/rotate") return ok({ code: "LEKKI-ITT2" });
    return ok(null);
  }

  // Drive
  if (path === "/drive/folders" && method === "GET") {
    const workspaceId = query.get("workspace_id");
    const list = workspaceId
      ? FOLDERS.filter((folder) => folder.workspace_id === workspaceId)
      : FOLDERS.filter((folder) => !folder.workspace_id);
    return ok(list);
  }
  if (path === "/drive/folders" && method === "POST") {
    const created = {
      id: `f-${Date.now()}`,
      name: String(body?.name || "Nouveau dossier"),
      parent_id: (body?.parent_id as string) || null,
      owner_id: DEMO_USER.id,
      workspace_id: (body?.workspace_id as string) || null,
      created_at: new Date().toISOString(),
    };
    FOLDERS.push(created);
    return ok(created);
  }
  if (path === "/drive/folders/tree") return ok({ created: 0, existing: 0 });
  if (path.startsWith("/drive/folders/")) return ok(null);

  if (path === "/drive/files" && method === "GET") {
    return ok(fileScope(FILES, query));
  }
  if (path === "/drive/files" && method === "POST") return ok(FILES[0]);
  if (path === "/drive/files/import" && method === "POST") return ok([FILES[0]]);
  if (path === "/drive/files/scan" && method === "POST") return ok(FILES[0]);
  const fileShare = path.match(/^\/drive\/files\/([^/]+)\/share$/);
  if (fileShare) {
    const file = FILES.find((item) => item.id === fileShare[1]);
    return ok(file || FILES[0]);
  }
  const fileIndex = path.match(/^\/drive\/files\/([^/]+)\/index$/);
  if (fileIndex) {
    const file = FILES.find((item) => item.id === fileIndex[1]);
    return ok({
      total_pages_analyzed: file?.page_count || 0,
      total_chunks: (file?.page_count || 1) * 2,
      chapters_detected: (file?.detected_chapters || []).map((chapter) => chapter.title),
    });
  }
  const fileMatch = path.match(/^\/drive\/files\/([^/]+)$/);
  if (fileMatch) {
    if (method === "DELETE") return ok(null);
    const file = FILES.find((item) => item.id === fileMatch[1]);
    if (!file) return { handled: false };
    if (method === "PUT" && body) Object.assign(file, body);
    return ok(file);
  }

  // Wiki
  if (path === "/wiki/pages" && method === "GET") {
    const workspaceId = query.get("workspace_id");
    const category = query.get("category");
    let pages = WIKI_PAGES as Array<(typeof WIKI_PAGES)[number]>;
    if (category) pages = pages.filter((page) => page.category === category);
    return ok(pages.map((page) => wikiPage(page, workspaceId || "ws-itt2")));
  }
  if (path === "/wiki/pages" && method === "POST") {
    const created = {
      id: `w-${Date.now()}`,
      title: String(body?.title || "Nouvelle fiche"),
      content: String(body?.content || ""),
      category: (body?.category as string) || "cours",
      topic: (body?.topic as string) || "Divers",
      section: (body?.section as string) || "Fiches de révision",
      status: "draft" as const,
      view_count: 0,
    };
    WIKI_PAGES.push(created);
    return ok(wikiPage(created, (body?.workspace_id as string) || "ws-itt2"));
  }
  if (path === "/wiki/pages/section" && method === "DELETE") return ok({ deleted_pages: 0 });

  const wikiStatus = path.match(/^\/wiki\/pages\/([^/]+)\/status$/);
  if (wikiStatus) {
    const page = WIKI_PAGES.find((item) => item.id === wikiStatus[1]);
    if (page) page.status = String(body?.status || "community") as typeof page.status;
    return ok(page ? wikiPage(page, "ws-itt2") : null);
  }
  const wikiRestore = path.match(/^\/wiki\/pages\/([^/]+)\/restore\/\d+$/);
  if (wikiRestore) {
    const page = WIKI_PAGES.find((item) => item.id === wikiRestore[1]);
    return ok(page ? wikiPage(page, "ws-itt2") : null);
  }
  const wikiMatch = path.match(/^\/wiki\/pages\/([^/]+)$/);
  if (wikiMatch) {
    if (method === "DELETE") return ok(null);
    const page = WIKI_PAGES.find((item) => item.id === wikiMatch[1]);
    if (!page) return { handled: false };
    if (method === "PUT" && body) Object.assign(page, body);
    return ok(wikiPage(page, "ws-itt2"));
  }

  // Recherche
  if (path === "/search") {
    const q = (query.get("q") || "").toLowerCase().trim();
    if (!q) return ok({ documents: [], wiki: [], shared: [] });
    return ok({
      documents: FILES.filter(
        (file) => !file.is_deleted && (file.name.toLowerCase().includes(q) || file.content.toLowerCase().includes(q))
      )
        .slice(0, 5)
        .map((file) => ({
          id: file.id,
          title: file.name,
          extension: file.extension,
          type: "document",
          category: "Cours",
          excerpt: file.summary || "",
          workspace_id: file.workspace_id,
        })),
      wiki: WIKI_PAGES.filter(
        (page) => page.title.toLowerCase().includes(q) || page.content.toLowerCase().includes(q)
      )
        .slice(0, 5)
        .map((page) => ({
          id: page.id,
          title: page.title,
          type: "wiki",
          status: page.status,
          category: page.category,
          excerpt: page.content.split("\n").find((line) => line.trim().length > 40)?.slice(0, 160) || "",
        })),
      shared: [],
    });
  }

  // IA
  if (path === "/ask" && method === "POST") {
    const question = String(body?.question || "");
    return ok({
      message_id: `msg-${Date.now()}`,
      answer: answerFor(question),
      sources: SEARCH_SOURCES.slice(0, 3),
      contradiction: null,
      confidence: 0.91,
      provider: "demo",
    });
  }
  if (path === "/chats/history" && method === "GET") return ok([]);
  if (path === "/chats/history" && method === "DELETE") return ok(null);

  // Révision
  if (path === "/revision/quiz" && method === "POST") {
    const count = Number(body?.count) || QUIZ_QUESTIONS.length;
    return ok({ questions: QUIZ_QUESTIONS.slice(0, count), provider: "demo", degraded: false });
  }
  if (path === "/revision/correction" && method === "POST") {
    const file = FILES.find((item) => item.id === body?.file_id) || FILES[1];
    return ok({
      subject_title: file.name.replace(/\.[^.]+$/, "").replace(/_/g, " "),
      answer: `## Correction guidée\n\n**Exercice 1 — échantillonnage.** La condition de Shannon impose \`Fe > 2·Fmax\`. Avec \`Fmax = 4 kHz\`, il faut \`Fe > 8 kHz\`, donc \`Fe = 10 kHz\` convient.\n\n**Exercice 2 — filtre RIF.** La réponse impulsionnelle \`h[n] = {1, 2, 1}/4\` est symétrique : le filtre est à phase linéaire, de gain statique 1.\n\n**Exercice 3 — TFD.** Pour \`N = 8\`, la résolution vaut \`Fe/8 = 1,25 kHz\`.\n\n> Barème indicatif : 6 / 7 / 7 points. Les erreurs les plus fréquentes portent sur l'oubli du facteur 1/N et sur la confusion entre fuite et repliement.`,
      sources: SEARCH_SOURCES.slice(0, 2),
      provider: "demo",
      degraded: false,
    });
  }

  // Google Drive / intégrations
  if (path === "/integrations/google-drive/config") {
    return ok({ supdocs: false, picker: false, client_id: null, api_key: null, app_id: null });
  }
  if (path.startsWith("/integrations/google-drive/")) {
    if (path.endsWith("/browse") || path.includes("/supdocs")) {
      return ok({ path: [], items: [] });
    }
    return ok({
      id: "job-demo",
      state: "done",
      total: 0,
      processed: 0,
      imported: 0,
      folders_created: 0,
      current: null,
      skipped: [],
      skipped_count: 0,
      error: null,
    });
  }

  return { handled: false };
}

function wikiPage(page: DemoWikiSeed, workspaceId: string) {
  const author = "Aïcha Tchoumi";
  return {
    ...page,
    workspace_id: workspaceId,
    parent_page_id: null,
    creator_id: "u-3",
    creator_name: author,
    author_name: author,
    last_editor_id: DEMO_USER.id,
    last_editor_name: DEMO_USER.name,
    status_verified_by: page.status === "verified" ? "u-3" : null,
    status_verified_at: page.status === "verified" ? "2026-11-12T19:00:00" : null,
    current_version: 3,
    related_document_ids: [],
    related_wiki_ids: [],
    related_wiki_pages: [],
    linked_documents: [],
    history: [
      {
        version: 3,
        author_id: DEMO_USER.id,
        author_name: DEMO_USER.name,
        updated_at: "2026-11-12T19:00:00",
        comment: "Ajout du résumé et des pièges d'examen",
        content: page.content,
      },
      {
        version: 2,
        author_id: "u-3",
        author_name: author,
        updated_at: "2026-11-08T17:30:00",
        comment: "Relecture et corrections",
        content: page.content,
      },
      {
        version: 1,
        author_id: "u-3",
        author_name: author,
        updated_at: "2026-11-05T10:00:00",
        comment: "Première version",
        content: page.content,
      },
    ],
    versions: [],
    created_at: "2026-11-05T10:00:00",
    updated_at: "2026-11-12T19:00:00",
  };
}
