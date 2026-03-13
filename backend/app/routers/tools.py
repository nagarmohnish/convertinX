import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.models.schemas import ContentType, ToolType
from app.utils.file_utils import save_upload
from app.dependencies import get_orchestrator
from app.config import settings
from app.auth.dependencies import get_current_user_optional
from app.db.models import User

router = APIRouter()


@router.post("/tools/tts")
async def tool_tts(
    text: str = Form(...),
    language: str = Form("en"),
    voice_gender: str = Form("female"),
    user: User | None = Depends(get_current_user_optional),
):
    """Text-to-Speech: convert text to audio."""
    if not text.strip():
        raise HTTPException(400, "Text is required")
    if len(text) > 5000:
        raise HTTPException(400, "Text too long. Max 5000 characters.")

    orchestrator = get_orchestrator()
    job_id = await orchestrator.submit_tool_job(
        tool=ToolType.TEXT_TO_SPEECH,
        content_type=ContentType.TEXT,
        user_id=user.id if user else None,
        extra_params={"text": text, "language": language, "voice_gender": voice_gender},
    )

    return {"job_id": job_id, "tool": "tts", "status": "queued"}


@router.post("/tools/stt")
async def tool_stt(
    file: UploadFile = File(...),
    language: str = Form(None),
    output_format: str = Form("srt"),
    user: User | None = Depends(get_current_user_optional),
):
    """Speech-to-Text: transcribe audio to text/subtitles."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    if file.size and file.size > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max: {settings.max_file_size_mb}MB")

    file_path = await save_upload(file)

    orchestrator = get_orchestrator()
    job_id = await orchestrator.submit_tool_job(
        tool=ToolType.SPEECH_TO_TEXT,
        content_type=ContentType.AUDIO,
        file_path=str(file_path),
        source_language=language if language else None,
        user_id=user.id if user else None,
        extra_params={"output_format": output_format},
    )

    return {"job_id": job_id, "tool": "stt", "status": "queued"}


@router.post("/tools/separate")
async def tool_separate(
    file: UploadFile = File(...),
    user: User | None = Depends(get_current_user_optional),
):
    """Audio Separation: split audio into vocals, drums, bass, other."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    if file.size and file.size > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max: {settings.max_file_size_mb}MB")

    file_path = await save_upload(file)

    orchestrator = get_orchestrator()
    job_id = await orchestrator.submit_tool_job(
        tool=ToolType.AUDIO_SEPARATE,
        content_type=ContentType.AUDIO,
        file_path=str(file_path),
        user_id=user.id if user else None,
    )

    return {"job_id": job_id, "tool": "audio_separate", "status": "queued"}


@router.post("/tools/doc-translate")
async def tool_doc_translate(
    file: UploadFile = File(...),
    source_language: str = Form("en"),
    target_language: str = Form(...),
    user: User | None = Depends(get_current_user_optional),
):
    """Document Translation: translate PDF, DOCX, or PPTX."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    from app.services.document import detect_doc_type
    doc_type = detect_doc_type(file.filename)
    if not doc_type:
        raise HTTPException(400, "Unsupported format. Use PDF, DOCX, or PPTX.")

    if file.size and file.size > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max: {settings.max_file_size_mb}MB")

    file_path = await save_upload(file)

    orchestrator = get_orchestrator()
    job_id = await orchestrator.submit_tool_job(
        tool=ToolType.DOC_TRANSLATE,
        content_type=ContentType.DOCUMENT,
        file_path=str(file_path),
        source_language=source_language,
        target_languages=[target_language],
        user_id=user.id if user else None,
    )

    return {"job_id": job_id, "tool": "doc_translate", "status": "queued"}


@router.post("/tools/image-ocr")
async def tool_image_ocr(
    file: UploadFile = File(...),
    source_language: str = Form("en"),
    target_language: str = Form(...),
    user: User | None = Depends(get_current_user_optional),
):
    """Image OCR + Translation: extract text from image, translate, overlay."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in {"png", "jpg", "jpeg", "webp", "bmp", "tiff"}:
        raise HTTPException(400, "Unsupported format. Use PNG, JPG, or WebP.")

    if file.size and file.size > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max: {settings.max_file_size_mb}MB")

    file_path = await save_upload(file)

    # Copy original to output dir for side-by-side comparison
    import shutil
    from app.utils.file_utils import get_job_output_dir

    orchestrator = get_orchestrator()
    job_id = await orchestrator.submit_tool_job(
        tool=ToolType.IMAGE_OCR,
        content_type=ContentType.IMAGE,
        file_path=str(file_path),
        source_language=source_language,
        target_languages=[target_language],
        user_id=user.id if user else None,
    )

    # Copy original image to output dir
    output_dir = get_job_output_dir(job_id)
    shutil.copy2(str(file_path), str(output_dir / f"original.{ext}"))

    return {"job_id": job_id, "tool": "image_ocr", "status": "queued"}
