import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.identity.models import User
from app.identity.repository import UserRepository
from app.identity.schemas import TokenResponse, UserLogin, UserOut, UserRegister
from app.identity.service import create_access_token, get_password_hash
from app.middleware.auth import get_current_user


auth_router = APIRouter(prefix="/auth", tags=["Auth"])
users_router = APIRouter(prefix="/users", tags=["Users"])


@auth_router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    repository = UserRepository(db)
    user = await repository.get_by_login(data.username)

    if not user:
        user = User(
            id=f"u-{uuid.uuid4().hex[:8]}",
            username=data.username.lower(),
            email=f"{data.username.lower()}@lekki.io",
            name=data.username.capitalize(),
            role="editor",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token({"sub": user.id, "username": user.username, "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@auth_router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    repository = UserRepository(db)
    if await repository.get_by_login(data.username) or await repository.get_by_login(data.email):
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur ou cet email est déjà utilisé.")

    user = User(
        id=f"u-{uuid.uuid4().hex[:8]}",
        username=data.username.lower(),
        email=data.email,
        name=data.name,
        hashed_password=get_password_hash(data.password),
        role=data.role or "editor",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "username": user.username, "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@auth_router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@users_router.get("", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    return [UserOut.model_validate(user) for user in await UserRepository(db).list()]


@users_router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    user = await UserRepository(db).get_by_id_or_username(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return UserOut.model_validate(user)
