from flask import Blueprint
from flask_login import current_user
from sqlalchemy import func

from app.extensions import db
from app.models import Category, Favorite, Recipe, Review, SiteSetting, User

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

BANNER_DEFAULTS = {
    "site_name": "FoodieBook",
    "tagline": "Recipes, memories & the joy of cooking",
    "banner_title": "Cook something unforgettable today",
    "banner_subtitle": "A curated collection of soulful recipes, from everyday comfort food to festive feasts.",
    "banner_image": "/uploads/seed/banner.jpg",
}


def _setting_map():
    values = {item.key: item.value for item in SiteSetting.query.all()}
    return {key: values.get(key, default) for key, default in BANNER_DEFAULTS.items()}


def _favorite_counts_subquery():
    return (
        db.session.query(Favorite.recipe_id, func.count(Favorite.id).label("fav_count"))
        .group_by(Favorite.recipe_id)
        .subquery()
    )


@dashboard_bp.get("")
@dashboard_bp.get("/")
def dashboard():
    published = Recipe.query.filter_by(status="published")
    featured = (
        published.filter_by(is_featured=True)
        .order_by(Recipe.rating_avg.desc())
        .limit(3)
        .all()
    )
    if not featured:
        featured = published.order_by(Recipe.rating_avg.desc()).limit(3).all()

    fav = _favorite_counts_subquery()
    trending = (
        published.outerjoin(fav, fav.c.recipe_id == Recipe.id)
        .order_by(func.coalesce(fav.c.fav_count, 0).desc(), Recipe.rating_avg.desc())
        .limit(6)
        .all()
    )
    popular = published.order_by(Recipe.rating_avg.desc(), Recipe.rating_count.desc()).limit(6).all()
    recent = published.order_by(Recipe.created_at.desc()).limit(6).all()

    recommended = []
    if current_user.is_authenticated:
        fav_categories = (
            db.session.query(Recipe.category_id)
            .join(Favorite, Favorite.recipe_id == Recipe.id)
            .filter(Favorite.user_id == current_user.id)
            .distinct()
            .all()
        )
        category_ids = [row[0] for row in fav_categories]
        if category_ids:
            recommended = (
                published.filter(Recipe.category_id.in_(category_ids))
                .order_by(Recipe.rating_avg.desc())
                .limit(6)
                .all()
            )
        if not recommended:
            cuisine_rows = (
                db.session.query(Recipe.cuisine)
                .join(Favorite, Favorite.recipe_id == Recipe.id)
                .filter(Favorite.user_id == current_user.id)
                .distinct()
                .all()
            )
            cuisines = [row[0] for row in cuisine_rows if row[0]]
            if cuisines:
                recommended = (
                    published.filter(Recipe.cuisine.in_(cuisines)).order_by(Recipe.rating_avg.desc()).limit(6).all()
                )
    if not recommended:
        recommended = popular[:6]

    categories = (
        db.session.query(Category, func.count(Recipe.id))
        .outerjoin(Recipe, (Recipe.category_id == Category.id) & (Recipe.status == "published"))
        .filter(Category.is_active.is_(True))
        .group_by(Category.id)
        .order_by(func.count(Recipe.id).desc())
        .all()
    )

    chefs = (
        db.session.query(User, func.count(Recipe.id).label("recipe_count"))
        .join(Recipe, Recipe.author_id == User.id)
        .filter(Recipe.status == "published", User.is_active.is_(True))
        .group_by(User.id)
        .order_by(func.count(Recipe.id).desc())
        .limit(4)
        .all()
    )

    total_recipes = published.count()
    stats = {
        "total_recipes": total_recipes,
        "my_recipes": current_user.recipes.count() if current_user.is_authenticated else 0,
        "favorites": current_user.favorites.count() if current_user.is_authenticated else 0,
        "categories": Category.query.filter_by(is_active=True).count(),
        "total_users": User.query.filter_by(is_active=True).count(),
        "total_reviews": Review.query.count(),
        "average_rating": round(
            float(db.session.query(func.avg(Recipe.rating_avg)).filter(Recipe.status == "published").scalar() or 0), 2
        ),
    }

    return {
        "stats": stats,
        "featured": [recipe.to_dict(viewer=current_user) for recipe in featured],
        "trending": [recipe.to_dict(viewer=current_user) for recipe in trending],
        "popular": [recipe.to_dict(viewer=current_user) for recipe in popular],
        "recent": [recipe.to_dict(viewer=current_user) for recipe in recent],
        "recommended": [recipe.to_dict(viewer=current_user) for recipe in recommended],
        "categories": [
            {**category.to_dict(with_count=False), "recipe_count": count} for category, count in categories
        ],
        "chefs": [
            {**chef.to_dict(), "recipe_count": count} for chef, count in chefs
        ],
        "banner": _setting_map(),
    }
