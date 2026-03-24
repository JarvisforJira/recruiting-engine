from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from db.mongodb import connect_db, close_db
from routers import roles, targeting, prospects, outreach, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Recruiting Engine API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(roles.router)
app.include_router(targeting.router)
app.include_router(prospects.router)
app.include_router(outreach.router)
app.include_router(analytics.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
