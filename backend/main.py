"""
DraftSage FastAPI Backend — main application entrypoint.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routes.draft import router as draft_router
from routes.auth import router as auth_router
from routes.payments import router as payments_router
from services.riot_service import get_all_champions


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm the champion cache on startup."""
    print("[DraftSage] Pre-loading champion data from Data Dragon...")
    try:
        champions = await get_all_champions()
        print(f"[DraftSage] Loaded {len(champions)} champions.")
    except Exception as e:
        print(f"[DraftSage] Warning: Could not pre-load champions: {e}")
    yield
    print("[DraftSage] Shutting down.")


app = FastAPI(
    title="DraftSage API",
    description="AI-powered League of Legends draft assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend origin(s).
# Baseline list is hardcoded so the app keeps working if ALLOWED_ORIGINS
# env var is missing or misconfigured. Add new production domains here.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BASELINE_ORIGINS = [
    "http://localhost:3000",                # local dev
    "https://draft-sage-five.vercel.app",   # Vercel default domain
    "https://draftsage.pro",                # custom domain (apex)
    "https://www.draftsage.pro",            # custom domain (www)
    FRONTEND_URL,
]
# Extra origins can be added via env var (comma-separated)
_origins_env = os.getenv("ALLOWED_ORIGINS", "")
EXTRA_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

# De-dup while preserving order
_seen = set()
ALLOWED_ORIGINS: list[str] = []
for origin in BASELINE_ORIGINS + EXTRA_ORIGINS:
    if origin and origin not in _seen:
        ALLOWED_ORIGINS.append(origin)
        _seen.add(origin)

# Regex covers all Vercel preview deploys (draft-sage-xxx-stain04s-projects.vercel.app)
VERCEL_PREVIEW_REGEX = r"^https://draft-sage(-[a-z0-9]+)*\.vercel\.app$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=VERCEL_PREVIEW_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(draft_router)
app.include_router(auth_router)
app.include_router(payments_router)


@app.get("/")
async def root():
    return {"message": "DraftSage API is live", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/champions")
async def list_champions(search: str = ""):
    """Return full champion list with icon URLs from Data Dragon."""
    from services.riot_service import get_all_champions
    champions = await get_all_champions()
    if search:
        search_lower = search.lower()
        champions = [
            c for c in champions
            if search_lower in c["name"].lower() or search_lower in c["id"].lower()
        ]
    return {"champions": champions, "count": len(champions)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
