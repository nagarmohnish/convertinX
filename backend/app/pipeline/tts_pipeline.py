import asyncio
import edge_tts
from pathlib import Path

from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.utils.file_utils import get_job_output_dir
from app.utils.language_map import LANGUAGES


async def run_tts_pipeline(
    job_id: str,
    params: dict,
    model_manager: ModelManager,
    progress: ProgressBroadcaster,
) -> dict:
    """Text-to-Speech pipeline: text + language → audio file."""
    text = params.get("text", "")
    language = params.get("language", "en")
    voice_gender = params.get("voice_gender", "female")

    if not text.strip():
        raise ValueError("No text provided")

    await progress.broadcast(job_id, 0.1, "Preparing", "Selecting voice...")

    # Get voice for language
    lang_data = LANGUAGES.get(language, LANGUAGES.get("en"))
    voices = lang_data.get("edge_tts_voices", {}) if lang_data else {}
    if voice_gender == "male":
        voice = voices.get("male", "en-US-GuyNeural")
    else:
        voice = voices.get("female", "en-US-JennyNeural")

    await progress.broadcast(job_id, 0.3, "Generating speech", f"Voice: {voice}")

    # Generate TTS
    output_dir = get_job_output_dir(job_id)
    output_path = output_dir / "tts_output.mp3"

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(output_path))

    await progress.broadcast(job_id, 0.9, "Finalizing")

    return {
        "audio_file": f"/outputs/{job_id}/tts_output.mp3",
        "voice": voice,
        "language": language,
        "text_length": len(text),
    }
