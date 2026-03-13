"""
Document Translation pipeline: PDF/DOCX/PPTX → translated document.
"""
import asyncio
from pathlib import Path

from app.models.model_manager import ModelManager
from app.pipeline.progress import ProgressBroadcaster
from app.services.document import (
    detect_doc_type,
    extract_text_from_pdf, extract_text_from_docx, extract_text_from_pptx,
    rebuild_pdf, rebuild_docx, rebuild_pptx,
)
from app.services.translation import translate_text
from app.utils.file_utils import get_job_output_dir


EXTRACTORS = {
    "pdf": extract_text_from_pdf,
    "docx": extract_text_from_docx,
    "pptx": extract_text_from_pptx,
}

REBUILDERS = {
    "pdf": rebuild_pdf,
    "docx": rebuild_docx,
    "pptx": rebuild_pptx,
}

EXTENSIONS = {
    "pdf": ".pdf",
    "docx": ".docx",
    "pptx": ".pptx",
}


async def run_doc_translate_pipeline(
    job_id: str,
    file_path: str | None,
    src_lang: str | None,
    tgt_langs: list[str],
    model_manager: ModelManager,
    progress: ProgressBroadcaster,
) -> dict:
    """Translate a document (PDF/DOCX/PPTX) to target languages."""
    if not file_path:
        raise ValueError("No document file provided")

    src = src_lang or "en"
    if not tgt_langs:
        raise ValueError("No target languages specified")

    tgt = tgt_langs[0]  # Translate to first target language

    # Detect doc type
    doc_type = detect_doc_type(file_path)
    if not doc_type:
        raise ValueError("Unsupported document format. Use PDF, DOCX, or PPTX.")

    await progress.broadcast(job_id, 0.1, "Extracting text", f"Reading {doc_type.upper()}...")

    # Extract text blocks
    extractor = EXTRACTORS[doc_type]
    blocks = await asyncio.get_event_loop().run_in_executor(
        None, extractor, file_path
    )

    if not blocks:
        raise ValueError("No text found in document")

    await progress.broadcast(
        job_id, 0.2, "Translating",
        f"Found {len(blocks)} text blocks, translating to {tgt}..."
    )

    # Translate each block
    total = len(blocks)
    translated_blocks = []
    for i, block in enumerate(blocks):
        translated_text = await asyncio.get_event_loop().run_in_executor(
            None, translate_text, block["text"], src, tgt, model_manager
        )
        translated_block = {**block, "text": translated_text}
        translated_blocks.append(translated_block)

        pct = 0.2 + 0.6 * ((i + 1) / total)
        if (i + 1) % 5 == 0 or i == total - 1:
            await progress.broadcast(
                job_id, pct, "Translating",
                f"Block {i + 1}/{total}"
            )

    await progress.broadcast(job_id, 0.85, "Rebuilding document", "Creating translated file...")

    # Rebuild document
    output_dir = get_job_output_dir(job_id)
    ext = EXTENSIONS[doc_type]
    output_filename = f"translated_{tgt}{ext}"
    output_path = str(output_dir / output_filename)

    rebuilder = REBUILDERS[doc_type]
    await asyncio.get_event_loop().run_in_executor(
        None, rebuilder, file_path, translated_blocks, output_path
    )

    await progress.broadcast(job_id, 0.95, "Finalizing")

    return {
        "translated_file": f"/outputs/{job_id}/{output_filename}",
        "doc_type": doc_type,
        "source_language": src,
        "target_language": tgt,
        "block_count": total,
    }
