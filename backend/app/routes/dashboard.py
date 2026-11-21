from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy import func

from app.extensions import db
from app.models import Category, Favorite, Recipe, Review, User
from app.services.recipe_service import query_recipes
from app.utils.responses import category_dict, ok, recipe_card, user_brief

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("")
@login_required
def dashboard():
    published = Recipe.query.filter(Recipe.status == "published")
    total_recipes = published.count()
    my_recipes = Recipe.query.filter(Recipe.author_id == current_user.id).count()
    favorites = Favorite.query.filter_by(user_id=current_user.id).count()
    categories_count = Category.query.count()

    featured = (
        published.filter(Recipe.is_featured.is_(True)).order_by(Recipe.updated_at.desc()).first()
        or published.order_by(Recipe.view_count.desc()).first()
        or published.order_by(Recipe.created_at.desc()).first()
    )

    trending = published.order_by(Recipe.view_count.desc(), Recipe.created_at.desc()).limit(6).all()

    popular = (
        db.session.query(Recipe)
        .outerjoin(Review, Review.recipe_id == Recipe.id)
        .filter(Recipe.status == "published")
        .group_by(Recipe.id)
        .order_by(func.count(Review.id).desc(), Recipe.view_count.desc())
        .limit(6)
        .all()
    )

    recent = published.order_by(Recipe.created_at.desc()).limit(6).all()

    favorite_category_ids = [
        row[0]
        for row in db.session.query(Recipe.category_id)
        .join(Favorite, Favorite.recipe_id == Recipe.id)
        .filter(Favorite.user_id == current_user.id, Recipe.category_id.isnot(None))
        .distinct()
        .all()
    ]
    recommended_query = published.filter(Recipe.author_id != current_user.id)
    if favorite_category_ids:
        recommended_query = recommended_query.filter(Recipe.category_id.in_(favorite_category_ids))
    recommended = recommended_query.order_by(Recipe.created_at.desc()).limit(6).all()
    if len(recommended) < 4:
        existing_ids = [recipe.id for recipe in recommended]
        recommended.extend(
            published.filter(Recipe.id.notin_(existing_ids))
            .order_by(Recipe.view_count.desc())
            .limit(6 - len(recommended))
            .all()
        )

    categories = Category.query.order_by(Category.sort_order.asc()).all()

    chef_rows = (
        db.session.query(User, func.count(Recipe.id).label("recipe_count"))
        .join(Recipe, Recipe.author_id == User.id)
        .filter(Recipe.status == "published")
        .group_by(User.id)
        .order_by(func.count(Recipe.id).desc())
        .limit(4)
        .all()
    )
    chefs = []
    for user, count in chef_rows:
        user_recipes = [recipe for recipe in user.recipes if recipe.status == "published"]
        ratings = [recipe.average_rating for recipe in user_recipes if recipe.average_rating]
        chefs.append(
            {
                **user_brief(user),
                "bio": user.bio,
                "recipe_count": count,
                "avg_rating": round(sum(ratings) / len(ratings), 1) if ratings else 0,
            }
        )

    return ok(
        {
            "greeting_name": current_user.name,
            "stats": {
                "total_recipes": total_recipes,
                "my_recipes": my_recipes,
                "favorites": favorites,
                "categories": categories_count,
            },
            "featured": recipe_card(featured, current_user) if featured else None,
            "trending": [recipe_card(recipe, current_user) for recipe in trending],
            "popular": [recipe_card(recipe, current_user) for recipe in popular],
            "recent": [recipe_card(recipe, current_user) for recipe in recent],
            "recommended": [recipe_card(recipe, current_user) for recipe in recommended],
            "categories": [category_dict(category) for category in categories[:10]],
            "chefs": chefs,
        }
    )


@dashboard_bp.get("/search")
@login_required
def quick_search():
    q = (request.args.get("q") or "").strip()
    query = query_recipes({"q": q}, public_only=True) if q else query_recipes({}, public_only=True)
    return ok([recipe_card(recipe, current_user) for recipe in query.limit(8).all()])
