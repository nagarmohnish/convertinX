import asyncio

from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.services.transcription import transcribe_audio
from app.services.translation import translate_text
from app.services.tts import generate_tts_for_segments
from app.services.audio import merge_audio_segments


async def run_audio_pipeline(
    job_id: str,
    file_path: str,
    src_lang: str | None,
    tgt_langs: list[str],
    model_manager: ModelManager,
    progress: ProgressBroadcaster,
) -> dict:
    """Audio pipeline: transcribe -> translate -> TTS -> merge."""

    # Step 1: Transcribe with Whisper
    await progress.broadcast(job_id, 0.05, "Transcribing audio", "Running Whisper...")
    segments = await asyncio.get_event_loop().run_in_executor(
        None, transcribe_audio, file_path, src_lang, model_manager
    )

    detected_lang = segments["language"]
    src_lang = src_lang or detected_lang
    await progress.broadcast(
        job_id, 0.25, "Transcription complete",
        f"Detected: {detected_lang}, {len(segments['segments'])} segments"
    )

    results = {}
    per_lang_weight = 0.70 / len(tgt_langs)

    for i, tgt_lang in enumerate(tgt_langs):
        base = 0.25 + (per_lang_weight * i)

        # Step 2: Translate each segment
        await progress.broadcast(job_id, base + 0.05, f"Translating to {tgt_lang}")
        translated_segments = []
        for seg in segments["segments"]:
            translated_text = await asyncio.get_event_loop().run_in_executor(
                None, translate_text, seg["text"], src_lang, tgt_lang, model_manager
            )
            translated_segments.append({
                "start": seg["start"],
                "end": seg["end"],
                "text": translated_text,
                "original_duration": seg["end"] - seg["start"],
            })

        # Step 3: Generate TTS for each segment
        await progress.broadcast(
            job_id, base + per_lang_weight * 0.5,
            f"Generating speech ({tgt_lang})"
        )
        tts_segments = await generate_tts_for_segments(translated_segments, tgt_lang)

        # Step 4: Merge audio with original timing
        await progress.broadcast(
            job_id, base + per_lang_weight * 0.8,
            f"Assembling audio ({tgt_lang})"
        )
        output_path = await merge_audio_segments(
            job_id, tgt_lang, tts_segments, total_duration=segments["duration"]
        )

        results[tgt_lang] = {
            "audio_file": f"/outputs/{job_id}/{tgt_lang}_audio.mp3",
            "transcript": [s["text"] for s in translated_segments],
        }

    return results
