import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile

from app.models.schemas import ContentType
from app.config import settings

TEXT_EXTENSIONS = {".txt", ".srt", ".vtt", ".md", ".html", ".json"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def detect_content_type(filename: str) -> ContentType | None:
    """Detect content type from file extension."""
    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()

    if ext in TEXT_EXTENSIONS:
        return ContentType.TEXT
    if ext in AUDIO_EXTENSIONS:
        return ContentType.AUDIO
    if ext in VIDEO_EXTENSIONS:
        return ContentType.VIDEO
    return None


async def save_upload(file: UploadFile) -> Path:
    """Save uploaded file to disk and return the path."""
    file_id = str(uuid.uuid4())
    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()

    file_path = settings.upload_dir / f"{file_id}{ext}"
    file_path.parent.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            await f.write(chunk)

    return file_path


def get_job_output_dir(job_id: str) -> Path:
    """Get output directory for a specific job."""
    output_dir = settings.output_dir / job_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir
