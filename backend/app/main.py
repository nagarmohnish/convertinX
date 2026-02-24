from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from app.models.model_manager import ModelManager
from app.pipeline.orchestrator import JobOrchestrator
from app.pipeline.progress import ProgressBroadcaster
from app.config import settings
from app import dependencies
from app.routers import upload, jobs, languages, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize dirs and preload models
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)

    model_manager = ModelManager()
    broadcaster = ProgressBroadcaster()
    orchestrator = JobOrchestrator(model_manager, broadcaster)

    dependencies.model_manager = model_manager
    dependencies.orchestrator = orchestrator
    dependencies.broadcaster = broadcaster

    print("ConvertinX backend starting...")
    print(f"Whisper model: {settings.whisper_model_size}")
    print(f"Upload dir: {settings.upload_dir.resolve()}")
    print(f"Output dir: {settings.output_dir.resolve()}")

    yield

    model_manager.unload_all()
    print("ConvertinX backend stopped.")


app = FastAPI(
    title="ConvertinX",
    description="Universal Content Localization Tool",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(languages.router, prefix="/api")
app.include_router(ws.router)

# Serve output files for download
app.mount(
    "/outputs",
    StaticFiles(directory=str(settings.output_dir)),
    name="outputs",
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "ConvertinX"}
