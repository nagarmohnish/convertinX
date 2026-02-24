import re
from app.models.model_manager import ModelManager
from app.utils.language_map import LANGUAGES, needs_pivot, get_pivot_chain


def translate_text(
    text: str, src: str, tgt: str, model_manager: ModelManager
) -> str:
    """
    Translate text, handling pivot through English if needed.
    Splits long text into chunks to respect model's 512-token limit.
    """
    if src == tgt:
        return text

    chain = get_pivot_chain(src, tgt)
    result = text
    for pair_src, pair_tgt in chain:
        result = _translate_single(result, pair_src, pair_tgt, model_manager)
    return result


def _translate_single(
    text: str, src: str, tgt: str, model_manager: ModelManager
) -> str:
    model, tokenizer, is_mbart = model_manager.get_translation_model(src, tgt)

    if is_mbart:
        return _translate_mbart(text, src, tgt, model, tokenizer)
    else:
        return _translate_opus(text, model, tokenizer)


def _translate_opus(text: str, model, tokenizer) -> str:
    """Translate using Opus-MT (MarianMT)."""
    chunks = _split_text_into_chunks(text, tokenizer, max_tokens=512)
    translated_chunks = []

    for chunk in chunks:
        inputs = tokenizer(
            chunk, return_tensors="pt", padding=True, truncation=True, max_length=512
        )
        output = model.generate(**inputs)
        translated = tokenizer.decode(output[0], skip_special_tokens=True)
        translated_chunks.append(translated)

    return " ".join(translated_chunks)


def _translate_mbart(text: str, src: str, tgt: str, model, tokenizer) -> str:
    """Translate using mBART-50."""
    src_mbart = LANGUAGES[src]["mbart_code"]
    tgt_mbart = LANGUAGES[tgt]["mbart_code"]
    tokenizer.src_lang = src_mbart

    chunks = _split_text_into_chunks(text, tokenizer, max_tokens=512)
    translated_chunks = []

    for chunk in chunks:
        inputs = tokenizer(
            chunk, return_tensors="pt", padding=True, truncation=True, max_length=512
        )
        output = model.generate(
            **inputs, forced_bos_token_id=tokenizer.lang_code_to_id[tgt_mbart]
        )
        translated = tokenizer.decode(output[0], skip_special_tokens=True)
        translated_chunks.append(translated)

    return " ".join(translated_chunks)


def _split_text_into_chunks(
    text: str, tokenizer, max_tokens: int = 512
) -> list[str]:
    """Split text at sentence boundaries to keep each chunk under max_tokens."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    if not sentences:
        return [text]

    chunks = []
    current_chunk = ""

    for sentence in sentences:
        candidate = (current_chunk + " " + sentence).strip() if current_chunk else sentence
        token_count = len(tokenizer.encode(candidate))

        if token_count > max_tokens and current_chunk:
            chunks.append(current_chunk)
            current_chunk = sentence
        else:
            current_chunk = candidate

    if current_chunk:
        chunks.append(current_chunk)

    return chunks if chunks else [text]
