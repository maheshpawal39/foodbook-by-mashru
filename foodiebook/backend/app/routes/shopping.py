from flask import Blueprint, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Recipe, ShoppingList, ShoppingListItem
from app.utils.helpers import error_response, json_body

shopping_bp = Blueprint("shopping", __name__, url_prefix="/api/shopping-list")


def _get_list():
    shopping = ShoppingList.query.filter_by(user_id=current_user.id).first()
    if not shopping:
        shopping = ShoppingList(user_id=current_user.id)
        db.session.add(shopping)
        db.session.commit()
    return shopping


@shopping_bp.get("")
@shopping_bp.get("/")
@login_required
def get_shopping_list():
    return {"shopping_list": _get_list().to_dict()}


@shopping_bp.post("/items")
@login_required
def add_item():
    data = json_body()
    name = (data.get("name") or "").strip()
    if len(name) < 1:
        return error_response("Item name is required.", 422, "validation_error")
    quantity = str(data.get("quantity") or "").strip()[:50]
    unit = str(data.get("unit") or "").strip()[:50]
    shopping = _get_list()

    existing = next(
        (
            item
            for item in shopping.items
            if item.name.lower() == name.lower()
            and (item.unit or "").lower() == unit.lower()
            and not item.is_purchased
        ),
        None,
    )
    if existing:
        existing.quantity = f"{existing.quantity or ''} + {quantity}".strip(" +")[:50] if quantity else existing.quantity
        db.session.commit()
        return {"item": existing.to_dict(), "message": "Item quantity updated."}

    item = ShoppingListItem(
        shopping_list_id=shopping.id,
        name=name[:160],
        quantity=quantity or None,
        unit=unit or None,
    )
    db.session.add(item)
    db.session.commit()
    return {"item": item.to_dict(), "message": "Added to shopping list."}, 201


@shopping_bp.patch("/items/<int:item_id>")
@login_required
def update_item(item_id):
    shopping = _get_list()
    item = ShoppingListItem.query.filter_by(id=item_id, shopping_list_id=shopping.id).first()
    if not item:
        return error_response("Shopping item not found.", 404, "not_found")
    data = json_body()
    if "is_purchased" in data:
        item.is_purchased = bool(data["is_purchased"])
    if "name" in data:
        name = (data.get("name") or "").strip()
        if name:
            item.name = name[:160]
    if "quantity" in data:
        item.quantity = str(data.get("quantity") or "").strip()[:50] or None
    if "unit" in data:
        item.unit = str(data.get("unit") or "").strip()[:50] or None
    db.session.commit()
    return {"item": item.to_dict(), "message": "Shopping list updated."}


@shopping_bp.delete("/items/<int:item_id>")
@login_required
def delete_item(item_id):
    shopping = _get_list()
    item = ShoppingListItem.query.filter_by(id=item_id, shopping_list_id=shopping.id).first()
    if not item:
        return error_response("Shopping item not found.", 404, "not_found")
    db.session.delete(item)
    db.session.commit()
    return {"message": "Item removed."}


@shopping_bp.post("/from-recipe/<int:recipe_id>")
@login_required
def add_from_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe or recipe.status != "published":
        return error_response("Recipe not found.", 404, "not_found")
    shopping = _get_list()
    added = 0
    for ingredient in recipe.ingredients:
        if not ingredient.ingredient:
            continue
        name = ingredient.ingredient.name
        exists = next(
            (
                item
                for item in shopping.items
                if item.name.lower() == name.lower() and item.unit == (ingredient.unit or None)
            ),
            None,
        )
        if exists:
            continue
        db.session.add(
            ShoppingListItem(
                shopping_list_id=shopping.id,
                name=name[:160],
                quantity=ingredient.quantity,
                unit=ingredient.unit,
                recipe_id=recipe.id,
            )
        )
        added += 1
    db.session.commit()
    return {
        "shopping_list": shopping.to_dict(),
        "added": added,
        "message": f"{added} ingredients added to your shopping list.",
    }


@shopping_bp.post("/clear-purchased")
@login_required
def clear_purchased():
    shopping = _get_list()
    removed = 0
    for item in list(shopping.items):
        if item.is_purchased:
            db.session.delete(item)
            removed += 1
    db.session.commit()
    return {"message": f"{removed} purchased items cleared.", "shopping_list": shopping.to_dict()}


@shopping_bp.delete("/clear")
@login_required
def clear_all():
    shopping = _get_list()
    ShoppingListItem.query.filter_by(shopping_list_id=shopping.id).delete()
    db.session.commit()
    return {"message": "Shopping list cleared.", "shopping_list": shopping.to_dict()}


@shopping_bp.patch("")
@shopping_bp.patch("/")
@login_required
def rename_list():
    shopping = _get_list()
    data = json_body()
    name = (data.get("name") or "").strip()
    if name:
        shopping.name = name[:120]
        db.session.commit()
    return {"shopping_list": shopping.to_dict(), "message": "Shopping list updated."}
