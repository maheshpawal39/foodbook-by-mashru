import io
import uuid
from pathlib import Path

from flask import current_app
from PIL import Image, ImageOps, UnidentifiedImageError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class UploadError(Exception):
    pass


def _upload_root() -> Path:
    root = Path(current_app.config["UPLOAD_FOLDER"]).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_image(file_storage, kind="recipe"):
    """Validate and store an uploaded image. Returns a relative URL path."""
    if not file_storage or not file_storage.filename:
        raise UploadError("Please choose an image to upload.")

    extension = file_storage.filename.rsplit(".", 1)[-1].lower() if "." in file_storage.filename else ""
    if extension not in {"jpg", "jpeg", "png", "webp"}:
        raise UploadError("Only JPG, JPEG, PNG and WEBP images are allowed.")

    raw = file_storage.read()
    if not raw:
        raise UploadError("The uploaded file is empty.")
    if len(raw) > current_app.config["MAX_CONTENT_LENGTH"]:
        raise UploadError("Image is too large.")

    try:
        probe = Image.open(io.BytesIO(raw))
        probe.verify()
        image = Image.open(io.BytesIO(raw))
        image.load()
        if image.format not in ALLOWED_FORMATS:
            raise UploadError("Unsupported image format.")
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        raise UploadError("The file is not a valid image.")

    image = ImageOps.exif_transpose(image)
    if kind == "avatar":
        limit = (700, 700)
    else:
        limit = (1800, 1800)
    image.thumbnail(limit, Image.Resampling.LANCZOS)

    if image.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        alpha = image.convert("RGBA")
        background.paste(alpha, mask=alpha.split()[-1])
        image = background
    else:
        image = image.convert("RGB")

    folder = "avatars" if kind == "avatar" else "recipes"
    target_dir = _upload_root() / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.jpg"
    image.save(target_dir / filename, format="JPEG", quality=88, optimize=True, progressive=True)
    return f"/uploads/{folder}/{filename}"
