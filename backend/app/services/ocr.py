"""
Image OCR: extract text regions from images and overlay translated text.
"""
import easyocr
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from dataclasses import dataclass


@dataclass
class TextRegion:
    bbox: list  # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
    text: str
    confidence: float


_reader_cache: dict[str, easyocr.Reader] = {}


def get_reader(languages: list[str]) -> easyocr.Reader:
    """Get or create an EasyOCR reader for the given languages."""
    key = ",".join(sorted(languages))
    if key not in _reader_cache:
        _reader_cache[key] = easyocr.Reader(languages, gpu=False, verbose=False)
    return _reader_cache[key]


# Map our language codes to EasyOCR language codes
EASYOCR_LANG_MAP = {
    "en": "en",
    "hi": "hi",
    "es": "es",
    "fr": "fr",
    "de": "de",
    "ja": "ja",
    "ar": "ar",
    "pt": "pt",
    "zh": "ch_sim",
    "ko": "ko",
}


def extract_text_regions(
    image_path: str,
    source_language: str = "en",
) -> list[TextRegion]:
    """Extract text regions from an image using EasyOCR."""
    ocr_lang = EASYOCR_LANG_MAP.get(source_language, "en")
    # Always include English as a secondary language for mixed text
    langs = list(set([ocr_lang, "en"])) if ocr_lang != "en" else ["en"]

    reader = get_reader(langs)
    results = reader.readtext(image_path)

    regions = []
    for bbox, text, confidence in results:
        if confidence > 0.3 and text.strip():
            regions.append(TextRegion(
                bbox=bbox,
                text=text.strip(),
                confidence=confidence,
            ))
    return regions


def overlay_translated_text(
    image_path: str,
    regions: list[TextRegion],
    translated_texts: list[str],
    output_path: str,
):
    """Overlay translated text on the image, whiting out original text regions."""
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)

    for region, translated in zip(regions, translated_texts):
        bbox = region.bbox
        # Get bounding rectangle
        xs = [p[0] for p in bbox]
        ys = [p[1] for p in bbox]
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)

        # White out original text
        draw.rectangle([x_min, y_min, x_max, y_max], fill="white")

        # Calculate font size to fit the box
        box_height = y_max - y_min
        box_width = x_max - x_min
        font_size = max(10, int(box_height * 0.7))

        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except (OSError, IOError):
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
            except (OSError, IOError):
                font = ImageFont.load_default()

        # Draw translated text
        draw.text(
            (x_min + 2, y_min),
            translated,
            fill="black",
            font=font,
        )

    img.save(output_path)
    return output_path
