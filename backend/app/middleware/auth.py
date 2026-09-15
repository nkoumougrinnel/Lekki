from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.services.auth_service import decode_token

# Demo student user ID fallback for effortless local testing
DEFAULT_DEMO_USER_ID = "u-grinnel"


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        # Try JWT decode first
        payload = decode_token(token)
        if payload and "sub" in payload:
            user_id = payload["sub"]
        else:
            # Direct token / user ID support for dev convenience
            user_id = token

    if user_id:
        result = await db.execute(select(User).where((User.id == user_id) | (User.username == user_id)))
        user = result.scalar_one_or_none()
        if user:
            return user

    # Fallback to demo user
    result = await db.execute(select(User).where(User.id == DEFAULT_DEMO_USER_ID))
    demo_user = result.scalar_one_or_none()
    if demo_user:
        return demo_user

    # If database not yet seeded, create temporary object
    return User(
        id=DEFAULT_DEMO_USER_ID,
        username="grinnel",
        email="grinnel@lekki.io",
        name="Grinnel N.",
        role="editor"
    )
