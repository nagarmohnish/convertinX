import asyncio

from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.utils.file_utils import get_job_output_dir


async def run_audio_separate_pipeline(
    job_id: str,
    file_path: str | None,
    model_manager: ModelManager,
    progress: ProgressBroadcaster,
) -> dict:
    """Audio Separation pipeline: audio → vocals, drums, bass, other stems."""
    if not file_path:
        raise ValueError("No audio file provided")

    await progress.broadcast(
        job_id, 0.05, "Loading Demucs",
        "Preparing AI model for source separation..."
    )

    # Run separation (heavy — uses Demucs on CPU/GPU)
    from app.services.vocal_separator import separate_all_stems
    stems = await asyncio.get_event_loop().run_in_executor(
        None, separate_all_stems, file_path, job_id, model_manager
    )

    await progress.broadcast(job_id, 0.9, "Finalizing", "Exporting stems...")

    return {
        "vocals_file": f"/outputs/{job_id}/stem_vocals.wav",
        "drums_file": f"/outputs/{job_id}/stem_drums.wav",
        "bass_file": f"/outputs/{job_id}/stem_bass.wav",
        "other_file": f"/outputs/{job_id}/stem_other.wav",
        "sample_rate": stems["sample_rate"],
    }
