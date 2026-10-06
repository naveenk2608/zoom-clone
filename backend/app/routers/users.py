from fastapi import APIRouter

from app.deps import CurrentUser
from app.schemas.user import UserOut

router = APIRouter(tags=["users"])


@router.get("/me")
def get_me(user: CurrentUser) -> UserOut:
    """The signed-in user, which is always the seeded default user in this demo."""
    return UserOut.model_validate(user)
