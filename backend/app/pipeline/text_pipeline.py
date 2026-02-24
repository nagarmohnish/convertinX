import asyncio
from pathlib import Path

from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.services.language_detect import detect_language
from app.services.translation import translate_text
from app.utils.file_utils import get_job_output_dir


async def run_text_pipeline(
    job_id: str,
    file_path: str,
    src_lang: str | None,
    tgt_langs: list[str],
    model_manager: ModelManager,
    progress: ProgressBroadcaster,
) -> dict:
    """Text pipeline: detect language -> translate -> save files."""

    await progress.broadcast(job_id, 0.05, "Reading file")
    text = Path(file_path).read_text(encoding="utf-8")

    # Auto-detect source language if not specified
    if not src_lang:
        await progress.broadcast(job_id, 0.10, "Detecting language")
        src_lang = detect_language(text)
        await progress.broadcast(job_id, 0.15, "Language detected", f"Detected: {src_lang}")

    results = {}
    for i, tgt_lang in enumerate(tgt_langs):
        pct = 0.15 + (0.80 * (i / len(tgt_langs)))
        await progress.broadcast(job_id, pct, f"Translating to {tgt_lang}")

        # Run translation in executor to avoid blocking event loop
        translated = await asyncio.get_event_loop().run_in_executor(
            None, translate_text, text, src_lang, tgt_lang, model_manager
        )

        # Save translated text
        output_dir = get_job_output_dir(job_id)
        output_path = output_dir / f"{tgt_lang}_translated.txt"
        output_path.write_text(translated, encoding="utf-8")

        results[tgt_lang] = {
            "text_file": f"/outputs/{job_id}/{tgt_lang}_translated.txt",
            "preview": translated[:500],
        }

    return results
