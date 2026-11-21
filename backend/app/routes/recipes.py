import json
import re
import unicodedata

from flask import Blueprint, Response, request
from flask_login import current_user, login_required
from sqlalchemy import func

from app.extensions import db
from app.models import Category, Ingredient, Recipe, RecipeIngredient, RecipeStep
from app.services.pdf_service import build_recipe_pdf
from app.services.recipe_service import filter_metadata, kitchen_matches, paginate, query_recipes, recalc_total_time
from app.utils.images import delete_upload, save_image
from app.utils.responses import fail, ok, recipe_card, recipe_detail
from app.utils.validators import clean_str, parse_bool, parse_int

recipes_bp = Blueprint("recipes", __name__)


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:200] or "recipe"


def unique_slug(title: str, recipe_id: int | None = None) -> str:
    base = slugify(title)
    candidate = base
    index = 2
    while Recipe.query.filter(Recipe.slug == candidate, Recipe.id != (recipe_id or 0)).first():
        candidate = f"{base}-{index}"
        index += 1
    return candidate


def _payload():
    if request.form:
        return request.form
    return request.get_json(silent=True) or {}


def _json_field(data, key, fallback):
    raw = data.get(key)
    if raw is None:
        return fallback
    if isinstance(raw, (list, dict)):
        return raw
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return fallback


def _normalize_diet(value) -> str:
    value = (value or "veg").strip().lower()
    return "nonveg" if value in {"nonveg", "non-veg", "non veg", "non_veg"} else "veg"


def _validate_recipe(data, is_create=True):
    errors = {}
    title = clean_str(data.get("title"), 200)
    if len(title) < 3:
        errors["title"] = "Recipe name must be at least 3 characters."

    category_id = parse_int(data.get("category_id"), None, 1)
    category = db.session.get(Category, category_id) if category_id else None
    if category_id and not category:
        errors["category_id"] = "Choose a valid category."
    if is_create and not category_id:
        errors["category_id"] = "Category is required."

    difficulty = clean_str(data.get("difficulty"), 20).title() or "Easy"
    if difficulty not in {"Easy", "Medium", "Hard"}:
        errors["difficulty"] = "Difficulty must be Easy, Medium or Hard."

    prep_time = parse_int(data.get("prep_time"), 0, 0, 100000)
    cook_time = parse_int(data.get("cook_time"), 0, 0, 100000)
    servings = parse_int(data.get("servings"), 2, 1, 500)
    calories = parse_int(data.get("calories"), None, 0, 100000)

    status = clean_str(data.get("status"), 20) or "draft"
    if status not in {"draft", "published"}:
        status = "draft"

    ingredients = _json_field(data, "ingredients", [])
    if not isinstance(ingredients, list):
        ingredients = []
    cleaned_ingredients = []
    seen = set()
    for item in ingredients:
        if not isinstance(item, dict):
            continue
        name = clean_str(item.get("name"), 120)
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        cleaned_ingredients.append(
            {
                "name": name,
                "quantity": clean_str(item.get("quantity"), 60),
                "unit": clean_str(item.get("unit"), 40),
                "notes": clean_str(item.get("notes"), 160),
            }
        )
    if not cleaned_ingredients:
        errors["ingredients"] = "Add at least one ingredient."

    steps = _json_field(data, "steps", [])
    if not isinstance(steps, list):
        steps = []
    cleaned_steps = []
    for item in steps:
        if isinstance(item, str):
            item = {"instruction": item}
        if not isinstance(item, dict):
            continue
        instruction = clean_str(item.get("instruction"), 4000)
        if not instruction:
            continue
        cleaned_steps.append(
            {
                "step_number": len(cleaned_steps) + 1,
                "instruction": instruction,
                "timer_seconds": parse_int(item.get("timer_seconds"), 0, 0, 86400),
            }
        )
    if not cleaned_steps:
        errors["steps"] = "Add at least one cooking step."

    nutrition = _json_field(data, "nutrition", {})
    if not isinstance(nutrition, dict):
        nutrition = {}
    clean_nutrition = {}
    for key in ("protein", "carbs", "fat", "fiber", "sugar", "sodium"):
        value = clean_str(nutrition.get(key), 40)
        if value:
            clean_nutrition[key] = value

    video_url = clean_str(data.get("video_url"), 500)
    if video_url and not re.match(r"^https?://", video_url):
        errors["video_url"] = "Video URL must start with http:// or https://."

    return errors, {
        "title": title,
        "short_description": clean_str(data.get("short_description"), 400),
        "description": clean_str(data.get("description"), 20000),
        "category": category,
        "cuisine": clean_str(data.get("cuisine"), 80) or "Indian",
        "diet": _normalize_diet(data.get("diet")),
        "difficulty": difficulty,
        "prep_time": prep_time,
        "cook_time": cook_time,
        "servings": servings,
        "calories": calories,
        "status": status,
        "tips": clean_str(data.get("tips"), 5000),
        "video_url": video_url or None,
        "nutrition": clean_nutrition,
        "ingredients": cleaned_ingredients,
        "steps": cleaned_steps,
    }


def _apply_ingredients(recipe, items):
    recipe.ingredients.clear()
    db.session.flush()
    for item in items:
        ingredient = Ingredient.query.filter(func.lower(Ingredient.name) == item["name"].lower()).first()
        if not ingredient:
            ingredient = Ingredient(name=item["name"], category="Pantry")
            db.session.add(ingredient)
            db.session.flush()
        recipe.ingredients.append(
            RecipeIngredient(
                ingredient_id=ingredient.id,
                quantity=item["quantity"],
                unit=item["unit"],
                notes=item["notes"],
            )
        )


def _apply_steps(recipe, steps):
    recipe.steps.clear()
    db.session.flush()
    for step in steps:
        recipe.steps.append(
            RecipeStep(
                step_number=step["step_number"],
                instruction=step["instruction"],
                timer_seconds=step["timer_seconds"],
            )
        )


def _can_view(recipe):
    if recipe.status == "published":
        return True
    if not current_user.is_authenticated:
        return False
    return current_user.id == recipe.author_id or current_user.is_admin


@recipes_bp.get("")
def list_recipes():
    query = query_recipes(request.args, public_only=True)
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


@recipes_bp.get("/mine")
@login_required
def my_recipes():
    query = Recipe.query.filter(Recipe.author_id == current_user.id)
    status = (request.args.get("status") or "").strip()
    if status in {"draft", "published"}:
        query = query.filter(Recipe.status == status)
    pagination = paginate(query.order_by(Recipe.updated_at.desc()), request.args, default_per_page=9)
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


@recipes_bp.get("/filters")
def filters():
    return ok(filter_metadata())


@recipes_bp.get("/kitchen")
def kitchen():
    raw = request.args.get("ingredients", "")
    names = [item.strip() for item in raw.split(",") if item.strip()]
    matches = kitchen_matches(names)
    return ok(
        {
            "selected": names,
            "results": [
                {
                    "recipe": recipe_card(item["recipe"], current_user),
                    "match_percentage": item["match_percentage"],
                    "matched_ingredients": item["matched_ingredients"],
                    "missing_ingredients": item["missing_ingredients"],
                }
                for item in matches
            ],
        }
    )


@recipes_bp.get("/<int:recipe_id>")
def get_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe or not _can_view(recipe):
        return fail("Recipe not found.", 404)
    if recipe.status == "published":
        recipe.view_count = (recipe.view_count or 0) + 1
        db.session.commit()
    return ok(recipe_detail(recipe, current_user))


@recipes_bp.post("")
@login_required
def create_recipe():
    data = _payload()
    errors, values = _validate_recipe(data, is_create=True)
    if errors:
        return fail("Please correct the highlighted fields.", 422, errors)

    image_path = None
    file = request.files.get("image")
    if file and file.filename:
        try:
            image_path = save_image(file, "recipes")
        except ValueError as exc:
            return fail(str(exc), 422, {"image": str(exc)})

    category = values.pop("category")
    ingredients = values.pop("ingredients")
    steps = values.pop("steps")
    recipe = Recipe(
        author_id=current_user.id,
        slug=unique_slug(values["title"]),
        image=image_path,
        is_featured=current_user.is_admin and parse_bool(data.get("is_featured"), False),
        category_id=category.id if category else None,
        **values,
    )
    recalc_total_time(recipe)
    db.session.add(recipe)
    db.session.flush()
    _apply_ingredients(recipe, ingredients)
    _apply_steps(recipe, steps)
    db.session.commit()

    message = "Recipe published successfully." if recipe.status == "published" else "Draft saved successfully."
    return ok(recipe_detail(recipe, current_user), message, 201)


@recipes_bp.put("/<int:recipe_id>")
@login_required
def update_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return fail("Recipe not found.", 404)
    if current_user.id != recipe.author_id and not current_user.is_admin:
        return fail("You can only edit your own recipes.", 403)

    data = _payload()
    errors, values = _validate_recipe(data, is_create=False)
    if errors:
        return fail("Please correct the highlighted fields.", 422, errors)

    file = request.files.get("image")
    if file and file.filename:
        try:
            new_path = save_image(file, "recipes")
        except ValueError as exc:
            return fail(str(exc), 422, {"image": str(exc)})
        old_path = recipe.image
        recipe.image = new_path
        delete_upload(old_path)
    elif parse_bool(data.get("remove_image"), False):
        delete_upload(recipe.image)
        recipe.image = None

    category = values.pop("category")
    ingredients = values.pop("ingredients")
    steps = values.pop("steps")

    if recipe.title != values["title"]:
        recipe.slug = unique_slug(values["title"], recipe.id)

    for key, value in values.items():
        setattr(recipe, key, value)
    recipe.category_id = category.id if category else None
    if current_user.is_admin and "is_featured" in data:
        recipe.is_featured = parse_bool(data.get("is_featured"), recipe.is_featured)
    recalc_total_time(recipe)

    _apply_ingredients(recipe, ingredients)
    _apply_steps(recipe, steps)
    db.session.commit()
    return ok(recipe_detail(recipe, current_user), "Recipe updated successfully.")


@recipes_bp.patch("/<int:recipe_id>/status")
@login_required
def set_status(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return fail("Recipe not found.", 404)
    if current_user.id != recipe.author_id and not current_user.is_admin:
        return fail("You can only manage your own recipes.", 403)
    payload = request.get_json(silent=True) or {}
    status = clean_str(payload.get("status"), 20)
    if status not in {"draft", "published"}:
        return fail("Status must be draft or published.", 422)
    recipe.status = status
    db.session.commit()
    return ok(
        recipe_detail(recipe, current_user),
        "Recipe published." if status == "published" else "Recipe moved to drafts.",
    )


@recipes_bp.delete("/<int:recipe_id>")
@login_required
def delete_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return fail("Recipe not found.", 404)
    if current_user.id != recipe.author_id and not current_user.is_admin:
        return fail("You can only delete your own recipes.", 403)
    image = recipe.image
    db.session.delete(recipe)
    db.session.commit()
    delete_upload(image)
    return ok(message="Recipe deleted.")


@recipes_bp.get("/<int:recipe_id>/similar")
def similar_recipes(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return fail("Recipe not found.", 404)
    query = Recipe.query.filter(Recipe.id != recipe.id, Recipe.status == "published")
    if recipe.category_id:
        query = query.filter(Recipe.category_id == recipe.category_id)
    items = query.order_by(Recipe.created_at.desc()).limit(4).all()
    if len(items) < 4 and recipe.cuisine:
        extra = (
            Recipe.query.filter(
                Recipe.id != recipe.id,
                Recipe.id.notin_([item.id for item in items]),
                Recipe.status == "published",
                Recipe.cuisine == recipe.cuisine,
            )
            .limit(4 - len(items))
            .all()
        )
        items.extend(extra)
    return ok([recipe_card(item, current_user) for item in items])


@recipes_bp.get("/<int:recipe_id>/pdf")
def recipe_pdf(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe or not _can_view(recipe):
        return fail("Recipe not found.", 404)
    pdf_bytes = build_recipe_pdf(recipe)
    filename = f"{slugify(recipe.title)}-foodiebook.pdf"
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
