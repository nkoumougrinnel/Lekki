from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserLogin, UserRegister, UserOut, TokenResponse
from app.services.auth_service import create_access_token, get_password_hash, verify_password
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    query = select(User).where((User.username == data.username) | (User.email == data.username))
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        # Create user on the fly if dev login
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
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.from_orm(user)
    )


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check existing
    query = select(User).where((User.username == data.username) | (User.email == data.email))
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur ou cet email est déjà utilisé.")

    user = User(
        id=f"u-{uuid.uuid4().hex[:8]}",
        username=data.username.lower(),
        email=data.email,
        name=data.name,
        hashed_password=get_password_hash(data.password),
        role=data.role or "editor"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "username": user.username, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.from_orm(user)
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.from_orm(current_user)
