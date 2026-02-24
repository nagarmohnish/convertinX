from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Paths
    upload_dir: Path = Path("./data/uploads")
    output_dir: Path = Path("./data/outputs")
    models_cache_dir: Path = Path("./data/models")

    # Model settings
    whisper_model_size: str = "medium"
    default_translation_model: str = "Helsinki-NLP/opus-mt"

    # Processing limits
    max_file_size_mb: int = 500
    max_video_duration_seconds: int = 3600
    max_concurrent_jobs: int = 3

    # FFmpeg
    ffmpeg_path: str = "ffmpeg"

    class Config:
        env_file = ".env"


settings = Settings()
