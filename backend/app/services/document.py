"""
Document text extraction and rebuilding for PDF, DOCX, PPTX.
"""
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from pathlib import Path


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
    """Create a translated PDF by overlaying translated text on each page.
    translated_blocks: list of {page, text, bbox} with translated text.
    """
    doc = fitz.open(original_path)

    for block in translated_blocks:
        page = doc[block["page"]]
        bbox = fitz.Rect(block["bbox"])

        # White out original text
        page.draw_rect(bbox, color=None, fill=(1, 1, 1))

        # Insert translated text
        fontsize = min(11, max(7, (bbox.y1 - bbox.y0) / max(1, block["text"].count("\n") + 1) * 0.8))
        page.insert_textbox(
            bbox,
            block["text"],
            fontsize=fontsize,
            fontname="helv",
            align=fitz.TEXT_ALIGN_LEFT,
        )

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
