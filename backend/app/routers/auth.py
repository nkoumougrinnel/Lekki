"""
Lekki Wiki — Router Auth (async)
Endpoints : POST /auth/register, POST /auth/login, GET /auth/me
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, TokenResponse
from app.services.auth_service import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
    }


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Crée un compte utilisateur (rôle reader par défaut) et retourne un JWT."""
    result = await db.execute(
        select(User).where(
            or_(User.email == body.email, User.username == body.username)
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        if existing.email == body.email:
            detail = "Cet email est déjà utilisé"
        else:
            detail = "Ce nom d'utilisateur est déjà pris"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

    user = User(
        email=body.email,
        username=body.username,
        password_hash=hash_password(body.password),
        role="reader",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(data={"sub": user.id, "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_payload(user),
    }


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post("/login")
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Authentifie un utilisateur et retourne un JWT.
    Accepte email ou username dans le champ `username`.
    """
    result = await db.execute(
        select(User).where(
            (User.email == form.username) | (User.username == form.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_token(data={"sub": user.id, "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_payload(user),
    }


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur authentifié."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at,
    }
