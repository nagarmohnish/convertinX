from app.models.model_manager import ModelManager


def transcribe_audio(
    file_path: str, src_lang: str | None, model_manager: ModelManager
) -> dict:
    """
    Transcribe audio with Whisper, returning segments with word-level timestamps.
    """
    model = model_manager.get_whisper()

    options = {
        "word_timestamps": True,
        "verbose": False,
    }
    if src_lang:
        options["language"] = src_lang

    result = model.transcribe(file_path, **options)

    segments = result.get("segments", [])
    duration = segments[-1]["end"] if segments else 0

    return {
        "language": result.get("language", "en"),
        "duration": duration,
        "segments": [
            {
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"].strip(),
                "words": seg.get("words", []),
            }
            for seg in segments
        ],
    }
