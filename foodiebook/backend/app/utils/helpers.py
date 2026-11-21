import math
import re
import secrets
from functools import wraps

from flask import abort, jsonify, request, session
from flask_login import current_user


def error_response(message, status=400, code="bad_request", errors=None):
    payload = {"message": message, "code": code}
    if errors:
        payload["errors"] = errors
    return jsonify(payload), status


def json_body():
    return request.get_json(silent=True) or {}


def clamp_page(value, default=1):
    try:
        page = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, page)


def pagination_meta(pagination):
    return {
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
        "total": pagination.total,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
    }


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return error_response("Please sign in first.", 401, "auth_required")
        if not current_user.is_admin:
            return error_response("Administrator access is required.", 403, "admin_required")
        return fn(*args, **kwargs)

    return wrapper


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9\u0900-\u097F]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or secrets.token_hex(4)


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def validate_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$", email or ""))


def validate_password(password: str):
    if not password or len(password) < 8:
        return "Password must be at least 8 characters long."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Password must contain at least one letter and one number."
    return None


def parse_int(value, default=None, minimum=None, maximum=None):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    if minimum is not None:
        number = max(minimum, number)
    if maximum is not None:
        number = min(maximum, number)
    return number


def mask_email(email: str) -> str:
    try:
        name, domain = email.split("@", 1)
    except ValueError:
        return "***"
    if len(name) <= 2:
        return f"{name[0]}***@{domain}"
    return f"{name[:2]}***{name[-1:]}@{domain}"


def percent(part, whole):
    if not whole:
        return 0
    return round((part / whole) * 100, 1)


def csrf_token():
    token = session.get("_csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token


def init_csrf(app):
    @app.before_request
    def _csrf_protect():
        if not app.config.get("CSRF_ENABLED", True):
            return None
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return None
        if request.endpoint in {"auth.csrf", "health", "static"}:
            return None
        expected = session.get("_csrf_token")
        provided = request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")
        if not expected or not provided or not secrets.compare_digest(str(expected), str(provided)):
            return error_response("Security token missing or invalid. Refresh and try again.", 403, "csrf_failed")
        return None


def safe_math_round(value, digits=1):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return 0
    return round(float(value), digits)
