from langdetect import detect
from app.utils.language_map import normalize_language


def detect_language(text: str) -> str:
    """Detect language from text. Returns a supported language code."""
    code = detect(text)
    if code.startswith("zh"):
        return "zh"
    return normalize_language(code)
