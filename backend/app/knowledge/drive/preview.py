from pdf2image import convert_from_path
from PIL import Image
import os
import subprocess
import tempfile
from typing import Optional

import fitz

class PreviewService:
    def __init__(self, thumbnail_dir: str = "storage/thumbnails"):
        self.thumbnail_dir = thumbnail_dir
        os.makedirs(self.thumbnail_dir, exist_ok=True)

    def generate_pdf_thumbnail(self, file_path: str, file_id: str) -> Optional[str]:
        """Generates a JPG of the first page of a PDF."""
        try:
            # convert_from_path returns a list of PIL images
            images = convert_from_path(file_path, first_page=1, last_page=1)
            if images:
                img = images[0]
                img.thumbnail((300, 400))
                thumb_path = os.path.join(self.thumbnail_dir, f"{file_id}.jpg")
                img.save(thumb_path, "JPEG")
                return thumb_path
        except Exception as e:
            print(f"Error generating PDF thumbnail {file_path}: {e}")
        return None

    def generate_office_thumbnail(self, file_path: str, file_id: str) -> Optional[str]:
        """Render the first DOCX page or PPTX slide through LibreOffice."""
        try:
            with tempfile.TemporaryDirectory(prefix="lekki-preview-") as temp_dir:
                profile_dir = os.path.join(temp_dir, "lo-profile")
                output = subprocess.run(
                    [
                        "libreoffice",
                        "--headless",
                        f"-env:UserInstallation=file://{profile_dir}",
                        "--convert-to",
                        "pdf",
                        "--outdir",
                        temp_dir,
                        file_path,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=60,
                    check=False,
                )
                converted_pdf = os.path.join(
                    temp_dir,
                    f"{os.path.splitext(os.path.basename(file_path))[0]}.pdf",
                )
                if output.returncode != 0 or not os.path.isfile(converted_pdf):
                    detail = (output.stderr or output.stdout or "PDF conversion failed").strip()
                    print(f"Error converting Office preview {file_path}: {detail}")
                    return None

                with fitz.open(converted_pdf) as document:
                    if not document.page_count:
                        return None
                    pixmap = document[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
                    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                    image.thumbnail((600, 800))
                    thumbnail_path = os.path.join(self.thumbnail_dir, f"{file_id}.jpg")
                    image.save(thumbnail_path, "JPEG", quality=88, optimize=True)
                    return thumbnail_path
        except Exception as error:
            print(f"Error generating Office thumbnail {file_path}: {error}")
            return None

    def generate_image_thumbnail(self, file_path: str, file_id: str) -> Optional[str]:
        """Creates a thumbnail for images."""
        try:
            with Image.open(file_path) as img:
                img.thumbnail((300, 300))
                thumb_path = os.path.join(self.thumbnail_dir, f"{file_id}.jpg")
                img.convert("RGB").save(thumb_path, "JPEG")
                return thumb_path
        except Exception as e:
            print(f"Error generating image thumbnail {file_path}: {e}")
        return None

    @staticmethod
    def get_text_snippet(text: str, length: int = 200) -> str:
        """Creates a short preview snippet from text."""
        if not text:
            return "Aucun contenu disponible"
        return (text[:length] + "...") if len(text) > length else text
