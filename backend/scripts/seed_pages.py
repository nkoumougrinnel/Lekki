"""Contenu wiki PME — 5 use cases démo + 2 pages complémentaires."""

from __future__ import annotations

import textwrap

# IDs fixes (tests API / démo)
PAGE_CONGES_ID = "b0000000-0000-4000-8000-000000000001"
PAGE_ONBOARDING_ID = "b0000000-0000-4000-8000-000000000002"
PAGE_FRAIS_ID = "b0000000-0000-4000-8000-000000000003"
PAGE_IT_ID = "b0000000-0000-4000-8000-000000000004"
PAGE_TELETRAVAIL_ID = "b0000000-0000-4000-8000-000000000005"
PAGE_RECRUTEMENT_ID = "b0000000-0000-4000-8000-000000000006"
PAGE_STACK_ID = "b0000000-0000-4000-8000-000000000007"

# Alias rétrocompat (anciens scripts)
PAGE_RH_ID = PAGE_TELETRAVAIL_ID
PAGE_TECH_ID = PAGE_IT_ID
PAGE_GUIDE_ID = PAGE_ONBOARDING_ID


def _md(text: str) -> str:
    """Nettoie l'indentation d'un bloc markdown multi-ligne."""
    return textwrap.dedent(text).strip() + "\n"


_CONGES = _md(
    """
    # Politique de congés

    > **En bref** — 25 jours de congés payés par an, à poser au moins **2 semaines à l'avance** via le portail RH.

    ## Acquisition et pose
    - **25 jours** de congés payés par an pour tout employé en CDI.
    - Les demandes se font via le **portail RH**, au moins **2 semaines à l'avance**.
    - Le manager dispose de 5 jours ouvrés pour valider ou refuser la demande.

    ## Report des congés
    Les congés non pris au **31 décembre** peuvent être reportés jusqu'au
    **31 mars** de l'année suivante, dans la limite de **5 jours**. Au-delà,
    les jours non posés sont perdus.

    ## Congés spéciaux
    | Évènement | Durée |
    |-----------|-------|
    | Mariage / PACS | 4 jours |
    | Naissance ou adoption | 3 jours |
    | Décès d'un proche (conjoint / enfant) | 3 jours |
    | Déménagement | 1 jour par an |

    ## Contact
    Pour toute demande exceptionnelle, contactez le service RH :
    [rh@entreprise.fr](mailto:rh@entreprise.fr).
    """
)

_ONBOARDING = _md(
    """
    # Bienvenue chez nous !

    Ce guide résume les étapes clés de votre **première semaine**. Gardez-le
    sous la main, il répond à la plupart des questions courantes.

    ## Jour 1
    - [ ] Récupérer votre **badge** à l'accueil (bâtiment A, **8h30**)
    - [ ] Rendez-vous RH : signature du contrat et remise du matériel
    - [ ] Déjeuner de bienvenue avec votre manager

    ## Semaine 1
    - [ ] Activation des accès : **Slack**, **Jira**, **GitHub**, **Google Workspace**
    - [ ] Formation **sécurité informatique** (obligatoire, 2h en ligne)
    - [ ] Présentation aux équipes (planning envoyé par votre manager)

    ## Contacts utiles
    | Service | Contact |
    |---------|---------|
    | RH | [rh@entreprise.fr](mailto:rh@entreprise.fr) |
    | IT Support | [it-support@entreprise.fr](mailto:it-support@entreprise.fr) — ticket via Jira |

    > Un doute ? Posez votre question sur le canal **#general** de Slack,
    > l'équipe est là pour aider.
    """
)

_FRAIS = _md(
    """
    # Remboursement des frais professionnels

    > Tout frais doit être soumis dans les **30 jours** suivant la dépense,
    > via le formulaire en ligne de l'intranet.

    ## Procédure en 3 étapes
    1. Remplir le **formulaire de note de frais** sur l'intranet.
    2. Joindre les **reçus originaux** (photo ou scan lisible).
    3. Soumettre pour validation à votre manager.

    ## Plafonds
    | Type de dépense | Plafond |
    |-----------------|---------|
    | Repas client | **80 € / personne** |
    | Repas solo en déplacement | 25 € |
    | Nuit d'hôtel (province) | 130 € |
    | Nuit d'hôtel (Paris / étranger) | 200 € |
    | Transport (taxi / VTC) | Sur justificatif |

    ## Délais de paiement
    Les remboursements validés sont traités le **10 de chaque mois** et versés
    avec le salaire.

    > **Important** — sans justificatif, le remboursement ne peut pas être traité.
    """
)

_IT = _md(
    """
    # Charte d'utilisation des outils numériques

    Cette charte s'applique à l'ensemble des collaborateurs et vise à protéger
    les données de l'entreprise.

    ## Règles fondamentales
    - Ne **jamais partager** vos identifiants.
    - **Verrouiller** votre session dès que vous quittez votre poste (`Win + L`).
    - Ne pas installer de logiciels **sans autorisation IT**.
    - **Signaler immédiatement** tout incident de sécurité.

    ## Politique de mots de passe
    | Critère | Règle |
    |---------|-------|
    | Longueur minimale | **12 caractères** |
    | Renouvellement | tous les **90 jours** |
    | Réutilisation | interdite (3 derniers) |

    Gestionnaire recommandé : **Bitwarden** (licence entreprise fournie).

    ## En cas d'incident
    Contactez sans délai l'IT Support :
    [it-support@entreprise.fr](mailto:it-support@entreprise.fr).
    """
)

_TELETRAVAIL = _md(
    """
    # Télétravail — Règles et bonnes pratiques

    > Jusqu'à **2 jours par semaine**, sur accord du manager. Le **lundi** reste
    > présentiel pour toutes les équipes.

    ## Conditions
    - Maximum **2 jours par semaine** de télétravail.
    - Accord préalable du **manager** requis.
    - **Lundi** : journée présentielle obligatoire (rituels d'équipe).

    ## Matériel et connexion
    - L'entreprise fournit un **laptop**.
    - Le salarié assure une connexion internet stable (**minimum 10 Mbps**).
    - Indemnité forfaitaire de **15 €/mois** pour les frais à domicile.

    ## Bonnes pratiques
    - Indiquez votre statut (présentiel / distanciel) dans l'agenda partagé.
    - Restez joignable sur Slack pendant les **plages communes** (10h–12h, 14h–17h).
    """
)

_RECRUTEMENT = _md(
    """
    # Recrutement interne

    L'entreprise privilégie la **mobilité interne** : tout poste ouvert est
    d'abord proposé aux collaborateurs.

    ## Processus
    1. Le poste est publié **en interne pendant 5 jours ouvrés** avant toute
       diffusion externe.
    2. Les candidatures internes sont envoyées **directement au manager
       recruteur**, avec copie à [rh@entreprise.fr](mailto:rh@entreprise.fr).
    3. Un entretien est organisé sous 10 jours ouvrés.

    ## Conditions d'éligibilité
    - Être en poste depuis au moins **12 mois**.
    - Informer son manager actuel de la démarche.

    > La mobilité interne n'entraîne **aucune perte d'ancienneté**.
    """
)

_STACK = _md(
    """
    # Architecture technique Lekki

    Vue d'ensemble de la stack qui fait tourner **Lekki Wiki**.

    ## Backend
    - **FastAPI** (Python) — API REST asynchrone
    - **SQLite** + **SQLAlchemy** (ORM) — persistance
    - **JWT** — authentification et autorisation par rôle
    - **RAG** — recherche sémantique : chunking, embeddings et **similarité cosinus**

    ## Embeddings
    | Fournisseur | Usage |
    |-------------|-------|
    | **MiniLM** (`all-MiniLM-L6-v2`, local) | par défaut, sans clé API |
    | **Gemini** | fallback distant |

    ## Frontend
    - **React 18** + **TypeScript**
    - **TailwindCSS** + composants shadcn/ui
    - Éditeur **Markdown** avec aperçu en direct

    ## Démarrage rapide
    ```bash
    # Backend
    uvicorn app.main:app --reload

    # Frontend
    pnpm dev
    ```
    """
)


PME_PAGES: list[dict] = [
    {
        "id": PAGE_CONGES_ID,
        "title": "Politique de congés",
        "category": "rh",
        "content": _CONGES,
    },
    {
        "id": PAGE_ONBOARDING_ID,
        "title": "Onboarding — Guide du nouveau collaborateur",
        "category": "rh",
        "content": _ONBOARDING,
    },
    {
        "id": PAGE_FRAIS_ID,
        "title": "Procédure de remboursement des frais",
        "category": "commercial",
        "content": _FRAIS,
    },
    {
        "id": PAGE_IT_ID,
        "title": "Charte IT — Utilisation des outils numériques",
        "category": "technique",
        "content": _IT,
    },
    {
        "id": PAGE_TELETRAVAIL_ID,
        "title": "Guide télétravail",
        "category": "rh",
        "content": _TELETRAVAIL,
    },
    {
        "id": PAGE_RECRUTEMENT_ID,
        "title": "Processus de recrutement interne",
        "category": "rh",
        "content": _RECRUTEMENT,
    },
    {
        "id": PAGE_STACK_ID,
        "title": "Architecture technique — Stack Lekki",
        "category": "technique",
        "content": _STACK,
    },
]

# Questions recommandées pour valider les 5 use cases PME
PME_DEMO_QUESTIONS = [
    ("Combien de jours de congés payés par an ?", PAGE_CONGES_ID),
    ("Que faire le premier jour d'onboarding ?", PAGE_ONBOARDING_ID),
    ("Quel est le plafond repas client ?", PAGE_FRAIS_ID),
    ("Quelle est la longueur minimale d'un mot de passe ?", PAGE_IT_ID),
    ("Combien de jours de télétravail par semaine ?", PAGE_TELETRAVAIL_ID),
]
