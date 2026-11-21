from flask import Blueprint, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Favorite, Recipe, Report, Review
from app.services.notification_service import notify
from app.services.recipe_service import paginate
from app.utils.responses import fail, ok, recipe_card, review_dict
from app.utils.validators import clean_str, parse_int

interactions_bp = Blueprint("interactions", __name__)


@interactions_bp.get("/favorites")
@login_required
def list_favorites():
    query = (
        Recipe.query.join(Favorite, Favorite.recipe_id == Recipe.id)
        .filter(Favorite.user_id == current_user.id, Recipe.status == "published")
        .order_by(Favorite.created_at.desc())
    )
    pagination = paginate(query, request.args)
    return ok(
        [recipe_card(recipe, current_user) for recipe in pagination.items],
        pagination={
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
            "total": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        },
    )


@interactions_bp.post("/recipes/<int:recipe_id>/favorite")
@login_required
def add_favorite(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe or (recipe.status != "published" and recipe.author_id != current_user.id and not current_user.is_admin):
        return fail("Recipe not found.", 404)
    existing = Favorite.query.filter_by(user_id=current_user.id, recipe_id=recipe.id).first()
    if existing:
        return ok({"is_favorite": True}, "Recipe is already in your favourites.")
    db.session.add(Favorite(user_id=current_user.id, recipe_id=recipe.id))
    if recipe.author_id != current_user.id:
        notify(
            recipe.author_id,
            "Your recipe was saved",
            f"{current_user.name} added “{recipe.title}” to their favourites.",
            "favorite",
            f"/recipes/{recipe.id}",
        )
    db.session.commit()
    return ok({"is_favorite": True, "favorite_count": recipe.favorite_count}, "Added to favourites.", 201)


@interactions_bp.delete("/recipes/<int:recipe_id>/favorite")
@login_required
def remove_favorite(recipe_id):
    favorite = Favorite.query.filter_by(user_id=current_user.id, recipe_id=recipe_id).first()
    if not favorite:
        return fail("This recipe is not in your favourites.", 404)
    recipe = favorite.recipe
    db.session.delete(favorite)
    db.session.commit()
    return ok(
        {"is_favorite": False, "favorite_count": recipe.favorite_count if recipe else 0},
        "Removed from favourites.",
    )


@interactions_bp.get("/recipes/<int:recipe_id>/reviews")
def list_reviews(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return fail("Recipe not found.", 404)
    reviews = Review.query.filter_by(recipe_id=recipe_id).order_by(Review.created_at.desc()).all()
    return ok(
        {
            "reviews": [review_dict(review, current_user) for review in reviews],
            "average_rating": recipe.average_rating,
            "review_count": recipe.review_count,
        }
    )


@interactions_bp.post("/recipes/<int:recipe_id>/reviews")
@login_required
def create_review(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return fail("Recipe not found.", 404)
    payload = request.get_json(silent=True) or {}
    rating = parse_int(payload.get("rating"), None, 1, 5)
    comment = clean_str(payload.get("comment"), 2000)
    if not rating:
        return fail("Choose a rating between 1 and 5.", 422, {"rating": "Rating is required."})
    if not comment:
        return fail("Write a short review.", 422, {"comment": "Review is required."})
    existing = Review.query.filter_by(user_id=current_user.id, recipe_id=recipe.id).first()
    if existing:
        return fail("You have already reviewed this recipe. Edit your existing review instead.", 409)

    review = Review(user_id=current_user.id, recipe_id=recipe.id, rating=rating, comment=comment)
    db.session.add(review)
    if recipe.author_id != current_user.id:
        notify(
            recipe.author_id,
            "New review on your recipe",
            f"{current_user.name} rated “{recipe.title}” {rating}★.",
            "review",
            f"/recipes/{recipe.id}#reviews",
        )
    db.session.commit()
    return ok(review_dict(review, current_user), "Review posted. Thank you!", 201)


@interactions_bp.put("/reviews/<int:review_id>")
@login_required
def update_review(review_id):
    review = db.session.get(Review, review_id)
    if not review:
        return fail("Review not found.", 404)
    if review.user_id != current_user.id and not current_user.is_admin:
        return fail("You can only edit your own review.", 403)
    payload = request.get_json(silent=True) or {}
    rating = parse_int(payload.get("rating"), review.rating, 1, 5)
    comment = clean_str(payload.get("comment"), 2000)
    if not comment:
        return fail("Write a short review.", 422, {"comment": "Review is required."})
    review.rating = rating
    review.comment = comment
    db.session.commit()
    return ok(review_dict(review, current_user), "Review updated.")


@interactions_bp.delete("/reviews/<int:review_id>")
@login_required
def delete_review(review_id):
    review = db.session.get(Review, review_id)
    if not review:
        return fail("Review not found.", 404)
    if review.user_id != current_user.id and not current_user.is_admin:
        return fail("You can only delete your own review.", 403)
    db.session.delete(review)
    db.session.commit()
    return ok(message="Review deleted.")


@interactions_bp.get("/reviews/mine")
@login_required
def my_reviews():
    reviews = Review.query.filter_by(user_id=current_user.id).order_by(Review.created_at.desc()).all()
    return ok([review_dict(review, current_user) for review in reviews])


@interactions_bp.post("/reports")
@login_required
def create_report():
    payload = request.get_json(silent=True) or {}
    recipe_id = parse_int(payload.get("recipe_id"), None, 1)
    review_id = parse_int(payload.get("review_id"), None, 1)
    reason = clean_str(payload.get("reason"), 160)
    details = clean_str(payload.get("details"), 1000)
    if not reason:
        return fail("Tell us why you are reporting this content.", 422, {"reason": "Reason is required."})
    if not recipe_id and not review_id:
        return fail("Report target is missing.", 422)
    if recipe_id and not db.session.get(Recipe, recipe_id):
        return fail("Recipe not found.", 404)
    if review_id and not db.session.get(Review, review_id):
        return fail("Review not found.", 404)
    existing = Report.query.filter_by(
        reporter_id=current_user.id, recipe_id=recipe_id or None, review_id=review_id or None, status="pending"
    ).first()
    if existing:
        return fail("You already reported this content. Our team will review it.", 409)
    report = Report(
        reporter_id=current_user.id,
        recipe_id=recipe_id or None,
        review_id=review_id or None,
        reason=reason,
        details=details,
    )
    db.session.add(report)
    db.session.commit()
    return ok(message="Thank you. Our moderators will review this report.", status=201)
