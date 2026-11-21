import re

from email_validator import EmailNotValidError, validate_email

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def clean_str(value, max_len=None, default=""):
    if value is None:
        return default
    text = str(value).strip()
    if max_len:
        text = text[:max_len]
    return text


def validate_email_address(email: str) -> str | None:
    if not email or not EMAIL_RE.match(email):
        return "Please enter a valid email address."
    try:
        validate_email(email, check_deliverability=False)
    except EmailNotValidError:
        return "Please enter a valid email address."
    return None


def validate_password(password: str) -> str | None:
    if not password or len(password) < 8:
        return "Password must be at least 8 characters long."
    if len(password) > 128:
        return "Password is too long."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Password must include at least one letter and one number."
    return None


def parse_int(value, default=None, minimum=None, maximum=None):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    if minimum is not None and number < minimum:
        return minimum
    if maximum is not None and number > maximum:
        return maximum
    return number


def parse_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on", "veg"}
