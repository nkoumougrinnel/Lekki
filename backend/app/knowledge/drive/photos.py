"""Photos de sujets papier → un PDF.

Beaucoup d'anciens sujets n'existent que sur papier : l'étudiant les prend en photo.
On redresse chaque photo (orientation EXIF), on la réduit pour économiser le stockage,
puis on assemble les pages dans un seul PDF. Le PDF obtenu ne contient que des images :
l'extraction de texte habituelle (parser.extract_pdf) déclenche alors l'OCR page par page.
"""

from __future__ import annotations

from io import BytesIO

import fitz  # PyMuPDF
from PIL import Image, ImageOps, UnidentifiedImageError

PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
MAX_SIDE = 2200          # assez pour l'OCR d'une page A4, sans fichier énorme
JPEG_QUALITY = 82
MAX_PHOTOS = 12
MAX_PHOTO_BYTES = 15 * 1024 * 1024


class PhotoError(ValueError):
    pass


def _normalize(data: bytes) -> tuple[bytes, int, int]:
    if len(data) > MAX_PHOTO_BYTES:
        raise PhotoError("Une photo dépasse 15 Mo.")
    try:
        image = Image.open(BytesIO(data))
        image = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError) as error:
        raise PhotoError("Une des photos est illisible (format non reconnu).") from error
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE))
    output = BytesIO()
    image.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return output.getvalue(), image.width, image.height


def photos_to_pdf(photos: list[bytes]) -> bytes:
    """Une page par photo, dans l'ordre reçu."""
    if not photos:
        raise PhotoError("Aucune photo reçue.")
    if len(photos) > MAX_PHOTOS:
        raise PhotoError(f"{MAX_PHOTOS} photos au maximum par sujet.")
    document = fitz.open()
    for data in photos:
        jpeg, width, height = _normalize(data)
        # Page au format de la photo (72 points par pouce, photo vue à ~150 dpi).
        scale = 72 / 150
        page = document.new_page(width=width * scale, height=height * scale)
        page.insert_image(page.rect, stream=jpeg)
    return document.tobytes(garbage=3, deflate=True)
