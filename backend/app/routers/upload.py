import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.models.schemas import ContentType
from app.utils.file_utils import detect_content_type, save_upload
from app.dependencies import get_orchestrator
from app.config import settings

router = APIRouter()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    target_languages: str = Form(...),
    source_language: str = Form(None),
):
    """Upload a file and start a localization job."""
    # Validate file
    if not file.filename:
        raise HTTPException(400, "No file provided")

    content_type = detect_content_type(file.filename)
    if content_type is None:
        raise HTTPException(400, f"Unsupported file type: {file.filename}")

    # Check file size
    if file.size and file.size > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max: {settings.max_file_size_mb}MB")

    # Parse target languages
    try:
        tgt_langs = json.loads(target_languages)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid target_languages format. Expected JSON array.")

    if not tgt_langs or not isinstance(tgt_langs, list):
        raise HTTPException(400, "At least one target language required")

    # Save file to disk
    file_path = await save_upload(file)

    # Submit job
    orchestrator = get_orchestrator()
    job_id = await orchestrator.submit_job(
        file_path=str(file_path),
        content_type=content_type,
        source_language=source_language if source_language else None,
        target_languages=tgt_langs,
    )

    return {
        "job_id": job_id,
        "content_type": content_type.value,
        "message": "Job submitted successfully",
    }
