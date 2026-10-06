from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.realtime import ping
from app.routers import health

app = FastAPI(title="Zoom Clone API")

# The browser calls this API from the frontend's origin, so that origin must be allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Every REST router is mounted under /api here, so the prefix lives in one place.
app.include_router(health.router, prefix="/api")

app.include_router(ping.router)  # Temporary; removed in Phase 5.
