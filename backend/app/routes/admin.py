from datetime import datetime, timedelta, timezone

from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy import or_

from app.extensions import db
from app.models import Category, Favorite, Recipe, Report, Review, Role, User
from app.services.recipe_service import paginate, query_recipes
from app.utils.decorators import admin_required
from app.utils.responses import category_dict, fail, ok, recipe_card, report_dict, review_dict, user_dict
from app.utils.validators import clean_str, parse_bool

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/stats")
@login_required
@admin_required
def stats():
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    return ok(
        {
            "users": User.query.count(),
            "recipes": Recipe.query.count(),
            "published_recipes": Recipe.query.filter_by(status="published").count(),
            "drafts": Recipe.query.filter_by(status="draft").count(),
            "categories": Category.query.count(),
            "reviews": Review.query.count(),
            "favorites": Favorite.query.count(),
            "pending_reports": Report.query.filter_by(status="pending").count(),
            "new_users_week": User.query.filter(User.created_at >= week_ago).count(),
            "new_recipes_week": Recipe.query.filter(Recipe.created_at >= week_ago).count(),
            "recent_users": [
                user_dict(user, include_email=True) for user in User.query.order_by(User.created_at.desc()).limit(5).all()
            ],
            "recent_recipes": [
                recipe_card(recipe) for recipe in Recipe.query.order_by(Recipe.created_at.desc()).limit(5).all()
            ],
            "recent_reviews": [
                review_dict(review) for review in Review.query.order_by(Review.created_at.desc()).limit(5).all()
            ],
        }
    )


@admin_bp.get("/users")
@login_required
@admin_required
def list_users():
    query = User.query
    q = clean_str(request.args.get("q"), 120)
    if q:
        query = query.filter(or_(User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))
    role = clean_str(request.args.get("role"), 20)
    if role in {"admin", "user"}:
        query = query.join(User.role).filter(Role.name == role)
    pagination = paginate(query.order_by(User.created_at.desc()), request.args, default_per_page=15)
    return ok(
        [user_dict(user, include_email=True) for user in pagination.items],
        pagination={
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
            "total": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        },
    )


@admin_bp.patch("/users/<int:user_id>")
@login_required
@admin_required
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return fail("User not found.", 404)
    payload = request.get_json(silent=True) or {}

    if "role" in payload:
        role_name = clean_str(payload.get("role"), 20)
        if role_name not in {"admin", "user"}:
            return fail("Invalid role.", 422, {"role": "Choose admin or user."})
        if user.id == current_user.id and role_name != "admin":
            return fail("You cannot remove your own admin access.", 400)
        if user.is_admin and role_name == "user":
            admin_count = User.query.join(User.role).filter(Role.name == "admin").count()
            if admin_count <= 1:
                return fail("At least one administrator must remain.", 400)
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            return fail("Role not found.", 400)
        user.role_id = role.id

    if "is_active" in payload:
        active = parse_bool(payload.get("is_active"), user.is_active)
        if user.id == current_user.id and not active:
            return fail("You cannot deactivate your own account.", 400)
        user.is_active = active

    if "name" in payload:
        name = clean_str(payload.get("name"), 120)
        if len(name) < 2:
            return fail("Name is too short.", 422, {"name": "Name is too short."})
        user.name = name

    db.session.commit()
    return ok(user_dict(user, include_email=True), "User updated.")


@admin_bp.delete("/users/<int:user_id>")
@login_required
@admin_required
def delete_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return fail("User not found.", 404)
    if user.id == current_user.id:
        return fail("You cannot delete your own account here.", 400)
    if user.is_admin:
        admin_count = User.query.join(User.role).filter(Role.name == "admin").count()
        if admin_count <= 1:
            return fail("At least one administrator must remain.", 400)
    db.session.delete(user)
    db.session.commit()
    return ok(message="User deleted.")


@admin_bp.get("/recipes")
@login_required
@admin_required
def list_all_recipes():
    query = query_recipes(request.args, public_only=False)
    pagination = paginate(query.order_by(Recipe.created_at.desc()), request.args, default_per_page=15)
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


@admin_bp.patch("/recipes/<int:recipe_id>/feature")
@login_required
@admin_required
def toggle_featured(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return fail("Recipe not found.", 404)
    payload = request.get_json(silent=True) or {}
    recipe.is_featured = parse_bool(payload.get("is_featured"), not recipe.is_featured)
    db.session.commit()
    return ok(recipe_card(recipe, current_user), "Featured recipe updated.")


@admin_bp.get("/reviews")
@login_required
@admin_required
def list_all_reviews():
    query = Review.query
    q = clean_str(request.args.get("q"), 120)
    if q:
        query = query.join(Review.recipe).filter(Recipe.title.ilike(f"%{q}%"))
    pagination = paginate(query.order_by(Review.created_at.desc()), request.args, default_per_page=15)
    return ok(
        [review_dict(review, current_user) for review in pagination.items],
        pagination={
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
            "total": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        },
    )


@admin_bp.get("/reports")
@login_required
@admin_required
def list_reports():
    query = Report.query
    status = clean_str(request.args.get("status"), 20)
    if status in {"pending", "resolved", "dismissed"}:
        query = query.filter_by(status=status)
    pagination = paginate(query.order_by(Report.created_at.desc()), request.args, default_per_page=15)
    return ok(
        [report_dict(report) for report in pagination.items],
        pagination={
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
            "total": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        },
    )


@admin_bp.patch("/reports/<int:report_id>")
@login_required
@admin_required
def update_report(report_id):
    report = db.session.get(Report, report_id)
    if not report:
        return fail("Report not found.", 404)
    payload = request.get_json(silent=True) or {}
    status = clean_str(payload.get("status"), 20)
    if status not in {"pending", "resolved", "dismissed"}:
        return fail("Invalid report status.", 422)
    report.status = status
    db.session.commit()
    return ok(report_dict(report), f"Report marked as {status}.")


@admin_bp.get("/categories")
@login_required
@admin_required
def list_categories():
    return ok([category_dict(category) for category in Category.query.order_by(Category.sort_order.asc()).all()])
