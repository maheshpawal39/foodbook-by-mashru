from flask import Blueprint, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Favorite, Recipe
from app.utils.helpers import clamp_page, error_response, pagination_meta

users_bp = Blueprint("users", __name__, url_prefix="/api")


@users_bp.get("/users/<int:user_id>")
def chef_profile(user_id):
    from app.models import User

    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return error_response("User not found.", 404, "not_found")
    recipes = (
        Recipe.query.filter_by(author_id=user.id, status="published")
        .order_by(Recipe.created_at.desc())
        .limit(12)
        .all()
    )
    return {
        "user": user.to_dict(),
        "recipes": [recipe.to_dict(viewer=current_user) for recipe in recipes],
    }


@users_bp.get("/favorites")
@login_required
def list_favorites():
    from app.models import Favorite

    page = clamp_page(request.args.get("page"))
    per_page = min(max(int(request.args.get("per_page", 12) or 12), 1), 48)
    pagination = (
        Favorite.query.filter_by(user_id=current_user.id)
        .order_by(Favorite.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    items = []
    for favorite in pagination.items:
        if favorite.recipe:
            items.append(favorite.recipe.to_dict(viewer=current_user))
    return {"items": items, "pagination": pagination_meta(pagination)}


@users_bp.get("/my-reviews")
@login_required
def my_reviews():
    from app.models import Review

    reviews = (
        Review.query.filter_by(user_id=current_user.id)
        .order_by(Review.created_at.desc())
        .limit(100)
        .all()
    )
    return {
        "items": [
            {
                **review.to_dict(),
                "recipe": {
                    "id": review.recipe.id,
                    "title": review.recipe.title,
                    "title_hi": review.recipe.title_hi,
                    "image": review.recipe.image,
                }
                if review.recipe
                else None,
            }
            for review in reviews
        ]
    }


@users_bp.delete("/favorites/<int:recipe_id>")
@login_required
def remove_favorite(recipe_id):
    favorite = Favorite.query.filter_by(user_id=current_user.id, recipe_id=recipe_id).first()
    if not favorite:
        return error_response("Favourite not found.", 404, "not_found")
    db.session.delete(favorite)
    db.session.commit()
    return {"message": "Removed from favourites."}
