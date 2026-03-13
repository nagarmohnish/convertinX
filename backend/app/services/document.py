"""
Document text extraction and rebuilding for PDF, DOCX, PPTX.
"""
import os
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from pathlib import Path


def _get_fonts_dir() -> str:
    if os.name == "nt":
        return os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
    return "/usr/share/fonts/truetype"


def _find_font(name: str) -> str | None:
    """Find a system font file by name."""
    fonts_dir = _get_fonts_dir()
    path = os.path.join(fonts_dir, name)
    return path if os.path.exists(path) else None


def _select_font_for_text(text: str) -> dict:
    """Select the best font for the given text based on script detection.

    Returns a dict with either:
      {"fontname": "builtin-name"}           — use PyMuPDF built-in (CJK)
      {"fontfile": "path", "fontname": "x"}  — embed a system font
    """
    for ch in text:
        cp = ord(ch)
        # CJK Unified Ideographs / CJK Extension A / Bopomofo
        if 0x4E00 <= cp <= 0x9FFF or 0x3400 <= cp <= 0x4DBF:
            return {"fontname": "china-s"}
        # Hiragana / Katakana
        if 0x3040 <= cp <= 0x30FF or 0x31F0 <= cp <= 0x31FF:
            return {"fontname": "japan"}
        # Hangul
        if 0xAC00 <= cp <= 0xD7AF or 0x1100 <= cp <= 0x11FF:
            return {"fontname": "korea"}
        # Arabic / Hebrew
        if 0x0600 <= cp <= 0x06FF or 0x0590 <= cp <= 0x05FF:
            for name in ("tahoma.ttf", "segoeui.ttf", "arial.ttf"):
                f = _find_font(name)
                if f:
                    return {"fontfile": f, "fontname": "rtlf"}
        # Devanagari / Bengali / Tamil / other Indic
        if 0x0900 <= cp <= 0x0DFF:
            for name in ("nirmala.ttf", "mangal.ttf", "segoeui.ttf"):
                f = _find_font(name)
                if f:
                    return {"fontfile": f, "fontname": "indic"}
        # Thai / Lao
        if 0x0E00 <= cp <= 0x0EFF:
            for name in ("tahoma.ttf", "segoeui.ttf"):
                f = _find_font(name)
                if f:
                    return {"fontfile": f, "fontname": "thai"}
        # Cyrillic
        if 0x0400 <= cp <= 0x04FF:
            for name in ("arial.ttf", "segoeui.ttf"):
                f = _find_font(name)
                if f:
                    return {"fontfile": f, "fontname": "latf"}

    # Latin / fallback — prefer system TTF for proper rendering
    for name in ("arial.ttf", "segoeui.ttf"):
        f = _find_font(name)
        if f:
            return {"fontfile": f, "fontname": "latf"}

    # Linux fallbacks
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    ):
        if os.path.exists(path):
            return {"fontfile": path, "fontname": "latf"}

    return {"fontname": "helv"}


def extract_text_from_pdf(file_path: str) -> list[dict]:
    """Extract text blocks from a PDF, preserving page structure.
    Returns list of {page, text, bbox} dicts.
    """
    doc = fitz.open(file_path)
    blocks = []
    for page_num, page in enumerate(doc):
        for block in page.get_text("blocks"):
            x0, y0, x1, y1, text, block_no, block_type = block
            if block_type == 0 and text.strip():  # text block
                blocks.append({
                    "page": page_num,
                    "text": text.strip(),
                    "bbox": (x0, y0, x1, y1),
                })
    doc.close()
    return blocks


def extract_text_from_docx(file_path: str) -> list[dict]:
    """Extract paragraphs from a DOCX file.
    Returns list of {index, text, style} dicts.
    """
    doc = DocxDocument(file_path)
    blocks = []
    for i, para in enumerate(doc.paragraphs):
        if para.text.strip():
            blocks.append({
                "index": i,
                "text": para.text.strip(),
                "style": para.style.name if para.style else "Normal",
            })
    return blocks


def extract_text_from_pptx(file_path: str) -> list[dict]:
    """Extract text from a PPTX file.
    Returns list of {slide, shape_idx, text} dicts.
    """
    from pptx import Presentation
    prs = Presentation(file_path)
    blocks = []
    for slide_num, slide in enumerate(prs.slides):
        for shape_idx, shape in enumerate(slide.shapes):
            if shape.has_text_frame:
                full_text = "\n".join(
                    para.text for para in shape.text_frame.paragraphs
                    if para.text.strip()
                )
                if full_text.strip():
                    blocks.append({
                        "slide": slide_num,
                        "shape_idx": shape_idx,
                        "text": full_text.strip(),
                    })
    return blocks


def rebuild_pdf(
    original_path: str,
    translated_blocks: list[dict],
    output_path: str,
):
    """Create a translated PDF by redacting original text and inserting translations."""
    doc = fitz.open(original_path)

    # Group blocks by page
    pages_blocks: dict[int, list[dict]] = {}
    for block in translated_blocks:
        pages_blocks.setdefault(block["page"], []).append(block)

    for page_num, blocks in pages_blocks.items():
        page = doc[page_num]

        # Step 1: Redact original text (properly removes it)
        for block in blocks:
            bbox = fitz.Rect(block["bbox"])
            page.add_redact_annot(bbox, fill=(1, 1, 1))
        page.apply_redactions()

        # Step 2: Insert translated text
        for block in blocks:
            bbox = fitz.Rect(block["bbox"])
            text = block["text"]
            line_count = max(1, text.count("\n") + 1)
            fontsize = min(11, max(6, bbox.height / line_count * 0.7))

            font_info = _select_font_for_text(text)
            kwargs = dict(
                rect=bbox,
                buffer=text,
                fontsize=fontsize,
                align=fitz.TEXT_ALIGN_LEFT,
                color=(0, 0, 0),
                **font_info,
            )

            rc = page.insert_textbox(**kwargs)

            # Text didn't fit — retry with smaller font
            if rc < 0:
                kwargs["fontsize"] = max(5, fontsize * 0.65)
                page.insert_textbox(**kwargs)

    doc.save(output_path)
    doc.close()


def rebuild_docx(
    original_path: str,
    translated_blocks: list[dict],
    output_path: str,
):
    """Create a translated DOCX by replacing paragraph text."""
    doc = DocxDocument(original_path)

    # Build index map
    block_map = {b["index"]: b["text"] for b in translated_blocks}

    for i, para in enumerate(doc.paragraphs):
        if i in block_map:
            # Preserve first run's formatting, replace text
            if para.runs:
                para.runs[0].text = block_map[i]
                for run in para.runs[1:]:
                    run.text = ""
            else:
                para.text = block_map[i]

    doc.save(output_path)


def rebuild_pptx(
    original_path: str,
    translated_blocks: list[dict],
    output_path: str,
):
    """Create a translated PPTX by replacing shape text."""
    from pptx import Presentation
    prs = Presentation(original_path)

    # Build lookup: (slide, shape_idx) -> translated text
    block_map = {(b["slide"], b["shape_idx"]): b["text"] for b in translated_blocks}

    for slide_num, slide in enumerate(prs.slides):
        for shape_idx, shape in enumerate(slide.shapes):
            key = (slide_num, shape_idx)
            if key in block_map and shape.has_text_frame:
                # Replace text while preserving first paragraph's formatting
                tf = shape.text_frame
                if tf.paragraphs:
                    first_para = tf.paragraphs[0]
                    if first_para.runs:
                        first_para.runs[0].text = block_map[key]
                        for run in first_para.runs[1:]:
                            run.text = ""
                    else:
                        first_para.text = block_map[key]
                    # Clear remaining paragraphs
                    for para in tf.paragraphs[1:]:
                        for run in para.runs:
                            run.text = ""

    prs.save(output_path)


def detect_doc_type(filename: str) -> str | None:
    """Detect document type from filename extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    elif ext in (".docx", ".doc"):
        return "docx"
    elif ext in (".pptx", ".ppt"):
        return "pptx"
    return None
