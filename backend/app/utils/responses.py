from datetime import datetime, timezone

from flask import jsonify


def _iso(value):
    if not value:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return value


def image_url(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith(("http://", "https://", "/")):
        return path
    return f"/uploads/{path.lstrip('/')}"


def user_brief(user) -> dict | None:
    if not user:
        return None
    return {"id": user.id, "name": user.name, "avatar": image_url(user.avatar)}


def user_dict(user, include_email: bool = False) -> dict:
    data = {
        "id": user.id,
        "name": user.name,
        "avatar": image_url(user.avatar),
        "bio": user.bio,
        "role": user.role.name if user.role else "user",
        "is_admin": user.is_admin,
        "is_active": user.is_active,
        "recipe_count": user.recipes.count(),
        "favorite_count": user.favorites.count(),
        "review_count": user.reviews.count(),
        "created_at": _iso(user.created_at),
    }
    if include_email:
        data["email"] = user.email
    return data


def category_dict(category, include_count: bool = True) -> dict:
    data = {
        "id": category.id,
        "name": category.name,
        "name_hi": category.name_hi,
        "slug": category.slug,
        "description": category.description,
        "icon": category.icon,
        "image": image_url(category.image),
        "sort_order": category.sort_order,
    }
    if include_count:
        data["recipe_count"] = category.recipes.filter_by(status="published").count()
    return data


def ingredient_dict(link) -> dict:
    ingredient = link.ingredient
    return {
        "id": ingredient.id,
        "name": ingredient.name,
        "name_hi": ingredient.name_hi,
        "category": ingredient.category,
        "quantity": link.quantity,
        "unit": link.unit,
        "notes": link.notes,
    }


def review_dict(review, current_user=None) -> dict:
    return {
        "id": review.id,
        "rating": review.rating,
        "comment": review.comment,
        "user": user_brief(review.user),
        "recipe_id": review.recipe_id,
        "recipe_title": review.recipe.title if review.recipe else None,
        "is_owner": bool(current_user and current_user.is_authenticated and review.user_id == current_user.id),
        "created_at": _iso(review.created_at),
        "updated_at": _iso(review.updated_at),
    }


def recipe_card(recipe, current_user=None) -> dict:
    is_favorite = False
    if current_user and current_user.is_authenticated:
        is_favorite = recipe.favorites.filter_by(user_id=current_user.id).first() is not None
    return {
        "id": recipe.id,
        "title": recipe.title,
        "slug": recipe.slug,
        "short_description": recipe.short_description,
        "image": image_url(recipe.image),
        "category": category_dict(recipe.category, include_count=False) if recipe.category else None,
        "cuisine": recipe.cuisine,
        "diet": recipe.diet,
        "prep_time": recipe.prep_time,
        "cook_time": recipe.cook_time,
        "total_time": recipe.total_time,
        "difficulty": recipe.difficulty,
        "servings": recipe.servings,
        "calories": recipe.calories,
        "status": recipe.status,
        "is_featured": recipe.is_featured,
        "average_rating": recipe.average_rating,
        "review_count": recipe.review_count,
        "favorite_count": recipe.favorite_count,
        "is_favorite": is_favorite,
        "view_count": recipe.view_count,
        "author": user_brief(recipe.author),
        "created_at": _iso(recipe.created_at),
        "updated_at": _iso(recipe.updated_at),
    }


def recipe_detail(recipe, current_user=None) -> dict:
    data = recipe_card(recipe, current_user)
    user_review = None
    if current_user and current_user.is_authenticated:
        own = next((r for r in recipe.reviews if r.user_id == current_user.id), None)
        if own:
            user_review = review_dict(own, current_user)
    can_edit = bool(
        current_user and current_user.is_authenticated and (current_user.id == recipe.author_id or current_user.is_admin)
    )
    data.update(
        {
            "description": recipe.description,
            "tips": recipe.tips,
            "video_url": recipe.video_url,
            "nutrition": recipe.nutrition or {},
            "ingredients": [ingredient_dict(link) for link in recipe.ingredients],
            "steps": [
                {
                    "id": step.id,
                    "step_number": step.step_number,
                    "instruction": step.instruction,
                    "timer_seconds": step.timer_seconds or 0,
                }
                for step in recipe.steps
            ],
            "reviews": [
                review_dict(r, current_user)
                for r in sorted(recipe.reviews, key=lambda r: r.created_at, reverse=True)
            ],
            "user_review": user_review,
            "can_edit": can_edit,
            "step_count": len(recipe.steps),
        }
    )
    return data


def notification_dict(note) -> dict:
    return {
        "id": note.id,
        "title": note.title,
        "message": note.message,
        "type": note.type,
        "link": note.link,
        "is_read": note.is_read,
        "created_at": _iso(note.created_at),
    }


def shopping_list_dict(shopping_list) -> dict:
    items = sorted(shopping_list.items, key=lambda item: (item.is_purchased, item.category or "", item.name.lower()))
    return {
        "id": shopping_list.id,
        "name": shopping_list.name,
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "quantity": item.quantity,
                "unit": item.unit,
                "category": item.category,
                "is_purchased": item.is_purchased,
                "created_at": _iso(item.created_at),
            }
            for item in items
        ],
        "total": len(items),
        "purchased": sum(1 for item in items if item.is_purchased),
        "updated_at": _iso(shopping_list.updated_at),
    }


def report_dict(report) -> dict:
    return {
        "id": report.id,
        "reason": report.reason,
        "details": report.details,
        "status": report.status,
        "reporter": user_brief(report.reporter),
        "recipe": (
            {"id": report.recipe.id, "title": report.recipe.title, "image": image_url(report.recipe.image)}
            if report.recipe
            else None
        ),
        "review": (
            {
                "id": report.review.id,
                "rating": report.review.rating,
                "comment": report.review.comment,
                "user": user_brief(report.review.user),
            }
            if report.review
            else None
        ),
        "created_at": _iso(report.created_at),
    }


def ok(data=None, message=None, status=200, **extra):
    payload = {"success": True}
    if data is not None:
        payload["data"] = data
    if message:
        payload["message"] = message
    payload.update(extra)
    return jsonify(payload), status


def fail(message="Request failed", status=400, errors=None):
    payload = {"success": False, "message": message}
    if errors:
        payload["errors"] = errors
    return jsonify(payload), status
