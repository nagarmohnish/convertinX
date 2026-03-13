import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.models.schemas import ContentType
from app.utils.file_utils import detect_content_type, save_upload
from app.dependencies import get_orchestrator
from app.config import settings
from app.auth.dependencies import get_current_user_optional
from app.db.models import User

router = APIRouter()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    target_languages: str = Form(...),
    source_language: str = Form(None),
    singing_mode: str = Form("false"),
    user: User | None = Depends(get_current_user_optional),
):
    """Upload a file and start a localization job."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    content_type = detect_content_type(file.filename)
    if content_type is None:
        raise HTTPException(400, f"Unsupported file type: {file.filename}")

    if file.size and file.size > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max: {settings.max_file_size_mb}MB")

    try:
        tgt_langs = json.loads(target_languages)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid target_languages format. Expected JSON array.")

    if not tgt_langs or not isinstance(tgt_langs, list):
        raise HTTPException(400, "At least one target language required")

    is_singing = singing_mode.lower() in ("true", "1", "yes")
    if is_singing and content_type != ContentType.AUDIO:
        raise HTTPException(400, "Song mode is only available for audio files")

    file_path = await save_upload(file)

    orchestrator = get_orchestrator()
    job_id = await orchestrator.submit_job(
        file_path=str(file_path),
        content_type=content_type,
        source_language=source_language if source_language else None,
        target_languages=tgt_langs,
        singing_mode=is_singing,
        user_id=user.id if user else None,
    )

    return {
        "job_id": job_id,
        "content_type": content_type.value,
        "singing_mode": is_singing,
        "message": "Job submitted successfully",
    }
