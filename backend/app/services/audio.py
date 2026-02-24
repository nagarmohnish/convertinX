from pathlib import Path
from pydub import AudioSegment
from app.utils.file_utils import get_job_output_dir


async def merge_audio_segments(
    job_id: str,
    target_language: str,
    tts_segments: list[dict],
    total_duration: float,
) -> Path:
    """
    Merge individual TTS segment audio files into a single audio track,
    placing each segment at its original start time.
    Gaps are filled with silence.
    """
    # Create a silent base track matching original duration
    base = AudioSegment.silent(duration=int(total_duration * 1000))

    for seg in tts_segments:
        segment_audio = AudioSegment.from_file(seg["path"])
        position_ms = int(seg["start"] * 1000)

        # Ensure we don't exceed the base track length
        max_len = len(base) - position_ms
        if len(segment_audio) > max_len:
            segment_audio = segment_audio[:max_len]

        # Overlay the TTS audio at the correct position
        base = base.overlay(segment_audio, position=position_ms)

    output_dir = get_job_output_dir(job_id)
    output_path = output_dir / f"{target_language}_audio.mp3"
    base.export(str(output_path), format="mp3")
    return output_path
