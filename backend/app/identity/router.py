import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.identity.models import User
from app.identity.repository import UserRepository
from app.identity.schemas import TokenResponse, UserLogin, UserOut, UserRegister
from app.identity.service import create_access_token, get_password_hash, verify_password
from app.middleware.auth import get_current_user


auth_router = APIRouter(prefix="/auth", tags=["Auth"])
users_router = APIRouter(prefix="/users", tags=["Users"])


def _issue_token(user: User) -> TokenResponse:
    token = create_access_token({"sub": user.id, "username": user.username, "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@auth_router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    repository = UserRepository(db)
    identifier = data.username.lower()
    user = await repository.get_by_login(identifier)

    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect.",
        )

    return _issue_token(user)


@auth_router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    repository = UserRepository(db)
    email = str(data.email).strip().lower()

    if await repository.get_by_login(data.username) or await repository.get_by_login(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce nom d'utilisateur ou cet email est déjà utilisé.",
        )

    user = User(
        id=f"u-{uuid.uuid4().hex[:8]}",
        username=data.username,
        email=email,
        name=data.name,
        hashed_password=get_password_hash(data.password),
        role="editor",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return _issue_token(user)


@auth_router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@users_router.get("", response_model=list[UserOut])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    del current_user
    return [UserOut.model_validate(user) for user in await UserRepository(db).list()]


@users_router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    del current_user
    user = await UserRepository(db).get_by_id_or_username(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return UserOut.model_validate(user)
