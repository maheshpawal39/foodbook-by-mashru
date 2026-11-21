from flask import Blueprint, request

from app.models import Ingredient
from app.utils.helpers import clamp_page

ingredients_bp = Blueprint("ingredients", __name__, url_prefix="/api/ingredients")


@ingredients_bp.get("")
@ingredients_bp.get("/")
def list_ingredients():
    q = (request.args.get("q") or "").strip()
    limit = min(max(int(request.args.get("limit", 20) or 20), 1), 100)
    query = Ingredient.query
    if q:
        query = query.filter(Ingredient.name.ilike(f"%{q}%"))
    items = query.order_by(Ingredient.name.asc()).limit(limit).all()
    return {"items": [item.to_dict() for item in items]}
