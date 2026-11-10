from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.identity.models import User
from app.identity.repository import UserRepository
from app.identity.service import decode_token


async def _user_from_token(token: str | None, db: AsyncSession) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise.",
        )

    payload = decode_token(token)
    user_id = payload.get("sub") if payload else None
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalide ou expirée.",
        )

    user = await UserRepository(db).get_by_id_or_username(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Compte introuvable.",
        )
    return user


def _bearer(authorization: str | None) -> str | None:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1].strip() or None
    return None


async def get_current_user(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await _user_from_token(_bearer(authorization), db)


async def get_current_user_for_file(
    authorization: str | None = Header(None),
    token: str | None = Query(None, description="Jeton pour les balises <img> et les téléchargements"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Comme get_current_user, mais accepte aussi ?token= : une balise <img> ou un lien
    de téléchargement ne peuvent pas envoyer d'en-tête Authorization."""
    return await _user_from_token(_bearer(authorization) or token, db)
