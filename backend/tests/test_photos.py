"""Photo d'un sujet papier → PDF lu par OCR."""
import io
import shutil

import pytest
from PIL import Image, ImageDraw, ImageFont

needs_ocr = pytest.mark.skipif(shutil.which("tesseract") is None, reason="tesseract absent")


def _photo(text_lines, rotate_exif=False):
    image = Image.new("RGB", (1200, 900), "white")
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 44)
    except OSError:
        font = ImageFont.load_default()
    for index, line in enumerate(text_lines):
        draw.text((60, 80 + index * 80), line, fill="black", font=font)
    buffer = io.BytesIO()
    if rotate_exif:
        # Photo prise téléphone tourné : pixels pivotés + EXIF qui dit de les redresser.
        image = image.rotate(90, expand=True)
        exif = Image.Exif()
        exif[0x0112] = 6
        image.save(buffer, format="JPEG", exif=exif)
    else:
        image.save(buffer, format="JPEG")
    return buffer.getvalue()


@needs_ocr
def test_scan_builds_one_pdf_from_several_photos(client, make_user):
    alice = make_user("alice")
    response = client.post(
        "/api/v1/drive/files/scan",
        headers=alice["headers"],
        data={"name": "TS_Examen_CL_2021"},
        files=[
            ("photos", ("p1.jpg", _photo(["Examen Traitement du signal", "Question 1 Shannon"]), "image/jpeg")),
            ("photos", ("p2.jpg", _photo(["Question 2 Parseval"], rotate_exif=True), "image/jpeg")),
        ],
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["name"] == "TS_Examen_CL_2021.pdf"
    assert body["page_count"] == 2
    detail = client.get(f"/api/v1/drive/files/{body['id']}", headers=alice["headers"]).json()
    text = (detail.get("content") or detail.get("summary") or "").lower()
    assert "shannon" in text and "parseval" in text


@needs_ocr
def test_single_photo_upload_becomes_pdf(client, make_user):
    alice = make_user("alice")
    response = client.post(
        "/api/v1/drive/files", headers=alice["headers"],
        files={"file": ("sujet.jpg", _photo(["Rattrapage Antennes", "Formule de Friis"]), "image/jpeg")},
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "sujet.pdf"


def test_scan_rejects_garbage(client, make_user):
    alice = make_user("alice")
    response = client.post(
        "/api/v1/drive/files/scan", headers=alice["headers"], data={"name": "x"},
        files=[("photos", ("p.jpg", b"pas une image", "image/jpeg"))],
    )
    assert response.status_code == 422
