"""
FPL Assistant — FastAPI main application entry point.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.database import create_tables

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="FPL Assistant API",
    description="Fantasy Premier League management assistant — 2026/27",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

# Create DB tables on startup
@app.on_event("startup")
def startup():
    logger.info("Starting FPL Assistant API...")
    create_tables()
    logger.info("Database tables created/verified.")
    FastAPICache.init(InMemoryBackend(), prefix="fpl-cache")
    logger.info("FastAPI Cache initialized (InMemory).")

# Register routers
from app.api.routes import fixtures, gameweeks, picks, players, simulator, squad, sync

app.include_router(sync.router, prefix="/api")
app.include_router(players.router, prefix="/api")
app.include_router(picks.router, prefix="/api")
app.include_router(fixtures.router, prefix="/api")
app.include_router(gameweeks.router, prefix="/api")
app.include_router(squad.router, prefix="/api")
app.include_router(simulator.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "FPL Assistant", "season": "2026/27"}


@app.get("/")
def root():
    return {"message": "FPL Assistant API. See /docs for API documentation."}
