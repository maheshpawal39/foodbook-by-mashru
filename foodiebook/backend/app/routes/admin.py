from datetime import datetime, timedelta, timezone

from flask import Blueprint, request
from flask_login import current_user
from sqlalchemy import func, or_

from app.extensions import db
from app.models import (
    Category,
    Favorite,
    Recipe,
    Report,
    Review,
    Role,
    SiteSetting,
    User,
)
from app.utils.helpers import (
    admin_required,
    clamp_page,
    error_response,
    json_body,
    pagination_meta,
    slugify,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/stats")
@admin_required
def stats():
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    category_rows = (
        db.session.query(Category.name, Category.name_hi, func.count(Recipe.id))
        .outerjoin(Recipe, (Recipe.category_id == Category.id) & (Recipe.status == "published"))
        .group_by(Category.id)
        .order_by(func.count(Recipe.id).desc())
        .all()
    )
    return {
        "users": {
            "total": User.query.count(),
            "active": User.query.filter_by(is_active=True).count(),
            "admins": User.query.join(Role).filter(Role.name == "admin").count(),
            "new_this_week": User.query.filter(User.created_at >= week_ago).count(),
        },
        "recipes": {
            "total": Recipe.query.count(),
            "published": Recipe.query.filter_by(status="published").count(),
            "drafts": Recipe.query.filter_by(status="draft").count(),
            "featured": Recipe.query.filter_by(is_featured=True).count(),
            "new_this_week": Recipe.query.filter(Recipe.created_at >= week_ago).count(),
        },
        "categories": Category.query.count(),
        "reviews": Review.query.count(),
        "favorites": Favorite.query.count(),
        "reports_open": Report.query.filter_by(status="open").count(),
        "settings_count": SiteSetting.query.count(),
        "avg_rating": round(
            float(db.session.query(func.avg(Review.rating)).scalar() or 0), 2
        ),
        "categories_breakdown": [
            {"name": name, "name_hi": name_hi, "count": count}
            for name, name_hi, count in category_rows
        ],
    }


@admin_bp.get("/users")
@admin_required
def list_users():
    page = clamp_page(request.args.get("page"))
    per_page = min(max(int(request.args.get("per_page", 20) or 20), 1), 100)
    q = (request.args.get("q") or "").strip()
    query = User.query
    if q:
        query = query.filter(or_(User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))
    role = request.args.get("role")
    if role in ("admin", "user"):
        query = query.join(Role).filter(Role.name == role)
    pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": [
            {
                **user.to_dict(private=True),
                "recipe_count": user.recipes.count(),
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            }
            for user in pagination.items
        ],
        "pagination": pagination_meta(pagination),
    }


@admin_bp.patch("/users/<int:user_id>")
@admin_required
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return error_response("User not found.", 404, "not_found")
    data = json_body()
    if "role" in data:
        role = Role.query.filter_by(name=data.get("role")).first()
        if not role:
            return error_response("Invalid role.", 422, "validation_error")
        if user.id == current_user.id and role.name != "admin":
            return error_response("You cannot remove your own admin role.", 400, "forbidden")
        user.role = role
    if "is_active" in data:
        if user.id == current_user.id and not data.get("is_active"):
            return error_response("You cannot deactivate your own account.", 400, "forbidden")
        user.is_active = bool(data.get("is_active"))
    db.session.commit()
    return {"user": user.to_dict(private=True), "message": "User updated."}


@admin_bp.delete("/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return error_response("User not found.", 404, "not_found")
    if user.id == current_user.id:
        return error_response("You cannot delete your own account.", 400, "forbidden")
    db.session.delete(user)
    db.session.commit()
    return {"message": "User deleted."}


@admin_bp.get("/recipes")
@admin_required
def list_recipes():
    page = clamp_page(request.args.get("page"))
    per_page = min(max(int(request.args.get("per_page", 20) or 20), 1), 100)
    q = (request.args.get("q") or "").strip()
    query = Recipe.query
    if q:
        query = query.filter(Recipe.title.ilike(f"%{q}%"))
    status = request.args.get("status")
    if status in ("draft", "published"):
        query = query.filter_by(status=status)
    if request.args.get("featured") == "1":
        query = query.filter_by(is_featured=True)
    pagination = query.order_by(Recipe.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": [
            {**recipe.to_dict(viewer=current_user), "author": recipe.author.to_dict() if recipe.author else None}
            for recipe in pagination.items
        ],
        "pagination": pagination_meta(pagination),
    }


@admin_bp.patch("/recipes/<int:recipe_id>")
@admin_required
def update_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return error_response("Recipe not found.", 404, "not_found")
    data = json_body()
    if "status" in data:
        if data["status"] not in ("draft", "published"):
            return error_response("Invalid status.", 422, "validation_error")
        recipe.status = data["status"]
    if "is_featured" in data:
        recipe.is_featured = bool(data["is_featured"])
    db.session.commit()
    return {"recipe": recipe.to_dict(viewer=current_user), "message": "Recipe updated."}


@admin_bp.delete("/recipes/<int:recipe_id>")
@admin_required
def delete_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return error_response("Recipe not found.", 404, "not_found")
    db.session.delete(recipe)
    db.session.commit()
    return {"message": "Recipe deleted."}


@admin_bp.get("/categories")
@admin_required
def list_categories():
    items = Category.query.order_by(Category.name.asc()).all()
    return {"items": [category.to_dict() for category in items]}


@admin_bp.post("/categories")
@admin_required
def create_category():
    data = json_body()
    name = (data.get("name") or "").strip()
    name_hi = (data.get("name_hi") or "").strip()
    if len(name) < 2 or len(name_hi) < 1:
        return error_response("English and Hindi category names are required.", 422, "validation_error")
    if Category.query.filter(func.lower(Category.name) == name.lower()).first():
        return error_response("A category with this name already exists.", 409, "category_exists")
    base_slug = slugify(name)
    slug = base_slug
    counter = 2
    while Category.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    category = Category(
        name=name[:80],
        name_hi=name_hi[:80],
        slug=slug,
        description=(data.get("description") or "").strip(),
        description_hi=(data.get("description_hi") or "").strip(),
        icon=(data.get("icon") or "Utensils")[:50],
        image=(data.get("image") or "").strip() or None,
    )
    db.session.add(category)
    db.session.commit()
    return {"category": category.to_dict(), "message": "Category created."}, 201


@admin_bp.patch("/categories/<int:category_id>")
@admin_required
def update_category(category_id):
    category = db.session.get(Category, category_id)
    if not category:
        return error_response("Category not found.", 404, "not_found")
    data = json_body()
    if "name" in data:
        name = (data.get("name") or "").strip()
        if len(name) < 2:
            return error_response("Category name is too short.", 422, "validation_error")
        duplicate = Category.query.filter(
            func.lower(Category.name) == name.lower(), Category.id != category.id
        ).first()
        if duplicate:
            return error_response("A category with this name already exists.", 409, "category_exists")
        category.name = name[:80]
        if not data.get("slug"):
            base_slug = slugify(name)
            slug = base_slug
            counter = 2
            while Category.query.filter(Category.slug == slug, Category.id != category.id).first():
                slug = f"{base_slug}-{counter}"
                counter += 1
            category.slug = slug
    if "slug" in data and data.get("slug"):
        category.slug = slugify(data["slug"])[:100]
    for field in ("name_hi", "description", "description_hi", "icon", "image"):
        if field in data:
            setattr(category, field, (data.get(field) or "").strip() or ("" if field == "description" else None))
    if "is_active" in data:
        category.is_active = bool(data["is_active"])
    db.session.commit()
    return {"category": category.to_dict(), "message": "Category updated."}


@admin_bp.delete("/categories/<int:category_id>")
@admin_required
def delete_category(category_id):
    category = db.session.get(Category, category_id)
    if not category:
        return error_response("Category not found.", 404, "not_found")
    if category.recipes.count() > 0:
        return error_response(
            "This category still has recipes. Deactivate it or move its recipes first.",
            409,
            "category_in_use",
        )
    db.session.delete(category)
    db.session.commit()
    return {"message": "Category deleted."}


@admin_bp.get("/reviews")
@admin_required
def list_reviews():
    page = clamp_page(request.args.get("page"))
    per_page = min(max(int(request.args.get("per_page", 20) or 20), 1), 100)
    q = (request.args.get("q") or "").strip()
    query = Review.query
    if q:
        query = query.filter(or_(Review.comment.ilike(f"%{q}%"), Recipe.title.ilike(f"%{q}%")))
        query = query.join(Recipe, Recipe.id == Review.recipe_id)
    pagination = query.order_by(Review.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": [
            {
                **review.to_dict(),
                "recipe": {"id": review.recipe.id, "title": review.recipe.title},
            }
            for review in pagination.items
        ],
        "pagination": pagination_meta(pagination),
    }


@admin_bp.delete("/reviews/<int:review_id>")
@admin_required
def delete_review(review_id):
    review = db.session.get(Review, review_id)
    if not review:
        return error_response("Review not found.", 404, "not_found")
    recipe = review.recipe
    db.session.delete(review)
    db.session.flush()
    if recipe:
        recipe.refresh_rating()
    db.session.commit()
    return {"message": "Review deleted."}


@admin_bp.get("/reports")
@admin_required
def list_reports():
    status = request.args.get("status")
    query = Report.query
    if status in ("open", "resolved", "dismissed"):
        query = query.filter_by(status=status)
    items = query.order_by(Report.created_at.desc()).limit(100).all()
    return {"items": [report.to_dict() for report in items]}


@admin_bp.patch("/reports/<int:report_id>")
@admin_required
def update_report(report_id):
    report = db.session.get(Report, report_id)
    if not report:
        return error_response("Report not found.", 404, "not_found")
    data = json_body()
    status = data.get("status")
    if status not in ("open", "resolved", "dismissed"):
        return error_response("Invalid report status.", 422, "validation_error")
    report.status = status
    if status != "open":
        report.resolved_at = datetime.now(timezone.utc)
    if data.get("delete_content"):
        if report.target_type == "review":
            target = db.session.get(Review, report.target_id)
            if target:
                recipe = target.recipe
                db.session.delete(target)
                db.session.flush()
                if recipe:
                    recipe.refresh_rating()
        elif report.target_type == "recipe":
            target = db.session.get(Recipe, report.target_id)
            if target:
                db.session.delete(target)
    db.session.commit()
    return {"report": report.to_dict(), "message": "Report updated."}


@admin_bp.get("/settings")
@admin_required
def list_settings():
    items = SiteSetting.query.order_by(SiteSetting.key.asc()).all()
    return {"items": [item.to_dict() for item in items]}


@admin_bp.put("/settings")
@admin_required
def update_settings():
    data = json_body()
    values = data.get("settings") if isinstance(data.get("settings"), dict) else data
    if not isinstance(values, dict):
        return error_response("Invalid settings payload.", 422, "validation_error")
    updated = 0
    for key, value in values.items():
        if not isinstance(key, str) or not key.strip() or len(key) > 100:
            continue
        setting = SiteSetting.query.filter_by(key=key).first()
        if not setting:
            setting = SiteSetting(key=key)
            db.session.add(setting)
        setting.value = str(value)[:2000] if value is not None else ""
        updated += 1
    db.session.commit()
    return {"message": f"{updated} settings saved.", "settings": {s.key: s.value for s in SiteSetting.query.all()}}
