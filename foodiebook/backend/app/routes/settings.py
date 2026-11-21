from flask import Blueprint

from app.models import SiteSetting

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

PUBLIC_KEYS = {
    "site_name",
    "tagline",
    "contact_email",
    "banner_title",
    "banner_subtitle",
    "banner_image",
    "about_text",
}


@settings_bp.get("")
@settings_bp.get("/")
def public_settings():
    items = SiteSetting.query.filter(SiteSetting.key.in_(PUBLIC_KEYS)).all()
    return {"settings": {item.key: item.value for item in items}}
