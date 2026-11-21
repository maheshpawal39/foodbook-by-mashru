from flask import Blueprint, request
from flask_login import login_required

from app.extensions import db
from app.models import Recipe, SiteSetting
from app.utils.decorators import admin_required
from app.utils.responses import image_url, ok
from app.utils.validators import clean_str

settings_bp = Blueprint("settings", __name__)

DEFAULT_SETTINGS = {
    "site_name": "FoodieBook",
    "site_tagline": "by Marshru",
    "site_description": "A premium home for recipes, flavours and the people who cook them.",
    "about_text": "FoodieBook by Marshru is a bilingual recipe management and food discovery platform built for passionate home cooks.",
    "contact_email": "hello@foodiebook.app",
    "instagram_url": "",
    "youtube_url": "",
    "featured_recipe_ids": "",
    "maintenance_mode": "false",
}


def _all_settings() -> dict:
    stored = {setting.key: setting.value for setting in SiteSetting.query.all()}
    return {**DEFAULT_SETTINGS, **stored}


def _settings_payload() -> dict:
    values = _all_settings()
    featured_ids = [
        int(item) for item in (values.get("featured_recipe_ids") or "").split(",") if item.strip().isdigit()
    ]
    featured = (
        Recipe.query.filter(Recipe.id.in_(featured_ids), Recipe.status == "published").all() if featured_ids else []
    )
    return {
        **values,
        "featured_recipes": [
            {"id": recipe.id, "title": recipe.title, "image": image_url(recipe.image)} for recipe in featured
        ],
    }


@settings_bp.get("/settings")
def get_public_settings():
    return ok(_settings_payload())


@settings_bp.put("/settings")
@login_required
@admin_required
def update_settings():
    payload = request.get_json(silent=True) or {}
    allowed = set(DEFAULT_SETTINGS.keys())
    for key, value in payload.items():
        if key not in allowed:
            continue
        text = clean_str(value, 5000)
        if key == "maintenance_mode":
            text = "true" if str(value).lower() in {"1", "true", "yes", "on"} else "false"
        if key == "featured_recipe_ids":
            ids = []
            for part in str(value).split(","):
                part = part.strip()
                if part.isdigit():
                    ids.append(part)
            text = ",".join(dict.fromkeys(ids))
        setting = db.session.get(SiteSetting, key)
        if setting:
            setting.value = text
        else:
            db.session.add(SiteSetting(key=key, value=text))
    db.session.commit()
    return ok(_settings_payload(), "Website settings saved.")
