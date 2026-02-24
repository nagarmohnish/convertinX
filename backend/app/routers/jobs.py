from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from app.dependencies import get_orchestrator
from app.config import settings

router = APIRouter()


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Get the status of a job."""
    orchestrator = get_orchestrator()
    job = orchestrator.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job.model_dump()


@router.get("/jobs/{job_id}/download/{lang}/{file_type}")
async def download_file(job_id: str, lang: str, file_type: str):
    """Download a specific output file from a completed job."""
    orchestrator = get_orchestrator()
    job = orchestrator.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    if not job.results or lang not in job.results:
        raise HTTPException(404, "Result not found for this language")

    lang_results = job.results[lang]
    url_path = lang_results.get(file_type)
    if not url_path:
        raise HTTPException(404, f"File type '{file_type}' not found")

    # Convert URL path to filesystem path
    # URL looks like: /outputs/{job_id}/filename.ext
    file_path = settings.output_dir / url_path.replace("/outputs/", "")
    if not file_path.exists():
        raise HTTPException(404, "File not found on disk")

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream",
    )
