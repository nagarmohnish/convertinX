from langdetect import detect


def detect_language(text: str) -> str:
    """Detect language from text. Returns ISO 639-1 code like 'en', 'es', 'fr'."""
    code = detect(text)
    # langdetect returns 'zh-cn'/'zh-tw' for Chinese, normalize to 'zh'
    if code.startswith("zh"):
        return "zh"
    return code
