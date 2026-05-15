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

# CORS — allow frontend origin(s)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
# Support comma-separated list of origins (e.g. localhost + Vercel preview URLs)
_origins_env = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _origins_env.split(",") if o.strip()]
    if _origins_env
    else [FRONTEND_URL, "http://localhost:3000"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
