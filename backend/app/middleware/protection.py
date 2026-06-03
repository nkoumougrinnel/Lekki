from app.middleware.auth_middleware import get_current_user
from app.middleware.roles import require_role

# Route accessible à tous les connectés
@router.get("/pages")
async def list_pages(current_user: User = Depends(get_current_user)):
    ...

# Route réservée admin et editor
@router.post("/pages")
async def create_page(current_user: User = Depends(require_role("admin", "editor"))):
    ...

# Route réservée admin uniquement
@router.delete("/pages/{id}")
async def delete_page(current_user: User = Depends(require_role("admin"))):
    ...