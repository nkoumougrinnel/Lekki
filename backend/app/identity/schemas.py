from typing import Optional

from pydantic import BaseModel, EmailStr


class UserLogin(BaseModel):
    username: str
    password: Optional[str] = None


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    name: str
    password: str
    role: Optional[str] = "editor"


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    name: str
    role: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
