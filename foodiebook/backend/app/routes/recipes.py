from datetime import datetime

from flask import Blueprint, request, send_file
from flask_login import current_user, login_required
from sqlalchemy import func, or_

from app.extensions import db
from app.models import (
    Category,
    Favorite,
    Ingredient,
    Recipe,
    RecipeIngredient,
    RecipeStep,
    Review,
)
from app.services.ingredients import resolve_ingredient
from app.services.notifications import create_notification
from app.services.pdf_service import build_recipe_pdf
from app.utils.helpers import (
    clamp_page,
    error_response,
    json_body,
    pagination_meta,
    percent,
)

recipes_bp = Blueprint("recipes", __name__, url_prefix="/api/recipes")

FOOD_TYPES = {"veg", "non-veg"}
DIFFICULTIES = {"Easy", "Medium", "Hard"}
STATUSES = {"draft", "published"}
SORTS = {"newest", "popular", "rating", "time_asc", "time_desc", "title"}


def _can_view(recipe):
    if recipe.status == "published":
        return True
    return current_user.is_authenticated and (
        current_user.id == recipe.author_id or current_user.is_admin
    )


def _can_edit(recipe):
    return current_user.is_authenticated and (
        current_user.id == recipe.author_id or current_user.is_admin
    )


def _apply_filters(query, args):
    q = (args.get("q") or "").strip()
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Recipe.title.ilike(like),
                Recipe.title_hi.ilike(like),
                Recipe.short_description.ilike(like),
                Recipe.cuisine.ilike(like),
                Recipe.category.has(Category.name.ilike(like)),
                Recipe.id.in_(
                    db.session.query(RecipeIngredient.recipe_id)
                    .join(Ingredient, Ingredient.id == RecipeIngredient.ingredient_id)
                    .filter(Ingredient.name.ilike(like))
                ),
            )
        )

    category = (args.get("category") or "").strip()
    if category:
        if category.isdigit():
            query = query.filter(Recipe.category_id == int(category))
        else:
            query = query.filter(
                Recipe.category.has(
                    or_(Category.slug == category, Category.name.ilike(category))
                )
            )

    category_id = _to_int(args.get("category_id"))
    if category_id:
        query = query.filter(Recipe.category_id == category_id)

    cuisine = (args.get("cuisine") or "").strip()
    if cuisine:
        query = query.filter(Recipe.cuisine.ilike(cuisine))

    food_type = (args.get("food_type") or "").strip()
    if food_type in FOOD_TYPES:
        query = query.filter(Recipe.food_type == food_type)

    difficulty = (args.get("difficulty") or "").strip()
    if difficulty in DIFFICULTIES:
        query = query.filter(Recipe.difficulty == difficulty)

    max_time = _to_int(args.get("max_time"))
    if max_time:
        query = query.filter(Recipe.total_time <= max_time)

    min_rating = args.get("min_rating")
    if min_rating:
        try:
            query = query.filter(Recipe.rating_avg >= float(min_rating))
        except (TypeError, ValueError):
            pass

    ingredient = (args.get("ingredient") or "").strip()
    if ingredient:
        query = query.filter(
            Recipe.id.in_(
                db.session.query(RecipeIngredient.recipe_id)
                .join(Ingredient, Ingredient.id == RecipeIngredient.ingredient_id)
                .filter(Ingredient.name.ilike(f"%{ingredient}%"))
            )
        )

    author_id = _to_int(args.get("author_id"))
    if author_id:
        query = query.filter(Recipe.author_id == author_id)

    return query


def _to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _list_response(query, args, per_page_default=12):
    sort = args.get("sort") or "newest"
    page = clamp_page(args.get("page"))
    per_page = min(max(_to_int(args.get("per_page")) or per_page_default, 1), 48)

    if sort == "popular":
        fav = (
            db.session.query(Favorite.recipe_id, func.count(Favorite.id).label("fav_count"))
            .group_by(Favorite.recipe_id)
            .subquery()
        )
        query = query.outerjoin(fav, fav.c.recipe_id == Recipe.id).order_by(
            func.coalesce(fav.c.fav_count, 0).desc(), Recipe.rating_avg.desc()
        )
    elif sort == "rating":
        query = query.order_by(Recipe.rating_avg.desc(), Recipe.rating_count.desc())
    elif sort == "time_asc":
        query = query.order_by(Recipe.total_time.asc())
    elif sort == "time_desc":
        query = query.order_by(Recipe.total_time.desc())
    elif sort == "title":
        query = query.order_by(Recipe.title.asc())
    else:
        query = query.order_by(Recipe.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": [recipe.to_dict(viewer=current_user) for recipe in pagination.items],
        "pagination": pagination_meta(pagination),
    }


@recipes_bp.get("")
@recipes_bp.get("/")
def list_recipes():
    query = Recipe.query.filter(Recipe.status == "published")
    if current_user.is_authenticated and current_user.is_admin and request.args.get("include_drafts") == "1":
        query = Recipe.query
    query = _apply_filters(query, request.args)
    return _list_response(query, request.args)


@recipes_bp.get("/mine")
@login_required
def my_recipes():
    query = Recipe.query.filter(Recipe.author_id == current_user.id)
    status = request.args.get("status")
    if status in STATUSES:
        query = query.filter(Recipe.status == status)
    query = _apply_filters(query, request.args)
    return _list_response(query, request.args)


@recipes_bp.get("/<int:recipe_id>/reviews")
def list_reviews(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe or not _can_view(recipe):
        return error_response("Recipe not found.", 404, "not_found")
    page = clamp_page(request.args.get("page"))
    per_page = min(max(_to_int(request.args.get("per_page")) or 10, 1), 50)
    query = Review.query.filter_by(recipe_id=recipe.id).order_by(Review.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": [review.to_dict() for review in pagination.items],
        "pagination": pagination_meta(pagination),
        "rating_avg": recipe.rating_avg,
        "rating_count": recipe.rating_count,
    }


@recipes_bp.post("/<int:recipe_id>/reviews")
@login_required
def create_review(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe or recipe.status != "published":
        return error_response("Recipe not found.", 404, "not_found")
    if recipe.author_id == current_user.id:
        return error_response("You cannot review your own recipe.", 400, "own_review")
    if Review.query.filter_by(user_id=current_user.id, recipe_id=recipe.id).first():
        return error_response("You have already reviewed this recipe. Edit your review instead.", 409, "review_exists")

    data = json_body()
    try:
        rating = int(data.get("rating"))
    except (TypeError, ValueError):
        rating = 0
    if rating < 1 or rating > 5:
        return error_response("Rating must be between 1 and 5.", 422, "validation_error")
    comment = (data.get("comment") or "").strip()
    if len(comment) > 2000:
        return error_response("Review is too long.", 422, "validation_error")

    review = Review(user_id=current_user.id, recipe_id=recipe.id, rating=rating, comment=comment)
    db.session.add(review)
    db.session.flush()
    recipe.refresh_rating()
    create_notification(
        recipe.author_id,
        "New review on your recipe",
        "आपकी रेसिपी पर नया रिव्यू",
        f"{current_user.name} rated “{recipe.title}” {rating}/5.",
        f"{current_user.name} ने “{recipe.title}” को {rating}/5 रेटिंग दी।",
        "review",
        f"/recipes/{recipe.id}",
    )
    db.session.commit()
    return {"review": review.to_dict(), "message": "Thank you for your review!"}, 201


@recipes_bp.put("/reviews/<int:review_id>")
@login_required
def update_review(review_id):
    review = db.session.get(Review, review_id)
    if not review:
        return error_response("Review not found.", 404, "not_found")
    if review.user_id != current_user.id and not current_user.is_admin:
        return error_response("You can only edit your own review.", 403, "forbidden")
    data = json_body()
    try:
        rating = int(data.get("rating", review.rating))
    except (TypeError, ValueError):
        rating = 0
    if rating < 1 or rating > 5:
        return error_response("Rating must be between 1 and 5.", 422, "validation_error")
    review.rating = rating
    review.comment = (data.get("comment") or "").strip()[:2000]
    review.recipe.refresh_rating()
    db.session.commit()
    return {"review": review.to_dict(), "message": "Review updated."}


@recipes_bp.delete("/reviews/<int:review_id>")
@login_required
def delete_review(review_id):
    review = db.session.get(Review, review_id)
    if not review:
        return error_response("Review not found.", 404, "not_found")
    if review.user_id != current_user.id and not current_user.is_admin:
        return error_response("You can only delete your own review.", 403, "forbidden")
    recipe = review.recipe
    db.session.delete(review)
    db.session.flush()
    if recipe:
        recipe.refresh_rating()
    db.session.commit()
    return {"message": "Review deleted."}


@recipes_bp.post("/match")
@login_required
def match_ingredients():
    data = json_body()
    raw = data.get("ingredients") or []
    if not isinstance(raw, list):
        return error_response("Ingredients must be a list.", 422, "validation_error")

    names = set()
    ids = set()
    for item in raw[:80]:
        if isinstance(item, dict):
            name = (item.get("name") or "").strip()
            if name:
                names.add(name.lower())
            if item.get("id"):
                try:
                    ids.add(int(item["id"]))
                except (TypeError, ValueError):
                    pass
        elif isinstance(item, str) and item.strip():
            names.add(item.strip().lower())

    if not names and not ids:
        return error_response("Choose at least one ingredient.", 422, "validation_error")

    matched_subq = (
        db.session.query(
            RecipeIngredient.recipe_id.label("recipe_id"),
            func.count(func.distinct(RecipeIngredient.ingredient_id)).label("matched"),
        )
        .join(Ingredient, Ingredient.id == RecipeIngredient.ingredient_id)
        .filter(
            or_(
                func.lower(Ingredient.name).in_(names),
                Ingredient.id.in_(ids) if ids else False,
            )
        )
        .group_by(RecipeIngredient.recipe_id)
        .subquery()
    )
    total_subq = (
        db.session.query(
            RecipeIngredient.recipe_id.label("recipe_id"),
            func.count(func.distinct(RecipeIngredient.ingredient_id)).label("total"),
        )
        .group_by(RecipeIngredient.recipe_id)
        .subquery()
    )
    ratio = (matched_subq.c.matched * 100.0 / total_subq.c.total)
    rows = (
        db.session.query(Recipe, matched_subq.c.matched, total_subq.c.total, ratio.label("score"))
        .join(matched_subq, matched_subq.c.recipe_id == Recipe.id)
        .join(total_subq, total_subq.c.recipe_id == Recipe.id)
        .filter(Recipe.status == "published")
        .order_by(ratio.desc(), Recipe.rating_avg.desc())
        .limit(40)
        .all()
    )

    results = []
    for recipe, matched, total, score in rows:
        missing = [
            item.ingredient.name
            for item in recipe.ingredients
            if item.ingredient and item.ingredient.id not in ids
            and item.ingredient.name.lower() not in names
        ]
        payload = recipe.to_dict(viewer=current_user)
        payload.update(
            {
                "match_percentage": round(float(score or 0), 1),
                "matched_count": int(matched),
                "total_ingredients": int(total),
                "missing_ingredients": missing[:10],
            }
        )
        results.append(payload)

    return {
        "items": results,
        "count": len(results),
        "searched": sorted(names),
    }


@recipes_bp.get("/<int:recipe_id>")
def get_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe or not _can_view(recipe):
        return error_response("Recipe not found.", 404, "not_found")
    return {"recipe": recipe.to_dict(detail=True, viewer=current_user)}


def _validate_and_fill(recipe, data, is_new=False):
    errors = {}
    title = (data.get("title") or "").strip()
    short = (data.get("short_description") or "").strip()
    if len(title) < 2:
        errors["title"] = "Recipe name must be at least 2 characters."
    if len(short) < 10:
        errors["short_description"] = "Short description must be at least 10 characters."

    category_id = _to_int(data.get("category_id"))
    category = db.session.get(Category, category_id) if category_id else None
    if not category:
        errors["category_id"] = "Choose a valid category."

    food_type = data.get("food_type") or "veg"
    if food_type not in FOOD_TYPES:
        errors["food_type"] = "Choose vegetarian or non-vegetarian."
    difficulty = data.get("difficulty") or "Easy"
    if difficulty not in DIFFICULTIES:
        errors["difficulty"] = "Choose a valid difficulty."
    status = data.get("status") or "draft"
    if status not in STATUSES:
        errors["status"] = "Choose draft or published."

    def positive(key, default, minimum=0, maximum=100000):
        value = data.get(key, default)
        try:
            value = int(value)
        except (TypeError, ValueError):
            errors[key] = "Enter a valid number."
            return default
        if value < minimum or value > maximum:
            errors[key] = f"Enter a value between {minimum} and {maximum}."
            return default
        return value

    prep = positive("prep_time", 0)
    cook = positive("cook_time", 0)
    total = data.get("total_time")
    try:
        total = int(total) if total not in (None, "") else prep + cook
    except (TypeError, ValueError):
        total = prep + cook
    if total <= 0:
        total = prep + cook
    servings = positive("servings", 2, minimum=1, maximum=200)
    calories = positive("calories", 0, maximum=20000)

    ingredients = data.get("ingredients") or []
    steps = data.get("steps") or []
    if status == "published" and (not isinstance(ingredients, list) or len(ingredients) < 1):
        errors["ingredients"] = "Add at least one ingredient before publishing."
    if status == "published" and (not isinstance(steps, list) or len(steps) < 1):
        errors["steps"] = "Add at least one step before publishing."

    if errors:
        return errors

    recipe.title = title[:200]
    recipe.title_hi = (data.get("title_hi") or "").strip()[:200] or None
    recipe.short_description = short[:500]
    recipe.short_description_hi = (data.get("short_description_hi") or "").strip()[:500] or None
    recipe.description = (data.get("description") or "").strip()
    recipe.description_hi = (data.get("description_hi") or "").strip() or None
    image = (data.get("image") or "").strip()
    if image and not (image.startswith("/uploads/") or image.startswith("http://") or image.startswith("https://")):
        errors["image"] = "Invalid image path."
        return errors
    recipe.image = image or None
    recipe.category_id = category.id
    recipe.cuisine = (data.get("cuisine") or "Indian").strip()[:80]
    recipe.cuisine_hi = (data.get("cuisine_hi") or "").strip()[:80] or None
    recipe.food_type = food_type
    recipe.prep_time = prep
    recipe.cook_time = cook
    recipe.total_time = total
    recipe.difficulty = difficulty
    recipe.servings = servings
    recipe.calories = calories
    recipe.tips = (data.get("tips") or "").strip()
    recipe.tips_hi = (data.get("tips_hi") or "").strip() or None
    video = (data.get("video_url") or "").strip()
    if video and not (video.startswith("http://") or video.startswith("https://")):
        errors["video_url"] = "Enter a valid video URL."
        return errors
    recipe.video_url = video or None

    nutrition = data.get("nutrition") or {}
    if not isinstance(nutrition, dict):
        nutrition = {}
    allowed_nutrition = {"protein", "carbs", "fat", "fiber", "sugar", "sodium"}
    recipe.nutrition = {
        key: str(value)[:30]
        for key, value in nutrition.items()
        if key in allowed_nutrition and value not in (None, "")
    }
    recipe.status = status
    if current_user.is_admin and "is_featured" in data:
        recipe.is_featured = bool(data.get("is_featured"))

    # Ingredients
    seen = set()
    parsed_ingredients = []
    if isinstance(ingredients, list):
        for item in ingredients[:60]:
            if isinstance(item, str):
                name = item.strip()
                quantity, unit, note, name_hi = "1", "", "", None
            elif isinstance(item, dict):
                name = (item.get("name") or "").strip()
                quantity = str(item.get("quantity") or "1").strip()[:50]
                unit = (item.get("unit") or "").strip()[:50]
                note = (item.get("note") or "").strip()[:160]
                name_hi = (item.get("name_hi") or "").strip()[:120] or None
            else:
                continue
            if not name:
                continue
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            parsed_ingredients.append((name, name_hi, quantity or "1", unit, note))

    parsed_steps = []
    if isinstance(steps, list):
        for index, item in enumerate(steps[:40], start=1):
            if isinstance(item, str):
                instruction = item.strip()
                instruction_hi = None
            elif isinstance(item, dict):
                instruction = (item.get("instruction") or "").strip()
                instruction_hi = (item.get("instruction_hi") or "").strip() or None
            else:
                continue
            if instruction:
                parsed_steps.append((index, instruction, instruction_hi))

    recipe.ingredients.clear()
    recipe.steps.clear()
    db.session.flush()
    for name, name_hi, quantity, unit, note in parsed_ingredients:
        ingredient = resolve_ingredient(name, name_hi)
        if ingredient:
            recipe.ingredients.append(
                RecipeIngredient(
                    ingredient_id=ingredient.id, quantity=quantity, unit=unit or None, note=note or None
                )
            )
    for number, instruction, instruction_hi in parsed_steps:
        recipe.steps.append(
            RecipeStep(step_number=number, instruction=instruction, instruction_hi=instruction_hi)
        )
    return {}


@recipes_bp.post("")
@recipes_bp.post("/")
@login_required
def create_recipe():
    data = json_body()
    recipe = Recipe(author_id=current_user.id)
    errors = _validate_and_fill(recipe, data, is_new=True)
    if errors:
        return error_response("Please correct the highlighted fields.", 422, "validation_error", errors)
    db.session.add(recipe)
    db.session.commit()
    return {
        "recipe": recipe.to_dict(detail=True, viewer=current_user),
        "message": "Recipe saved." if recipe.status == "draft" else "Recipe published!",
    }, 201


@recipes_bp.put("/<int:recipe_id>")
@recipes_bp.patch("/<int:recipe_id>")
@login_required
def update_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return error_response("Recipe not found.", 404, "not_found")
    if not _can_edit(recipe):
        return error_response("You can only edit your own recipes.", 403, "forbidden")
    data = json_body()
    errors = _validate_and_fill(recipe, data)
    if errors:
        db.session.rollback()
        return error_response("Please correct the highlighted fields.", 422, "validation_error", errors)
    db.session.commit()
    return {
        "recipe": recipe.to_dict(detail=True, viewer=current_user),
        "message": "Recipe updated successfully.",
    }


@recipes_bp.patch("/<int:recipe_id>/publish")
@login_required
def publish_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return error_response("Recipe not found.", 404, "not_found")
    if not _can_edit(recipe):
        return error_response("You can only publish your own recipes.", 403, "forbidden")
    data = json_body()
    status = data.get("status") or "published"
    if status not in STATUSES:
        return error_response("Invalid status.", 422, "validation_error")
    if status == "published" and (not recipe.ingredients or not recipe.steps):
        return error_response("Add ingredients and steps before publishing.", 422, "incomplete_recipe")
    recipe.status = status
    db.session.commit()
    return {"recipe": recipe.to_dict(detail=True, viewer=current_user), "message": "Recipe status updated."}


@recipes_bp.delete("/<int:recipe_id>")
@login_required
def delete_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return error_response("Recipe not found.", 404, "not_found")
    if not _can_edit(recipe):
        return error_response("You can only delete your own recipes.", 403, "forbidden")
    db.session.delete(recipe)
    db.session.commit()
    return {"message": "Recipe deleted."}


@recipes_bp.post("/<int:recipe_id>/favorite")
@login_required
def toggle_favorite(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe or not _can_view(recipe):
        return error_response("Recipe not found.", 404, "not_found")
    favorite = Favorite.query.filter_by(user_id=current_user.id, recipe_id=recipe.id).first()
    if favorite:
        db.session.delete(favorite)
        db.session.commit()
        return {
            "is_favorited": False,
            "favorite_count": recipe.favorites.count(),
            "message": "Removed from favourites.",
        }
    db.session.add(Favorite(user_id=current_user.id, recipe_id=recipe.id))
    if recipe.author_id != current_user.id:
        create_notification(
            recipe.author_id,
            "Someone saved your recipe",
            "किसी ने आपकी रेसिपी सहेजी",
            f"{current_user.name} added “{recipe.title}” to their favourites.",
            f"{current_user.name} ने “{recipe.title}” को अपने पसंदीदा में जोड़ा।",
            "favorite",
            f"/recipes/{recipe.id}",
        )
    db.session.commit()
    return {
        "is_favorited": True,
        "favorite_count": recipe.favorites.count(),
        "message": "Added to favourites.",
    }


@recipes_bp.get("/<int:recipe_id>/pdf")
@login_required
def download_pdf(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe or not _can_view(recipe):
        return error_response("Recipe not found.", 404, "not_found")
    buffer = build_recipe_pdf(recipe)
    safe = "".join(ch for ch in recipe.title if ch.isalnum() or ch in " -_")[:60].strip() or "recipe"
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"FoodieBook-{safe}.pdf",
    )
