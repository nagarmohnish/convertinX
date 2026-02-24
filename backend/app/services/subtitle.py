from pathlib import Path
from app.utils.file_utils import get_job_output_dir
from app.utils.time_utils import seconds_to_ass_time, seconds_to_srt_time

ASS_HEADER = """[Script Info]
Title: ConvertinX Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,20,20,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"""


def generate_ass_subtitles(
    job_id: str,
    target_language: str,
    segments: list[dict],
) -> Path:
    """Generate an ASS subtitle file from translated segments."""
    lines = [ASS_HEADER]

    for seg in segments:
        start_ass = seconds_to_ass_time(seg["start"])
        end_ass = seconds_to_ass_time(seg["end"])

        # Escape special ASS characters
        text = seg["text"].replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")

        # Line break if text is long (>40 chars) at a natural break point
        if len(text) > 40:
            mid = len(text) // 2
            space_pos = text.rfind(" ", 0, mid + 10)
            if space_pos > mid - 10:
                text = text[:space_pos] + "\\N" + text[space_pos + 1:]

        lines.append(
            f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{text}"
        )

    output_dir = get_job_output_dir(job_id)
    output_path = output_dir / f"{target_language}_subtitles.ass"
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return output_path


def generate_srt_subtitles(
    job_id: str,
    target_language: str,
    segments: list[dict],
) -> Path:
    """Generate an SRT subtitle file for user download."""
    lines = []
    for i, seg in enumerate(segments, 1):
        start = seconds_to_srt_time(seg["start"])
        end = seconds_to_srt_time(seg["end"])
        lines.append(f"{i}\n{start} --> {end}\n{seg['text']}\n")

    output_dir = get_job_output_dir(job_id)
    output_path = output_dir / f"{target_language}_subtitles.srt"
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return output_path
