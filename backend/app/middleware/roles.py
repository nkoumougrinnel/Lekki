from fastapi import HTTPException, status
from app.models.user import User
from functools import wraps

def require_role(*roles: str):
    """
    Utilisation :
        @router.get("/admin")
        async def admin_route(current_user: User = Depends(require_role("admin"))):
    """
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle requis : {', '.join(roles)}"
            )
        return current_user
    return dependency