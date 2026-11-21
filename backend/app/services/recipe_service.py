from sqlalchemy import func, or_

from app.extensions import db
from app.models import Category, Ingredient, Recipe, RecipeIngredient, Review
from app.utils.validators import parse_int


def recalc_total_time(recipe: Recipe) -> None:
    recipe.total_time = int(recipe.prep_time or 0) + int(recipe.cook_time or 0)


def _rating_ids(minimum: float):
    return (
        db.session.query(Review.recipe_id)
        .group_by(Review.recipe_id)
        .having(func.avg(Review.rating) >= minimum)
        .subquery()
    )


def query_recipes(args, public_only=True, base_query=None):
    query = base_query if base_query is not None else Recipe.query

    status = (args.get("status") or "").strip()
    if public_only:
        query = query.filter(Recipe.status == "published")
    elif status in {"draft", "published"}:
        query = query.filter(Recipe.status == status)

    q = (args.get("q") or "").strip()
    if q:
        like = f"%{q}%"
        ingredient_recipe_ids = (
            db.session.query(RecipeIngredient.recipe_id)
            .join(Ingredient)
            .filter(Ingredient.name.ilike(like))
            .subquery()
        )
        query = query.filter(
            or_(
                Recipe.title.ilike(like),
                Recipe.short_description.ilike(like),
                Recipe.description.ilike(like),
                Recipe.cuisine.ilike(like),
                Recipe.id.in_(db.session.query(ingredient_recipe_ids.c.recipe_id)),
            )
        )

    category = (args.get("category") or "").strip()
    if category:
        if category.isdigit():
            query = query.filter(Recipe.category_id == int(category))
        else:
            query = query.join(Category).filter(Category.slug == category)

    cuisine = (args.get("cuisine") or "").strip()
    if cuisine:
        query = query.filter(Recipe.cuisine.ilike(cuisine))

    diet = (args.get("diet") or "").strip().lower()
    if diet in {"veg", "nonveg", "non-veg"}:
        query = query.filter(Recipe.diet == ("nonveg" if diet.startswith("non") else "veg"))

    difficulty = (args.get("difficulty") or "").strip()
    if difficulty:
        query = query.filter(Recipe.difficulty == difficulty)

    max_time = parse_int(args.get("max_time"), None, 1)
    if max_time:
        query = query.filter(Recipe.total_time <= max_time)

    min_rating = args.get("min_rating")
    try:
        min_rating_value = float(min_rating) if min_rating not in (None, "") else 0
    except (TypeError, ValueError):
        min_rating_value = 0
    if min_rating_value > 0:
        ids = _rating_ids(min_rating_value)
        query = query.filter(Recipe.id.in_(db.session.query(ids.c.recipe_id)))

    ingredient = (args.get("ingredient") or "").strip()
    if ingredient:
        ingredient_ids = (
            db.session.query(RecipeIngredient.recipe_id)
            .join(Ingredient)
            .filter(Ingredient.name.ilike(f"%{ingredient}%"))
            .subquery()
        )
        query = query.filter(Recipe.id.in_(db.session.query(ingredient_ids.c.recipe_id)))

    author_id = parse_int(args.get("author_id"), None, 1)
    if author_id:
        query = query.filter(Recipe.author_id == author_id)

    if str(args.get("featured", "")).lower() in {"1", "true", "yes"}:
        query = query.filter(Recipe.is_featured.is_(True))

    sort = (args.get("sort") or "newest").strip()
    if sort == "oldest":
        query = query.order_by(Recipe.created_at.asc())
    elif sort == "rating":
        avg = (
            db.session.query(Review.recipe_id.label("rid"), func.avg(Review.rating).label("avg_rating"))
            .group_by(Review.recipe_id)
            .subquery()
        )
        query = query.outerjoin(avg, avg.c.rid == Recipe.id).order_by(func.coalesce(avg.c.avg_rating, 0).desc())
    elif sort == "popular":
        query = query.order_by(Recipe.view_count.desc(), Recipe.created_at.desc())
    elif sort == "time_asc":
        query = query.order_by(Recipe.total_time.asc())
    elif sort == "time_desc":
        query = query.order_by(Recipe.total_time.desc())
    elif sort == "title":
        query = query.order_by(Recipe.title.asc())
    else:
        query = query.order_by(Recipe.created_at.desc())

    return query


def paginate(query, args, default_per_page=12, max_per_page=48):
    page = parse_int(args.get("page"), 1, 1)
    per_page = parse_int(args.get("per_page"), default_per_page, 1, max_per_page)
    return query.paginate(page=page, per_page=per_page, error_out=False)


def kitchen_matches(selected_names: list[str], limit: int = 30):
    normalized = {name.strip().lower() for name in selected_names if name and name.strip()}
    if not normalized:
        return []

    recipes = Recipe.query.filter(Recipe.status == "published").order_by(Recipe.created_at.desc()).all()
    matches = []
    for recipe in recipes:
        recipe_names = {link.ingredient.name.strip().lower() for link in recipe.ingredients}
        if not recipe_names:
            continue
        matched = sorted(normalized & recipe_names)
        if not matched:
            continue
        percentage = round((len(matched) / len(recipe_names)) * 100)
        missing = sorted(recipe_names - normalized)
        matches.append(
            {
                "recipe": recipe,
                "match_percentage": percentage,
                "matched_ingredients": matched,
                "missing_ingredients": missing,
                "matched_count": len(matched),
            }
        )

    matches.sort(
        key=lambda item: (item["match_percentage"], item["matched_count"], -len(item["missing_ingredients"])),
        reverse=True,
    )
    return matches[:limit]


def filter_metadata():
    cuisines = [
        row[0]
        for row in db.session.query(Recipe.cuisine)
        .filter(Recipe.cuisine.isnot(None), Recipe.status == "published")
        .distinct()
        .order_by(Recipe.cuisine.asc())
        .all()
        if row[0]
    ]
    ingredients = [
        {"name": name, "name_hi": name_hi, "category": category}
        for name, name_hi, category in db.session.query(Ingredient.name, Ingredient.name_hi, Ingredient.category)
        .order_by(Ingredient.name.asc())
        .limit(400)
        .all()
    ]
    return {
        "cuisines": cuisines,
        "difficulties": ["Easy", "Medium", "Hard"],
        "ingredients": ingredients,
        "sort_options": ["newest", "oldest", "rating", "popular", "time_asc", "time_desc", "title"],
    }
