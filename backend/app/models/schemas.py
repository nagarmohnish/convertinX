from pydantic import BaseModel
from enum import Enum
from typing import Optional
from datetime import datetime


class ContentType(str, Enum):
    TEXT = "text"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    IMAGE = "image"


class ToolType(str, Enum):
    # Existing translation tools
    TRANSLATE_TEXT = "translate_text"
    TRANSLATE_AUDIO = "translate_audio"
    TRANSLATE_VIDEO = "translate_video"
    TRANSLATE_SINGING = "translate_singing"
    # New tools
    TEXT_TO_SPEECH = "tts"
    SPEECH_TO_TEXT = "stt"
    DOC_TRANSLATE = "doc_translate"
    IMAGE_OCR = "image_ocr"
    AUDIO_SEPARATE = "audio_separate"


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    tool: ToolType
    content_type: ContentType
    source_language: Optional[str] = None
    target_languages: list[str] = []
    progress: float = 0.0
    current_step: str = ""
    created_at: datetime
    results: Optional[dict] = None
    singing_mode: bool = False


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
