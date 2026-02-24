import edge_tts
import asyncio
import tempfile
import subprocess
from pathlib import Path
from pydub import AudioSegment
from app.utils.language_map import LANGUAGES


async def generate_tts_for_segments(
    translated_segments: list[dict],
    target_language: str,
    voice_gender: str = "female",
) -> list[dict]:
    """
    Generate TTS audio for each segment, adjusting rate to match original duration.
    Returns list of {path, start, end, text}.
    """
    voice = LANGUAGES[target_language]["edge_tts_voices"][voice_gender]
    results = []

    for seg in translated_segments:
        target_duration = seg["original_duration"]
        tts_path = await _generate_single_tts(
            text=seg["text"],
            voice=voice,
            target_duration=target_duration,
        )
        results.append({
            "path": tts_path,
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"],
        })

    return results


async def _generate_single_tts(
    text: str, voice: str, target_duration: float
) -> str:
    """
    Generate TTS and adjust playback rate to match target_duration.

    Three-tier strategy:
      1. Pre-adjust Edge TTS rate based on text length heuristic
      2. Post-adjust with FFmpeg atempo if still >10% off
      3. Pad with silence if too short
    """
    if not text.strip():
        # Empty text — return silence
        tmp_path = tempfile.mktemp(suffix=".mp3")
        silence = AudioSegment.silent(duration=int(target_duration * 1000))
        silence.export(tmp_path, format="mp3")
        return tmp_path

    # Estimate natural TTS duration and compute rate adjustment
    rate_str = _compute_rate_string(text, target_duration)

    # Generate TTS
    tmp_path = tempfile.mktemp(suffix=".mp3")
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate_str)
    await communicate.save(tmp_path)

    # Check actual duration and fine-tune
    audio = AudioSegment.from_file(tmp_path)
    actual_duration = len(audio) / 1000.0

    if target_duration <= 0:
        return tmp_path

    duration_ratio = actual_duration / target_duration

    if duration_ratio > 1.10:
        # Audio is too long — speed it up with FFmpeg atempo
        return _speed_up_audio(tmp_path, duration_ratio)
    elif duration_ratio < 0.90:
        # Audio is too short — pad with silence
        return _pad_with_silence(tmp_path, audio, target_duration, actual_duration)

    return tmp_path


def _compute_rate_string(text: str, target_duration: float) -> str:
    """Compute Edge TTS rate parameter based on text/duration heuristic."""
    word_count = len(text.split())
    # Average speaking rate ~2.5 words/sec
    estimated_natural_duration = word_count / 2.5

    if target_duration <= 0 or estimated_natural_duration <= 0:
        return "+0%"

    ratio = estimated_natural_duration / target_duration

    if ratio > 1.5:
        return "+100%"
    elif ratio > 1.0:
        rate_pct = int((ratio - 1.0) * 100)
        return f"+{rate_pct}%"
    elif ratio < 0.7:
        rate_pct = int((1.0 - ratio) * 100)
        return f"-{min(rate_pct, 50)}%"
    else:
        return "+0%"


def _speed_up_audio(tmp_path: str, duration_ratio: float) -> str:
    """Speed up audio using FFmpeg atempo filter."""
    adjusted_path = tempfile.mktemp(suffix=".mp3")
    atempo = min(duration_ratio, 2.0)

    subprocess.run(
        [
            "ffmpeg", "-y", "-i", tmp_path,
            "-filter:a", f"atempo={atempo}",
            "-loglevel", "error",
            adjusted_path,
        ],
        capture_output=True,
    )
    return adjusted_path


def _pad_with_silence(
    tmp_path: str,
    audio: AudioSegment,
    target_duration: float,
    actual_duration: float,
) -> str:
    """Pad audio with silence to match target duration."""
    silence_ms = int((target_duration - actual_duration) * 1000)
    padded = audio + AudioSegment.silent(duration=silence_ms)
    padded_path = tempfile.mktemp(suffix=".mp3")
    padded.export(padded_path, format="mp3")
    return padded_path
