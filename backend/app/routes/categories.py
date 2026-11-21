import re
import unicodedata

from flask import Blueprint, request
from flask_login import login_required

from app.extensions import db
from app.models import Category
from app.utils.decorators import admin_required
from app.utils.responses import category_dict, fail, ok
from app.utils.validators import clean_str, parse_int

categories_bp = Blueprint("categories", __name__)


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "category"


@categories_bp.get("")
def list_categories():
    categories = Category.query.order_by(Category.sort_order.asc(), Category.name.asc()).all()
    return ok([category_dict(category) for category in categories])


@categories_bp.get("/<int:category_id>")
def get_category(category_id):
    category = db.session.get(Category, category_id)
    if not category:
        return fail("Category not found.", 404)
    return ok(category_dict(category))


@categories_bp.post("")
@login_required
@admin_required
def create_category():
    payload = request.get_json(silent=True) or {}
    name = clean_str(payload.get("name"), 80)
    if len(name) < 2:
        return fail("Category name is required.", 422, {"name": "Category name is required."})
    if Category.query.filter(db.func.lower(Category.name) == name.lower()).first():
        return fail("A category with this name already exists.", 409, {"name": "Name already in use."})

    base_slug = _slugify(clean_str(payload.get("slug"), 100) or name)
    slug = base_slug
    counter = 2
    while Category.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    category = Category(
        name=name,
        name_hi=clean_str(payload.get("name_hi"), 120) or None,
        slug=slug,
        description=clean_str(payload.get("description"), 500) or None,
        icon=clean_str(payload.get("icon"), 40) or "UtensilsCrossed",
        image=clean_str(payload.get("image"), 500) or None,
        sort_order=parse_int(payload.get("sort_order"), 0, 0) or 0,
    )
    db.session.add(category)
    db.session.commit()
    return ok(category_dict(category), "Category created.", 201)


@categories_bp.put("/<int:category_id>")
@login_required
@admin_required
def update_category(category_id):
    category = db.session.get(Category, category_id)
    if not category:
        return fail("Category not found.", 404)
    payload = request.get_json(silent=True) or {}
    name = clean_str(payload.get("name"), 80)
    if len(name) < 2:
        return fail("Category name is required.", 422, {"name": "Category name is required."})
    duplicate = Category.query.filter(db.func.lower(Category.name) == name.lower(), Category.id != category.id).first()
    if duplicate:
        return fail("A category with this name already exists.", 409, {"name": "Name already in use."})

    category.name = name
    category.name_hi = clean_str(payload.get("name_hi"), 120) or None
    category.description = clean_str(payload.get("description"), 500) or None
    category.icon = clean_str(payload.get("icon"), 40) or category.icon
    category.image = clean_str(payload.get("image"), 500) or None
    category.sort_order = parse_int(payload.get("sort_order"), category.sort_order, 0) or 0
    db.session.commit()
    return ok(category_dict(category), "Category updated.")


@categories_bp.delete("/<int:category_id>")
@login_required
@admin_required
def delete_category(category_id):
    category = db.session.get(Category, category_id)
    if not category:
        return fail("Category not found.", 404)
    if category.recipes.count() > 0:
        return fail("This category still has recipes. Move or delete those recipes first.", 409)
    db.session.delete(category)
    db.session.commit()
    return ok(message="Category deleted.")
