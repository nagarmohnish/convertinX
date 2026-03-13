"""
Image OCR + Translation pipeline: image → extracted text + translated overlay.
"""
import asyncio
from pathlib import Path

from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.services.ocr import extract_text_regions, overlay_translated_text
from app.services.translation import translate_text
from app.utils.file_utils import get_job_output_dir


async def run_image_ocr_pipeline(
    job_id: str,
    file_path: str | None,
    src_lang: str | None,
    tgt_langs: list[str],
    model_manager: ModelManager,
    progress: ProgressBroadcaster,
) -> dict:
    """OCR an image, translate text regions, overlay translations."""
    if not file_path:
        raise ValueError("No image file provided")

    src = src_lang or "en"
    if not tgt_langs:
        raise ValueError("No target language specified")

    tgt = tgt_langs[0]

    await progress.broadcast(job_id, 0.1, "Running OCR", "Detecting text in image...")

    # Extract text regions
    regions = await asyncio.get_event_loop().run_in_executor(
        None, extract_text_regions, file_path, src
    )

    if not regions:
        raise ValueError("No text detected in the image")

    await progress.broadcast(
        job_id, 0.4, "Translating",
        f"Found {len(regions)} text regions, translating..."
    )

    # Translate each region
    translated_texts = []
    for i, region in enumerate(regions):
        translated = await asyncio.get_event_loop().run_in_executor(
            None, translate_text, region.text, src, tgt, model_manager
        )
        translated_texts.append(translated)

        pct = 0.4 + 0.3 * ((i + 1) / len(regions))
        if (i + 1) % 3 == 0 or i == len(regions) - 1:
            await progress.broadcast(
                job_id, pct, "Translating",
                f"Region {i + 1}/{len(regions)}"
            )

    await progress.broadcast(job_id, 0.8, "Overlaying text", "Creating translated image...")

    # Create translated overlay image
    output_dir = get_job_output_dir(job_id)
    ext = Path(file_path).suffix or ".png"
    output_filename = f"translated_{tgt}{ext}"
    output_path = str(output_dir / output_filename)

    await asyncio.get_event_loop().run_in_executor(
        None, overlay_translated_text, file_path, regions, translated_texts, output_path
    )

    # Also save extracted text as a file
    text_filename = "extracted_text.txt"
    text_path = output_dir / text_filename
    lines = [f"[{r.confidence:.0%}] {r.text}" for r in regions]
    text_path.write_text("\n".join(lines), encoding="utf-8")

    # Save translated text
    translated_filename = f"translated_text_{tgt}.txt"
    translated_path = output_dir / translated_filename
    translated_lines = [
        f"{original.text} → {translated}"
        for original, translated in zip(regions, translated_texts)
    ]
    translated_path.write_text("\n".join(translated_lines), encoding="utf-8")

    await progress.broadcast(job_id, 0.95, "Finalizing")

    return {
        "original_image": f"/outputs/{job_id}/original{ext}",
        "translated_image": f"/outputs/{job_id}/{output_filename}",
        "extracted_text_file": f"/outputs/{job_id}/{text_filename}",
        "translated_text_file": f"/outputs/{job_id}/{translated_filename}",
        "source_language": src,
        "target_language": tgt,
        "region_count": len(regions),
        "regions": [
            {"text": r.text, "translated": t, "confidence": r.confidence}
            for r, t in zip(regions, translated_texts)
        ],
    }
