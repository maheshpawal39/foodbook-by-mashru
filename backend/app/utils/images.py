import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import current_app
from PIL import Image, UnidentifiedImageError
from werkzeug.utils import secure_filename

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
EXTENSION_BY_FORMAT = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


class ImageValidationError(ValueError):
    pass


def allowed_file(filename: str) -> bool:
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return extension in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]


def save_image(file_storage, subfolder: str) -> str:
    if file_storage is None or not getattr(file_storage, "filename", ""):
        raise ImageValidationError("No image file was provided.")
    if not allowed_file(file_storage.filename):
        raise ImageValidationError("Only JPG, JPEG, PNG and WEBP images are allowed.")

    upload_root = Path(current_app.config["UPLOAD_FOLDER"])
    target_dir = upload_root / subfolder
    target_dir.mkdir(parents=True, exist_ok=True)

    try:
        original = Image.open(file_storage.stream)
        original.verify()
        file_storage.stream.seek(0)
        image = Image.open(file_storage.stream)
        image_format = (image.format or "").upper()
        width, height = image.size
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageValidationError("The uploaded file is not a valid image.") from exc

    if image_format not in ALLOWED_FORMATS:
        raise ImageValidationError("Only JPG, JPEG, PNG and WEBP images are allowed.")
    if width < 50 or height < 50:
        raise ImageValidationError("Image is too small. Use at least 50x50 pixels.")
    if width > 8000 or height > 8000:
        raise ImageValidationError("Image dimensions are too large (maximum 8000px).")

    extension = EXTENSION_BY_FORMAT[image_format]
    safe_base = secure_filename(Path(file_storage.filename).stem)[:40] or "image"
    filename = f"{safe_base}-{secrets.token_hex(6)}.{extension}"
    destination = target_dir / filename

    if extension == "jpg":
        image = image.convert("RGB")
        image.save(destination, "JPEG", quality=88, optimize=True)
    else:
        image.save(destination, image_format, optimize=True)

    return f"{subfolder}/{filename}"


def delete_upload(relative_path: str | None) -> None:
    if not relative_path or relative_path.startswith(("http://", "https://", "/")):
        return
    upload_root = Path(current_app.config["UPLOAD_FOLDER"]).resolve()
    candidate = (upload_root / relative_path).resolve()
    if upload_root in candidate.parents and candidate.is_file():
        try:
            candidate.unlink()
        except OSError:
            pass


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_reset_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(40)
    return token, hash_token(token)


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def reset_expiry() -> datetime:
    minutes = current_app.config["PASSWORD_RESET_TOKEN_MINUTES"]
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)
