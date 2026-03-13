from pathlib import Path
from pydub import AudioSegment
from app.utils.file_utils import get_job_output_dir


async def mix_vocals_over_instrumental(
    job_id: str,
    target_language: str,
    tts_segments: list[dict],
    instrumental_path: str,
    total_duration: float,
    vocal_volume_db: float = 3.0,
    instrumental_volume_db: float = -2.0,
) -> Path:
    """
    Mix TTS vocal segments over the original instrumental track.

    Each TTS segment is placed at its original timestamp,
    then overlaid on the instrumental.
    """
    # Load instrumental
    instrumental = AudioSegment.from_file(instrumental_path)
    instrumental = instrumental + instrumental_volume_db

    # Match total duration
    target_ms = int(total_duration * 1000)
    if len(instrumental) < target_ms:
        instrumental = instrumental + AudioSegment.silent(
            duration=target_ms - len(instrumental)
        )
    elif len(instrumental) > target_ms:
        instrumental = instrumental[:target_ms]

    # Build vocal track from TTS segments
    vocal_track = AudioSegment.silent(duration=target_ms)

    for seg in tts_segments:
        segment_audio = AudioSegment.from_file(seg["path"])
        segment_audio = segment_audio + vocal_volume_db
        position_ms = int(seg["start"] * 1000)

        max_len = len(vocal_track) - position_ms
        if len(segment_audio) > max_len:
            segment_audio = segment_audio[:max_len]

        vocal_track = vocal_track.overlay(segment_audio, position=position_ms)

    # Overlay vocals on instrumental
    mixed = instrumental.overlay(vocal_track)

    # Export
    output_dir = get_job_output_dir(job_id)
    output_path = output_dir / f"{target_language}_singing_audio.mp3"
    mixed.export(str(output_path), format="mp3", bitrate="192k")
    return output_path
