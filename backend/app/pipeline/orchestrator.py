import asyncio
import json
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.models.schemas import JobStatus, ContentType, ToolType, JobResponse
from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.db.models import Job as JobDB
from app.config import settings


def _resolve_tool(content_type: ContentType, singing_mode: bool = False) -> ToolType:
    """Map legacy content_type + singing_mode to ToolType."""
    if content_type == ContentType.TEXT:
        return ToolType.TRANSLATE_TEXT
    elif content_type == ContentType.AUDIO and singing_mode:
        return ToolType.TRANSLATE_SINGING
    elif content_type == ContentType.AUDIO:
        return ToolType.TRANSLATE_AUDIO
    elif content_type == ContentType.VIDEO:
        return ToolType.TRANSLATE_VIDEO
    elif content_type == ContentType.DOCUMENT:
        return ToolType.DOC_TRANSLATE
    elif content_type == ContentType.IMAGE:
        return ToolType.IMAGE_OCR
    raise ValueError(f"Cannot resolve tool for content_type={content_type}")


class JobOrchestrator:
    """
    Manages job lifecycle. Runs pipelines in background asyncio tasks.
    Active jobs kept in-memory for fast WebSocket updates.
    Completed/failed jobs persisted to DB.
    """

    def __init__(
        self,
        model_manager: ModelManager,
        broadcaster: ProgressBroadcaster,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
    ):
        self.active_jobs: dict[str, JobResponse] = {}
        self.model_manager = model_manager
        self.broadcaster = broadcaster
        self.session_factory = session_factory
        self._semaphore = asyncio.Semaphore(settings.max_concurrent_jobs)

    # ── Legacy submit (used by existing /api/upload) ──

    async def submit_job(
        self,
        file_path: str,
        content_type: ContentType,
        source_language: str | None,
        target_languages: list[str],
        singing_mode: bool = False,
        user_id: str | None = None,
    ) -> str:
        tool = _resolve_tool(content_type, singing_mode)
        return await self.submit_tool_job(
            tool=tool,
            content_type=content_type,
            file_path=file_path,
            source_language=source_language,
            target_languages=target_languages,
            singing_mode=singing_mode,
            user_id=user_id,
        )

    # ── Tool-based submit (new unified method) ──

    async def submit_tool_job(
        self,
        tool: ToolType,
        content_type: ContentType,
        file_path: str | None = None,
        source_language: str | None = None,
        target_languages: list[str] | None = None,
        singing_mode: bool = False,
        user_id: str | None = None,
        extra_params: dict | None = None,
    ) -> str:
        job_id = str(uuid.uuid4())
        now = datetime.utcnow()

        job = JobResponse(
            job_id=job_id,
            status=JobStatus.QUEUED,
            tool=tool,
            content_type=content_type,
            source_language=source_language,
            target_languages=target_languages or [],
            progress=0.0,
            current_step="Queued",
            created_at=now,
            singing_mode=singing_mode,
        )
        self.active_jobs[job_id] = job

        # Persist to DB
        input_meta = {
            "file_path": file_path,
            "content_type": content_type.value,
            "source_language": source_language,
            "target_languages": target_languages or [],
            "singing_mode": singing_mode,
        }
        if extra_params:
            input_meta.update(extra_params)

        await self._db_create_job(job_id, tool, input_meta, file_path, user_id, now)

        asyncio.create_task(
            self._run_job(
                job_id, tool, file_path, source_language,
                target_languages or [], singing_mode, extra_params or {},
            )
        )
        return job_id

    def get_job(self, job_id: str) -> JobResponse | None:
        """Check active jobs first (fast path), then return None (DB queried in router)."""
        return self.active_jobs.get(job_id)

    async def get_job_from_db(self, job_id: str) -> JobResponse | None:
        """Load a completed/historical job from the database."""
        if not self.session_factory:
            return None
        async with self.session_factory() as db:
            result = await db.execute(select(JobDB).where(JobDB.id == job_id))
            row = result.scalar_one_or_none()
            if not row:
                return None
            return JobResponse(
                job_id=row.id,
                status=JobStatus(row.status),
                tool=ToolType(row.tool),
                content_type=ContentType(
                    json.loads(row.input_meta).get("content_type", "text")
                ) if row.input_meta else ContentType.TEXT,
                source_language=json.loads(row.input_meta).get("source_language") if row.input_meta else None,
                target_languages=json.loads(row.input_meta).get("target_languages", []) if row.input_meta else [],
                progress=row.progress or 0.0,
                current_step=row.current_step or "",
                created_at=row.created_at or datetime.utcnow(),
                results=json.loads(row.output_meta) if row.output_meta else None,
                singing_mode=json.loads(row.input_meta).get("singing_mode", False) if row.input_meta else False,
            )

    # ── Pipeline execution ──

    async def _run_job(
        self,
        job_id: str,
        tool: ToolType,
        file_path: str | None,
        src_lang: str | None,
        tgt_langs: list[str],
        singing_mode: bool = False,
        extra_params: dict | None = None,
    ):
        async with self._semaphore:
            job = self.active_jobs[job_id]
            job.status = JobStatus.PROCESSING
            job.current_step = "Starting..."
            await self._db_update_status(job_id, "processing", started=True)

            try:
                results = await self._dispatch_pipeline(
                    tool, job_id, file_path, src_lang, tgt_langs,
                    singing_mode, extra_params or {},
                )

                job.status = JobStatus.COMPLETED
                job.results = results
                job.progress = 1.0
                job.current_step = "Completed"
                await self.broadcaster.broadcast(job_id, 1.0, "Completed")
                await self._db_complete_job(job_id, results)

            except Exception as e:
                job.status = JobStatus.FAILED
                job.current_step = f"Error: {str(e)}"
                await self.broadcaster.broadcast(job_id, -1, "Failed", str(e))
                await self._db_fail_job(job_id, str(e))
                print(f"Job {job_id} failed: {e}")
                import traceback
                traceback.print_exc()

    async def _dispatch_pipeline(
        self,
        tool: ToolType,
        job_id: str,
        file_path: str | None,
        src_lang: str | None,
        tgt_langs: list[str],
        singing_mode: bool,
        extra_params: dict,
    ) -> dict:
        if tool == ToolType.TRANSLATE_TEXT:
            from app.pipeline.text_pipeline import run_text_pipeline
            return await run_text_pipeline(
                job_id, file_path, src_lang, tgt_langs,
                self.model_manager, self.broadcaster,
            )
        elif tool == ToolType.TRANSLATE_SINGING:
            from app.pipeline.singing_pipeline import run_singing_pipeline
            return await run_singing_pipeline(
                job_id, file_path, src_lang, tgt_langs,
                self.model_manager, self.broadcaster,
            )
        elif tool == ToolType.TRANSLATE_AUDIO:
            from app.pipeline.audio_pipeline import run_audio_pipeline
            return await run_audio_pipeline(
                job_id, file_path, src_lang, tgt_langs,
                self.model_manager, self.broadcaster,
            )
        elif tool == ToolType.TRANSLATE_VIDEO:
            from app.pipeline.video_pipeline import run_video_pipeline
            return await run_video_pipeline(
                job_id, file_path, src_lang, tgt_langs,
                self.model_manager, self.broadcaster,
            )
        # New tools — will be implemented in Phase 3/4
        elif tool == ToolType.TEXT_TO_SPEECH:
            from app.pipeline.tts_pipeline import run_tts_pipeline
            return await run_tts_pipeline(
                job_id, extra_params, self.model_manager, self.broadcaster,
            )
        elif tool == ToolType.SPEECH_TO_TEXT:
            from app.pipeline.stt_pipeline import run_stt_pipeline
            return await run_stt_pipeline(
                job_id, file_path, src_lang, extra_params,
                self.model_manager, self.broadcaster,
            )
        elif tool == ToolType.AUDIO_SEPARATE:
            from app.pipeline.audio_separate_pipeline import run_audio_separate_pipeline
            return await run_audio_separate_pipeline(
                job_id, file_path, self.model_manager, self.broadcaster,
            )
        elif tool == ToolType.DOC_TRANSLATE:
            from app.pipeline.doc_translate_pipeline import run_doc_translate_pipeline
            return await run_doc_translate_pipeline(
                job_id, file_path, src_lang, tgt_langs,
                self.model_manager, self.broadcaster,
            )
        elif tool == ToolType.IMAGE_OCR:
            from app.pipeline.image_ocr_pipeline import run_image_ocr_pipeline
            return await run_image_ocr_pipeline(
                job_id, file_path, src_lang, tgt_langs,
                self.model_manager, self.broadcaster,
            )
        else:
            raise ValueError(f"Unknown tool: {tool}")

    # ── DB helpers ──

    async def _db_create_job(
        self, job_id: str, tool: ToolType, input_meta: dict,
        file_path: str | None, user_id: str | None, created_at: datetime,
    ):
        if not self.session_factory:
            return
        async with self.session_factory() as db:
            db.add(JobDB(
                id=job_id,
                user_id=user_id,
                tool=tool.value,
                status="queued",
                input_meta=json.dumps(input_meta),
                input_file_path=file_path,
                created_at=created_at,
            ))
            await db.commit()

    async def _db_update_status(self, job_id: str, status: str, started: bool = False):
        if not self.session_factory:
            return
        async with self.session_factory() as db:
            result = await db.execute(select(JobDB).where(JobDB.id == job_id))
            row = result.scalar_one_or_none()
            if row:
                row.status = status
                if started:
                    row.started_at = datetime.utcnow()
                await db.commit()

    async def _db_complete_job(self, job_id: str, results: dict):
        if not self.session_factory:
            return
        async with self.session_factory() as db:
            result = await db.execute(select(JobDB).where(JobDB.id == job_id))
            row = result.scalar_one_or_none()
            if row:
                row.status = "completed"
                row.progress = 1.0
                row.current_step = "Completed"
                row.output_meta = json.dumps(results)
                row.completed_at = datetime.utcnow()
                await db.commit()

    async def _db_fail_job(self, job_id: str, error: str):
        if not self.session_factory:
            return
        async with self.session_factory() as db:
            result = await db.execute(select(JobDB).where(JobDB.id == job_id))
            row = result.scalar_one_or_none()
            if row:
                row.status = "failed"
                row.current_step = f"Error: {error}"
                row.error_message = error
                row.completed_at = datetime.utcnow()
                await db.commit()
