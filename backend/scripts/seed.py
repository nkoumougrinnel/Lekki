import asyncio
import json
from datetime import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.drive import DriveFolder, DriveFile
from app.models.wiki import WikiPage, WikiHistory
from app.services.auth_service import get_password_hash


async def seed_database():
    async with AsyncSessionLocal() as db:
        # Check if users already exist
        res = await db.execute(select(User).where(User.id == "u-grinnel"))
        if res.scalar_one_or_none():
            print("[Lekki Seed] Database already seeded.")
            return

        print("[Lekki Seed] Seeding initial dataset for SUP'PTIC 3A IR...")

        # 1. Users
        pwd_hash = get_password_hash("lekki123")
        u_grinnel = User(
            id="u-grinnel",
            username="grinnel",
            email="grinnel@lekki.io",
            name="Grinnel N.",
            hashed_password=pwd_hash,
            role="editor"
        )
        u_sarah = User(
            id="u-sarah",
            username="sarah",
            email="sarah.m@supptic.cm",
            name="Sarah M.",
            hashed_password=pwd_hash,
            role="admin"
        )
        u_kevin = User(
            id="u-kevin",
            username="kevin",
            email="kevin.t@supptic.cm",
            name="Kevin T.",
            hashed_password=pwd_hash,
            role="reader"
        )
        db.add_all([u_grinnel, u_sarah, u_kevin])

        # 2. Workspace
        ws_id = "ws-supptic-3a"
        ws = Workspace(
            id=ws_id,
            name="SUP'PTIC — 3A IR",
            description="Promotion 3ème Année Ingénierie des Réseaux & Systèmes Télécoms",
            icon="school",
            owner_id=u_grinnel.id
        )
        db.add(ws)

        # 3. Workspace Members
        db.add_all([
            WorkspaceMember(id="wm-1", workspace_id=ws_id, user_id=u_grinnel.id, role="owner"),
            WorkspaceMember(id="wm-2", workspace_id=ws_id, user_id=u_sarah.id, role="admin"),
            WorkspaceMember(id="wm-3", workspace_id=ws_id, user_id=u_kevin.id, role="member"),
        ])

        # 4. Drive Folders
        f_cours = DriveFolder(id="folder-cours", name="Cours Magistraux (PDF)", workspace_id=ws_id, owner_id=u_sarah.id)
        f_td = DriveFolder(id="folder-td", name="Travaux Dirigés & Annales", workspace_id=ws_id, owner_id=u_grinnel.id)
        f_tp = DriveFolder(id="folder-tp", name="Comptes-Rendus TP", workspace_id=ws_id, owner_id=u_grinnel.id)
        db.add_all([f_cours, f_td, f_tp])

        # 5. Drive Files
        file1 = DriveFile(
            id="doc-res-cours-1",
            name="Polycopie-Reseaux-Avances-2026.pdf",
            extension="pdf",
            content="Support de cours de Réseaux Avancés de 3ème Année. Sommaire : 1. Architecture OSPF multi-aires (Backbone Area 0, ABR, ASBR). 2. Algorithme de Dijkstra (SPF) et calcul de coût : Coût = Bande Passante de Référence / Bande Passante de l'interface. En standard Cisco, la référence est 100 Mbps (10^8), mais recommandée à 1 Gbps (10^9) pour les liens rapides.",
            summary="Polycopié complet de cours de Réseaux Avancés (Routage dynamique OSPF, BGP, métriques et découpage en aires).",
            size=1024 * 1024 * 4,
            tags=json.dumps(["Réseaux", "OSPF", "Cours"]),
            workspace_id=ws_id,
            folder_id=f_cours.id,
            owner_id=u_sarah.id,
            scope="workspace",
            is_starred=True
        )
        file2 = DriveFile(
            id="doc-td-ospf-1",
            name="TD3-Routage-Dynamique-OSPF-BGP.pdf",
            extension="pdf",
            content="Feuille d'exercices TD n°3 : Exercice 1 : Calcul des coûts de liens Ethernet (100 Mbps) et Gigabit (1 Gbps). Note importante pour les étudiants : l'énoncé du TD impose une bande passante de référence standard de 100 Mbps.",
            summary="Énoncés et corrigés des exercices de TD sur les calculs de métriques de routage OSPF et configurations d'AS BGP.",
            size=1024 * 850,
            tags=json.dumps(["TD", "Exercices", "OSPF"]),
            workspace_id=ws_id,
            folder_id=f_td.id,
            owner_id=u_grinnel.id,
            scope="workspace",
            is_starred=False
        )
        file3 = DriveFile(
            id="doc-tp-vlan-1",
            name="TP2-VLAN-802.1Q-Trunking.pdf",
            extension="pdf",
            content="Guide pratique de travaux pratiques sur commutateurs Cisco Catalyst. Configuration des VLAN 10 (Administration) et 20 (Étudiants). Encapsulation 802.1Q sur liens Trunk et routage Router-on-a-stick avec sous-interfaces.",
            summary="Sujet de TP Packet Tracer / GNS3 pour le paramétrage des commutateurs L2/L3 et liaisons Trunking 802.1Q.",
            size=1024 * 1024 * 2,
            tags=json.dumps(["TP", "VLAN", "Cisco"]),
            workspace_id=ws_id,
            folder_id=f_tp.id,
            owner_id=u_grinnel.id,
            scope="workspace",
            is_starred=True
        )
        db.add_all([file1, file2, file3])

        # 6. Wiki Pages
        wiki_ospf_content = """# OSPF — Comprendre simplement (Calcul de coût & États de voisinage)

L'**Open Shortest Path First (OSPF)** est un protocole de routage dynamique à **état de liens** de type IGP (Interior Gateway Protocol), standardisé dans la RFC 2328.

---

## 1. Principe fondamental

Chaque routeur OSPF construit une carte complète de la topologie du réseau (la **LSDB** — *Link-State Database*) en échangeant des paquets **LSA** (*Link-State Advertisements*). 
Ensuite, chaque routeur applique localement l'**algorithme de Dijkstra (SPF)** pour déterminer le chemin de coût minimal vers chaque réseau de destination.

## 2. Calcul du coût d'un lien

La métrique utilisée par OSPF est le **coût** (inversement proportionnel à la bande passante de l'interface) :

$$\\text{Coût} = \\frac{\\text{Bande passante de référence}}{\\text{Bande passante du lien}}$$

### Valeurs de référence types :
* **Bande passante par défaut Cisco** : $10^8$ bps (100 Mbps).
* **Conséquence** : Une interface FastEthernet (100 Mbps) et une interface GigabitEthernet (1000 Mbps) auront toutes deux un coût de **1** si la référence n'est pas modifiée !
* **Bonne pratique recommandée** : Configurer `auto-cost reference-bandwidth 1000` (ou $10000$ pour du 10 GbE) sur tous les routeurs de l'aire.

## 3. Les 7 états de voisinage OSPF

1. **Down** : Aucun paquet Hello reçu.
2. **Init** : Hello reçu du voisin, mais l'identifiant local n'est pas listé.
3. **2-Way** : Communication bidirectionnelle établie. Élection du **DR** (*Designated Router*) et **BDR** sur les réseaux broadcast.
4. **ExStart** : Négociation de la relation Maître/Esclave et du numéro de séquence DBD.
5. **Exchange** : Échange des paquets DBD (sommaire de la base LSDB).
6. **Loading** : Demande d'informations complémentaires via LSR (*Link State Request*) et réception des LSU.
7. **Full** : Synchronisation complète des bases de données topologiques.
"""
        w_ospf = WikiPage(
            id="wiki-ospf-1",
            title="OSPF — Comprendre simplement (Calcul de coût & États de voisinage)",
            content=wiki_ospf_content,
            category="cours",
            topic="📡 Réseaux",
            section="Routage dynamique",
            workspace_id=ws_id,
            status="verified",
            status_verified_by="Sarah M. (Référente)",
            status_verified_at=datetime.utcnow(),
            creator_id=u_sarah.id,
            last_editor_id=u_sarah.id,
            view_count=84,
            related_document_ids=json.dumps([file1.id, file2.id]),
            related_wiki_ids=json.dumps(["wiki-vlan-1", "wiki-osi-1"])
        )
        db.add(w_ospf)

        h_ospf = WikiHistory(
            id="wh-ospf-1",
            page_id=w_ospf.id,
            version=1,
            author_id=u_sarah.id,
            author_name="Sarah M.",
            comment="Validation pédagogique de la fiche OSPF et ajout du calcul de coût",
            content=wiki_ospf_content,
            updated_at=datetime.utcnow()
        )
        db.add(h_ospf)

        wiki_vlan_content = """# VLAN & Trunking 802.1Q (Isolation & Routage Inter-VLAN)

Un **VLAN (Virtual Local Area Network)** permet de segmenter un domaine de diffusion de couche 2 en plusieurs sous-réseaux logiques indépendants sur la même infrastructure physique de commutation.

---

## 1. Rôle du Trunk 802.1Q
Pour faire transiter le trafic de plusieurs VLANs à travers une seule liaison physique entre deux commutateurs, on configure un **lien Trunk**.
La norme **IEEE 802.1Q** ajoute une balise (*tag*) de 4 octets dans l'en-tête Ethernet :
* **TPID (Tag Protocol Identifier)** : `0x8100` (identifie le protocole 802.1Q).
* **VLAN ID (VID)** : 12 bits (autorise de 1 à 4094 VLANs).
* **PCP (Priority Code Point)** : 3 bits pour la Qualité de Service (802.1p).

## 2. VLAN Natif
Par défaut sur le matériel Cisco, le **VLAN 1** est le VLAN natif. Les trames appartenant au VLAN natif traversent le Trunk sans être balisées (untagged).
"""
        w_vlan = WikiPage(
            id="wiki-vlan-1",
            title="VLAN & Trunking 802.1Q (Isolation & Routage Inter-VLAN)",
            content=wiki_vlan_content,
            category="methodes",
            topic="📡 Réseaux",
            section="Commutation L2/L3",
            workspace_id=ws_id,
            status="community",
            creator_id=u_grinnel.id,
            last_editor_id=u_grinnel.id,
            view_count=52,
            related_document_ids=json.dumps([file3.id]),
            related_wiki_ids=json.dumps(["wiki-ospf-1"])
        )
        db.add(w_vlan)

        h_vlan = WikiHistory(
            id="wh-vlan-1",
            page_id=w_vlan.id,
            version=1,
            author_id=u_grinnel.id,
            author_name="Grinnel N.",
            comment="Fiche de synthèse rédigée après la séance de TP2",
            content=wiki_vlan_content,
            updated_at=datetime.utcnow()
        )
        db.add(h_vlan)

        wiki_osi_content = """# Modèle OSI vs TCP/IP — Mémo synthétique d'examen

Ce mémo résume la correspondance entre les 7 couches du modèle théorique OSI et les 4 couches de l'architecture pragmatique d'Internet (TCP/IP).

| Couche OSI | Nom | PDU | Rôle principal | Protocoles types |
| :--- | :--- | :--- | :--- | :--- |
| **7** | Application | Donnée | Interface utilisateur et services réseau | HTTP, DNS, SSH, SMTP |
| **6** | Présentation | Donnée | Formatage, chiffrement, compression | TLS/SSL, JPEG, ASCII |
| **5** | Session | Donnée | Gestion du dialogue inter-applications | RPC, NetBIOS |
| **4** | Transport | Segment (TCP) / Datagramme (UDP) | Connexion de bout en bout et contrôle de flux | TCP, UDP |
| **3** | Réseau | Paquet | Adressage logique et routage de paquets | IP, ICMP, OSPF, BGP |
| **2** | Liaison de données | Trame | Adressage physique (MAC) et détection d'erreurs | Ethernet, 802.11, 802.1Q |
| **1** | Physique | Bit | Transmission binaire sur le médium physique | RJ45, Fibre optique |
"""
        w_osi = WikiPage(
            id="wiki-osi-1",
            title="Modèle OSI vs TCP/IP — Mémo synthétique d'examen",
            content=wiki_osi_content,
            category="syntheses",
            topic="📡 Réseaux",
            section="Fondamentaux",
            workspace_id=ws_id,
            status="verified",
            status_verified_by="Sarah M. (Référente)",
            status_verified_at=datetime.utcnow(),
            creator_id=u_sarah.id,
            last_editor_id=u_sarah.id,
            view_count=120,
            related_document_ids=json.dumps([file1.id]),
            related_wiki_ids=json.dumps(["wiki-ospf-1", "wiki-vlan-1"])
        )
        db.add(w_osi)

        h_osi = WikiHistory(
            id="wh-osi-1",
            page_id=w_osi.id,
            version=1,
            author_id=u_sarah.id,
            author_name="Sarah M.",
            comment="Fiche de révision certifiée pour les examens",
            content=wiki_osi_content,
            updated_at=datetime.utcnow()
        )
        db.add(h_osi)

        await db.commit()
        print("[Lekki Seed] Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
