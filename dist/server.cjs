"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_express2 = __toESM(require("express"), 1);
var import_http = require("http");
var import_path = __toESM(require("path"), 1);

// server/routes.ts
var import_express = require("express");
var import_genai = require("@google/genai");

// server/seedData.ts
var USER_GRINNEL_ID = "u-grinnel-001";
var USER_SARAH_ID = "u-sarah-002";
var USER_MARC_ID = "u-marc-003";
var USER_ADMIN_ID = "u-admin-004";
var WS_SUPPTIC_ID = "ws-supptic-3a-ir";
var WS_RH_ID = "ws-rh-organisation";
var WS_TECH_ID = "ws-technique-produit";
var INITIAL_USERS = [
  {
    id: USER_GRINNEL_ID,
    username: "grinnel",
    name: "Grinnel N.",
    email: "grinnel@lekki.io",
    role: "admin"
  },
  {
    id: USER_SARAH_ID,
    username: "sarah",
    name: "Sarah M.",
    email: "sarah@lekki.io",
    role: "editor"
  },
  {
    id: USER_MARC_ID,
    username: "marc",
    name: "Marc T.",
    email: "marc@lekki.io",
    role: "editor"
  },
  {
    id: USER_ADMIN_ID,
    username: "admin",
    name: "Administrateur",
    email: "admin@lekki.io",
    role: "admin"
  }
];
var INITIAL_WORKSPACES = [
  {
    id: WS_SUPPTIC_ID,
    name: "SUP'PTIC \u2014 3A IR",
    description: "Promotion 3\xE8me Ann\xE9e Ing\xE9nierie des R\xE9seaux & T\xE9l\xE9coms",
    owner_id: USER_GRINNEL_ID,
    icon: "GraduationCap",
    created_at: new Date(Date.now() - 40 * 864e5).toISOString()
  },
  {
    id: WS_RH_ID,
    name: "RH & Organisation",
    description: "Politiques RH, vie d'entreprise, onboarding et cong\xE9s",
    owner_id: USER_ADMIN_ID,
    icon: "Building2",
    created_at: new Date(Date.now() - 30 * 864e5).toISOString()
  },
  {
    id: WS_TECH_ID,
    name: "Technique & Produit",
    description: "Architecture, infrastructure, s\xE9curit\xE9 et outils num\xE9riques",
    owner_id: USER_ADMIN_ID,
    icon: "Cpu",
    created_at: new Date(Date.now() - 25 * 864e5).toISOString()
  }
];
var INITIAL_MEMBERS = [
  {
    id: "m-01",
    workspace_id: WS_SUPPTIC_ID,
    user_id: USER_GRINNEL_ID,
    role: "owner",
    joined_at: new Date(Date.now() - 40 * 864e5).toISOString()
  },
  {
    id: "m-02",
    workspace_id: WS_SUPPTIC_ID,
    user_id: USER_SARAH_ID,
    role: "verifier",
    joined_at: new Date(Date.now() - 38 * 864e5).toISOString()
  },
  {
    id: "m-03",
    workspace_id: WS_SUPPTIC_ID,
    user_id: USER_MARC_ID,
    role: "member",
    joined_at: new Date(Date.now() - 35 * 864e5).toISOString()
  },
  {
    id: "m-04",
    workspace_id: WS_RH_ID,
    user_id: USER_GRINNEL_ID,
    role: "member",
    joined_at: new Date(Date.now() - 30 * 864e5).toISOString()
  },
  {
    id: "m-05",
    workspace_id: WS_TECH_ID,
    user_id: USER_GRINNEL_ID,
    role: "admin",
    joined_at: new Date(Date.now() - 25 * 864e5).toISOString()
  }
];
var INITIAL_FOLDERS = [
  // SUP'PTIC Workspace Folders (as described in product vision Section 6)
  {
    id: "f-supptic-cours",
    name: "Cours",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 35 * 864e5).toISOString()
  },
  {
    id: "f-supptic-td-tp",
    name: "TD & TP",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 35 * 864e5).toISOString()
  },
  {
    id: "f-supptic-examens",
    name: "Examens",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_SARAH_ID,
    created_at: new Date(Date.now() - 30 * 864e5).toISOString()
  },
  {
    id: "f-supptic-projets",
    name: "Projets",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_MARC_ID,
    created_at: new Date(Date.now() - 30 * 864e5).toISOString()
  },
  {
    id: "f-supptic-ressources",
    name: "Ressources",
    workspace_id: WS_SUPPTIC_ID,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 28 * 864e5).toISOString()
  },
  // Personal Folders for Grinnel ("Mon Espace")
  {
    id: "f-perso-revisions",
    name: "R\xE9visions personnelles",
    workspace_id: null,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 20 * 864e5).toISOString()
  },
  {
    id: "f-perso-stages",
    name: "Dossier Stage PFE",
    workspace_id: null,
    owner_id: USER_GRINNEL_ID,
    created_at: new Date(Date.now() - 15 * 864e5).toISOString()
  }
];
var INITIAL_FILES = [
  // Personal files (Mon Espace)
  {
    id: "file-perso-cours",
    name: "Cours personnel \u2014 T\xE9l\xE9coms & Signaux.pdf",
    extension: "pdf",
    size_bytes: 342e4,
    mime_type: "application/pdf",
    page_count: 58,
    is_starred: true,
    is_deleted: false,
    owner_id: USER_GRINNEL_ID,
    workspace_id: null,
    folder_id: "f-perso-revisions",
    shared_with: [],
    summary: "Notes personnelles et formules de modulation QAM, OFDM, transform\xE9e de Fourier et traitement du signal.",
    content: `# Cours Personnel T\xE9l\xE9coms & Signaux

## Modulation et D\xE9modulation
- QAM-16 et QAM-64 : constellations et efficacit\xE9 spectrale.
- \xC9chantillonnage de Nyquist-Shannon : fe >= 2 * fmax.
- Bilan de liaison et calcul du rapport Signal sur Bruit (SNR).

## Synth\xE8se personnelle
Fiche de r\xE9vision pour l'\xE9preuve de fin de semestre \xE0 SUP'PTIC. Formules de Friis et att\xE9nuation en espace libre.`,
    created_at: new Date(Date.now() - 18 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 10 * 864e5).toISOString(),
    index_meta: {
      total_chunks: 34,
      total_pages_analyzed: 58,
      chapters_detected: ["Modulation et D\xE9modulation", "Synth\xE8se personnelle"]
    }
  },
  {
    id: "file-perso-td-partage",
    name: "TD R\xE9seaux \u2014 Exercices & Corrig\xE9s.pdf",
    extension: "pdf",
    size_bytes: 184e4,
    mime_type: "application/pdf",
    page_count: 24,
    is_starred: false,
    is_deleted: false,
    owner_id: USER_GRINNEL_ID,
    workspace_id: null,
    folder_id: null,
    shared_with: [USER_SARAH_ID],
    // Partagé avec Sarah
    summary: "Exercices d'adressage IPv4/IPv6, VLSM, calcul de masques et tables de routage statique.",
    content: `# TD R\xE9seaux \u2014 Adressage et Routage Statique

## Exercice 1 : D\xE9coupage VLSM
Soit le r\xE9seau 192.168.10.0/24. D\xE9couper pour 4 sous-r\xE9seaux :
- LAN 1 (60 h\xF4tes) : masque /26 (192.168.10.0 \xE0 192.168.10.63)
- LAN 2 (28 h\xF4tes) : masque /27 (192.168.10.64 \xE0 192.168.10.95)
- Interconnexion routeurs R1-R2 (2 adresses) : masque /30 (192.168.10.96 \xE0 192.168.10.99)

## Exercice 2 : Tables de routage
Route par d\xE9faut 0.0.0.0/0 vers la passerelle de sortie du campus.`,
    created_at: new Date(Date.now() - 14 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 6 * 864e5).toISOString()
  },
  {
    id: "file-shared-sarah",
    name: "Rapport_TP_Fibre_Optique_Mesures.docx",
    extension: "docx",
    size_bytes: 89e4,
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    page_count: 14,
    is_starred: true,
    is_deleted: false,
    owner_id: USER_SARAH_ID,
    // Sarah est propriétaire
    workspace_id: null,
    folder_id: null,
    shared_with: [USER_GRINNEL_ID],
    // Partagé avec Grinnel -> "Partagés avec moi"
    summary: "Rapport de mesures par r\xE9flectom\xE9trie optique (OTDR) sur liaison monomode 1310nm et 1550nm.",
    content: `# Rapport TP R\xE9flectom\xE9trie et Fibre Optique

Auteur : Sarah M. (partag\xE9 avec Grinnel)
Date : Septembre 2026

## 1. Mesures r\xE9flectom\xE9triques (OTDR)
- Att\xE9nuation moyenne mesur\xE9e \xE0 1310 nm : 0.34 dB/km.
- Att\xE9nuation moyenne \xE0 1550 nm : 0.20 dB/km (fen\xEAtre de dispersion minimale).
- \xC9v\xE9nements d\xE9tect\xE9s : \xE9pissure par fusion au point km 4.2 (perte 0.05 dB, conforme \xE0 la norme UIT-T G.652).

## 2. Conclusion du banc de test
La liaison est qualifi\xE9e pour un d\xE9bit 10 Gbps Ethernet (10GBASE-LR).`,
    created_at: new Date(Date.now() - 8 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 3 * 864e5).toISOString()
  },
  {
    id: "file-shared-marc",
    name: "Planning_Soutenances_PFE_2026.pdf",
    extension: "pdf",
    size_bytes: 42e4,
    mime_type: "application/pdf",
    page_count: 4,
    is_starred: false,
    is_deleted: false,
    owner_id: USER_MARC_ID,
    workspace_id: null,
    folder_id: null,
    shared_with: [USER_GRINNEL_ID],
    // Partagé avec Grinnel
    summary: "Calendrier officiel des jurys et pr\xE9sentations de fin d'\xE9tudes.",
    content: `# Planning des Soutenances PFE 2026 \u2014 3A IR

Session principale : 15 au 25 Octobre 2026.
B\xE2timent B, Salle de Conf\xE9rence 102.
Chaque candidat dispose de 30 minutes de pr\xE9sentation, suivies de 20 minutes de questions du jury d'experts.`,
    created_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 2 * 864e5).toISOString()
  },
  {
    id: "file-perso-corbeille",
    name: "Ancienne_Ebauche_CV.txt",
    extension: "txt",
    size_bytes: 12e3,
    mime_type: "text/plain",
    page_count: 1,
    is_starred: false,
    is_deleted: true,
    // Corbeille
    owner_id: USER_GRINNEL_ID,
    workspace_id: null,
    folder_id: null,
    shared_with: [],
    summary: "Brouillon supprim\xE9.",
    content: `Ancienne version de CV \xE9tudiant 2025.`,
    created_at: new Date(Date.now() - 45 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 20 * 864e5).toISOString()
  },
  // Workspace SUP'PTIC Documents (as in Section 6 & 10 of product document)
  {
    id: "file-supptic-cours-reseaux",
    name: "Cours R\xE9seaux \u2014 Routage Dynamique & OSPF.pdf",
    extension: "pdf",
    size_bytes: 485e4,
    mime_type: "application/pdf",
    page_count: 78,
    indexed_chunks_count: 284,
    detected_chapters: [
      { number: "01", title: "Introduction aux architectures de routage", page: 4, subtopics: ["Routage statique vs dynamique", "Syst\xE8mes autonomes (AS)"] },
      { number: "02", title: "Protocoles \xE0 vecteur de distance", page: 16, subtopics: ["Algorithme Bellman-Ford", "Probl\xE8me du compte \xE0 l'infini", "Poison reverse"] },
      { number: "03", title: "Protocoles \xE0 \xE9tat de liens (Link-State)", page: 28, subtopics: ["Inondation LSA", "Base de donn\xE9es topologique (LSDB)"] },
      { number: "04", title: "Routage dynamique OSPF v2/v3", page: 42, subtopics: ["Calcul du co\xFBt m\xE9trique", "Types de paquets OSPF", "\xC9lection DR/BDR"] },
      { number: "05", title: "Hi\xE9rarchie Multi-Zones et convergence", page: 60, subtopics: ["Zone Backbone Area 0", "Routeurs ABR et ASBR", "Aires Stub et NSSA"] }
    ],
    key_passages: [
      { label: "M\xE9trique et Formule du Co\xFBt OSPF", location: "Chapitre 4 \xB7 p. 42", excerpt: "Co\xFBt = Bande Passante de R\xE9f\xE9rence / Bande Passante de l'interface. R\xE9f\xE9rence standard Cisco : 100 Mbps (10^8 bps)." },
      { label: "Types de paquets OSPF", location: "Chapitre 4 \xB7 p. 45", excerpt: "1. Hello (keepalive 10s), 2. DBD (Database Description), 3. LSR, 4. LSU, 5. LSAck." },
      { label: "Algorithme de Dijkstra", location: "Chapitre 3 \xB7 p. 30", excerpt: "Calcul du plus court chemin d'arbre couvrant (SPF Tree) depuis la racine locale." }
    ],
    linked_wiki_ids: ["wiki-ospf", "wiki-tcp-udp"],
    is_starred: true,
    is_deleted: false,
    owner_id: USER_GRINNEL_ID,
    workspace_id: WS_SUPPTIC_ID,
    folder_id: "f-supptic-cours",
    shared_with: [],
    summary: "Support complet sur les protocoles \xE0 \xE9tat de liens, l'algorithme Dijkstra (SPF), les LSA et le calcul du co\xFBt OSPF (page 42).",
    content: `# Cours R\xE9seaux : Protocoles de Routage Dynamique

Document original de r\xE9f\xE9rence \u2014 SUP'PTIC 3A IR.

## Chapitre 4 : Open Shortest Path First (OSPF v2/v3)
OSPF est un protocole de passerelle int\xE9rieure (IGP) standardis\xE9 (RFC 2328).
Il utilise l'algorithme de Dijkstra pour trouver le plus court chemin entre chaque routeur.

### Page 42 : Calcul de la m\xE9trique et Co\xFBt OSPF
La m\xE9trique utilis\xE9e par OSPF est le **Co\xFBt** (Cost), inversement proportionnel \xE0 la bande passante :
\`Co\xFBt = Bande Passante de R\xE9f\xE9rence / Bande Passante de l'interface\`

Dans la sp\xE9cification standard de base Cisco et RFC 2328 :
- La bande passante de r\xE9f\xE9rence par d\xE9faut est de **100 Mbps** (10^8 bps).
- Pour FastEthernet (100 Mbps) : Co\xFBt = 100 / 100 = 1.
- Pour GigabitEthernet (1000 Mbps) : Co\xFBt = 100 / 1000 = 0.1 -> arrondi \xE0 1 (saturation de la m\xE9trique sans ajustement de la bande passante de r\xE9f\xE9rence).

Pour diff\xE9rencier le Gigabit et le 10G, l'administrateur doit ex\xE9cuter :
\`auto-cost reference-bandwidth 1000\` ou \`10000\`.

### Page 45 : Types de paquets OSPF
1. Hello (d\xE9couverte de voisins, keepalive toutes les 10s)
2. DBD (Database Description)
3. LSR (Link-State Request)
4. LSU (Link-State Update)
5. LSAck (Link-State Acknowledgment)

### Diff\xE9rence TCP vs UDP (Rappel Fondamental)
- TCP : orient\xE9 connexion, fiable avec accus\xE9 de r\xE9ception (ACK), contr\xF4le de flux par fen\xEAtre glissante, ordonnancement garanti.
- UDP : sans connexion, sans garantie de livraison ni d'ordre, faible overhead, adapt\xE9 au temps r\xE9el (VoIP, DNS, streaming).`,
    created_at: new Date(Date.now() - 32 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 15 * 864e5).toISOString(),
    index_meta: {
      total_chunks: 124,
      total_pages_analyzed: 78,
      chapters_detected: ["Chapitre 4 : Open Shortest Path First (OSPF v2/v3)", "Chapitre 5 : BGP et routage inter-AS", "Chapitre 6 : S\xE9curit\xE9 des protocoles"]
    }
  },
  {
    id: "file-supptic-td-routage",
    name: "TD Routage \u2014 Topologies Multi-Zones & OSPF.pdf",
    extension: "pdf",
    size_bytes: 21e5,
    mime_type: "application/pdf",
    page_count: 18,
    indexed_chunks_count: 64,
    detected_chapters: [
      { number: "01", title: "Exercice 1 : Plan d'adressage et VLSM", page: 2, subtopics: ["Sous-r\xE9seaux /27 et /30"] },
      { number: "02", title: "Exercice 2 : Configuration d'un Backbone OSPF", page: 7, subtopics: ["Area 0", "Voisinages 2-Way"] },
      { number: "03", title: "Exercice 3 : Routeurs ABR et redistribution", page: 12, subtopics: ["LSA Type 3 et 5"] }
    ],
    key_passages: [
      { label: "Exercice 3 : Raccordement ABR", location: "p. 12 \xB7 Exercice 3", excerpt: "Configuration d'un routeur fronti\xE8re ABR entre l'Area 0 et l'Area 10." }
    ],
    linked_wiki_ids: ["wiki-ospf"],
    is_starred: false,
    is_deleted: false,
    owner_id: USER_SARAH_ID,
    workspace_id: WS_SUPPTIC_ID,
    folder_id: "f-supptic-td-tp",
    shared_with: [],
    summary: "Travaux dirig\xE9s sur la segmentation en zones OSPF (Area 0 Backbone) et les routeurs ABR/ASBR.",
    content: `# TD Routage Avanc\xE9 : OSPF Multi-Zones

Auteurs : D\xE9partement R\xE9seaux SUP'PTIC.

## Architecture en Zones
Toutes les zones non-backbone (Area 1, Area 2) doivent obligatoirement \xEAtre raccord\xE9es \xE0 la zone dorsale **Area 0**.
- **ABR (Area Border Router)** : routeur situ\xE9 \xE0 la fronti\xE8re entre Area 0 et une zone secondaire.
- **ASBR (Autonomous System Boundary Router)** : injecte des routes externes (redistribution BGP ou statique) via des LSA Type 5.`,
    created_at: new Date(Date.now() - 25 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 12 * 864e5).toISOString()
  },
  {
    id: "file-supptic-examen-2025",
    name: "Examen R\xE9seaux & T\xE9l\xE9coms \u2014 Session 2025.pdf",
    extension: "pdf",
    size_bytes: 14e5,
    mime_type: "application/pdf",
    page_count: 8,
    is_starred: true,
    is_deleted: false,
    owner_id: USER_SARAH_ID,
    workspace_id: WS_SUPPTIC_ID,
    folder_id: "f-supptic-examens",
    shared_with: [],
    summary: "Sujet officiel de l'\xE9preuve d'ing\xE9nierie r\xE9seaux avec corrig\xE9 partiel sur BGP et OSPF.",
    content: `# Examen National \u2014 Ing\xE9nierie R\xE9seaux 2025

Partie 1 : Protocole OSPF et ing\xE9nierie de trafic.
Questions sur les \xE9tats de voisinage OSPF : Down, Init, 2-Way, ExStart, Exchange, Loading, Full.
Explication de l'\xE9lection DR/BDR sur r\xE9seaux multi-acc\xE8s broadcast (priorit\xE9 maximale puis Router-ID le plus \xE9lev\xE9).`,
    created_at: new Date(Date.now() - 20 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 10 * 864e5).toISOString()
  },
  {
    id: "file-supptic-projet-pfe",
    name: "Cahier_Des_Charges_Projet_SDN.docx",
    extension: "docx",
    size_bytes: 65e4,
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    page_count: 12,
    is_starred: false,
    is_deleted: false,
    owner_id: USER_MARC_ID,
    workspace_id: WS_SUPPTIC_ID,
    folder_id: "f-supptic-projets",
    shared_with: [],
    summary: "Sp\xE9cification du banc d'essai Software Defined Networking avec OpenFlow et contr\xF4leur Ryu.",
    content: `# Projet 3A : D\xE9ploiement d'un R\xE9seau SDN avec OpenFlow et Ryu

Objectif : S\xE9parer le plan de contr\xF4le du plan de donn\xE9es.
Impl\xE9mentation de r\xE8gles de redirection dynamique et monitoring de bande passante par t\xE9l\xE9m\xE9trie.`,
    created_at: new Date(Date.now() - 15 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 5 * 864e5).toISOString()
  }
];
var INITIAL_WIKI_PAGES = [
  // 📡 RÉSEAUX — Fondamentaux
  {
    id: "wiki-modele-osi",
    title: "Mod\xE8le OSI",
    topic: "R\xE9seaux",
    section: "Fondamentaux",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M. (R\xE9f\xE9rente R\xE9seaux)",
    status_verified_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 142,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-tcp-vs-udp", "wiki-vlan", "wiki-ospf-comprendre"],
    created_at: new Date(Date.now() - 30 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 3 * 864e5).toISOString(),
    content: `# Mod\xE8le OSI (Open Systems Interconnection)

Le mod\xE8le OSI est la r\xE9f\xE9rence th\xE9orique en 7 couches standardis\xE9e par l'ISO pour conceptualiser l'interconnexion r\xE9seau.

## Les 7 Couches
1. **Physique (L1)** : Transmission binaire sur le m\xE9dia (bits, tensions, connecteurs RJ45, fibre optique).
2. **Liaison de donn\xE9es (L2)** : Adressage physique MAC, trames, d\xE9tection d'erreurs (Ethernet, commutateurs, VLAN 802.1Q).
3. **R\xE9seau (L3)** : Adressage logique IP, routage des paquets (IPv4, IPv6, routeurs, OSPF, BGP).
4. **Transport (L4)** : Communication de bout en bout, multiplexage par ports (TCP, UDP).
5. **Session (L5)** : \xC9tablissement, gestion et fermeture des sessions applicatives.
6. **Pr\xE9sentation (L6)** : Encodage, formatage, chiffrement/d\xE9chiffrement (ASCII, TLS/SSL, JSON).
7. **Application (L7)** : Protocoles directement utilis\xE9s par les applications (HTTP, DNS, SSH, SMTP).

## Mn\xE9monique
*Pour Le R\xE9seau Tout Semble Parfaitement Accessible* (1 \xE0 7).`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 30 * 864e5).toISOString(),
        comment: "R\xE9daction de la fiche fondamentale OSI",
        content: "Version 1..."
      }
    ]
  },
  {
    id: "wiki-tcp-vs-udp",
    title: "TCP/IP & Comparatif TCP vs UDP",
    topic: "R\xE9seaux",
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
    created_at: new Date(Date.now() - 19 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    content: `# TCP/IP & Comparatif TCP vs UDP

La suite de protocoles d'Internet s'articule autour de 4 couches pragmatiques : Acc\xE8s r\xE9seau, Internet (IP), Transport (TCP/UDP) et Application.

| Crit\xE8re | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Connexion** | Orient\xE9 connexion (Handshake SYN, SYN-ACK, ACK) | Sans connexion |
| **Fiabilit\xE9** | Garantie : acquittement (ACK) et retransmission | Aucune garantie (best effort) |
| **Ordonnancement** | Segments num\xE9rot\xE9s et r\xE9ordonn\xE9s | Aucun r\xE9ordonnancement |
| **Contr\xF4le de flux** | Oui (fen\xEAtre glissante, congestion control) | Non |
| **En-t\xEAte** | 20 \xE0 60 octets | 8 octets fixes |
| **Usages** | Web (HTTP/HTTPS), SSH, Transfert (FTP), Mail | Streaming direct, VoIP, DNS, Jeux r\xE9seau |`,
    history: [
      {
        version: 2,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 5 * 864e5).toISOString(),
        comment: "Ajout du tableau synth\xE9tique et des couches TCP/IP",
        content: "v2..."
      },
      {
        version: 1,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 19 * 864e5).toISOString(),
        comment: "Cr\xE9ation initiale",
        content: "v1..."
      }
    ]
  },
  {
    id: "wiki-ipv4-ipv6",
    title: "Adressage IPv4 & IPv6",
    topic: "R\xE9seaux",
    section: "Fondamentaux",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 10 * 864e5).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 65,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-modele-osi", "wiki-routage-statique"],
    created_at: new Date(Date.now() - 25 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 10 * 864e5).toISOString(),
    content: `# Adressage IPv4 & IPv6

Principes fondamentaux du plan d'adressage IP pour l'ing\xE9nierie des r\xE9seaux d'entreprise et d'op\xE9rateurs.

## 1. IPv4 (32 bits)
- D\xE9coupage par masques de sous-r\xE9seau (CIDR et VLSM).
- Plages priv\xE9es RFC 1918 : \`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`.
- N\xE9cessit\xE9 du NAT/PAT pour l'acc\xE8s \xE0 l'Internet public.

## 2. IPv6 (128 bits)
- Notation hexad\xE9cimale (8 blocs de 16 bits).
- Types d'adresses : Unicast Global (\`2000::/3\`), Link-Local (\`fe80::/10\`), Multicast (\`ff00::/8\`).
- Fin du broadcast au profit du Multicast et de Neighbor Discovery (NDP / ICMPv6).`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 25 * 864e5).toISOString(),
        comment: "Fiche initiale d'adressage",
        content: "v1..."
      }
    ]
  },
  // 📡 RÉSEAUX — Routage
  {
    id: "wiki-routage-statique",
    title: "Routage statique",
    topic: "R\xE9seaux",
    section: "Routage",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 15 * 864e5).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_GRINNEL_ID,
    view_count: 45,
    related_document_ids: ["file-supptic-td-routage"],
    related_wiki_ids: ["wiki-rip", "wiki-ospf-comprendre"],
    created_at: new Date(Date.now() - 24 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 15 * 864e5).toISOString(),
    content: `# Routage statique

Le routage statique consiste \xE0 inscrire manuellement les routes dans la table de routage d'un \xE9quipement.

## Avantages & Limites
- **Avantages** : Faible utilisation CPU/RAM, bande passante pr\xE9serv\xE9e (aucun \xE9change de paquets de d\xE9couverte), s\xE9curit\xE9 accrue.
- **Inconv\xE9nients** : \xC9volutivit\xE9 difficile, aucune tol\xE9rance aux pannes automatique sans IP SLA.

## Commande type Cisco
\`\`\`bash
ip route <r\xE9seau_destination> <masque> <adresse_prochain_saut> [distance_administrative]
# Route par d\xE9faut (passerelle de dernier recours)
ip route 0.0.0.0 0.0.0.0 192.168.1.254
\`\`\``,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 24 * 864e5).toISOString(),
        comment: "Fiche routage statique",
        content: "v1..."
      }
    ]
  },
  {
    id: "wiki-rip",
    title: "RIP (Routing Information Protocol)",
    topic: "R\xE9seaux",
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
    created_at: new Date(Date.now() - 20 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 12 * 864e5).toISOString(),
    content: `# RIP (Routing Information Protocol)

Protocole de routage dynamique interne (IGP) \xE0 vecteur de distance (Distance Vector) fond\xE9 sur l'algorithme Bellman-Ford.

## Caract\xE9ristiques
- **M\xE9trique** : Nombre de sauts (Hop count). M\xE9trique infinie fix\xE9e \xE0 16.
- **Mises \xE0 jour** : P\xE9riodiques (toutes les 30 secondes).
- **Limites** : Convergence lente, risque de boucles de routage (att\xE9nu\xE9 par Split Horizon, Poison Reverse et Hold-down timers).`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 20 * 864e5).toISOString(),
        comment: "Fiche RIP initiale",
        content: "v1..."
      }
    ]
  },
  {
    id: "wiki-ospf-comprendre",
    title: "OSPF \u2014 Comprendre simplement",
    topic: "R\xE9seaux",
    section: "Routage",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M. (R\xE9f\xE9rente R\xE9seaux)",
    status_verified_at: new Date(Date.now() - 2 * 864e5).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 168,
    related_document_ids: ["file-supptic-cours-reseaux", "file-supptic-td-routage"],
    related_wiki_ids: ["wiki-routage-statique", "wiki-rip", "wiki-bgp-intro"],
    created_at: new Date(Date.now() - 22 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 2 * 864e5).toISOString(),
    content: `# OSPF \u2014 Comprendre simplement

> **M\xE9moire collective du Workspace** \u2014 Synth\xE8se r\xE9dig\xE9e et v\xE9rifi\xE9e par la communaut\xE9 SUP'PTIC.
> R\xE9f\xE9rences documentaires : \u{1F4C4} *Cours R\xE9seaux \u2014 Routage Dynamique & OSPF.pdf* & \u{1F4C4} *TD Routage*.

## 1. Qu'est-ce que OSPF ?
**OSPF (Open Shortest Path First)** est un protocole de routage dynamique interne (IGP) \xE0 \xE9tat de liens. Contrairement \xE0 RIP qui compte les sauts, OSPF choisit le chemin le plus rapide en fonction de la bande passante gr\xE2ce \xE0 l'algorithme de **Dijkstra**.

## 2. Principes fondamentaux
- **Convergence rapide** : Chaque routeur poss\xE8de une carte compl\xE8te de la topologie (LSDB - Link State Database).
- **Architecture hi\xE9rarchique** : D\xE9coupage en zones. L'**Area 0 (Backbone)** est le c\u0153ur obligatoire.
- **Voisinage OSPF** : Les routeurs s'\xE9changent des paquets Hello (toutes les 10 secondes) pour former des adjacences.

## 3. Calcul du Co\xFBt et Contradiction possible avec les r\xE9seaux modernes
Le co\xFBt standard RFC est \`100 Mbps / Bande passante\`.
- \u26A0\uFE0F *Note pratique de l'\xE9quipe* : Sur les liens modernes 1 Gbps ou 10 Gbps, le co\xFBt calcul\xE9 par d\xE9faut vaut 1 dans les deux cas si la commande \`auto-cost reference-bandwidth\` n'est pas configur\xE9e \xE0 au moins 1000 ou 10000.

## 4. Les \xE9tats d'adjacence OSPF
1. **Down** : aucun paquet re\xE7u.
2. **Init** : Hello re\xE7u du voisin.
3. **2-Way** : communication bidirectionnelle confirm\xE9e, \xE9lection du DR (Designated Router) et BDR.
4. **ExStart / Exchange** : n\xE9gociation du Master/Slave et \xE9change des descripteurs de base (DBD).
5. **Loading** : requ\xEAte des LSA manquantes via LSR.
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
        updated_at: new Date(Date.now() - 2 * 864e5).toISOString(),
        comment: "Relecture et validation du calcul de m\xE9trique 1 Gbps (Statut V\xE9rifi\xE9)",
        content: "Version 3 compl\xE8te..."
      },
      {
        version: 2,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 8 * 864e5).toISOString(),
        comment: "Ajout du tableau des \xE9tats d'adjacence et commandes Cisco",
        content: "Version 2..."
      },
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 22 * 864e5).toISOString(),
        comment: "Cr\xE9ation initiale de la fiche de synth\xE8se",
        content: "Version 1..."
      }
    ]
  },
  {
    id: "wiki-bgp-intro",
    title: "BGP \u2014 Routage Inter-Domaine & Politiques",
    topic: "R\xE9seaux",
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
    created_at: new Date(Date.now() - 6 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 6 * 864e5).toISOString(),
    content: `# BGP \u2014 Routage Inter-Domaine & Politiques

Border Gateway Protocol (BGP-4) est le protocole de routage vecteur de chemin (Path Vector) qui relie l'ensemble des Syst\xE8mes Autonomes (AS) d'Internet.

## Caract\xE9ristiques
- Fonctionne au-dessus de TCP (port 179).
- D\xE9cision fond\xE9e sur les politiques de routage et les attributs (AS_PATH, Local_Pref, MED).
- eBGP pour les liaisons entre op\xE9rateurs diff\xE9rents ; iBGP \xE0 l'int\xE9rieur d'un m\xEAme AS.`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 6 * 864e5).toISOString(),
        comment: "Brouillon initial BGP",
        content: "v1..."
      }
    ]
  },
  // 📡 RÉSEAUX — Commutation (Exemple central Section 6 du cadrage : VLAN relié à Sécurité réseau, Trunk, STP, 802.1Q)
  {
    id: "wiki-vlan",
    title: "VLAN (Virtual Local Area Network)",
    topic: "R\xE9seaux",
    section: "Commutation",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 4 * 864e5).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 125,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-securite-reseau", "wiki-trunk-8021q", "wiki-stp", "wiki-modele-osi"],
    created_at: new Date(Date.now() - 21 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 4 * 864e5).toISOString(),
    content: `# VLAN (Virtual Local Area Network)

Un VLAN permet de segmenter logiquement un r\xE9seau local physique (LAN) en plusieurs domaines de diffusion ind\xE9pendants de niveau 2.

## 1. Objectifs
- **S\xE9curit\xE9** : Cloisonnement du trafic sensible (ex: VLAN Direction, VLAN \xC9tudiants, VLAN Invit\xE9s).
- **Performance** : R\xE9duction de la taille des domaines de diffusion (broadcast storms).
- **Flexibilit\xE9** : Organisation logique ind\xE9pendante de la topologie physique du c\xE2blage.

## 2. Relations Cl\xE9s & Notions Associ\xE9es (Section 6)
- \u{1F517} **Trunk 802.1Q** : Port inter-commutateurs transportant plusieurs VLAN simultan\xE9ment via l'encapsulation de tag 802.1Q (4 octets).
- \u{1F517} **STP (Spanning Tree Protocol)** : \xC9vite les boucles de commutation cr\xE9\xE9es par la redondance de liens dans les VLAN (PVST+).
- \u{1F517} **S\xE9curit\xE9 r\xE9seau & Pare-feu** : Le routage inter-VLAN doit obligatoirement transiter par un pare-feu ou routeur de niveau 3 (Router-on-a-Stick ou commutateur L3 SVI).

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
        updated_at: new Date(Date.now() - 4 * 864e5).toISOString(),
        comment: "Ajout des liens avec Trunk 802.1Q et S\xE9curit\xE9 r\xE9seau",
        content: "v2..."
      },
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 21 * 864e5).toISOString(),
        comment: "Cr\xE9ation initiale",
        content: "v1..."
      }
    ]
  },
  {
    id: "wiki-stp",
    title: "STP (Spanning Tree Protocol)",
    topic: "R\xE9seaux",
    section: "Commutation",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 7 * 864e5).toISOString(),
    creator_id: USER_SARAH_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 73,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-vlan", "wiki-trunk-8021q"],
    created_at: new Date(Date.now() - 18 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 7 * 864e5).toISOString(),
    content: `# STP (Spanning Tree Protocol \u2014 IEEE 802.1D / 802.1w)

Protocole de niveau 2 con\xE7u pour \xE9liminer les boucles physiques de commutation dans les r\xE9seaux Ethernet maill\xE9s tout en assurant la redondance des liens.

## Principes
- \xC9lection du **Root Bridge** (commutateur avec la priorit\xE9 la plus basse, puis adresse MAC la plus faible).
- R\xF4les des ports : Root Port (vers le Root Bridge), Designated Port (sur chaque segment), Blocked/Alternate Port (coupe la boucle).
- \xC9volution vers RSTP (802.1w) pour une convergence en moins de 1 seconde contre 30 \xE0 50 secondes avec STP legacy.`,
    history: [
      {
        version: 1,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 18 * 864e5).toISOString(),
        comment: "Fiche STP",
        content: "v1..."
      }
    ]
  },
  {
    id: "wiki-trunk-8021q",
    title: "Trunk & Encapsulation IEEE 802.1Q",
    topic: "R\xE9seaux",
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
    created_at: new Date(Date.now() - 17 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 8 * 864e5).toISOString(),
    content: `# Trunk & Encapsulation IEEE 802.1Q

Une liaison Trunk permet de v\xE9hiculer plusieurs flux de VLAN diff\xE9rents \xE0 travers un seul c\xE2ble physique entre deux commutateurs ou entre un commutateur et un routeur.

## Format de la trame 802.1Q
Insertion d'un champ de 4 octets (Tag) entre l'adresse MAC source et le champ EtherType :
- **TPID (0x8100)** : Identifie le protocole 802.1Q.
- **PCP (3 bits)** : Priorit\xE9 de qualit\xE9 de service (CoS 802.1p).
- **DEI (1 bit)** : \xC9ligibilit\xE9 \xE0 la suppression de trame en cas d'encombrement.
- **VID (12 bits)** : Identifiant du VLAN (1 \xE0 4094).

## VLAN Natif
Les trames appartenant au VLAN natif (par d\xE9faut VLAN 1) transitent sans tag sur le lien trunk.`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 17 * 864e5).toISOString(),
        comment: "Fiche Trunk",
        content: "v1..."
      }
    ]
  },
  // 📶 TÉLÉCOMS
  {
    id: "wiki-fibre-optique",
    title: "Fibre Optique & R\xE9flectom\xE9trie (OTDR)",
    topic: "T\xE9l\xE9coms",
    section: "Transmission",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Marc T.",
    status_verified_at: new Date(Date.now() - 3 * 864e5).toISOString(),
    creator_id: USER_MARC_ID,
    last_editor_id: USER_MARC_ID,
    view_count: 81,
    related_document_ids: ["file-supptic-td-routage"],
    related_wiki_ids: ["wiki-modulation-qam"],
    created_at: new Date(Date.now() - 14 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 3 * 864e5).toISOString(),
    content: `# Fibre Optique & R\xE9flectom\xE9trie (OTDR)

Supports de transmission par guidage d'ondes lumineuses utilis\xE9es dans les r\xE9seaux d'acc\xE8s FTTH et les dorsales op\xE9rateurs (DWDM).

## Monomode (SMF) vs Multimode (MMF)
- **Monomode (G.652, 9/125 \xB5m)** : C\u0153ur tr\xE8s fin permettant un seul mode de propagation. Utilis\xE9e pour les longues distances (plusieurs dizaines de kilom\xE8tres) avec lasers DFB/FP \xE0 1310 nm et 1550 nm.
- **Multimode (OM3/OM4, 50/125 \xB5m)** : Plusieurs modes lumineux coexistent, causant une dispersion modale. R\xE9serv\xE9e aux data centers (distances < 500 m).

## R\xE9flectom\xE9trie optique (OTDR)
L'OTDR envoie des impulsions lumineuses et mesure la r\xE9trodiffusion Rayleigh ainsi que les r\xE9flexions de Fresnel pour localiser avec pr\xE9cision les \xE9pissures, connecteurs et coupures sur le lien.`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 14 * 864e5).toISOString(),
        comment: "Fiche fibre optique",
        content: "v1..."
      }
    ]
  },
  {
    id: "wiki-modulation-qam",
    title: "Modulations Num\xE9riques (QPSK, 16-QAM, 64-QAM)",
    topic: "T\xE9l\xE9coms",
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
    created_at: new Date(Date.now() - 16 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 9 * 864e5).toISOString(),
    content: `# Modulations Num\xE9riques (QPSK, 16-QAM, 64-QAM, 256-QAM)

Techniques d'adaptation des signaux num\xE9riques sur une onde porteuse sinuso\xEFdale radio ou hertzienne.

- **QPSK (Quadrature Phase Shift Keying)** : 4 \xE9tats de phase, transporte 2 bits par symbole.
- **16-QAM** : Combine amplitude et phase pour g\xE9n\xE9rer 16 points de constellation, transportant 4 bits par symbole.
- **256-QAM (utilis\xE9 en 4G/5G)** : 8 bits par symbole dans des conditions radio optimales (SINR \xE9lev\xE9).`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 16 * 864e5).toISOString(),
        comment: "Fiche modulations",
        content: "v1..."
      }
    ]
  },
  {
    id: "wiki-architecture-5g",
    title: "Architecture R\xE9seau Mobile 4G & 5G (SA / NSA)",
    topic: "T\xE9l\xE9coms",
    section: "R\xE9seaux Mobiles",
    category: "syntheses",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 1 * 864e5).toISOString(),
    creator_id: USER_SARAH_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 110,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-modulation-qam"],
    created_at: new Date(Date.now() - 11 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 1 * 864e5).toISOString(),
    content: `# Architecture R\xE9seau Mobile 4G & 5G (SA / NSA)

\xC9volution des r\xE9seaux d'acc\xE8s radio\xE9lectrique (RAN) et du c\u0153ur de r\xE9seau (Core Network).

## 1. Diff\xE9rence 5G NSA vs 5G SA
- **5G NSA (Non-Standalone - Option 3x)** : Utilise les antennes 5G NR (New Radio) reli\xE9es au c\u0153ur de r\xE9seau existant 4G EPC. D\xE9ploiement rapide.
- **5G SA (Standalone - Option 2)** : Antennes 5G gNodeB reli\xE9es directement \xE0 un c\u0153ur 5G Core natif en microservices cloud (SBA - Service Based Architecture), autorisant le **Network Slicing** et la latence ultra-faible (URLLC).

## 2. Fonctions du c\u0153ur 5G (5GC)
- **AMF** : Gestion des acc\xE8s et de la mobilit\xE9 (\xE9quivalent MME en 4G).
- **SMF** : Gestion des sessions de donn\xE9es (\xE9quivalent SGW-C/PGW-C).
- **UPF** : Plan utilisateur transportant les donn\xE9es utiles \xE0 tr\xE8s haut d\xE9bit.`,
    history: [
      {
        version: 1,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 11 * 864e5).toISOString(),
        comment: "Fiche 5G",
        content: "v1..."
      }
    ]
  },
  // 🔐 CYBERSÉCURITÉ
  {
    id: "wiki-securite-reseau",
    title: "S\xE9curit\xE9 R\xE9seau & Pare-feu (Firewall)",
    topic: "Cybers\xE9curit\xE9",
    section: "S\xE9curit\xE9 R\xE9seau",
    category: "cours",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Grinnel N.",
    status_verified_at: new Date(Date.now() - 6 * 864e5).toISOString(),
    creator_id: USER_GRINNEL_ID,
    last_editor_id: USER_GRINNEL_ID,
    view_count: 94,
    related_document_ids: ["file-supptic-cours-reseaux"],
    related_wiki_ids: ["wiki-vlan", "wiki-vpn-ipsec", "wiki-crypto-intro"],
    created_at: new Date(Date.now() - 15 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 6 * 864e5).toISOString(),
    content: `# S\xE9curit\xE9 R\xE9seau & Pare-feu (Firewall)

Mise en place de zones de s\xE9curit\xE9 (DMZ, R\xE9seau interne, WAN) et filtrage des flux au p\xE9rim\xE8tre.

## 1. Types de Pare-feu
- **Filtrage de paquets sans \xE9tat (Stateless)** : Bas\xE9 uniquement sur les adresses IP et ports sources/destinations (ACLs routeur).
- **Stateful Inspection (Stateful)** : Maintient une table d'\xE9tats des connexions (TCP handshakes, UDP pseudo-sessions).
- **Next-Generation Firewall (NGFW)** : Inspection applicative L7 (Deep Packet Inspection), d\xE9tection d'intrusions (IPS), sandboxing et d\xE9cryptage SSL/TLS.

## 2. Relation avec la segmentation VLAN (Section 6)
Le cloisonnement par VLAN n'est efficace que s'il est combin\xE9 \xE0 des r\xE8gles strictes de pare-feu entre sous-r\xE9seaux (principe du moindre privil\xE8ge).`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 15 * 864e5).toISOString(),
        comment: "Fiche s\xE9curit\xE9 r\xE9seau",
        content: "v1..."
      }
    ]
  },
  {
    id: "wiki-vpn-ipsec",
    title: "VPN IPsec & Tunnels S\xE9curis\xE9s",
    topic: "Cybers\xE9curit\xE9",
    section: "S\xE9curit\xE9 R\xE9seau",
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
    created_at: new Date(Date.now() - 13 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 4 * 864e5).toISOString(),
    content: `# VPN IPsec & Tunnels S\xE9curis\xE9s

IPsec (Internet Protocol Security) fournit l'authentification, l'int\xE9grit\xE9 et la confidentialit\xE9 des \xE9changes au niveau IP (couche 3).

## Les deux phases d'IKE (Internet Key Exchange)
1. **IKE Phase 1 (ISAKMP SA)** : Authentification mutuelle des routeurs (PSK ou certificats X.509) et \xE9tablissement d'un canal s\xE9curis\xE9 de gestion.
2. **IKE Phase 2 (IPsec SA)** : N\xE9gociation des algorithmes de chiffrement (ESP avec AES-GCM) pour encapsuler le trafic utilisateur.

## Modes de fonctionnement
- **Mode Tunnel** : Chiffre le paquet IP complet et y ajoute un nouvel en-t\xEAte IP (liaison Site-\xE0-Site).
- **Mode Transport** : Chiffre uniquement la charge utile (payload L4), conservant l'en-t\xEAte IP d'origine (Host-to-Host).`,
    history: [
      {
        version: 1,
        author_id: USER_MARC_ID,
        author_name: "Marc T.",
        updated_at: new Date(Date.now() - 13 * 864e5).toISOString(),
        comment: "Fiche IPsec",
        content: "v1..."
      }
    ]
  },
  {
    id: "wiki-crypto-intro",
    title: "Cryptographie Sym\xE9trique vs Asym\xE9trique",
    topic: "Cybers\xE9curit\xE9",
    section: "Cryptographie",
    category: "syntheses",
    workspace_id: WS_SUPPTIC_ID,
    status: "verified",
    status_verified_by: "Sarah M.",
    status_verified_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    creator_id: USER_SARAH_ID,
    last_editor_id: USER_SARAH_ID,
    view_count: 88,
    related_document_ids: [],
    related_wiki_ids: ["wiki-securite-reseau", "wiki-vpn-ipsec"],
    created_at: new Date(Date.now() - 18 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    content: `# Cryptographie Sym\xE9trique vs Asym\xE9trique

Les deux piliers math\xE9matiques assurant la confidentialit\xE9, l'int\xE9grit\xE9, l'authenticit\xE9 et la non-r\xE9pudiation des syst\xE8mes d'information.

| Propri\xE9t\xE9 | Cryptographie Sym\xE9trique (Cl\xE9 secr\xE8te) | Cryptographie Asym\xE9trique (Bi-cl\xE9 Publique/Priv\xE9e) |
|---|---|---|
| **Cl\xE9s utilis\xE9es** | Une unique cl\xE9 partag\xE9e pour chiffrer et d\xE9chiffrer | Une cl\xE9 publique (chiffrement/v\xE9rification) et une cl\xE9 priv\xE9e (d\xE9chiffrement/signature) |
| **Vitesse de calcul** | Tr\xE8s rapide, impl\xE9mentable mat\xE9riellement (AES-NI) | Lente (op\xE9rations d'exponentiation modulaire ou courbes elliptiques) |
| **Algorithmes types** | AES-256, ChaCha20, 3DES | RSA (2048/4096 bits), ECC (ECDSA, Ed25519) |
| **Cas d'usage** | Chiffrement en masse des flux r\xE9seau et disques | \xC9change initial de cl\xE9 sym\xE9trique (Diffie-Hellman), signatures num\xE9riques, certificats TLS |`,
    history: [
      {
        version: 1,
        author_id: USER_SARAH_ID,
        author_name: "Sarah M.",
        updated_at: new Date(Date.now() - 18 * 864e5).toISOString(),
        comment: "Fiche cryptographie",
        content: "v1..."
      }
    ]
  },
  // 💻 INFORMATIQUE & SYSTÈMES
  {
    id: "wiki-linux-bash",
    title: "Administration Linux & Scripts Shell",
    topic: "Informatique",
    section: "Syst\xE8mes",
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
    created_at: new Date(Date.now() - 20 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 7 * 864e5).toISOString(),
    content: `# Administration Linux & Scripts Shell

Commandes et bonnes pratiques pour administrer des serveurs Debian/Ubuntu et RedHat en environnement r\xE9seau.

## Commandes r\xE9seau indispensables
- \`ip addr\` / \`ip route\` : Gestion des interfaces et de la table de routage sous Linux.
- \`ss -tulpn\` : Visualisation des sockets d'\xE9coute et ports ouverts.
- \`tcpdump -i eth0 -nn\` : Capture de trafic r\xE9seau en ligne de commande.
- \`systemctl status <service>\` : Gestion des d\xE9mons syst\xE8me (systemd).`,
    history: [
      {
        version: 1,
        author_id: USER_GRINNEL_ID,
        author_name: "Grinnel N.",
        updated_at: new Date(Date.now() - 20 * 864e5).toISOString(),
        comment: "Fiche Linux",
        content: "v1..."
      }
    ]
  }
];

// server/routes.ts
var apiRouter = (0, import_express.Router)();
var users = [...INITIAL_USERS];
var workspaces = [...INITIAL_WORKSPACES];
var members = [...INITIAL_MEMBERS];
var folders = [...INITIAL_FOLDERS];
var files = [...INITIAL_FILES];
var wikiPages = [...INITIAL_WIKI_PAGES];
var chatHistory = [
  {
    id: "msg-init-1",
    role: "assistant",
    content: `Bonjour ! Je suis **Lekki AI**, votre assistant de recherche et de compr\xE9hension documentaire.

Mon p\xE9rim\xE8tre d'action est strictement align\xE9 sur **vos acc\xE8s actuels** :
- \u{1F4C1} Vos documents personnels & partag\xE9s
- \u{1F517} Les fichiers partag\xE9s avec vous
- \u25A3 Le Workspace actif (**SUP'PTIC \u2014 3A IR**) : fichiers originaux et fiches Wiki

Posez-moi une question sur vos cours, demandez un comparatif (ex: *TCP vs UDP*), ou interrogez le calcul de co\xFBt OSPF !`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }
];
function getCurrentUser(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const found = users.find((u) => u.id === token || u.username === token);
    if (found) return found;
  }
  return users.find((u) => u.id === USER_GRINNEL_ID) || users[0];
}
apiRouter.get("/auth/me", (req, res) => {
  const user = getCurrentUser(req);
  return res.json(user);
});
apiRouter.post("/auth/login", (req, res) => {
  const username = String(req.body.username || "grinnel").toLowerCase();
  let user = users.find((u) => u.username.toLowerCase() === username);
  if (!user) {
    user = {
      id: `u-${Date.now()}`,
      username,
      name: username.charAt(0).toUpperCase() + username.slice(1),
      email: `${username}@lekki.io`,
      role: "editor"
    };
    users.push(user);
  }
  return res.json({
    access_token: user.id,
    token_type: "bearer",
    user
  });
});
apiRouter.get("/users", (_req, res) => {
  return res.json(users);
});
apiRouter.get("/workspaces", (req, res) => {
  const user = getCurrentUser(req);
  const userWsIds = members.filter((m) => m.user_id === user.id).map((m) => m.workspace_id);
  const userWorkspaces = workspaces.filter(
    (w) => w.owner_id === user.id || userWsIds.includes(w.id)
  );
  return res.json(userWorkspaces.length > 0 ? userWorkspaces : workspaces);
});
apiRouter.get("/workspaces/:id", (req, res) => {
  const ws = workspaces.find((w) => w.id === req.params.id);
  if (!ws) return res.status(404).json({ detail: "Workspace introuvable" });
  return res.json(ws);
});
apiRouter.post("/workspaces", (req, res) => {
  const user = getCurrentUser(req);
  const { name, description, icon = "Folder" } = req.body;
  const newWs = {
    id: `ws-${Date.now()}`,
    name: name || "Nouveau Workspace",
    description: description || null,
    owner_id: user.id,
    icon,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  workspaces.push(newWs);
  members.push({
    id: `m-${Date.now()}`,
    workspace_id: newWs.id,
    user_id: user.id,
    role: "owner",
    joined_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  return res.status(201).json(newWs);
});
apiRouter.get("/workspaces/:id/members", (req, res) => {
  const wsMembers = members.filter((m) => m.workspace_id === req.params.id).map((m) => {
    const u = users.find((usr) => usr.id === m.user_id);
    return {
      ...m,
      user_name: u?.name || u?.username || "Utilisateur",
      user_email: u?.email || ""
    };
  });
  return res.json(wsMembers);
});
apiRouter.post("/workspaces/:id/members", (req, res) => {
  const { user_id, role = "member" } = req.body;
  const newMember = {
    id: `m-${Date.now()}`,
    workspace_id: req.params.id,
    user_id,
    role,
    joined_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  members.push(newMember);
  return res.status(201).json(newMember);
});
apiRouter.get("/drive/folders", (req, res) => {
  const user = getCurrentUser(req);
  const { workspace_id, scope } = req.query;
  let result = folders.filter((f) => !f.is_deleted);
  if (scope === "personal") {
    result = result.filter((f) => !f.workspace_id && f.owner_id === user.id);
  } else if (workspace_id) {
    result = result.filter((f) => f.workspace_id === workspace_id);
  } else {
    result = result.filter(
      (f) => !f.workspace_id && f.owner_id === user.id || f.workspace_id === WS_SUPPTIC_ID
    );
  }
  return res.json(result);
});
apiRouter.post("/drive/folders", (req, res) => {
  const user = getCurrentUser(req);
  const { name, workspace_id, parent_id } = req.body;
  const newFolder = {
    id: `f-${Date.now()}`,
    name: name || "Nouveau dossier",
    workspace_id: workspace_id || null,
    parent_id: parent_id || null,
    owner_id: user.id,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  folders.push(newFolder);
  return res.status(201).json(newFolder);
});
apiRouter.put("/drive/folders/:id", (req, res) => {
  const folder = folders.find((f) => f.id === req.params.id);
  if (!folder) return res.status(404).json({ detail: "Dossier introuvable" });
  if (req.body.name) folder.name = req.body.name;
  if (req.body.parent_id !== void 0) folder.parent_id = req.body.parent_id;
  return res.json(folder);
});
apiRouter.delete("/drive/folders/:id", (req, res) => {
  folders = folders.filter((f) => f.id !== req.params.id);
  return res.status(204).send();
});
apiRouter.get("/drive/files", (req, res) => {
  const user = getCurrentUser(req);
  const { scope = "all", workspace_id, folder_id, search } = req.query;
  let result = [...files];
  if (scope === "trash") {
    result = result.filter((f) => f.is_deleted && f.owner_id === user.id);
  } else {
    result = result.filter((f) => !f.is_deleted);
    if (scope === "personal") {
      result = result.filter((f) => !f.workspace_id && f.owner_id === user.id);
    } else if (scope === "shared_with_me") {
      result = result.filter((f) => f.shared_with.includes(user.id));
    } else if (scope === "starred") {
      result = result.filter((f) => f.is_starred);
    } else if (scope === "workspace") {
      const wsId = String(workspace_id || WS_SUPPTIC_ID);
      result = result.filter((f) => f.workspace_id === wsId);
    } else if (workspace_id) {
      result = result.filter((f) => f.workspace_id === String(workspace_id));
    }
  }
  if (folder_id !== void 0) {
    if (folder_id === "root" || folder_id === "") {
      result = result.filter((f) => !f.folder_id);
    } else {
      result = result.filter((f) => f.folder_id === folder_id);
    }
  }
  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (f) => f.name.toLowerCase().includes(q) || f.summary && f.summary.toLowerCase().includes(q) || f.content.toLowerCase().includes(q)
    );
  }
  const enriched = result.map((f) => {
    const owner = users.find((u) => u.id === f.owner_id);
    return {
      ...f,
      owner_name: owner?.name || owner?.username || "Inconnu",
      is_owner: f.owner_id === user.id,
      is_shared: f.shared_with.length > 0
    };
  });
  return res.json(enriched);
});
apiRouter.post("/drive/files", (req, res) => {
  const user = getCurrentUser(req);
  const {
    name,
    content,
    extension = "pdf",
    workspace_id,
    folder_id,
    summary
  } = req.body;
  const ext = (extension || "pdf").replace(".", "");
  const newFile = {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name || `Nouveau_document.${ext}`,
    extension: ext,
    size_bytes: Buffer.byteLength(content || "", "utf8") || 128e3,
    mime_type: ext === "pdf" ? "application/pdf" : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : ext === "pptx" ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : "text/plain",
    page_count: Math.max(1, Math.ceil((content?.length || 500) / 1200)),
    is_starred: false,
    is_deleted: false,
    owner_id: user.id,
    workspace_id: workspace_id || null,
    folder_id: folder_id || null,
    shared_with: [],
    content: content || `# ${name || "Document"}

Document ajout\xE9 le ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}.`,
    summary: summary || (content ? content.slice(0, 160) + "..." : "Document Lekki Drive."),
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  files.unshift(newFile);
  return res.status(201).json(newFile);
});
apiRouter.get("/drive/files/:id", (req, res) => {
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ detail: "Fichier introuvable" });
  const owner = users.find((u) => u.id === file.owner_id);
  return res.json({
    ...file,
    owner_name: owner?.name || owner?.username || "Inconnu"
  });
});
apiRouter.put("/drive/files/:id", (req, res) => {
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ detail: "Fichier introuvable" });
  const { name, is_starred, is_deleted, folder_id, content } = req.body;
  if (name !== void 0) file.name = name;
  if (is_starred !== void 0) file.is_starred = Boolean(is_starred);
  if (is_deleted !== void 0) file.is_deleted = Boolean(is_deleted);
  if (folder_id !== void 0) file.folder_id = folder_id;
  if (content !== void 0) {
    file.content = content;
    file.size_bytes = Buffer.byteLength(content, "utf8");
  }
  file.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  return res.json(file);
});
apiRouter.get("/drive/files/:id/download", (req, res) => {
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ detail: "Fichier introuvable" });
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
  return res.send(file.content || `Fichier Lekki: ${file.name}`);
});
apiRouter.post("/drive/files/:id/share", (req, res) => {
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ detail: "Fichier introuvable" });
  const { user_ids } = req.body;
  if (Array.isArray(user_ids)) {
    file.shared_with = user_ids;
  }
  file.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  return res.json(file);
});
apiRouter.delete("/drive/files/:id", (req, res) => {
  const permanent = req.query.permanent === "true";
  const fileIndex = files.findIndex((f) => f.id === req.params.id);
  if (fileIndex === -1) return res.status(404).json({ detail: "Fichier introuvable" });
  if (permanent) {
    files.splice(fileIndex, 1);
  } else {
    files[fileIndex].is_deleted = true;
    files[fileIndex].updated_at = (/* @__PURE__ */ new Date()).toISOString();
  }
  return res.status(204).send();
});
apiRouter.get("/wiki/pages", (req, res) => {
  const { workspace_id, category, status, topic, section } = req.query;
  const wsId = String(workspace_id || WS_SUPPTIC_ID);
  let result = wikiPages.filter((p) => p.workspace_id === wsId);
  if (topic) {
    result = result.filter((p) => p.topic === topic);
  }
  if (section) {
    result = result.filter((p) => p.section === section);
  }
  if (category) {
    result = result.filter((p) => p.category === category);
  }
  if (status) {
    result = result.filter((p) => p.status === status);
  }
  const enriched = result.map((p) => {
    const creator = users.find((u) => u.id === p.creator_id);
    const editor = users.find((u) => u.id === p.last_editor_id);
    const relatedWikiPages = wikiPages.filter((wp) => (p.related_wiki_ids || []).includes(wp.id)).map((wp) => ({ id: wp.id, title: wp.title, topic: wp.topic, section: wp.section }));
    return {
      ...p,
      creator_name: creator?.name || creator?.username || "Membre",
      last_editor_name: editor?.name || editor?.username || "Membre",
      related_wiki_pages: relatedWikiPages,
      linked_documents: files.filter((f) => (p.related_document_ids || []).includes(f.id)).map((f) => ({ id: f.id, name: f.name, extension: f.extension }))
    };
  });
  return res.json(enriched);
});
apiRouter.get("/wiki/pages/:id", (req, res) => {
  const page = wikiPages.find((p) => p.id === req.params.id);
  if (!page) return res.status(404).json({ detail: "Page Wiki introuvable" });
  page.view_count = (page.view_count || 0) + 1;
  const creator = users.find((u) => u.id === page.creator_id);
  const editor = users.find((u) => u.id === page.last_editor_id);
  const linkedDocs = files.filter((f) => (page.related_document_ids || []).includes(f.id)).map((f) => ({
    id: f.id,
    name: f.name,
    extension: f.extension,
    size_bytes: f.size_bytes,
    summary: f.summary
  }));
  const relatedWikiPages = wikiPages.filter((wp) => (page.related_wiki_ids || []).includes(wp.id)).map((wp) => ({ id: wp.id, title: wp.title, topic: wp.topic, section: wp.section }));
  return res.json({
    ...page,
    creator_name: creator?.name || creator?.username || "Membre",
    last_editor_name: editor?.name || editor?.username || "Membre",
    linked_documents: linkedDocs,
    related_wiki_pages: relatedWikiPages
  });
});
apiRouter.post("/wiki/pages", (req, res) => {
  const user = getCurrentUser(req);
  const {
    title,
    content,
    topic = "R\xE9seaux",
    section = "G\xE9n\xE9ral",
    category = "cours",
    parent_page_id = null,
    workspace_id = WS_SUPPTIC_ID,
    related_document_ids = [],
    related_wiki_ids = []
  } = req.body;
  const newPage = {
    id: `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title || "Nouvelle page Wiki",
    content: content || `# ${title || "Page Wiki"}

Contenu en cours de r\xE9daction...`,
    topic,
    section,
    parent_page_id,
    category,
    workspace_id,
    status: "draft",
    // 🟡 Toujours créé en Brouillon
    creator_id: user.id,
    last_editor_id: user.id,
    view_count: 1,
    related_document_ids: Array.isArray(related_document_ids) ? related_document_ids : [],
    related_wiki_ids: Array.isArray(related_wiki_ids) ? related_wiki_ids : [],
    history: [
      {
        version: 1,
        author_id: user.id,
        author_name: user.name || user.username,
        updated_at: (/* @__PURE__ */ new Date()).toISOString(),
        comment: "Cr\xE9ation initiale de la page",
        content: content || `# ${title}

`
      }
    ],
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  wikiPages.unshift(newPage);
  return res.status(201).json(newPage);
});
apiRouter.put("/wiki/pages/:id", (req, res) => {
  const user = getCurrentUser(req);
  const page = wikiPages.find((p) => p.id === req.params.id);
  if (!page) return res.status(404).json({ detail: "Page Wiki introuvable" });
  const { title, content, topic, section, category, related_document_ids, related_wiki_ids, comment } = req.body;
  if (title) page.title = title;
  if (topic) page.topic = topic;
  if (section) page.section = section;
  if (category) page.category = category;
  if (Array.isArray(related_document_ids)) page.related_document_ids = related_document_ids;
  if (Array.isArray(related_wiki_ids)) page.related_wiki_ids = related_wiki_ids;
  if (content && content !== page.content) {
    page.content = content;
    const newVersion = (page.history?.length || 0) + 1;
    page.history.unshift({
      version: newVersion,
      author_id: user.id,
      author_name: user.name || user.username,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      comment: comment || `Mise \xE0 jour v${newVersion}`,
      content
    });
    if (page.status === "draft") {
      page.status = "community";
    }
  }
  page.last_editor_id = user.id;
  page.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  return res.json(page);
});
apiRouter.post("/wiki/pages/:id/status", (req, res) => {
  const user = getCurrentUser(req);
  const page = wikiPages.find((p) => p.id === req.params.id);
  if (!page) return res.status(404).json({ detail: "Page Wiki introuvable" });
  const { status } = req.body;
  if (["draft", "community", "verified"].includes(status)) {
    page.status = status;
    if (status === "verified") {
      page.status_verified_by = `${user.name || user.username} (R\xE9f\xE9rent)`;
      page.status_verified_at = (/* @__PURE__ */ new Date()).toISOString();
    } else {
      page.status_verified_by = null;
      page.status_verified_at = null;
    }
    page.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  }
  return res.json(page);
});
apiRouter.post("/wiki/pages/:id/restore/:version", (req, res) => {
  const user = getCurrentUser(req);
  const page = wikiPages.find((p) => p.id === req.params.id);
  if (!page) return res.status(404).json({ detail: "Page Wiki introuvable" });
  const targetVersion = parseInt(req.params.version, 10);
  const historicEntry = page.history.find((h) => h.version === targetVersion);
  if (!historicEntry) return res.status(404).json({ detail: "Version introuvable" });
  page.content = historicEntry.content;
  const nextVer = page.history.length + 1;
  page.history.unshift({
    version: nextVer,
    author_id: user.id,
    author_name: user.name || user.username,
    updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    comment: `Restauration de la version v${targetVersion}`,
    content: historicEntry.content
  });
  page.last_editor_id = user.id;
  page.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  return res.json(page);
});
apiRouter.delete("/wiki/pages/:id", (req, res) => {
  wikiPages = wikiPages.filter((p) => p.id !== req.params.id);
  return res.status(204).send();
});
apiRouter.get("/search", (req, res) => {
  const user = getCurrentUser(req);
  const q = String(req.query.q || "").toLowerCase().trim();
  const workspaceId = String(req.query.workspace_id || WS_SUPPTIC_ID);
  if (!q) {
    return res.json({ documents: [], wiki: [], shared: [] });
  }
  const terms = q.split(/\s+/).filter(Boolean);
  const matchScore = (text) => {
    const lower = text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (lower.includes(t)) score += 1;
    }
    return score;
  };
  const docResults = files.filter((f) => !f.is_deleted && (f.workspace_id === workspaceId || !f.workspace_id && f.owner_id === user.id)).map((f) => ({
    file: f,
    score: matchScore(f.name) * 4 + matchScore(f.summary || "") * 2 + matchScore(f.content)
  })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => ({
    id: item.file.id,
    title: item.file.name,
    extension: item.file.extension,
    type: "document",
    category: item.file.workspace_id ? "Workspace" : "Personnel",
    excerpt: item.file.summary || item.file.content.slice(0, 140) + "...",
    workspace_id: item.file.workspace_id
  }));
  const wikiResults = wikiPages.filter((p) => p.workspace_id === workspaceId).map((p) => ({
    page: p,
    score: matchScore(p.title) * 5 + matchScore(p.content)
  })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => ({
    id: item.page.id,
    title: item.page.title,
    type: "wiki",
    status: item.page.status,
    category: item.page.category,
    excerpt: item.page.content.replace(/^[#\s>-]+/, "").slice(0, 140) + "..."
  }));
  const sharedResults = files.filter((f) => !f.is_deleted && f.shared_with.includes(user.id)).map((f) => ({
    file: f,
    score: matchScore(f.name) * 4 + matchScore(f.content)
  })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => {
    const owner = users.find((u) => u.id === item.file.owner_id);
    return {
      id: item.file.id,
      title: item.file.name,
      extension: item.file.extension,
      type: "shared",
      shared_by: owner?.name || owner?.username || "Collaborateur",
      excerpt: item.file.summary || item.file.content.slice(0, 140) + "..."
    };
  });
  return res.json({
    documents: docResults.slice(0, 8),
    wiki: wikiResults.slice(0, 8),
    shared: sharedResults.slice(0, 6)
  });
});
apiRouter.post("/ask", async (req, res) => {
  const user = getCurrentUser(req);
  const { question, workspace_id = WS_SUPPTIC_ID } = req.body;
  if (!question || typeof question !== "string") {
    return res.status(400).json({ detail: "Question requise" });
  }
  const personalDocs = files.filter((f) => !f.is_deleted && !f.workspace_id && f.owner_id === user.id);
  const sharedWithMeDocs = files.filter((f) => !f.is_deleted && f.shared_with.includes(user.id));
  const workspaceDocs = files.filter((f) => !f.is_deleted && f.workspace_id === workspace_id);
  const workspaceWiki = wikiPages.filter((p) => p.workspace_id === workspace_id);
  const qLower = question.toLowerCase();
  const qTerms = qLower.split(/\s+/).filter((w) => w.length > 2);
  const scoredSources = [];
  const allDocs = [...personalDocs, ...sharedWithMeDocs, ...workspaceDocs];
  for (const doc of allDocs) {
    const paragraphs = doc.content.split(/\n\s*\n/).filter((p) => p.trim().length > 15);
    for (const para of paragraphs) {
      const pLower = para.toLowerCase();
      let match = 0;
      for (const t of qTerms) {
        if (pLower.includes(t)) match++;
        if (doc.name.toLowerCase().includes(t)) match += 2;
      }
      if (match > 0) {
        let situatedLoc = "Document original";
        if (doc.key_passages && doc.key_passages.length > 0) {
          const matchedKp = doc.key_passages.find(
            (kp) => qTerms.some((t) => kp.label.toLowerCase().includes(t) || kp.excerpt.toLowerCase().includes(t))
          ) || doc.key_passages[0];
          situatedLoc = `${matchedKp.location} \xB7 ${matchedKp.label}`;
        } else if (doc.page_count) {
          situatedLoc = `p. 1\u2013${Math.min(10, doc.page_count)}`;
        }
        scoredSources.push({
          id: doc.id,
          type: "document",
          title: doc.name,
          detail: `Document original (${doc.extension.toUpperCase()})`,
          location: situatedLoc,
          file_extension: doc.extension,
          size_bytes: doc.size_bytes,
          workspace_id: doc.workspace_id,
          excerpt: para.replace(/^[#\s>-]+/, "").slice(0, 300),
          score: Math.min(0.98, 0.6 + match * 0.1),
          content: para
        });
      }
    }
  }
  for (const wp of workspaceWiki) {
    const sections = wp.content.split(/\n##\s+/).filter((s) => s.trim().length > 15);
    for (const sec of sections) {
      const secLower = sec.toLowerCase();
      let match = 0;
      for (const t of qTerms) {
        if (secLower.includes(t)) match++;
        if (wp.title.toLowerCase().includes(t)) match += 2.5;
      }
      if (match > 0) {
        const statusLabel = wp.status === "verified" ? "Wiki \u2022 V\xE9rifi\xE9e \u{1F7E2}" : wp.status === "community" ? "Wiki \u2022 Communautaire \u{1F535}" : "Wiki \u2022 Brouillon \u{1F7E1}";
        const wikiLoc = `${wp.topic || "G\xE9n\xE9ral"} / ${wp.section || "G\xE9n\xE9ral"}`;
        scoredSources.push({
          id: wp.id,
          type: "wiki",
          title: wp.title,
          detail: statusLabel,
          location: wikiLoc,
          workspace_id: wp.workspace_id,
          excerpt: sec.replace(/^[#\s>-]+/, "").slice(0, 300),
          score: Math.min(0.99, 0.65 + match * 0.1),
          content: sec
        });
      }
    }
  }
  scoredSources.sort((a, b) => b.score - a.score);
  const topSources = scoredSources.slice(0, 4);
  let contradictionNote = null;
  const isOspfQuery = qLower.includes("ospf") || qLower.includes("cout") || qLower.includes("co\xFBt") || qLower.includes("bande passante");
  if (isOspfQuery) {
    contradictionNote = "\u26A0\uFE0F **Nuance de provenance identifi\xE9e entre sources :**\n- **Source documentaire** (`Cours R\xE9seaux \u2014 Routage Dynamique & OSPF.pdf`, p. 42) : Le co\xFBt standard RFC 2328 utilise une bande passante de r\xE9f\xE9rence par d\xE9faut de **100 Mbps**.\n- **Source Wiki** (`OSPF \u2014 Comprendre simplement`, statut V\xE9rifi\xE9e) : La fiche pr\xE9cise qu'en environnement moderne (1G / 10G), ce calcul par d\xE9faut sature \xE0 1 et n\xE9cessite d'ajuster manuellement la commande `auto-cost reference-bandwidth 1000`.";
  }
  let answer = "";
  let provider = "Lekki AI Engine (Grounded Local)";
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const contextBlocks = topSources.map((s) => `[${s.type.toUpperCase()}: ${s.title} (${s.detail})]
${s.excerpt}`).join("\n\n");
      const prompt = `Tu es Lekki AI, un assistant de connaissance documentaire d'entreprise et d'\xE9cole d'ing\xE9nieurs.
Principes stricts :
1. Tu ne r\xE9ponds QU'\xC0 PARTIR des sources accessibles ci-dessous.
2. Distingue explicitement les sources originales (documents) et la m\xE9moire collective (Wiki).
3. Si une nuance ou contradiction existe, signale-la avec transparence.
4. R\xE9ponds en fran\xE7ais clair, pr\xE9cis et structur\xE9 (Markdown).

SOURCES ACCESSIBLES :
${contextBlocks || "Aucune source directement li\xE9e."}

QUESTION DE L'UTILISATEUR :
${question}`;
      const resGen = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      if (resGen.text) {
        answer = resGen.text;
        provider = "Gemini 2.5 Flash + Lekki Grounding";
      }
    } catch {
    }
  }
  if (!answer) {
    if (topSources.length > 0) {
      const docSources = topSources.filter((s) => s.type === "document");
      const wikiSources = topSources.filter((s) => s.type === "wiki");
      let body = "";
      if (wikiSources.length > 0) {
        body += `### Synth\xE8se issue du Wiki (${wikiSources[0].detail})
${wikiSources[0].excerpt}

`;
      }
      if (docSources.length > 0) {
        body += `### R\xE9f\xE9rence documentaire originale (${docSources[0].detail})
${docSources[0].excerpt}

`;
      }
      if (contradictionNote) {
        body += `
${contradictionNote}
`;
      }
      answer = body.trim();
    } else {
      answer = `Je n'ai pas trouv\xE9 d'\xE9l\xE9ment correspondant \xE0 votre demande dans votre p\xE9rim\xE8tre documentaire accessible (${workspaces.find((w) => w.id === workspace_id)?.name || "Workspace actif"}).

V\xE9rifiez que le document ou la fiche Wiki a bien \xE9t\xE9 ajout\xE9 ou partag\xE9 avec vous.`;
    }
  }
  const assistantMessage = {
    id: `msg-${Date.now()}`,
    role: "assistant",
    content: answer,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    sources: topSources.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      detail: s.detail,
      location: s.location,
      file_extension: s.file_extension,
      size_bytes: s.size_bytes,
      workspace_id: s.workspace_id,
      excerpt: s.excerpt,
      score: s.score
    })),
    contradiction: contradictionNote
  };
  chatHistory.push({
    id: `usr-${Date.now()}`,
    role: "user",
    content: question,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  chatHistory.push(assistantMessage);
  return res.json({
    message_id: assistantMessage.id,
    answer,
    sources: assistantMessage.sources,
    contradiction: contradictionNote,
    confidence: topSources.length > 0 ? topSources[0].score : 0.6,
    provider
  });
});
apiRouter.get("/chats/history", (_req, res) => {
  return res.json(chatHistory);
});
apiRouter.delete("/chats/history", (_req, res) => {
  chatHistory = [
    {
      id: `msg-reset-${Date.now()}`,
      role: "assistant",
      content: "Historique r\xE9initialis\xE9. Comment puis-je vous aider dans vos documents et Wiki ?",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  return res.status(204).send();
});
apiRouter.get("/pages", (req, res) => {
  const list = wikiPages.map((wp) => ({
    id: wp.id,
    title: wp.title,
    content: wp.content,
    category: wp.category,
    status: wp.status === "draft" ? "draft" : "published",
    view_count: wp.view_count,
    workspace_id: wp.workspace_id,
    created_at: wp.created_at,
    updated_at: wp.updated_at
  }));
  return res.json(list);
});

// server/index.ts
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = 3e3;
  app.use(import_express2.default.json({ limit: "25mb" }));
  app.use(import_express2.default.urlencoded({ extended: true, limit: "25mb" }));
  app.use("/api/v1", apiRouter);
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Lekki Wiki" });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: import_path.default.resolve(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true, host: "0.0.0.0", port: 3e3 },
      appType: "spa",
      root: import_path.default.resolve(process.cwd(), "client")
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.resolve(process.cwd(), "dist", "public");
    app.use(import_express2.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  const server = (0, import_http.createServer)(app);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Lekki Wiki server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start Lekki Wiki server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
