from flask import Blueprint, request
from flask_login import login_required

from app.utils.helpers import error_response
from app.utils.uploads import UploadError, save_image

uploads_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")


@uploads_bp.post("")
@login_required
def upload_image():
    if "file" not in request.files:
        return error_response("No image was provided.", 422, "no_file")
    kind = request.form.get("kind", "recipe")
    if kind not in ("recipe", "avatar"):
        kind = "recipe"
    try:
        path = save_image(request.files["file"], kind=kind)
    except UploadError as exc:
        return error_response(str(exc), 422, "upload_error")
    return {"path": path, "url": path, "message": "Image uploaded."}, 201
