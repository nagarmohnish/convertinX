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
from app.routers import upload, jobs, languages, ws, auth, tools, dashboard, api_keys, distribution


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize dirs and preload models
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)

    # Initialize database
    from app.db.engine import create_tables
    await create_tables()

    # Initialize services
    from app.db.session import get_session_factory
    model_manager = ModelManager()
    broadcaster = ProgressBroadcaster()
    session_factory = get_session_factory()
    orchestrator = JobOrchestrator(model_manager, broadcaster, session_factory)

    dependencies.model_manager = model_manager
    dependencies.orchestrator = orchestrator
    dependencies.broadcaster = broadcaster

    # Resolve and configure FFmpeg path for pydub, whisper, and all subprocess calls
    import os
    ffmpeg = settings.resolve_ffmpeg()
    settings.ffmpeg_path = ffmpeg
    # Add ffmpeg directory to PATH so whisper and any subprocess("ffmpeg") calls find it
    ffmpeg_dir = str(Path(ffmpeg).parent)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
    import pydub.utils
    pydub.utils.FFMPEG_PATH = ffmpeg  # type: ignore
    from pydub import AudioSegment
    AudioSegment.converter = ffmpeg
    AudioSegment.ffprobe = ffmpeg.replace("ffmpeg", "ffprobe")

    print("ConvertinX backend starting...")
    print(f"Whisper model: {settings.whisper_model_size}")
    print(f"FFmpeg: {ffmpeg}")
    print(f"Database: {settings.database_url}")
    print(f"Upload dir: {settings.upload_dir.resolve()}")
    print(f"Output dir: {settings.output_dir.resolve()}")

    yield

    model_manager.unload_all()
    from app.db.engine import dispose_engine
    await dispose_engine()
    print("ConvertinX backend stopped.")


app = FastAPI(
    title="ConvertinX",
    description="Universal Content Localization & Distribution Platform",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(tools.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(languages.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")
app.include_router(distribution.router, prefix="/api")
app.include_router(ws.router)

# Serve output files for download
app.mount(
    "/outputs",
    StaticFiles(directory=str(settings.output_dir)),
    name="outputs",
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "ConvertinX", "version": "2.0.0"}
