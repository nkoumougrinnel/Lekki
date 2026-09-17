import fitz  # PyMuPDF
from docx import Document
import os
from typing import Dict, Tuple

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
                blocks = page.get_text("dict")["blocks"]
                page_text = []
                structure.append(f"[Page {page_number}]")
                for b in blocks:
                    if "lines" in b:
                        for line in b["lines"]:
                            for span in line["spans"]:
                                text = span["text"].strip()
                                if not text: continue
                                size = span["size"]

                                # Heuristic for structure
                                if size > 14:
                                    structure.append(f"# {text}")
                                elif size > 12:
                                    structure.append(f"## {text}")
                                else:
                                    structure.append(text)

                                full_text.append(text)
                                page_text.append(text)

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
        """
        Extracts text from .docx paragraphs and tables.
        """
        try:
            doc = Document(file_path)
            full_text = []
            structure = []

            for para in doc.paragraphs:
                text = para.text.strip()
                if not text: continue

                # Use Word styles for structure
                if para.style.name.startswith('Heading'):
                    structure.append(f"# {text}")
                else:
                    structure.append(text)

                full_text.append(text)

            return {
                "raw_text": " ".join(full_text),
                "structured_text": "\n".join(structure)
            }
        except Exception as e:
            print(f"Error parsing DOCX {file_path}: {e}")
            return {"raw_text": "", "structured_text": ""}

    @classmethod
    def parse(cls, file_path: str, extension: str) -> Dict[str, str]:
        extension = extension.lower()
        if extension == ".pdf":
            return cls.extract_pdf(file_path)
        elif extension == ".docx":
            return cls.extract_docx(file_path)
        elif extension in [".txt", ".md"]:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                return {"raw_text": text, "structured_text": text}
            except Exception:
                return {"raw_text": "", "structured_text": ""}
        return {"raw_text": "", "structured_text": ""}
