from pydantic import BaseModel, EmailStr, Field, field_validator


class UserLogin(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("username", "password")
    @classmethod
    def strip_value(cls, value: str) -> str:
        return value.strip()


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: EmailStr
    name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        username = value.strip().lower()
        if not username.replace(".", "").replace("_", "").replace("-", "").isalnum():
            raise ValueError("L'identifiant ne peut contenir que des lettres, chiffres, points, tirets et underscores.")
        return username

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    name: str
    role: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
