"""Contenu wiki PME — 5 use cases démo + 2 pages complémentaires."""

from __future__ import annotations

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

PME_PAGES: list[dict] = [
    {
        "id": PAGE_CONGES_ID,
        "title": "Politique de congés",
        "category": "rh",
        "content": (
            "# Politique de congés\n\n"
            "Chaque employé bénéficie de 25 jours de congés payés par an. "
            "Les congés doivent être posés au moins 2 semaines à l'avance "
            "via le portail RH. Les congés non pris au 31 décembre peuvent "
            "être reportés jusqu'au 31 mars de l'année suivante, dans la "
            "limite de 5 jours. Pour toute demande exceptionnelle, contacter "
            "directement le service RH à rh@entreprise.fr.\n\n"
            "## Congés spéciaux\n"
            "- Mariage : 4 jours\n"
            "- Naissance / adoption : 3 jours\n"
            "- Décès d'un proche (conjoint/enfant) : 3 jours\n"
            "- Déménagement : 1 jour par an\n"
        ),
    },
    {
        "id": PAGE_ONBOARDING_ID,
        "title": "Onboarding — Guide du nouveau collaborateur",
        "category": "rh",
        "content": (
            "# Bienvenue chez nous !\n\n"
            "Ce guide résume les étapes clés de votre première semaine.\n\n"
            "## Jour 1\n"
            "- Récupérer votre badge à l'accueil (bâtiment A, 8h30)\n"
            "- Rendez-vous RH pour signature du contrat et remise du matériel\n"
            "- Déjeuner de bienvenue avec votre manager\n\n"
            "## Semaine 1\n"
            "- Accès aux outils : Slack, Jira, GitHub, Google Workspace\n"
            "- Formation sécurité informatique (obligatoire, 2h en ligne)\n"
            "- Présentation aux équipes : planning envoyé par votre manager\n\n"
            "## Contacts utiles\n"
            "- RH : rh@entreprise.fr\n"
            "- IT Support : it-support@entreprise.fr (ticket via Jira)\n"
        ),
    },
    {
        "id": PAGE_FRAIS_ID,
        "title": "Procédure de remboursement des frais",
        "category": "commercial",
        "content": (
            "# Remboursement des frais professionnels\n\n"
            "Tout frais professionnel doit être soumis dans les 30 jours "
            "suivant la dépense via le formulaire en ligne disponible sur l'intranet.\n\n"
            "## Plafonds\n"
            "| Type | Plafond |\n"
            "|------|---------|\n"
            "| Repas client | 80 € / personne |\n"
            "| Repas solo en déplacement | 25 € |\n"
            "| Nuit d'hôtel (province) | 130 € |\n"
            "| Nuit d'hôtel (Paris / étranger) | 200 € |\n"
            "| Transport (taxi/VTC) | justificatif obligatoire |\n\n"
            "## Pièces justificatives\n"
            "Joindre obligatoirement les reçus originaux (photo ou scan). "
            "Les remboursements sont traités le 10 de chaque mois.\n"
        ),
    },
    {
        "id": PAGE_IT_ID,
        "title": "Charte IT — Utilisation des outils numériques",
        "category": "technique",
        "content": (
            "# Charte d'utilisation des outils numériques\n\n"
            "## Règles fondamentales\n"
            "- Ne jamais partager vos identifiants\n"
            "- Verrouiller votre session dès que vous quittez votre poste\n"
            "- Ne pas installer de logiciels sans autorisation IT\n"
            "- Signaler immédiatement tout incident de sécurité\n\n"
            "## Mots de passe\n"
            "Minimum 12 caractères, renouvellement tous les 90 jours. "
            "Gestionnaire recommandé : Bitwarden (licence entreprise fournie).\n"
        ),
    },
    {
        "id": PAGE_TELETRAVAIL_ID,
        "title": "Guide télétravail",
        "category": "rh",
        "content": (
            "# Télétravail — Règles et bonnes pratiques\n\n"
            "Le télétravail est autorisé jusqu'à 2 jours par semaine, "
            "sur accord du manager. La journée du lundi est obligatoirement "
            "présentielle pour l'ensemble des équipes.\n\n"
            "## Matériel\n"
            "L'entreprise fournit un laptop. Le salarié est responsable "
            "d'une connexion internet stable (minimum 10 Mbps). "
            "Une indemnité forfaitaire de 15 €/mois est versée.\n"
        ),
    },
    {
        "id": PAGE_RECRUTEMENT_ID,
        "title": "Processus de recrutement interne",
        "category": "rh",
        "content": (
            "# Recrutement interne\n\n"
            "Tout poste ouvert est d'abord publié en interne pendant 5 jours ouvrés "
            "avant diffusion externe. Les candidatures internes sont à envoyer "
            "directement au manager recruteur avec copie à rh@entreprise.fr.\n"
        ),
    },
    {
        "id": PAGE_STACK_ID,
        "title": "Architecture technique — Stack Lekki",
        "category": "technique",
        "content": (
            "# Architecture technique Lekki\n\n"
            "## Backend\n"
            "- FastAPI, SQLite, SQLAlchemy, JWT\n"
            "- RAG : embeddings Gemini + similarité cosinus\n\n"
            "## Frontend\n"
            "- React 18 + TailwindCSS + CodeMirror\n"
        ),
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
