from io import BytesIO
import re
from statistics import median
from typing import Any
from zipfile import ZipFile
import xml.etree.ElementTree as ET

import fitz  # PyMuPDF
from docx import Document
from docx.document import Document as WordDocument
from docx.table import Table
from docx.text.paragraph import Paragraph
from PIL import Image
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
import pytesseract


def _empty_result(content_unit: str | None = None) -> dict[str, Any]:
    return {
        "raw_text": "",
        "structured_text": "",
        "page_count": None,
        "slide_count": None,
        "content_unit": content_unit,
        "detected_chapters": [],
    }


def _heading_entry(title: str, number: int, page: int | None = None, location: str | None = None) -> dict[str, Any]:
    return {
        "number": str(number),
        "title": title.strip(),
        "page": page,
        "location": location,
        "subtopics": [],
    }


def _pdf_heading_candidate(text: str, font_size: float, body_size: float, bold: bool) -> bool:
    text = text.strip()
    if not text or len(text) > 140 or len(text.split()) > 18:
        return False
    numbered = re.match(r"^(?:(?:chapitre|chapter|partie)\s+\w+|\d+(?:\.\d+){0,4}[.)]?)\s+\S", text, re.IGNORECASE)
    title_like = font_size >= body_size * 1.22 and not re.search(r"[.!?;:]$", text)
    return bool(numbered or (title_like and (bold or font_size >= body_size * 1.35)))


def _word_heading_level(paragraph: Paragraph) -> int | None:
    style_name = (paragraph.style.name if paragraph.style else "").strip().lower()
    match = re.search(r"(?:heading|titre)\s*(\d+)", style_name)
    if match:
        return min(max(int(match.group(1)), 1), 6)

    paragraph_properties = paragraph._p.pPr
    outline_level = paragraph_properties.outlineLvl if paragraph_properties is not None else None
    if outline_level is not None and outline_level.val is not None:
        return min(max(int(outline_level.val) + 1, 1), 6)
    return None


def _iter_word_blocks(container):
    """Yield paragraphs and tables in document order, including nested tables."""
    if hasattr(container, "iter_inner_content"):
        yield from container.iter_inner_content()
        return

    for paragraph in getattr(container, "paragraphs", []):
        yield paragraph
    for table in getattr(container, "tables", []):
        yield table


def _word_table_lines(table: Table) -> list[str]:
    lines: list[str] = []
    for row in table.rows:
        cells: list[str] = []
        seen_cells: set[int] = set()
        for cell in row.cells:
            cell_key = id(cell._tc)
            if cell_key in seen_cells:
                continue
            seen_cells.add(cell_key)
            cell_text = " ".join(
                paragraph.text.strip()
                for paragraph in cell.paragraphs
                if paragraph.text.strip()
            )
            cells.append(cell_text)
        if any(cells):
            lines.append(" | ".join(cells))
    return lines


def _word_page_count(file_path: str) -> int | None:
    """Read Word's cached pagination if available; it may be absent or stale."""
    try:
        with ZipFile(file_path) as archive:
            root = ET.fromstring(archive.read("docProps/app.xml"))
        for node in root.iter():
            if node.tag.rsplit("}", 1)[-1] == "Pages" and node.text:
                count = int(node.text)
                return count if count > 0 else None
    except (KeyError, OSError, ValueError, ET.ParseError):
        pass
    return None


def _shape_text_lines(shape) -> list[str]:
    lines: list[str] = []
    if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
        for child in shape.shapes:
            lines.extend(_shape_text_lines(child))
    elif getattr(shape, "has_table", False):
        for row in shape.table.rows:
            values = [cell.text.strip().replace("\n", " ") for cell in row.cells]
            if any(values):
                lines.append(" | ".join(values))
    elif getattr(shape, "has_text_frame", False):
        for paragraph in shape.text_frame.paragraphs:
            text = paragraph.text.strip()
            if text:
                lines.append(text)
    return lines


class DocumentParserService:
    @staticmethod
    def extract_pdf(file_path: str) -> dict[str, Any]:
        """Extract actual PDF pages, OCR text-only-empty pages, and likely headings."""
        try:
            with fitz.open(file_path) as doc:
                page_lines: list[tuple[int, list[tuple[str, float, bool]]]] = []
                all_sizes: list[float] = []
                for page_number, page in enumerate(doc, start=1):
                    page_data = page.get_text("dict", sort=True)
                    lines: list[tuple[str, float, bool]] = []
                    for block in page_data.get("blocks", []):
                        if "lines" not in block:
                            continue
                        for line in block["lines"]:
                            spans = line.get("spans", [])
                            text = "".join(span.get("text", "") for span in spans).strip()
                            if not text:
                                continue
                            size = max((float(span.get("size", 0)) for span in spans), default=0)
                            bold = any(int(span.get("flags", 0)) & 16 for span in spans)
                            lines.append((text, size, bold))
                            if size > 0:
                                all_sizes.append(size)
                    page_lines.append((page_number, lines))

                body_size = median(all_sizes) if all_sizes else 0
                raw_pages: list[str] = []
                structured_lines: list[str] = []
                chapters: list[dict[str, Any]] = []
                for page_number, lines in page_lines:
                    page_text = "\n".join(text for text, _, _ in lines).strip()
                    if sum(character.isalnum() for character in page_text) < 20:
                        try:
                            page = doc[page_number - 1]
                            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                            image = Image.open(BytesIO(pixmap.tobytes("png")))
                            ocr_text = pytesseract.image_to_string(image, lang="fra+eng").strip()
                            if ocr_text:
                                page_text = ocr_text
                                lines = [(line.strip(), 0, False) for line in ocr_text.splitlines() if line.strip()]
                        except Exception:
                            # Keep selectable text even if OCR is unavailable on this host.
                            pass

                    raw_pages.append(page_text)
                    structured_lines.append(f"[Page {page_number}]")
                    for text, size, bold in lines:
                        if _pdf_heading_candidate(text, size, body_size, bold):
                            structured_lines.append(f"## {text}")
                            chapters.append(_heading_entry(text, len(chapters) + 1, page_number, f"Page {page_number}"))
                        else:
                            structured_lines.append(text)

                page_count = len(doc)
                return {
                    "raw_text": "\n\n".join(text for text in raw_pages if text).strip(),
                    "structured_text": "\n".join(structured_lines).strip(),
                    "page_count": page_count,
                    "slide_count": None,
                    "content_unit": "pages",
                    "detected_chapters": chapters,
                }
        except Exception as error:
            print(f"Error parsing PDF {file_path}: {error}")
            return _empty_result("pages")

    @staticmethod
    def extract_docx(file_path: str) -> dict[str, Any]:
        """Extract DOCX text in document order and preserve heading/table structure."""
        try:
            document: WordDocument = Document(file_path)
            raw_lines: list[str] = []
            structured_lines: list[str] = []
            chapters: list[dict[str, Any]] = []

            def consume(container) -> None:
                for block in _iter_word_blocks(container):
                    if isinstance(block, Paragraph):
                        text = block.text.strip()
                        if not text:
                            continue
                        level = _word_heading_level(block)
                        raw_lines.append(text)
                        if level:
                            structured_lines.append(f"{'#' * level} {text}")
                            chapters.append(_heading_entry(text, len(chapters) + 1, location="Section"))
                        else:
                            structured_lines.append(text)
                    elif isinstance(block, Table):
                        table_lines = _word_table_lines(block)
                        if table_lines:
                            structured_lines.extend(["", *table_lines, ""])
                            raw_lines.extend(table_lines)

            consume(document)
            structured_text = "\n".join(structured_lines).strip()
            if not structured_text:
                return _empty_result("pages")
            return {
                "raw_text": "\n".join(raw_lines).strip(),
                "structured_text": structured_text,
                "page_count": _word_page_count(file_path),
                "slide_count": None,
                "content_unit": "pages",
                "detected_chapters": chapters,
            }
        except Exception as error:
            print(f"Error parsing DOCX {file_path}: {error}")
            return _empty_result("pages")

    @staticmethod
    def extract_pptx(file_path: str) -> dict[str, Any]:
        """Use presentation slide order and retain each slide, including empty slides."""
        try:
            presentation = Presentation(file_path)
            raw_slides: list[str] = []
            structured_slides: list[str] = []
            chapters: list[dict[str, Any]] = []

            for slide_number, slide in enumerate(presentation.slides, start=1):
                lines: list[str] = []
                for shape in slide.shapes:
                    lines.extend(_shape_text_lines(shape))
                # Avoid repeating a title placeholder when encountered in shape order.
                slide_title = slide.shapes.title.text.strip() if slide.shapes.title else ""
                if slide_title:
                    lines = [slide_title, *(line for line in lines if line != slide_title)]
                structured_slides.append(f"[Diapositive {slide_number}]\n" + "\n".join(lines))
                if lines:
                    raw_slides.append("\n".join(lines))
                    chapters.append(_heading_entry(lines[0], len(chapters) + 1, location=f"Diapositive {slide_number}"))
                else:
                    raw_slides.append("")

            slide_count = len(presentation.slides)
            return {
                "raw_text": "\n\n".join(raw_slides).strip(),
                "structured_text": "\n\n".join(structured_slides).strip(),
                "page_count": None,
                "slide_count": slide_count,
                "content_unit": "slides",
                "detected_chapters": chapters,
            }
        except Exception as error:
            print(f"Error parsing PPTX {file_path}: {error}")
            return _empty_result("slides")

    @classmethod
    def parse(cls, file_path: str, extension: str) -> dict[str, Any]:
        extension = extension.lower()
        if extension == ".pdf":
            return cls.extract_pdf(file_path)
        if extension == ".docx":
            return cls.extract_docx(file_path)
        if extension == ".pptx":
            return cls.extract_pptx(file_path)
        if extension in {".txt", ".md"}:
            try:
                with open(file_path, "r", encoding="utf-8-sig") as file:
                    text = file.read()
                return {
                    "raw_text": text,
                    "structured_text": text,
                    "page_count": None,
                    "slide_count": None,
                    "content_unit": "document",
                    "detected_chapters": [],
                }
            except (OSError, UnicodeError) as error:
                print(f"Error parsing text document {file_path}: {error}")
                return _empty_result("document")
        return _empty_result()
