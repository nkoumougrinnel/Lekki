from io import BytesIO
import re
from typing import Dict
from zipfile import ZipFile
import xml.etree.ElementTree as ET

import fitz  # PyMuPDF
import pytesseract
from PIL import Image

WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DRAWING_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"


def _paragraph_text(paragraph: ET.Element, namespace: str) -> str:
    """Collect paragraph text while avoiding duplicate nested text-box paragraphs."""
    parts: list[str] = []

    def visit(node: ET.Element) -> None:
        for child in node:
            if child.tag == f"{namespace}p":
                continue
            elif child.tag in (f"{namespace}t", f"{namespace}instrText"):
                if child.text:
                    parts.append(child.text)
            elif child.tag == f"{namespace}tab":
                parts.append("\t")
            elif child.tag in (f"{namespace}br", f"{namespace}cr"):
                parts.append("\n")
            else:
                visit(child)

    visit(paragraph)
    return "".join(parts).strip()


def _word_heading(paragraph: ET.Element) -> bool:
    style = paragraph.find(f"{WORD_NS}pPr/{WORD_NS}pStyle")
    if style is None:
        return False
    style_name = style.attrib.get(f"{WORD_NS}val", "")
    return style_name.lower().startswith(("heading", "titre"))

class DocumentParserService:
    @staticmethod
    def extract_pdf(file_path: str) -> Dict[str, str]:
        """
        Extracts text and attempts to detect structure via font size.
        Returns a dict with raw_text and structured_text.
        """
        try:
            doc = fitz.open(file_path)
            full_text = []
            structure = []

            for page_number, page in enumerate(doc, start=1):
                page_text = page.get_text("text").strip()
                if not page_text:
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                    image = Image.open(BytesIO(pixmap.tobytes("png")))
                    page_text = pytesseract.image_to_string(image, lang="fra+eng").strip()
                structure.append(f"[Page {page_number}]")
                if page_text:
                    structure.extend(line.strip() for line in page_text.splitlines() if line.strip())
                    full_text.append(page_text)

            doc.close()
            return {
                "raw_text": " ".join(full_text),
                "structured_text": "\n".join(structure)
            }
        except Exception as e:
            print(f"Error parsing PDF {file_path}: {e}")
            return {"raw_text": "", "structured_text": ""}

    @staticmethod
    def extract_docx(file_path: str) -> Dict[str, str]:
        """Extract body, nested tables, text boxes, headers, and footers from DOCX."""
        try:
            with ZipFile(file_path) as archive:
                part_names = [
                    name for name in archive.namelist()
                    if re.fullmatch(r"word/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml", name)
                ]
                part_names.sort(key=lambda name: (name != "word/document.xml", name))

                lines: list[str] = []
                for part_name in part_names:
                    root = ET.fromstring(archive.read(part_name))
                    for paragraph in root.iter(f"{WORD_NS}p"):
                        text = _paragraph_text(paragraph, WORD_NS)
                        if not text:
                            continue
                        lines.append(f"# {text}" if _word_heading(paragraph) else text)

            structured_text = "\n".join(lines).strip()
            return {"raw_text": "\n".join(line.removeprefix("# ") for line in lines), "structured_text": structured_text}
        except Exception as e:
            print(f"Error parsing DOCX {file_path}: {e}")
            return {"raw_text": "", "structured_text": ""}

    @staticmethod
    def extract_pptx(file_path: str) -> Dict[str, str]:
        """Extract text from slide XML, including grouped shapes and table cells."""
        try:
            with ZipFile(file_path) as archive:
                slide_parts = [
                    name for name in archive.namelist()
                    if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)
                ]
                slide_parts.sort(key=lambda name: int(re.search(r"slide(\d+)\.xml$", name).group(1)))

            slides_text = []
            with ZipFile(file_path) as archive:
                for slide_part in slide_parts:
                    slide_number = int(re.search(r"slide(\d+)\.xml$", slide_part).group(1))
                    root = ET.fromstring(archive.read(slide_part))
                    paragraphs = [
                        _paragraph_text(paragraph, DRAWING_NS)
                        for paragraph in root.iter(f"{DRAWING_NS}p")
                    ]
                    slide_lines = [text for text in paragraphs if text]
                    if slide_lines:
                        slides_text.append(f"[Diapositive {slide_number}]\n" + "\n".join(slide_lines))
            structured_text = "\n\n".join(slides_text)
            return {"raw_text": "\n".join(slides_text), "structured_text": structured_text}
        except Exception as e:
            print(f"Error parsing PPTX {file_path}: {e}")
            return {"raw_text": "", "structured_text": ""}

    @classmethod
    def parse(cls, file_path: str, extension: str) -> Dict[str, str]:
        extension = extension.lower()
        if extension == ".pdf":
            return cls.extract_pdf(file_path)
        elif extension == ".docx":
            return cls.extract_docx(file_path)
        elif extension == ".pptx":
            return cls.extract_pptx(file_path)
        elif extension in [".txt", ".md"]:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                return {"raw_text": text, "structured_text": text}
            except Exception:
                return {"raw_text": "", "structured_text": ""}
        return {"raw_text": "", "structured_text": ""}
