LANGUAGES = {
    "en": {
        "name": "English",
        "flag": "\U0001f1fa\U0001f1f8",
        "whisper_code": "en",
        "opus_code": "en",
        "mbart_code": "en_XX",
        "edge_tts_voices": {
            "male": "en-US-GuyNeural",
            "female": "en-US-JennyNeural",
        },
    },
    "hi": {
        "name": "Hindi",
        "flag": "\U0001f1ee\U0001f1f3",
        "whisper_code": "hi",
        "opus_code": "hi",
        "mbart_code": "hi_IN",
        "edge_tts_voices": {
            "male": "hi-IN-MadhurNeural",
            "female": "hi-IN-SwaraNeural",
        },
    },
    "es": {
        "name": "Spanish",
        "flag": "\U0001f1ea\U0001f1f8",
        "whisper_code": "es",
        "opus_code": "es",
        "mbart_code": "es_XX",
        "edge_tts_voices": {
            "male": "es-ES-AlvaroNeural",
            "female": "es-ES-ElviraNeural",
        },
    },
    "fr": {
        "name": "French",
        "flag": "\U0001f1eb\U0001f1f7",
        "whisper_code": "fr",
        "opus_code": "fr",
        "mbart_code": "fr_XX",
        "edge_tts_voices": {
            "male": "fr-FR-HenriNeural",
            "female": "fr-FR-DeniseNeural",
        },
    },
    "de": {
        "name": "German",
        "flag": "\U0001f1e9\U0001f1ea",
        "whisper_code": "de",
        "opus_code": "de",
        "mbart_code": "de_DE",
        "edge_tts_voices": {
            "male": "de-DE-ConradNeural",
            "female": "de-DE-KatjaNeural",
        },
    },
    "ja": {
        "name": "Japanese",
        "flag": "\U0001f1ef\U0001f1f5",
        "whisper_code": "ja",
        "opus_code": "jap",
        "mbart_code": "ja_XX",
        "edge_tts_voices": {
            "male": "ja-JP-KeitaNeural",
            "female": "ja-JP-NanamiNeural",
        },
    },
    "ar": {
        "name": "Arabic",
        "flag": "\U0001f1f8\U0001f1e6",
        "whisper_code": "ar",
        "opus_code": "ar",
        "mbart_code": "ar_AR",
        "edge_tts_voices": {
            "male": "ar-SA-HamedNeural",
            "female": "ar-SA-ZariyahNeural",
        },
    },
    "pt": {
        "name": "Portuguese",
        "flag": "\U0001f1e7\U0001f1f7",
        "whisper_code": "pt",
        "opus_code": "pt",
        "mbart_code": "pt_XX",
        "edge_tts_voices": {
            "male": "pt-BR-AntonioNeural",
            "female": "pt-BR-FranciscaNeural",
        },
    },
    "zh": {
        "name": "Chinese",
        "flag": "\U0001f1e8\U0001f1f3",
        "whisper_code": "zh",
        "opus_code": "zh",
        "mbart_code": "zh_CN",
        "edge_tts_voices": {
            "male": "zh-CN-YunxiNeural",
            "female": "zh-CN-XiaoxiaoNeural",
        },
    },
    "ko": {
        "name": "Korean",
        "flag": "\U0001f1f0\U0001f1f7",
        "whisper_code": "ko",
        "opus_code": "ko",
        "mbart_code": "ko_KR",
        "edge_tts_voices": {
            "male": "ko-KR-InJoonNeural",
            "female": "ko-KR-SunHiNeural",
        },
    },
}

# Known direct Opus-MT pairs (verified on HuggingFace)
OPUS_DIRECT_PAIRS = {
    ("en", "es"), ("es", "en"),
    ("en", "fr"), ("fr", "en"),
    ("en", "de"), ("de", "en"),
    ("en", "zh"), ("zh", "en"),
    ("en", "jap"), ("jap", "en"),
    ("en", "ar"), ("ar", "en"),
    ("en", "pt"), ("pt", "en"),
    ("en", "hi"), ("hi", "en"),
    ("en", "ko"), ("ko", "en"),
    ("es", "fr"), ("fr", "es"),
    ("es", "de"), ("de", "es"),
    ("es", "pt"), ("pt", "es"),
    ("fr", "de"), ("de", "fr"),
}


def get_opus_codes(src: str, tgt: str) -> tuple[str, str]:
    """Convert language codes to Opus-MT specific codes."""
    src_opus = LANGUAGES[src]["opus_code"]
    tgt_opus = LANGUAGES[tgt]["opus_code"]
    return src_opus, tgt_opus


def needs_pivot(src: str, tgt: str) -> bool:
    """Check if translation needs to pivot through English."""
    src_opus, tgt_opus = get_opus_codes(src, tgt)
    return (src_opus, tgt_opus) not in OPUS_DIRECT_PAIRS


def get_pivot_chain(src: str, tgt: str) -> list[tuple[str, str]]:
    """Return the chain of translation pairs needed."""
    if not needs_pivot(src, tgt):
        return [(src, tgt)]
    # Pivot through English
    if src == "en":
        return [(src, tgt)]
    if tgt == "en":
        return [(src, tgt)]
    return [(src, "en"), ("en", tgt)]


def get_language_list() -> list[dict]:
    """Return language list for the API."""
    return [
        {"code": code, "name": info["name"], "flag": info["flag"]}
        for code, info in LANGUAGES.items()
    ]
