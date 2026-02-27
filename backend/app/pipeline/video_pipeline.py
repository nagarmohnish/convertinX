import asyncio

from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.services.video import extract_audio, burn_subtitles_and_replace_audio
from app.services.transcription import transcribe_audio
from app.services.translation import translate_text
from app.utils.language_map import normalize_language
from app.services.tts import generate_tts_for_segments
from app.services.audio import merge_audio_segments
from app.services.subtitle import generate_ass_subtitles, generate_srt_subtitles


async def run_video_pipeline(
    job_id: str,
    file_path: str,
    src_lang: str | None,
    tgt_langs: list[str],
    model_manager: ModelManager,
    progress: ProgressBroadcaster,
) -> dict:
    """Video pipeline: extract audio -> transcribe -> translate -> TTS -> subs -> burn."""

    # Step 1: Extract audio from video
    await progress.broadcast(job_id, 0.02, "Extracting audio from video")
    audio_path = await extract_audio(file_path, job_id)

    # Step 2: Transcribe
    await progress.broadcast(job_id, 0.05, "Transcribing audio", "Running Whisper...")
    segments = await asyncio.get_event_loop().run_in_executor(
        None, transcribe_audio, audio_path, src_lang, model_manager
    )
    src_lang = src_lang or normalize_language(segments["language"])
    await progress.broadcast(
        job_id, 0.20, "Transcription complete",
        f"Detected: {src_lang}, {len(segments['segments'])} segments"
    )

    results = {}
    per_lang_weight = 0.75 / len(tgt_langs)

    for i, tgt_lang in enumerate(tgt_langs):
        base = 0.20 + (per_lang_weight * i)

        # Step 3: Translate each segment
        await progress.broadcast(job_id, base, f"Translating to {tgt_lang}")
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
                "words": seg.get("words", []),
            })

        # Step 4: Generate TTS for each segment
        await progress.broadcast(
            job_id, base + per_lang_weight * 0.3,
            f"Generating speech ({tgt_lang})"
        )
        tts_segments = await generate_tts_for_segments(translated_segments, tgt_lang)

        # Step 5: Merge TTS into single audio track
        await progress.broadcast(
            job_id, base + per_lang_weight * 0.5,
            f"Assembling audio ({tgt_lang})"
        )
        dubbed_audio = await merge_audio_segments(
            job_id, tgt_lang, tts_segments, segments["duration"]
        )

        # Step 6: Generate subtitles (ASS for burning, SRT for download)
        await progress.broadcast(
            job_id, base + per_lang_weight * 0.65,
            f"Generating subtitles ({tgt_lang})"
        )
        subtitle_ass = generate_ass_subtitles(job_id, tgt_lang, translated_segments)
        subtitle_srt = generate_srt_subtitles(job_id, tgt_lang, translated_segments)

        # Step 7: Burn subtitles + replace audio -> final video
        await progress.broadcast(
            job_id, base + per_lang_weight * 0.8,
            f"Rendering final video ({tgt_lang})"
        )
        final_video = await burn_subtitles_and_replace_audio(
            original_video=file_path,
            dubbed_audio=str(dubbed_audio),
            subtitle_file=str(subtitle_ass),
            job_id=job_id,
            target_language=tgt_lang,
        )

        results[tgt_lang] = {
            "video_file": f"/outputs/{job_id}/{tgt_lang}_final.mp4",
            "subtitle_file": f"/outputs/{job_id}/{tgt_lang}_subtitles.srt",
            "audio_file": f"/outputs/{job_id}/{tgt_lang}_audio.mp3",
        }

    return results
