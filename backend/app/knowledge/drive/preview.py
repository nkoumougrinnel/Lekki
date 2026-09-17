from pdf2image import convert_from_path
from PIL import Image
import os
from typing import Optional

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
