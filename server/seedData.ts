export interface ApiUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "reader";
  avatar?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  icon?: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "verifier";
  joined_at: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  parent_id?: string | null;
  owner_id: string;
  workspace_id?: string | null; // null = personal
  is_deleted?: boolean;
  created_at: string;
}

export interface ChapterInfo {
  number: string;
  title: string;
  page: number;
  subtopics?: string[];
}

export interface KeyPassage {
  label: string;
  location: string;
  excerpt: string;
}

export interface DriveFile {
  id: string;
  name: string;
  extension: "pdf" | "docx" | "pptx" | "txt" | "md" | "xlsx";
  size_bytes: number;
  mime_type: string;
  content: string; // Plain text or markdown for indexing & RAG
  summary?: string;
  owner_id: string;
  workspace_id?: string | null; // null = personal
  folder_id?: string | null;
  is_starred: boolean;
  is_deleted: boolean;
  shared_with: string[]; // user IDs
  created_at: string;
  updated_at: string;
  page_count?: number;
  indexed_chunks_count?: number;
  detected_chapters?: ChapterInfo[];
  key_passages?: KeyPassage[];
  linked_wiki_ids?: string[];
  index_meta?: DocumentIndexMeta;
}

export interface DocumentIndexMeta {
  total_chunks: number;
  total_pages_analyzed: number;
  chapters_detected: string[];
}

export interface ServerIndexedChunk {
  id: string;
  source_id: string;
  source_type: "document" | "wiki";
  content: string;
  chapter?: string;
  section?: string;
  locator?: string;
}

export type WikiStatus = "draft" | "community" | "verified";

export interface WikiHistoryEntry {
  version: number;
  author_id: string;
  author_name: string;
  updated_at: string;
  comment?: string;
  content: string;
}

export interface WikiPage {
  id: string;
  title: string;
  content: string;
  category?: "cours" | "methodes" | "syntheses" | "faq" | "guides" | string;
  topic?: string;
  section?: string;
  parent_page_id?: string | null;
  workspace_id: string;
  status: WikiStatus;
  status_verified_by?: string | null;
  status_verified_at?: string | null;
  creator_id: string;
  last_editor_id: string;
  view_count: number;
  related_document_ids: string[];
  related_wiki_ids?: string[];
  history: WikiHistoryEntry[];
  created_at: string;
  updated_at: string;
}

// Fixed UUIDs for consistency
export const USER_GRINNEL_ID = "u-grinnel-001";
export const USER_SARAH_ID = "u-sarah-002";
export const USER_MARC_ID = "u-marc-003";
export const USER_ADMIN_ID = "u-admin-004";

export const WS_SUPPTIC_ID = "ws-supptic-3a-ir";
export const WS_RH_ID = "ws-rh-organisation";
export const WS_TECH_ID = "ws-technique-produit";

export const INITIAL_USERS: ApiUser[] = [
  {
    id: USER_GRINNEL_ID,
    username: "grinnel",
    name: "Grinnel N.",
    email: "grinnel@lekki.io",
    role: "admin",
  },
  {
    id: USER_SARAH_ID,
    username: "sarah",
    name: "Sarah M.",
    email: "sarah@lekki.io",
    role: "editor",
  },
  {
    id: USER_MARC_ID,
    username: "marc",
    name: "Marc T.",
    email: "marc@lekki.io",
    role: "editor",
  },
  {
    id: USER_ADMIN_ID,
    username: "admin",
    name: "Administrateur",
    email: "admin@lekki.io",
    role: "admin",
  },
];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: WS_SUPPTIC_ID,
    name: "SUP'PTIC — 3A IR",
    description: "Promotion 3ème Année Ingénierie des Réseaux & Télécoms",
    owner_id: USER_GRINNEL_ID,
    icon: "GraduationCap",
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: WS_RH_ID,
    name: "RH & Organisation",
    description: "Politiques RH, vie d'entreprise, onboarding et congés",
    owner_id: USER_ADMIN_ID,
    icon: "Building2",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: WS_TECH_ID,
    name: "Technique & Produit",
    description: "Architecture, infrastructure, sécurité et outils numériques",
    owner_id: USER_ADMIN_ID,
    icon: "Cpu",
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
];

export const INITIAL_MEMBERS: WorkspaceMember[] = [
  {
    id: "m-01",
    workspace_id: WS_SUPPTIC_ID,
    user_id: USER_GRINNEL_ID,
    role: "owner",
    joined_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: "m-02",
    workspace_id: WS_SUPPTIC_ID,
    user_id: USER_SARAH_ID,
    role: "verifier",
    joined_at: new Date(Date.now() - 38 * 86400000).toISOString(),
  },
  {
    id: "m-03",
    workspace_id: WS_SUPPTIC_ID,
    user_id: USER_MARC_ID,
    role: "member",
    joined_at: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    id: "m-04",
    workspace_id: WS_RH_ID,
    user_id: USER_GRINNEL_ID,
    role: "member",
    joined_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "m-05",
    workspace_id: WS_TECH_ID,
    user_id: USER_GRINNEL_ID,
    role: "admin",
    joined_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
];

export const INITIAL_FOLDERS: DriveFolder[] = [
  // SUP'PTIC Workspace Folders (as described in product vision Section 6)
  {
    id: "f-supptic-cours",
    name: "Cours",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    id: "f-supptic-td-tp",
    name: "TD & TP",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    id: "f-supptic-examens",
    name: "Examens",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_SARAH_ID,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "f-supptic-projets",
    name: "Projets",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_MARC_ID,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "f-supptic-ressources",
    name: "Ressources",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
  },

  // Personal Folders for Grinnel ("Mon Espace")
  {
    id: "f-perso-revisions",
    name: "Révisions personnelles",
    workspace_id: null,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: "f-perso-stages",
    name: "Dossier Stage PFE",
    workspace_id: null,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

export const INITIAL_FILES: DriveFile[] = [
  // Personal files (Mon Espace)
  {
    id: "file-perso-cours",
    name: "Cours personnel — Télécoms & Signaux.pdf",
    extension: "pdf",
    size_bytes: 3420000,
    mime_type: "application/pdf",
    page_count: 58,
    is_starred: true,
    is_deleted: false,
    owner_id: USER_GRINNEL_ID,
    workspace_id: null,
    folder_id: "f-perso-revisions",
    shared_with: [],
    summary: "Notes personnelles et formules de modulation QAM, OFDM, transformée de Fourier et traitement du signal.",
    content: `# Cours Personnel Télécoms & Signaux

## Modulation et Démodulation
- QAM-16 et QAM-64 : constellations et efficacité spectrale.
- Échantillonnage de Nyquist-Shannon : fe >= 2 * fmax.
- Bilan de liaison et calcul du rapport Signal sur Bruit (SNR).

## Synthèse personnelle
Fiche de révision pour l'épreuve de fin de semestre à SUP'PTIC. Formules de Friis et atténuation en espace libre.`,
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    index_meta: {
      total_chunks: 34,
      total_pages_analyzed: 58,
      chapters_detected: ["Modulation et Démodulation", "Synthèse personnelle"],
    },
  },
  {
    id: "file-perso-td-partage",
    name: "TD Réseaux — Exercices & Corrigés.pdf",
    extension: "pdf",
    size_bytes: 1840000,
    mime_type: "application/pdf",
    page_count: 24,
    is_starred: false,
    is_deleted: false,
    owner_id: USER_GRINNEL_ID,
    workspace_id: null,
    folder_id: null,
    shared_with: [USER_SARAH_ID], // Partagé avec Sarah
    summary: "Exercices d'adressage IPv4/IPv6, VLSM, calcul de masques et tables de routage statique.",
    content: `# TD Réseaux — Adressage et Routage Statique

## Exercice 1 : Découpage VLSM
Soit le réseau 192.168.10.0/24. Découper pour 4 sous-réseaux :
- LAN 1 (60 hôtes) : masque /26 (192.168.10.0 à 192.168.10.63)
- LAN 2 (28 hôtes) : masque /27 (192.168.10.64 à 192.168.10.95)
- Interconnexion routeurs R1-R2 (2 adresses) : masque /30 (192.168.10.96 à 192.168.10.99)

## Exercice 2 : Tables de routage
Route par défaut 0.0.0.0/0 vers la passerelle de sortie du campus.`,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: "file-shared-sarah",
    name: "Rapport_TP_Fibre_Optique_Mesures.docx",
    extension: "docx",
    size_bytes: 890000,
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    page_count: 14,
    is_starred: true,
    is_deleted: false,
    owner_id: USER_SARAH_ID, // Sarah est propriétaire
    workspace_id: null,
    folder_id: null,
    shared_with: [USER_GRINNEL_ID], // Partagé avec Grinnel -> "Partagés avec moi"
    summary: "Rapport de mesures par réflectométrie optique (OTDR) sur liaison monomode 1310nm et 1550nm.",
    content: `# Rapport TP Réflectométrie et Fibre Optique

Auteur : Sarah M. (partagé avec Grinnel)
Date : Septembre 2026

## 1. Mesures réflectométriques (OTDR)
- Atténuation moyenne mesurée à 1310 nm : 0.34 dB/km.
- Atténuation moyenne à 1550 nm : 0.20 dB/km (fenêtre de dispersion minimale).
- Événements détectés : épissure par fusion au point km 4.2 (perte 0.05 dB, conforme à la norme UIT-T G.652).

## 2. Conclusion du banc de test
La liaison est qualifiée pour un débit 10 Gbps Ethernet (10GBASE-LR).`,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "file-shared-marc",
    name: "Planning_Soutenances_PFE_2026.pdf",
    extension: "pdf",
    size_bytes: 420000,
    mime_type: "application/pdf",
    page_count: 4,
    is_starred: false,
    is_deleted: false,
    owner_id: USER_MARC_ID,
    workspace_id: null,
    folder_id: null,
    shared_with: [USER_GRINNEL_ID], // Partagé avec Grinnel
    summary: "Calendrier officiel des jurys et présentations de fin d'études.",
    content: `# Planning des Soutenances PFE 2026 — 3A IR

Session principale : 15 au 25 Octobre 2026.
Bâtiment B, Salle de Conférence 102.
Chaque candidat dispose de 30 minutes de présentation, suivies de 20 minutes de questions du jury d'experts.`,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "file-perso-corbeille",
    name: "Ancienne_Ebauche_CV.txt",
    extension: "txt",
    size_bytes: 12000,
    mime_type: "text/plain",
    page_count: 1,
    is_starred: false,
    is_deleted: true, // Corbeille
    owner_id: USER_GRINNEL_ID,
    workspace_id: null,
    folder_id: null,
    shared_with: [],
    summary: "Brouillon supprimé.",
    content: `Ancienne version de CV étudiant 2025.`,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },

  // Workspace SUP'PTIC Documents (as in Section 6 & 10 of product document)
  {
    id: "file-supptic-cours-reseaux",
    name: "Cours Réseaux — Routage Dynamique & OSPF.pdf",
    extension: "pdf",
    size_bytes: 4850000,
    mime_type: "application/pdf",
    page_count: 78,
    indexed_chunks_count: 284,
    detected_chapters: [
      { number: "01", title: "Introduction aux architectures de routage", page: 4, subtopics: ["Routage statique vs dynamique", "Systèmes autonomes (AS)"] },
      { number: "02", title: "Protocoles à vecteur de distance", page: 16, subtopics: ["Algorithme Bellman-Ford", "Problème du compte à l'infini", "Poison reverse"] },
      { number: "03", title: "Protocoles à état de liens (Link-State)", page: 28, subtopics: ["Inondation LSA", "Base de données topologique (LSDB)"] },
      { number: "04", title: "Routage dynamique OSPF v2/v3", page: 42, subtopics: ["Calcul du coût métrique", "Types de paquets OSPF", "Élection DR/BDR"] },
      { number: "05", title: "Hiérarchie Multi-Zones et convergence", page: 60, subtopics: ["Zone Backbone Area 0", "Routeurs ABR et ASBR", "Aires Stub et NSSA"] },
    ],
    key_passages: [
      { label: "Métrique et Formule du Coût OSPF", location: "Chapitre 4 · p. 42", excerpt: "Coût = Bande Passante de Référence / Bande Passante de l'interface. Référence standard Cisco : 100 Mbps (10^8 bps)." },
      { label: "Types de paquets OSPF", location: "Chapitre 4 · p. 45", excerpt: "1. Hello (keepalive 10s), 2. DBD (Database Description), 3. LSR, 4. LSU, 5. LSAck." },
      { label: "Algorithme de Dijkstra", location: "Chapitre 3 · p. 30", excerpt: "Calcul du plus court chemin d'arbre couvrant (SPF Tree) depuis la racine locale." },
    ],
    linked_wiki_ids: ["wiki-ospf", "wiki-tcp-udp"],
    is_starred: true,
    is_deleted: false,
    owner_id: USER_GRINNEL_ID,
    workspace_id: WS_SUPPTIC_ID,
    folder_id: "f-supptic-cours",
    shared_with: [],
    summary: "Support complet sur les protocoles à état de liens, l'algorithme Dijkstra (SPF), les LSA et le calcul du coût OSPF (page 42).",
    content: `# Cours Réseaux : Protocoles de Routage Dynamique

Document original de référence — SUP'PTIC 3A IR.

## Chapitre 4 : Open Shortest Path First (OSPF v2/v3)
OSPF est un protocole de passerelle intérieure (IGP) standardisé (RFC 2328).
Il utilise l'algorithme de Dijkstra pour trouver le plus court chemin entre chaque routeur.

### Page 42 : Calcul de la métrique et Coût OSPF
La métrique utilisée par OSPF est le **Coût** (Cost), inversement proportionnel à la bande passante :
\`Coût = Bande Passante de Référence / Bande Passante de l'interface\`

Dans la spécification standard de base Cisco et RFC 2328 :
- La bande passante de référence par défaut est de **100 Mbps** (10^8 bps).
- Pour FastEthernet (100 Mbps) : Coût = 100 / 100 = 1.
- Pour GigabitEthernet (1000 Mbps) : Coût = 100 / 1000 = 0.1 -> arrondi à 1 (saturation de la métrique sans ajustement de la bande passante de référence).

Pour différencier le Gigabit et le 10G, l'administrateur doit exécuter :
\`auto-cost reference-bandwidth 1000\` ou \`10000\`.

### Page 45 : Types de paquets OSPF
1. Hello (découverte de voisins, keepalive toutes les 10s)
2. DBD (Database Description)
3. LSR (Link-State Request)
4. LSU (Link-State Update)
5. LSAck (Link-State Acknowledgment)

### Différence TCP vs UDP (Rappel Fondamental)
- TCP : orienté connexion, fiable avec accusé de réception (ACK), contrôle de flux par fenêtre glissante, ordonnancement garanti.
- UDP : sans connexion, sans garantie de livraison ni d'ordre, faible overhead, adapté au temps réel (VoIP, DNS, streaming).`,
    created_at: new Date(Date.now() - 32 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    index_meta: {
      total_chunks: 124,
      total_pages_analyzed: 78,
      chapters_detected: ["Chapitre 4 : Open Shortest Path First (OSPF v2/v3)", "Chapitre 5 : BGP et routage inter-AS", "Chapitre 6 : Sécurité des protocoles"],
    },
  },
  {
    id: "file-supptic-td-routage",
    name: "TD Routage — Topologies Multi-Zones & OSPF.pdf",
    extension: "pdf",
    size_bytes: 2100000,
    mime_type: "application/pdf",
    page_count: 18,
    indexed_chunks_count: 64,
    detected_chapters: [
      { number: "01", title: "Exercice 1 : Plan d'adressage et VLSM", page: 2, subtopics: ["Sous-réseaux /27 et /30"] },
      { number: "02", title: "Exercice 2 : Configuration d'un Backbone OSPF", page: 7, subtopics: ["Area 0", "Voisinages 2-Way"] },
      { number: "03", title: "Exercice 3 : Routeurs ABR et redistribution", page: 12, subtopics: ["LSA Type 3 et 5"] },
    ],
    key_passages: [
      { label: "Exercice 3 : Raccordement ABR", location: "p. 12 · Exercice 3", excerpt: "Configuration d'un routeur frontière ABR entre l'Area 0 et l'Area 10." },
    ],
    linked_wiki_ids: ["wiki-ospf"],
    is_starred: false,
    is_deleted: false,
    owner_id: USER_SARAH_ID,
    workspace_id: WS_SUPPTIC_ID,
    folder_id: "f-supptic-td-tp",
    shared_with: [],
    summary: "Travaux dirigés sur la segmentation en zones OSPF (Area 0 Backbone) et les routeurs ABR/ASBR.",
    content: `# TD Routage Avancé : OSPF Multi-Zones

Auteurs : Département Réseaux SUP'PTIC.

## Architecture en Zones
Toutes les zones non-backbone (Area 1, Area 2) doivent obligatoirement être raccordées à la zone dorsale **Area 0**.
- **ABR (Area Border Router)** : routeur situé à la frontière entre Area 0 et une zone secondaire.
- **ASBR (Autonomous System Boundary Router)** : injecte des routes externes (redistribution BGP ou statique) via des LSA Type 5.`,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: "file-supptic-examen-2025",
    name: "Examen Réseaux & Télécoms — Session 2025.pdf",
    extension: "pdf",
    size_bytes: 1400000,
    mime_type: "application/pdf",
    page_count: 8,
    is_starred: true,
    is_deleted: false,
    owner_id: USER_SARAH_ID,
    workspace_id: WS_SUPPTIC_ID,
    folder_id: "f-supptic-examens",
    shared_with: [],
    summary: "Sujet officiel de l'épreuve d'ingénierie réseaux avec corrigé partiel sur BGP et OSPF.",
    content: `# Examen National — Ingénierie Réseaux 2025

Partie 1 : Protocole OSPF et ingénierie de trafic.
Questions sur les états de voisinage OSPF : Down, Init, 2-Way, ExStart, Exchange, Loading, Full.
Explication de l'élection DR/BDR sur réseaux multi-accès broadcast (priorité maximale puis Router-ID le plus élevé).`,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "file-supptic-projet-pfe",
    name: "Cahier_Des_Charges_Projet_SDN.docx",
    extension: "docx",
    size_bytes: 650000,
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    page_count: 12,
    is_starred: false,
    is_deleted: false,
    owner_id: USER_MARC_ID,
    workspace_id: WS_SUPPTIC_ID,
    folder_id: "f-supptic-projets",
    shared_with: [],
    summary: "Spécification du banc d'essai Software Defined Networking avec OpenFlow et contrôleur Ryu.",
    content: `# Projet 3A : Déploiement d'un Réseau SDN avec OpenFlow et Ryu

Objectif : Séparer le plan de contrôle du plan de données.
Implémentation de règles de redirection dynamique et monitoring de bande passante par télémétrie.`,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

// Initial Wiki Pages for SUP'PTIC Workspace (Structured by Knowledge Domains, Sections & Interlinked Concepts)
export const INITIAL_WIKI_PAGES: WikiPage[] = [
  // 📡 RÉSEAUX — Fondamentaux
  {
    id: "wiki-modele-osi",
    title: "Modèle OSI",
    topic: "Réseaux",
    section: "Fondamentaux",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M. (Référente Réseaux)",
    status_verified_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 142,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-tcp-vs-udp", "wiki-vlan", "wiki-ospf-comprendre"],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    content: `# Modèle OSI (Open Systems Interconnection)

Le modèle OSI est la référence théorique en 7 couches standardisée par l'ISO pour conceptualiser l'interconnexion réseau.

## Les 7 Couches
1. **Physique (L1)** : Transmission binaire sur le média (bits, tensions, connecteurs RJ45, fibre optique).
2. **Liaison de données (L2)** : Adressage physique MAC, trames, détection d'erreurs (Ethernet, commutateurs, VLAN 802.1Q).
3. **Réseau (L3)** : Adressage logique IP, routage des paquets (IPv4, IPv6, routeurs, OSPF, BGP).
4. **Transport (L4)** : Communication de bout en bout, multiplexage par ports (TCP, UDP).
5. **Session (L5)** : Établissement, gestion et fermeture des sessions applicatives.
6. **Présentation (L6)** : Encodage, formatage, chiffrement/déchiffrement (ASCII, TLS/SSL, JSON).
7. **Application (L7)** : Protocoles directement utilisés par les applications (HTTP, DNS, SSH, SMTP).

## Mnémonique
*Pour Le Réseau Tout Semble Parfaitement Accessible* (1 à 7).`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        comment: "Rédaction de la fiche fondamentale OSI",
        content: "Version 1...",
      },
    ],
  },
  {
    id: "wiki-tcp-vs-udp",
    title: "TCP/IP & Comparatif TCP vs UDP",
    topic: "Réseaux",
    section: "Fondamentaux",
    category: "syntheses",
    workspace_id: WS_SUPPTIC_ID,
    status: "community",
    status_verified_by: null,
    status_verified_at: null,
    creator_id: USER_SARAH_ID,
    last_editor_id: USER_MARC_ID,
    view_count: 98,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-modele-osi", "wiki-ipv4-ipv6"],
    created_at: new Date(Date.now() - 19 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    content: `# TCP/IP & Comparatif TCP vs UDP

La suite de protocoles d'Internet s'articule autour de 4 couches pragmatiques : Accès réseau, Internet (IP), Transport (TCP/UDP) et Application.

| Critère | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Connexion** | Orienté connexion (Handshake SYN, SYN-ACK, ACK) | Sans connexion |
| **Fiabilité** | Garantie : acquittement (ACK) et retransmission | Aucune garantie (best effort) |
| **Ordonnancement** | Segments numérotés et réordonnés | Aucun réordonnancement |
| **Contrôle de flux** | Oui (fenêtre glissante, congestion control) | Non |
| **En-tête** | 20 à 60 octets | 8 octets fixes |
| **Usages** | Web (HTTP/HTTPS), SSH, Transfert (FTP), Mail | Streaming direct, VoIP, DNS, Jeux réseau |`,
    history: [
      {
        version: 2,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        comment: "Ajout du tableau synthétique et des couches TCP/IP",
        content: "v2...",
      },
      {
        version: 1,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 19 * 86400000).toISOString(),
        comment: "Création initiale",
        content: "v1...",
      },
    ],
  },
  {
    id: "wiki-ipv4-ipv6",
    title: "Adressage IPv4 & IPv6",
    topic: "Réseaux",
    section: "Fondamentaux",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 65,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-modele-osi", "wiki-routage-statique"],
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    content: `# Adressage IPv4 & IPv6

Principes fondamentaux du plan d'adressage IP pour l'ingénierie des réseaux d'entreprise et d'opérateurs.

## 1. IPv4 (32 bits)
- Découpage par masques de sous-réseau (CIDR et VLSM).
- Plages privées RFC 1918 : \`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`.
- Nécessité du NAT/PAT pour l'accès à l'Internet public.

## 2. IPv6 (128 bits)
- Notation hexadécimale (8 blocs de 16 bits).
- Types d'adresses : Unicast Global (\`2000::/3\`), Link-Local (\`fe80::/10\`), Multicast (\`ff00::/8\`).
- Fin du broadcast au profit du Multicast et de Neighbor Discovery (NDP / ICMPv6).`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 25 * 86400000).toISOString(),
        comment: "Fiche initiale d'adressage",
        content: "v1...",
      },
    ],
  },

  // 📡 RÉSEAUX — Routage
  {
    id: "wiki-routage-statique",
    title: "Routage statique",
    topic: "Réseaux",
    section: "Routage",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_GRINNEL_ID,
    view_count: 45,
    related_document_ids: ["file-supptic-td-routage"],
    related_wiki_ids: ["wiki-rip", "wiki-ospf-comprendre"],
    created_at: new Date(Date.now() - 24 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    content: `# Routage statique

Le routage statique consiste à inscrire manuellement les routes dans la table de routage d'un équipement.

## Avantages & Limites
- **Avantages** : Faible utilisation CPU/RAM, bande passante préservée (aucun échange de paquets de découverte), sécurité accrue.
- **Inconvénients** : Évolutivité difficile, aucune tolérance aux pannes automatique sans IP SLA.

## Commande type Cisco
\`\`\`bash
ip route <réseau_destination> <masque> <adresse_prochain_saut> [distance_administrative]
# Route par défaut (passerelle de dernier recours)
ip route 0.0.0.0 0.0.0.0 192.168.1.254
\`\`\``,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 24 * 86400000).toISOString(),
        comment: "Fiche routage statique",
        content: "v1...",
      },
    ],
  },
  {
    id: "wiki-rip",
    title: "RIP (Routing Information Protocol)",
    topic: "Réseaux",
    section: "Routage",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "community",
    status_verified_by: null,
    status_verified_at: null,
    creator_id: USER_MARC_ID,
    last_editor_id: USER_MARC_ID,
    view_count: 38,
    related_document_ids: ["file-supptic-td-routage"],
    related_wiki_ids: ["wiki-routage-statique", "wiki-ospf-comprendre"],
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    content: `# RIP (Routing Information Protocol)

Protocole de routage dynamique interne (IGP) à vecteur de distance (Distance Vector) fondé sur l'algorithme Bellman-Ford.

## Caractéristiques
- **Métrique** : Nombre de sauts (Hop count). Métrique infinie fixée à 16.
- **Mises à jour** : Périodiques (toutes les 30 secondes).
- **Limites** : Convergence lente, risque de boucles de routage (atténué par Split Horizon, Poison Reverse et Hold-down timers).`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        comment: "Fiche RIP initiale",
        content: "v1...",
      },
    ],
  },
  {
    id: "wiki-ospf-comprendre",
    title: "OSPF — Comprendre simplement",
    topic: "Réseaux",
    section: "Routage",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M. (Référente Réseaux)",
    status_verified_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 168,
    related_document_ids: ["file-supptic-cours-reseaux", "file-supptic-td-routage"],
    related_wiki_ids: ["wiki-routage-statique", "wiki-rip", "wiki-bgp-intro"],
    created_at: new Date(Date.now() - 22 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    content: `# OSPF — Comprendre simplement

> **Mémoire collective du Workspace** — Synthèse rédigée et vérifiée par la communauté SUP'PTIC.
> Références documentaires : 📄 *Cours Réseaux — Routage Dynamique & OSPF.pdf* & 📄 *TD Routage*.

## 1. Qu'est-ce que OSPF ?
**OSPF (Open Shortest Path First)** est un protocole de routage dynamique interne (IGP) à état de liens. Contrairement à RIP qui compte les sauts, OSPF choisit le chemin le plus rapide en fonction de la bande passante grâce à l'algorithme de **Dijkstra**.

## 2. Principes fondamentaux
- **Convergence rapide** : Chaque routeur possède une carte complète de la topologie (LSDB - Link State Database).
- **Architecture hiérarchique** : Découpage en zones. L'**Area 0 (Backbone)** est le cœur obligatoire.
- **Voisinage OSPF** : Les routeurs s'échangent des paquets Hello (toutes les 10 secondes) pour former des adjacences.

## 3. Calcul du Coût et Contradiction possible avec les réseaux modernes
Le coût standard RFC est \`100 Mbps / Bande passante\`.
- ⚠️ *Note pratique de l'équipe* : Sur les liens modernes 1 Gbps ou 10 Gbps, le coût calculé par défaut vaut 1 dans les deux cas si la commande \`auto-cost reference-bandwidth\` n'est pas configurée à au moins 1000 ou 10000.

## 4. Les états d'adjacence OSPF
1. **Down** : aucun paquet reçu.
2. **Init** : Hello reçu du voisin.
3. **2-Way** : communication bidirectionnelle confirmée, élection du DR (Designated Router) et BDR.
4. **ExStart / Exchange** : négociation du Master/Slave et échange des descripteurs de base (DBD).
5. **Loading** : requête des LSA manquantes via LSR.
6. **Full** : synchronisation totale de la base topologique.

## 5. Commandes de configuration Cisco essentielles
\`\`\`bash
router ospf 1
 router-id 1.1.1.1
 auto-cost reference-bandwidth 1000
 network 192.168.1.0 0.0.0.255 area 0
\`\`\``,
    history: [
      {
        version: 3,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        comment: "Relecture et validation du calcul de métrique 1 Gbps (Statut Vérifié)",
        content: "Version 3 complète...",
      },
      {
        version: 2,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 8 * 86400000).toISOString(),
        comment: "Ajout du tableau des états d'adjacence et commandes Cisco",
        content: "Version 2...",
      },
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 22 * 86400000).toISOString(),
        comment: "Création initiale de la fiche de synthèse",
        content: "Version 1...",
      },
    ],
  },
  {
    id: "wiki-bgp-intro",
    title: "BGP — Routage Inter-Domaine & Politiques",
    topic: "Réseaux",
    section: "Routage",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "draft",
    status_verified_by: null,
    status_verified_at: null,
    creator_id: USER_MARC_ID,
    last_editor_id: USER_MARC_ID,
    view_count: 32,
    related_document_ids: ["file-supptic-examen-2025"],
    related_wiki_ids: ["wiki-ospf-comprendre"],
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    content: `# BGP — Routage Inter-Domaine & Politiques

Border Gateway Protocol (BGP-4) est le protocole de routage vecteur de chemin (Path Vector) qui relie l'ensemble des Systèmes Autonomes (AS) d'Internet.

## Caractéristiques
- Fonctionne au-dessus de TCP (port 179).
- Décision fondée sur les politiques de routage et les attributs (AS_PATH, Local_Pref, MED).
- eBGP pour les liaisons entre opérateurs différents ; iBGP à l'intérieur d'un même AS.`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
        comment: "Brouillon initial BGP",
        content: "v1...",
      },
    ],
  },

  // 📡 RÉSEAUX — Commutation (Exemple central Section 6 du cadrage : VLAN relié à Sécurité réseau, Trunk, STP, 802.1Q)
  {
    id: "wiki-vlan",
    title: "VLAN (Virtual Local Area Network)",
    topic: "Réseaux",
    section: "Commutation",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 125,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-securite-reseau", "wiki-trunk-8021q", "wiki-stp", "wiki-modele-osi"],
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    content: `# VLAN (Virtual Local Area Network)

Un VLAN permet de segmenter logiquement un réseau local physique (LAN) en plusieurs domaines de diffusion indépendants de niveau 2.

## 1. Objectifs
- **Sécurité** : Cloisonnement du trafic sensible (ex: VLAN Direction, VLAN Étudiants, VLAN Invités).
- **Performance** : Réduction de la taille des domaines de diffusion (broadcast storms).
- **Flexibilité** : Organisation logique indépendante de la topologie physique du câblage.

## 2. Relations Clés & Notions Associées (Section 6)
- 🔗 **Trunk 802.1Q** : Port inter-commutateurs transportant plusieurs VLAN simultanément via l'encapsulation de tag 802.1Q (4 octets).
- 🔗 **STP (Spanning Tree Protocol)** : Évite les boucles de commutation créées par la redondance de liens dans les VLAN (PVST+).
- 🔗 **Sécurité réseau & Pare-feu** : Le routage inter-VLAN doit obligatoirement transiter par un pare-feu ou routeur de niveau 3 (Router-on-a-Stick ou commutateur L3 SVI).

## 3. Configuration Cisco
\`\`\`bash
vlan 10
 name ETUDIANTS
exit
interface GigabitEthernet0/1
 switchport mode access
 switchport access vlan 10
\`\`\``,
    history: [
      {
        version: 2,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        comment: "Ajout des liens avec Trunk 802.1Q et Sécurité réseau",
        content: "v2...",
      },
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 21 * 86400000).toISOString(),
        comment: "Création initiale",
        content: "v1...",
      },
    ],
  },
  {
    id: "wiki-stp",
    title: "STP (Spanning Tree Protocol)",
    topic: "Réseaux",
    section: "Commutation",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    creator_id: USER_SARAH_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 73,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-vlan", "wiki-trunk-8021q"],
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    content: `# STP (Spanning Tree Protocol — IEEE 802.1D / 802.1w)

Protocole de niveau 2 conçu pour éliminer les boucles physiques de commutation dans les réseaux Ethernet maillés tout en assurant la redondance des liens.

## Principes
- Élection du **Root Bridge** (commutateur avec la priorité la plus basse, puis adresse MAC la plus faible).
- Rôles des ports : Root Port (vers le Root Bridge), Designated Port (sur chaque segment), Blocked/Alternate Port (coupe la boucle).
- Évolution vers RSTP (802.1w) pour une convergence en moins de 1 seconde contre 30 à 50 secondes avec STP legacy.`,
    history: [
      {
        version: 1,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 18 * 86400000).toISOString(),
        comment: "Fiche STP",
        content: "v1...",
      },
    ],
  },
  {
    id: "wiki-trunk-8021q",
    title: "Trunk & Encapsulation IEEE 802.1Q",
    topic: "Réseaux",
    section: "Commutation",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "community",
    status_verified_by: null,
    status_verified_at: null,
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_GRINNEL_ID,
    view_count: 59,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-vlan", "wiki-stp"],
    created_at: new Date(Date.now() - 17 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    content: `# Trunk & Encapsulation IEEE 802.1Q

Une liaison Trunk permet de véhiculer plusieurs flux de VLAN différents à travers un seul câble physique entre deux commutateurs ou entre un commutateur et un routeur.

## Format de la trame 802.1Q
Insertion d'un champ de 4 octets (Tag) entre l'adresse MAC source et le champ EtherType :
- **TPID (0x8100)** : Identifie le protocole 802.1Q.
- **PCP (3 bits)** : Priorité de qualité de service (CoS 802.1p).
- **DEI (1 bit)** : Éligibilité à la suppression de trame en cas d'encombrement.
- **VID (12 bits)** : Identifiant du VLAN (1 à 4094).

## VLAN Natif
Les trames appartenant au VLAN natif (par défaut VLAN 1) transitent sans tag sur le lien trunk.`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 17 * 86400000).toISOString(),
        comment: "Fiche Trunk",
        content: "v1...",
      },
    ],
  },

  // 📶 TÉLÉCOMS
  {
    id: "wiki-fibre-optique",
    title: "Fibre Optique & Réflectométrie (OTDR)",
    topic: "Télécoms",
    section: "Transmission",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Marc T.",
    status_verified_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    creator_id: USER_MARC_ID,
    last_editor_id: USER_MARC_ID,
    view_count: 81,
    related_document_ids: ["file-supptic-td-routage"],
    related_wiki_ids: ["wiki-modulation-qam"],
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    content: `# Fibre Optique & Réflectométrie (OTDR)

Supports de transmission par guidage d'ondes lumineuses utilisées dans les réseaux d'accès FTTH et les dorsales opérateurs (DWDM).

## Monomode (SMF) vs Multimode (MMF)
- **Monomode (G.652, 9/125 µm)** : Cœur très fin permettant un seul mode de propagation. Utilisée pour les longues distances (plusieurs dizaines de kilomètres) avec lasers DFB/FP à 1310 nm et 1550 nm.
- **Multimode (OM3/OM4, 50/125 µm)** : Plusieurs modes lumineux coexistent, causant une dispersion modale. Réservée aux data centers (distances < 500 m).

## Réflectométrie optique (OTDR)
L'OTDR envoie des impulsions lumineuses et mesure la rétrodiffusion Rayleigh ainsi que les réflexions de Fresnel pour localiser avec précision les épissures, connecteurs et coupures sur le lien.`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
        comment: "Fiche fibre optique",
        content: "v1...",
      },
    ],
  },
  {
    id: "wiki-modulation-qam",
    title: "Modulations Numériques (QPSK, 16-QAM, 64-QAM)",
    topic: "Télécoms",
    section: "Transmission",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "community",
    status_verified_by: null,
    status_verified_at: null,
    creator_id: USER_MARC_ID,
    last_editor_id: USER_MARC_ID,
    view_count: 48,
    related_document_ids: [],
    related_wiki_ids: ["wiki-fibre-optique", "wiki-architecture-5g"],
    created_at: new Date(Date.now() - 16 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 9 * 86400000).toISOString(),
    content: `# Modulations Numériques (QPSK, 16-QAM, 64-QAM, 256-QAM)

Techniques d'adaptation des signaux numériques sur une onde porteuse sinusoïdale radio ou hertzienne.

- **QPSK (Quadrature Phase Shift Keying)** : 4 états de phase, transporte 2 bits par symbole.
- **16-QAM** : Combine amplitude et phase pour générer 16 points de constellation, transportant 4 bits par symbole.
- **256-QAM (utilisé en 4G/5G)** : 8 bits par symbole dans des conditions radio optimales (SINR élevé).`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 16 * 86400000).toISOString(),
        comment: "Fiche modulations",
        content: "v1...",
      },
    ],
  },
  {
    id: "wiki-architecture-5g",
    title: "Architecture Réseau Mobile 4G & 5G (SA / NSA)",
    topic: "Télécoms",
    section: "Réseaux Mobiles",
    category: "syntheses",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    creator_id: USER_SARAH_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 110,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-modulation-qam"],
    created_at: new Date(Date.now() - 11 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    content: `# Architecture Réseau Mobile 4G & 5G (SA / NSA)

Évolution des réseaux d'accès radioélectrique (RAN) et du cœur de réseau (Core Network).

## 1. Différence 5G NSA vs 5G SA
- **5G NSA (Non-Standalone - Option 3x)** : Utilise les antennes 5G NR (New Radio) reliées au cœur de réseau existant 4G EPC. Déploiement rapide.
- **5G SA (Standalone - Option 2)** : Antennes 5G gNodeB reliées directement à un cœur 5G Core natif en microservices cloud (SBA - Service Based Architecture), autorisant le **Network Slicing** et la latence ultra-faible (URLLC).

## 2. Fonctions du cœur 5G (5GC)
- **AMF** : Gestion des accès et de la mobilité (équivalent MME en 4G).
- **SMF** : Gestion des sessions de données (équivalent SGW-C/PGW-C).
- **UPF** : Plan utilisateur transportant les données utiles à très haut débit.`,
    history: [
      {
        version: 1,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 11 * 86400000).toISOString(),
        comment: "Fiche 5G",
        content: "v1...",
      },
    ],
  },

  // 🔐 CYBERSÉCURITÉ
  {
    id: "wiki-securite-reseau",
    title: "Sécurité Réseau & Pare-feu (Firewall)",
    topic: "Cybersécurité",
    section: "Sécurité Réseau",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Grinnel N.",
    status_verified_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_GRINNEL_ID,
    view_count: 94,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-vlan", "wiki-vpn-ipsec", "wiki-crypto-intro"],
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    content: `# Sécurité Réseau & Pare-feu (Firewall)

Mise en place de zones de sécurité (DMZ, Réseau interne, WAN) et filtrage des flux au périmètre.

## 1. Types de Pare-feu
- **Filtrage de paquets sans état (Stateless)** : Basé uniquement sur les adresses IP et ports sources/destinations (ACLs routeur).
- **Stateful Inspection (Stateful)** : Maintient une table d'états des connexions (TCP handshakes, UDP pseudo-sessions).
- **Next-Generation Firewall (NGFW)** : Inspection applicative L7 (Deep Packet Inspection), détection d'intrusions (IPS), sandboxing et décryptage SSL/TLS.

## 2. Relation avec la segmentation VLAN (Section 6)
Le cloisonnement par VLAN n'est efficace que s'il est combiné à des règles strictes de pare-feu entre sous-réseaux (principe du moindre privilège).`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        comment: "Fiche sécurité réseau",
        content: "v1...",
      },
    ],
  },
  {
    id: "wiki-vpn-ipsec",
    title: "VPN IPsec & Tunnels Sécurisés",
    topic: "Cybersécurité",
    section: "Sécurité Réseau",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "community",
    status_verified_by: null,
    status_verified_at: null,
    creator_id: USER_MARC_ID,
    last_editor_id: USER_MARC_ID,
    view_count: 67,
    related_document_ids: [],
    related_wiki_ids: ["wiki-securite-reseau", "wiki-crypto-intro"],
    created_at: new Date(Date.now() - 13 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    content: `# VPN IPsec & Tunnels Sécurisés

IPsec (Internet Protocol Security) fournit l'authentification, l'intégrité et la confidentialité des échanges au niveau IP (couche 3).

## Les deux phases d'IKE (Internet Key Exchange)
1. **IKE Phase 1 (ISAKMP SA)** : Authentification mutuelle des routeurs (PSK ou certificats X.509) et établissement d'un canal sécurisé de gestion.
2. **IKE Phase 2 (IPsec SA)** : Négociation des algorithmes de chiffrement (ESP avec AES-GCM) pour encapsuler le trafic utilisateur.

## Modes de fonctionnement
- **Mode Tunnel** : Chiffre le paquet IP complet et y ajoute un nouvel en-tête IP (liaison Site-à-Site).
- **Mode Transport** : Chiffre uniquement la charge utile (payload L4), conservant l'en-tête IP d'origine (Host-to-Host).`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 13 * 86400000).toISOString(),
        comment: "Fiche IPsec",
        content: "v1...",
      },
    ],
  },
  {
    id: "wiki-crypto-intro",
    title: "Cryptographie Symétrique vs Asymétrique",
    topic: "Cybersécurité",
    section: "Cryptographie",
    category: "syntheses",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    creator_id: USER_SARAH_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 88,
    related_document_ids: [],
    related_wiki_ids: ["wiki-securite-reseau", "wiki-vpn-ipsec"],
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    content: `# Cryptographie Symétrique vs Asymétrique

Les deux piliers mathématiques assurant la confidentialité, l'intégrité, l'authenticité et la non-répudiation des systèmes d'information.

| Propriété | Cryptographie Symétrique (Clé secrète) | Cryptographie Asymétrique (Bi-clé Publique/Privée) |
|---|---|---|
| **Clés utilisées** | Une unique clé partagée pour chiffrer et déchiffrer | Une clé publique (chiffrement/vérification) et une clé privée (déchiffrement/signature) |
| **Vitesse de calcul** | Très rapide, implémentable matériellement (AES-NI) | Lente (opérations d'exponentiation modulaire ou courbes elliptiques) |
| **Algorithmes types** | AES-256, ChaCha20, 3DES | RSA (2048/4096 bits), ECC (ECDSA, Ed25519) |
| **Cas d'usage** | Chiffrement en masse des flux réseau et disques | Échange initial de clé symétrique (Diffie-Hellman), signatures numériques, certificats TLS |`,
    history: [
      {
        version: 1,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 18 * 86400000).toISOString(),
        comment: "Fiche cryptographie",
        content: "v1...",
      },
    ],
  },

  // 💻 INFORMATIQUE & SYSTÈMES
  {
    id: "wiki-linux-bash",
    title: "Administration Linux & Scripts Shell",
    topic: "Informatique",
    section: "Systèmes",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "community",
    status_verified_by: null,
    status_verified_at: null,
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_GRINNEL_ID,
    view_count: 76,
    related_document_ids: ["file-supptic-projet-pfe"],
    related_wiki_ids: ["wiki-securite-reseau"],
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    content: `# Administration Linux & Scripts Shell

Commandes et bonnes pratiques pour administrer des serveurs Debian/Ubuntu et RedHat en environnement réseau.

## Commandes réseau indispensables
- \`ip addr\` / \`ip route\` : Gestion des interfaces et de la table de routage sous Linux.
- \`ss -tulpn\` : Visualisation des sockets d'écoute et ports ouverts.
- \`tcpdump -i eth0 -nn\` : Capture de trafic réseau en ligne de commande.
- \`systemctl status <service>\` : Gestion des démons système (systemd).`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        comment: "Fiche Linux",
        content: "v1...",
      },
    ],
  },
];

export const INITIAL_CHUNKS: ServerIndexedChunk[] = [
  {
    id: "chunk-1",
    source_id: "file-supptic-cours-reseaux",
    source_type: "document",
    content: "La métrique utilisée par OSPF est le Coût (Cost), inversement proportionnel à la bande passante : Coût = Bande Passante de Référence / Bande Passante de l'interface.",
    chapter: "Chapitre 4 : Open Shortest Path First (OSPF v2/v3)",
    section: "Calcul de la métrique et Coût OSPF",
    locator: "p. 42",
  },
  {
    id: "chunk-2",
    source_id: "file-supptic-cours-reseaux",
    source_type: "document",
    content: "Dans la spécification standard de base Cisco et RFC 2328 : La bande passante de référence par défaut est de 100 Mbps (10^8 bps). Pour GigabitEthernet (1000 Mbps) : Coût = 100 / 1000 = 0.1 -> arrondi à 1.",
    chapter: "Chapitre 4 : Open Shortest Path First (OSPF v2/v3)",
    section: "Calcul de la métrique et Coût OSPF",
    locator: "p. 42",
  },
  {
    id: "chunk-3",
    source_id: "file-supptic-cours-reseaux",
    source_type: "document",
    content: "OSPF est un protocole de passerelle intérieure (IGP) standardisé (RFC 2328). Il utilise l'algorithme de Dijkstra pour trouver le plus court chemin entre chaque routeur.",
    chapter: "Chapitre 4 : Open Shortest Path First (OSPF v2/v3)",
    section: "Introduction",
    locator: "p. 41",
  },
  {
    id: "chunk-4",
    source_id: "file-supptic-td-routage",
    source_type: "document",
    content: "Dans un réseau OSPF multi-zones, l'aire 0 est appelée backbone area. Tous les autres réseaux doivent être physiquement ou logiquement connectés à l'aire 0.",
    chapter: "Topologies Multi-Zones",
    section: "Aire 0",
    locator: "p. 5",
  },
  {
    id: "chunk-5",
    source_id: "file-perso-cours",
    source_type: "document",
    content: "QAM-16 et QAM-64 : constellations et efficacité spectrale. Échantillonnage de Nyquist-Shannon : fe >= 2 * fmax.",
    chapter: "Modulation et Démodulation",
    section: "Théorèmes",
    locator: "p. 12",
  },
  {
    id: "chunk-6",
    source_id: "wiki-ospf-base",
    source_type: "wiki",
    content: "En environnement moderne (1G / 10G), le calcul du coût par défaut sature à 1 et nécessite d'ajuster manuellement la commande auto-cost reference-bandwidth 1000.",
    chapter: "Configuration OSPF",
    section: "Limites du calcul de base",
  }
];
