"""
Lekki Wiki — Seed data
Place : backend/data/seed.py
Lance : cd backend && python -m data.seed
"""

import hashlib
import json
from app.database import SessionLocal, Base
from sqlalchemy import create_engine, inspect

from app.models.user import User
from app.models.page import Page
from app.models.chunk import Chunk
from app.models.chat import Chat, Message


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def hash_password_plain(password: str) -> str:
    """
    Placeholder SHA-256 — sera écrasé par bcrypt quand auth_service sera branché.
    NE PAS utiliser en production.
    """
    return "PLACEHOLDER:" + hashlib.sha256(password.encode()).hexdigest()


def chunk_text(text: str, size: int = 300) -> list[str]:
    """Découpe naïve par mots (sera remplacé par le RAG chunker de BE-2)."""
    words = text.split()
    chunks, current, length = [], [], 0
    for word in words:
        current.append(word)
        length += len(word) + 1
        if length >= size:
            chunks.append(" ".join(current))
            current, length = [], 0
    if current:
        chunks.append(" ".join(current))
    return chunks


def make_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Données
# ---------------------------------------------------------------------------

PAGES_DATA = [
    {
        "title": "Politique de congés",
        "category": "rh",
        "status": "published",
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
        "title": "Onboarding — Guide du nouveau collaborateur",
        "category": "rh",
        "status": "published",
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
            "- Office Manager : office@entreprise.fr\n"
        ),
    },
    {
        "title": "Procédure de remboursement des frais",
        "category": "commercial",
        "status": "published",
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
        "title": "Charte IT — Utilisation des outils numériques",
        "category": "technique",
        "status": "published",
        "content": (
            "# Charte d'utilisation des outils numériques\n\n"
            "L'ensemble des équipements informatiques mis à disposition "
            "sont destinés à un usage professionnel. Un usage personnel raisonnable est toléré.\n\n"
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
        "title": "Guide télétravail",
        "category": "rh",
        "status": "published",
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
        "title": "Processus de recrutement interne",
        "category": "rh",
        "status": "published",
        "content": (
            "# Recrutement interne\n\n"
            "Tout poste ouvert est d'abord publié en interne pendant 5 jours ouvrés "
            "avant diffusion externe. Les candidatures internes sont à envoyer "
            "directement au manager recruteur avec copie à rh@entreprise.fr.\n\n"
            "## Critères de priorité\n"
            "1. Compétences techniques requises\n"
            "2. Ancienneté dans l'entreprise\n"
            "3. Évaluation annuelle (dernière note ≥ 3/5)\n"
        ),
    },
    {
        "title": "Architecture technique — Stack Lekki",
        "category": "technique",
        "status": "published",
        "content": (
            "# Architecture technique Lekki\n\n"
            "## Backend\n"
            "- **Framework** : FastAPI (Python 3.11)\n"
            "- **Base de données** : SQLite + SQLAlchemy ORM\n"
            "- **Auth** : JWT (python-jose + bcrypt)\n"
            "- **RAG** : Embeddings Claude + recherche cosinus sur chunks\n\n"
            "## Frontend\n"
            "- **Framework** : React 18 + TailwindCSS\n"
            "- **Éditeur** : CodeMirror (Markdown)\n"
            "- **State** : Context API\n\n"
            "## Déploiement MVP\n"
            "Lancement direct en local, sans Docker. "
            "Commande : `uvicorn app.main:app --reload`\n"
        ),
    },
]


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

def seed() -> None:
    db = SessionLocal()
    try:
        # ── Idempotence ───────────────────────────────────────────────────
        if db.query(User).count() > 0:
            print("⚠️  Base déjà peuplée — seed annulé.")
            return

        print("🌱  Démarrage du seed…")

        # ── 1. Utilisateurs ───────────────────────────────────────────────
        admin = User(
            email="admin@lekki.io",
            username="admin",
            password_hash=hash_password_plain("Admin1234!"),
            role="admin",
        )
        editor = User(
            email="alice@lekki.io",
            username="alice",
            password_hash=hash_password_plain("Alice1234!"),
            role="editor",
        )
        reader = User(
            email="bob@lekki.io",
            username="bob",
            password_hash=hash_password_plain("Bob1234!"),
            role="reader",
        )
        db.add_all([admin, editor, reader])
        db.flush()
        print(" 3 utilisateurs créés (admin / alice / bob)")

        # ── 2. Pages ──────────────────────────────────────────────────────
        pages = []
        for data in PAGES_DATA:
            p = Page(
                title=data["title"],
                category=data["category"],
                status=data["status"],
                content=data["content"],
                creator_id=admin.id if data["category"] != "commercial" else editor.id,
            )
            db.add(p)
            pages.append(p)
        db.flush()
        print(f" {len(pages)} pages créées")

        # ── 3. Chunks ─────────────────────────────────────────────────────
        total_chunks = 0
        for page in pages:
            if page.status != "published":
                continue
            for idx, text in enumerate(chunk_text(page.content)):
                db.add(Chunk(
                    page_id=page.id,
                    chunk_index=idx,
                    chunk_text=text,
                    chunk_hash=make_hash(text),
                    token_count=len(text.split()),
                ))
                total_chunks += 1
            page.is_embedded = True
        db.flush()
        print(f" {total_chunks} chunks créés")

        # ── 4. Chat + messages d'exemple ─────────────────────────────────
        chat = Chat(
            title="Question sur les congés",
            user_id=reader.id,
        )
        db.add(chat)
        db.flush()

        db.add_all([
            Message(
                chat_id=chat.id,
                role="user",
                content="Combien de jours de congés ai-je par an ?",
                tokens_used=12,
            ),
            Message(
                chat_id=chat.id,
                role="assistant",
                content=(
                    "Selon la politique interne, chaque employé bénéficie de "
                    "**25 jours de congés payés** par an. Les demandes doivent être "
                    "soumises au moins 2 semaines à l'avance via le portail RH."
                ),
                sources=json.dumps([{"page_id": pages[0].id, "excerpt": "25 jours de congés payés", "score": 0.97}]),
                tokens_used=58,
            ),
        ])

        db.commit()
        print(" 1 chat d'exemple avec 2 messages créé")
        print()
        print("🎉  Seed terminé avec succès !")
        print()
        print("  Comptes disponibles :")
        print("    admin@lekki.io  / Admin1234!  (admin)")
        print("    alice@lekki.io  / Alice1234!  (editor)")
        print("    bob@lekki.io    / Bob1234!    (reader)")
        print()
        print(" Mots de passe en SHA-256 placeholder.")
        print("     Ils seront remplacés automatiquement quand bcrypt sera branché.")

    except Exception as e:
        db.rollback()
        print(f"Erreur seed : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()