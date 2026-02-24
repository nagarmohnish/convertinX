import threading
import asyncio
from app.config import settings
from app.utils.language_map import LANGUAGES, get_opus_codes, OPUS_DIRECT_PAIRS


class ModelManager:
    """
    Singleton-pattern model cache.
    Whisper is loaded lazily on first use.
    Translation models are loaded lazily per language pair and cached.
    """

    def __init__(self):
        self._whisper_model = None
        self._translation_models: dict[str, tuple] = {}
        self._lock = threading.Lock()
        self._whisper_lock = threading.Lock()

    def get_whisper(self):
        """Load Whisper on first use and cache it."""
        if self._whisper_model is None:
            with self._whisper_lock:
                if self._whisper_model is None:
                    import whisper
                    print(f"Loading Whisper model: {settings.whisper_model_size}...")
                    self._whisper_model = whisper.load_model(
                        settings.whisper_model_size
                    )
                    print("Whisper model loaded.")
        return self._whisper_model

    def get_translation_model(self, src_lang: str, tgt_lang: str):
        """
        Load and cache a translation model for the given pair.
        Strategy:
          1. Try direct pair: Helsinki-NLP/opus-mt-{src}-{tgt}
          2. Fallback to facebook/mbart-large-50-many-to-many-mmt
        """
        src_opus, tgt_opus = get_opus_codes(src_lang, tgt_lang)
        pair_key = f"{src_opus}-{tgt_opus}"

        with self._lock:
            if pair_key not in self._translation_models:
                model, tokenizer, is_mbart = self._load_translation_pair(
                    src_lang, tgt_lang
                )
                self._translation_models[pair_key] = (model, tokenizer, is_mbart)

        return self._translation_models[pair_key]

    def _load_translation_pair(self, src: str, tgt: str):
        src_opus, tgt_opus = get_opus_codes(src, tgt)

        # Try Opus-MT first
        if (src_opus, tgt_opus) in OPUS_DIRECT_PAIRS:
            try:
                from transformers import MarianMTModel, MarianTokenizer

                model_name = f"Helsinki-NLP/opus-mt-{src_opus}-{tgt_opus}"
                print(f"Loading translation model: {model_name}...")
                tokenizer = MarianTokenizer.from_pretrained(model_name)
                model = MarianMTModel.from_pretrained(model_name)
                print(f"Translation model loaded: {model_name}")
                return model, tokenizer, False
            except Exception as e:
                print(f"Failed to load Opus-MT {src_opus}-{tgt_opus}: {e}")

        # Fallback: mBART-50
        print(f"Loading mBART-50 fallback for {src}-{tgt}...")
        from transformers import (
            MBartForConditionalGeneration,
            MBart50TokenizerFast,
        )

        model_name = "facebook/mbart-large-50-many-to-many-mmt"
        tokenizer = MBart50TokenizerFast.from_pretrained(model_name)
        model = MBartForConditionalGeneration.from_pretrained(model_name)
        print("mBART-50 loaded.")
        return model, tokenizer, True

    def unload_all(self):
        """Free all loaded models."""
        self._whisper_model = None
        self._translation_models.clear()
