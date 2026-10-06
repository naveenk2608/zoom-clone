from fastapi import APIRouter

from app.schemas.health import HealthOut

router = APIRouter(tags=["health"])


@router.get("/health")
def get_health() -> HealthOut:
    """Liveness check. The frontend also calls it to wake a sleeping Render instance."""
    return HealthOut(status="ok")
