from pydantic import BaseModel
from enum import Enum
from typing import Optional
from datetime import datetime


class ContentType(str, Enum):
    TEXT = "text"
    AUDIO = "audio"
    VIDEO = "video"


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    content_type: ContentType
    source_language: Optional[str] = None
    target_languages: list[str]
    progress: float = 0.0
    current_step: str = ""
    created_at: datetime
    results: Optional[dict] = None


class ProgressUpdate(BaseModel):
    job_id: str
    progress: float
    step: str
    detail: str = ""


class TranscriptionSegment(BaseModel):
    start: float
    end: float
    text: str
    words: list[dict] = []
