import shutil
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Paths
    upload_dir: Path = Path("./data/uploads")
    output_dir: Path = Path("./data/outputs")
    models_cache_dir: Path = Path("./data/models")

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/convertinx.db"

    # Auth
    jwt_secret_key: str = "convertinx-dev-secret-change-in-production"
    jwt_access_expiry_minutes: int = 15
    jwt_refresh_expiry_days: int = 7

    # Model settings
    whisper_model_size: str = "medium"
    default_translation_model: str = "Helsinki-NLP/opus-mt"

    # Processing limits
    max_file_size_mb: int = 500
    max_video_duration_seconds: int = 3600
    max_concurrent_jobs: int = 3

    # API
    api_rate_limit_per_minute: int = 60

    # FFmpeg
    ffmpeg_path: str = "ffmpeg"

    class Config:
        env_file = ".env"

    def resolve_ffmpeg(self) -> str:
        """Return a working ffmpeg path, checking common locations."""
        if shutil.which(self.ffmpeg_path):
            return self.ffmpeg_path
        # WinGet install location
        winget = Path.home() / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe"
        if winget.exists():
            return str(winget)
        # Chocolatey
        choco = Path("C:/ProgramData/chocolatey/bin/ffmpeg.exe")
        if choco.exists():
            return str(choco)
        return self.ffmpeg_path


settings = Settings()
