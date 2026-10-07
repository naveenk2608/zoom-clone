from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import SessionLocal, engine
from app.models import create_tables
from app.realtime import ws
from app.routers import health, meetings, users
from app.seed import seed_if_empty
from app.services.errors import ServiceError
from app.services.lifecycle import close_stale_sessions


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Runs once at startup, before the first request is served."""
    create_tables(engine)
    with SessionLocal() as db:
        close_stale_sessions(db)  # after a restart nobody is connected
        seed_if_empty(db)  # free hosting loses the database on restart
    yield


app = FastAPI(title="Zoom Clone API", lifespan=lifespan)

# The browser calls this API from the frontend's origin, so that origin must be allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ServiceError)
async def handle_service_error(request: Request, error: ServiceError) -> JSONResponse:
    """Turns a broken business rule into {"detail": message} with its status code."""
    return JSONResponse(status_code=error.status_code, content={"detail": error.detail})


# Every REST router is mounted under /api here, so the prefix lives in one place.
app.include_router(health.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(meetings.router, prefix="/api")

app.include_router(ws.router)  # the live meeting socket, at /ws/meetings/{code}
