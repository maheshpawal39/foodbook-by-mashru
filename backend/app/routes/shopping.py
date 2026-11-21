from flask import Blueprint, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Recipe, ShoppingListItem
from app.utils.responses import fail, ok, shopping_list_dict
from app.utils.validators import clean_str, parse_bool

shopping_bp = Blueprint("shopping", __name__)

CATEGORIES = {"Produce", "Dairy", "Bakery", "Pantry", "Spices", "Meat", "Seafood", "Frozen", "Other"}


def _normalize_category(value):
    value = clean_str(value, 60).title() or "Other"
    return value if value in CATEGORIES else "Other"


@shopping_bp.get("")
@login_required
def get_list():
    shopping_list = current_user.default_list()
    db.session.commit()
    return ok(shopping_list_dict(shopping_list))


@shopping_bp.post("/items")
@login_required
def add_item():
    payload = request.get_json(silent=True) or {}
    name = clean_str(payload.get("name"), 160)
    if not name:
        return fail("Ingredient name is required.", 422, {"name": "Ingredient name is required."})
    shopping_list = current_user.default_list()
    db.session.add(
        ShoppingListItem(
            shopping_list_id=shopping_list.id,
            name=name,
            quantity=clean_str(payload.get("quantity"), 60),
            unit=clean_str(payload.get("unit"), 40),
            category=_normalize_category(payload.get("category")),
        )
    )
    db.session.commit()
    return ok(shopping_list_dict(shopping_list), "Item added to shopping list.", 201)


@shopping_bp.put("/items/<int:item_id>")
@login_required
def update_item(item_id):
    item = db.session.get(ShoppingListItem, item_id)
    if not item or item.shopping_list.user_id != current_user.id:
        return fail("Shopping list item not found.", 404)
    payload = request.get_json(silent=True) or {}
    if "name" in payload:
        name = clean_str(payload.get("name"), 160)
        if not name:
            return fail("Ingredient name cannot be empty.", 422, {"name": "Name is required."})
        item.name = name
    if "quantity" in payload:
        item.quantity = clean_str(payload.get("quantity"), 60)
    if "unit" in payload:
        item.unit = clean_str(payload.get("unit"), 40)
    if "category" in payload:
        item.category = _normalize_category(payload.get("category"))
    if "is_purchased" in payload:
        item.is_purchased = parse_bool(payload.get("is_purchased"), item.is_purchased)
    db.session.commit()
    return ok(shopping_list_dict(item.shopping_list), "Shopping list updated.")


@shopping_bp.delete("/items/<int:item_id>")
@login_required
def delete_item(item_id):
    item = db.session.get(ShoppingListItem, item_id)
    if not item or item.shopping_list.user_id != current_user.id:
        return fail("Shopping list item not found.", 404)
    shopping_list = item.shopping_list
    db.session.delete(item)
    db.session.commit()
    return ok(shopping_list_dict(shopping_list), "Item removed.")


@shopping_bp.delete("/purchased")
@login_required
def clear_purchased():
    shopping_list = current_user.default_list()
    deleted = ShoppingListItem.query.filter_by(shopping_list_id=shopping_list.id, is_purchased=True).delete()
    db.session.commit()
    return ok(shopping_list_dict(shopping_list), f"Removed {deleted} purchased item(s).")


@shopping_bp.post("/from-recipe/<int:recipe_id>")
@login_required
def add_from_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return fail("Recipe not found.", 404)
    shopping_list = current_user.default_list()
    existing = {item.name.lower() for item in shopping_list.items}
    added = 0
    for link in recipe.ingredients:
        if link.ingredient.name.lower() in existing:
            continue
        db.session.add(
            ShoppingListItem(
                shopping_list_id=shopping_list.id,
                name=link.ingredient.name,
                quantity=link.quantity,
                unit=link.unit,
                category="Other",
            )
        )
        existing.add(link.ingredient.name.lower())
        added += 1
    db.session.commit()
    message = (
        f"Added {added} ingredient(s) from “{recipe.title}”."
        if added
        else "All ingredients are already on your list."
    )
    return ok(shopping_list_dict(shopping_list), message, 201 if added else 200)
