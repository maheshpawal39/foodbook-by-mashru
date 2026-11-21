from flask import Blueprint

from app.extensions import db
from app.models import Category

categories_bp = Blueprint("categories", __name__, url_prefix="/api/categories")


@categories_bp.get("")
@categories_bp.get("/")
def list_categories():
    categories = Category.query.filter_by(is_active=True).order_by(Category.name.asc()).all()
    return {"items": [category.to_dict() for category in categories]}
