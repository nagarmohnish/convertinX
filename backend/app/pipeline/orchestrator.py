import asyncio
import uuid
from datetime import datetime

from app.models.schemas import JobStatus, ContentType, JobResponse
from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.config import settings


class JobOrchestrator:
    """
    Manages job lifecycle. Runs pipelines in background asyncio tasks.
    Uses a semaphore to limit concurrent jobs.
    """

    def __init__(self, model_manager: ModelManager, broadcaster: ProgressBroadcaster):
        self.jobs: dict[str, JobResponse] = {}
        self.model_manager = model_manager
        self.broadcaster = broadcaster
        self._semaphore = asyncio.Semaphore(settings.max_concurrent_jobs)

    async def submit_job(
        self,
        file_path: str,
        content_type: ContentType,
        source_language: str | None,
        target_languages: list[str],
    ) -> str:
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = JobResponse(
            job_id=job_id,
            status=JobStatus.QUEUED,
            content_type=content_type,
            source_language=source_language,
            target_languages=target_languages,
            progress=0.0,
            current_step="Queued",
            created_at=datetime.utcnow(),
        )
        asyncio.create_task(
            self._run_job(job_id, file_path, content_type, source_language, target_languages)
        )
        return job_id

    def get_job(self, job_id: str) -> JobResponse | None:
        return self.jobs.get(job_id)

    async def _run_job(
        self,
        job_id: str,
        file_path: str,
        content_type: ContentType,
        src_lang: str | None,
        tgt_langs: list[str],
    ):
        async with self._semaphore:
            job = self.jobs[job_id]
            job.status = JobStatus.PROCESSING
            job.current_step = "Starting..."

            try:
                if content_type == ContentType.TEXT:
                    from app.pipeline.text_pipeline import run_text_pipeline
                    results = await run_text_pipeline(
                        job_id, file_path, src_lang, tgt_langs,
                        self.model_manager, self.broadcaster,
                    )
                elif content_type == ContentType.AUDIO:
                    from app.pipeline.audio_pipeline import run_audio_pipeline
                    results = await run_audio_pipeline(
                        job_id, file_path, src_lang, tgt_langs,
                        self.model_manager, self.broadcaster,
                    )
                elif content_type == ContentType.VIDEO:
                    from app.pipeline.video_pipeline import run_video_pipeline
                    results = await run_video_pipeline(
                        job_id, file_path, src_lang, tgt_langs,
                        self.model_manager, self.broadcaster,
                    )
                else:
                    raise ValueError(f"Unknown content type: {content_type}")

                job.status = JobStatus.COMPLETED
                job.results = results
                job.progress = 1.0
                job.current_step = "Completed"
                await self.broadcaster.broadcast(job_id, 1.0, "Completed")

            except Exception as e:
                job.status = JobStatus.FAILED
                job.current_step = f"Error: {str(e)}"
                await self.broadcaster.broadcast(job_id, -1, "Failed", str(e))
                print(f"Job {job_id} failed: {e}")
                import traceback
                traceback.print_exc()
