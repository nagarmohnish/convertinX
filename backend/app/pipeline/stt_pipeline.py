import asyncio

from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.services.transcription import transcribe_audio
from app.utils.file_utils import get_job_output_dir
from app.utils.language_map import normalize_language
from app.utils.time_utils import seconds_to_srt_time


async def run_stt_pipeline(
    job_id: str,
    file_path: str | None,
    src_lang: str | None,
    params: dict,
    model_manager: ModelManager,
    progress: ProgressBroadcaster,
) -> dict:
    """Speech-to-Text pipeline: audio file -> transcript + subtitles."""
    if not file_path:
        raise ValueError("No audio file provided")

    await progress.broadcast(job_id, 0.1, "Transcribing", "Running Whisper...")

    segments = await asyncio.get_event_loop().run_in_executor(
        None, transcribe_audio, file_path, src_lang, model_manager
    )

    detected_lang = normalize_language(segments["language"])
    await progress.broadcast(
        job_id, 0.7, "Transcription complete",
        f"Detected: {detected_lang}, {len(segments['segments'])} segments"
    )

    output_dir = get_job_output_dir(job_id)

    # Full text
    full_text = "\n".join(seg["text"].strip() for seg in segments["segments"])
    text_path = output_dir / "transcript.txt"
    text_path.write_text(full_text, encoding="utf-8")

    # SRT subtitles
    srt_lines = []
    for i, seg in enumerate(segments["segments"], 1):
        start = seconds_to_srt_time(seg["start"])
        end = seconds_to_srt_time(seg["end"])
        srt_lines.append(f"{i}\n{start} --> {end}\n{seg['text']}\n")
    srt_path = output_dir / "transcript.srt"
    srt_path.write_text("\n".join(srt_lines), encoding="utf-8")

    await progress.broadcast(job_id, 0.9, "Finalizing")

    return {
        "transcript_file": f"/outputs/{job_id}/transcript.txt",
        "subtitle_file": f"/outputs/{job_id}/transcript.srt",
        "detected_language": detected_lang,
        "segment_count": len(segments["segments"]),
        "duration": segments.get("duration", 0),
        "text_preview": full_text[:500],
        "segments": [
            {"start": s["start"], "end": s["end"], "text": s["text"]}
            for s in segments["segments"]
        ],
    }
