import asyncio

from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.services.transcription import transcribe_audio
from app.services.translation import translate_text
from app.services.tts import generate_tts_for_segments
from app.services.vocal_separator import separate_vocals
from app.services.audio_mixer import mix_vocals_over_instrumental
from app.utils.language_map import normalize_language


async def run_singing_pipeline(
    job_id: str,
    file_path: str,
    src_lang: str | None,
    tgt_langs: list[str],
    model_manager: ModelManager,
    progress: ProgressBroadcaster,
) -> dict:
    """
    Singing pipeline: separate vocals → transcribe → translate → TTS → mix over instrumental.
    """

    # Step 1: Separate vocals from instrumental using Demucs
    await progress.broadcast(
        job_id, 0.02, "Separating vocals",
        "Running Demucs... this may take a few minutes on CPU"
    )
    separation = await asyncio.get_event_loop().run_in_executor(
        None, separate_vocals, file_path, job_id, model_manager
    )
    vocals_path = separation["vocals_path"]
    instrumental_path = separation["instrumental_path"]

    await progress.broadcast(
        job_id, 0.20, "Vocals separated",
        "Isolated vocal and instrumental tracks"
    )

    # Step 2: Transcribe the isolated vocals
    await progress.broadcast(
        job_id, 0.22, "Transcribing lyrics",
        "Running Whisper on isolated vocals..."
    )
    segments = await asyncio.get_event_loop().run_in_executor(
        None, transcribe_audio, vocals_path, src_lang, model_manager
    )

    detected_lang = normalize_language(segments["language"])
    src_lang = src_lang or detected_lang
    await progress.broadcast(
        job_id, 0.35, "Lyrics transcribed",
        f"Detected: {detected_lang}, {len(segments['segments'])} segments"
    )

    results = {}
    per_lang_weight = 0.60 / len(tgt_langs)

    for i, tgt_lang in enumerate(tgt_langs):
        base = 0.35 + (per_lang_weight * i)

        # Step 3: Translate each lyric segment
        await progress.broadcast(job_id, base, f"Translating lyrics to {tgt_lang}")
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

        # Step 4: Generate TTS for translated lyrics
        await progress.broadcast(
            job_id, base + per_lang_weight * 0.4,
            f"Generating vocal track ({tgt_lang})"
        )
        tts_segments = await generate_tts_for_segments(
            translated_segments, tgt_lang
        )

        # Step 5: Mix TTS vocals over original instrumental
        await progress.broadcast(
            job_id, base + per_lang_weight * 0.7,
            f"Mixing vocals with instrumental ({tgt_lang})"
        )
        output_path = await mix_vocals_over_instrumental(
            job_id=job_id,
            target_language=tgt_lang,
            tts_segments=tts_segments,
            instrumental_path=instrumental_path,
            total_duration=segments["duration"],
        )

        results[tgt_lang] = {
            "audio_file": f"/outputs/{job_id}/{tgt_lang}_singing_audio.mp3",
            "transcript": [s["text"] for s in translated_segments],
        }

    return results
