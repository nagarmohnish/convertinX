import asyncio
from pathlib import Path
from app.utils.file_utils import get_job_output_dir


async def extract_audio(video_path: str, job_id: str) -> str:
    """Extract audio track from video as WAV (Whisper prefers WAV at 16kHz mono)."""
    output_dir = get_job_output_dir(job_id)
    output_path = output_dir / "extracted_audio.wav"

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(output_path),
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()

    if process.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {stderr.decode()}")

    return str(output_path)


async def burn_subtitles_and_replace_audio(
    original_video: str,
    dubbed_audio: str,
    subtitle_file: str,
    job_id: str,
    target_language: str,
) -> Path:
    """
    Final assembly: take original video (visuals only), replace audio with
    dubbed track, and burn ASS subtitles into the video.
    """
    output_dir = get_job_output_dir(job_id)
    output_path = output_dir / f"{target_language}_final.mp4"

    # On Windows, FFmpeg filter paths need forward slashes and escaped colons
    subtitle_filter_path = subtitle_file.replace("\\", "/")
    subtitle_filter_path = subtitle_filter_path.replace(":", "\\:")

    cmd = [
        "ffmpeg", "-y",
        "-i", original_video,
        "-i", dubbed_audio,
        "-filter_complex",
        f"[0:v]ass='{subtitle_filter_path}'[v]",
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        str(output_path),
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()

    if process.returncode != 0:
        raise RuntimeError(f"FFmpeg video assembly failed: {stderr.decode()}")

    return output_path
