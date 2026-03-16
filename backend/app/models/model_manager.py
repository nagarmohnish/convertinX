import threading
import asyncio
from app.config import settings
from app.utils.language_map import LANGUAGES, get_opus_codes, OPUS_DIRECT_PAIRS


class ModelManager:
    """
    Singleton-pattern model cache.
    Whisper is loaded lazily on first use.
    Translation models are loaded lazily per language pair and cached.
    Priority: Opus-MT (direct pairs) -> NLLB-200 -> mBART-50
    """

    def __init__(self):
        self._whisper_model = None
        self._demucs_model = None
        self._nllb_model = None
        self._nllb_tokenizer = None
        self._translation_models: dict[str, tuple] = {}
        self._lock = threading.Lock()
        self._whisper_lock = threading.Lock()
        self._whisper_use_lock = threading.Lock()  # prevents concurrent transcription
        self._demucs_lock = threading.Lock()
        self._nllb_lock = threading.Lock()

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

    def get_demucs(self):
        """Load Demucs htdemucs model on first use and cache it."""
        if self._demucs_model is None:
            with self._demucs_lock:
                if self._demucs_model is None:
                    from demucs.pretrained import get_model
                    import torch
                    print("Loading Demucs model: htdemucs...")
                    model = get_model("htdemucs")
                    device = "cuda" if torch.cuda.is_available() else "cpu"
                    model.to(device)
                    self._demucs_model = model
                    print(f"Demucs model loaded on {device}.")
        return self._demucs_model

    def get_nllb(self):
        """Load NLLB-200-distilled-600M on first use and cache it."""
        if self._nllb_model is None:
            with self._nllb_lock:
                if self._nllb_model is None:
                    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
                    model_name = "facebook/nllb-200-distilled-600M"
                    print(f"Loading NLLB model: {model_name}...")
                    self._nllb_tokenizer = AutoTokenizer.from_pretrained(model_name)
                    self._nllb_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
                    print("NLLB model loaded.")
        return self._nllb_model, self._nllb_tokenizer

    def get_translation_model(self, src_lang: str, tgt_lang: str):
        """
        Load and cache a translation model for the given pair.
        Priority: Opus-MT (direct pair) -> NLLB-200 -> mBART-50 (last resort)
        Returns: (model, tokenizer, engine: str) where engine is "opus", "nllb", or "mbart"
        """
        src_opus, tgt_opus = get_opus_codes(src_lang, tgt_lang)
        pair_key = f"{src_opus}-{tgt_opus}"

        with self._lock:
            if pair_key not in self._translation_models:
                model, tokenizer, engine = self._load_translation_pair(
                    src_lang, tgt_lang
                )
                self._translation_models[pair_key] = (model, tokenizer, engine)

        return self._translation_models[pair_key]

    def _load_translation_pair(self, src: str, tgt: str):
        src_opus, tgt_opus = get_opus_codes(src, tgt)

        # 1. Try Opus-MT first (best quality for known direct pairs)
        if (src_opus, tgt_opus) in OPUS_DIRECT_PAIRS:
            try:
                from transformers import MarianMTModel, MarianTokenizer

                model_name = f"Helsinki-NLP/opus-mt-{src_opus}-{tgt_opus}"
                print(f"Loading translation model: {model_name}...")
                tokenizer = MarianTokenizer.from_pretrained(model_name)
                model = MarianMTModel.from_pretrained(model_name)
                print(f"Translation model loaded: {model_name}")
                return model, tokenizer, "opus"
            except Exception as e:
                print(f"Failed to load Opus-MT {src_opus}-{tgt_opus}: {e}")

        # 2. Try NLLB-200 (supports 200+ languages directly)
        src_info = LANGUAGES.get(src, {})
        tgt_info = LANGUAGES.get(tgt, {})
        if "nllb_code" in src_info and "nllb_code" in tgt_info:
            try:
                model, tokenizer = self.get_nllb()
                print(f"Using NLLB-200 for {src}->{tgt}")
                return model, tokenizer, "nllb"
            except Exception as e:
                print(f"Failed to load NLLB: {e}")

        # 3. Fallback: mBART-50
        print(f"Loading mBART-50 fallback for {src}-{tgt}...")
        from transformers import (
            MBartForConditionalGeneration,
            MBart50TokenizerFast,
        )

        model_name = "facebook/mbart-large-50-many-to-many-mmt"
        tokenizer = MBart50TokenizerFast.from_pretrained(model_name)
        model = MBartForConditionalGeneration.from_pretrained(model_name)
        print("mBART-50 loaded.")
        return model, tokenizer, "mbart"

    def unload_all(self):
        """Free all loaded models."""
        self._whisper_model = None
        self._demucs_model = None
        self._nllb_model = None
        self._nllb_tokenizer = None
        self._translation_models.clear()
