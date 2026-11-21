from flask import Blueprint, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Report, Recipe, Review, Role, User
from app.services.notifications import create_notification
from app.utils.helpers import error_response, json_body

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@reports_bp.post("")
@login_required
def create_report():
    data = json_body()
    target_type = data.get("target_type")
    target_id = data.get("target_id")
    reason = (data.get("reason") or "").strip()
    if target_type not in ("recipe", "review"):
        return error_response("Invalid report target.", 422, "validation_error")
    if len(reason) < 5:
        return error_response("Please describe the issue in at least 5 characters.", 422, "validation_error")
    try:
        target_id = int(target_id)
    except (TypeError, ValueError):
        return error_response("Invalid report target.", 422, "validation_error")

    if target_type == "recipe":
        target = db.session.get(Recipe, target_id)
    else:
        target = db.session.get(Review, target_id)
    if not target:
        return error_response("Reported content was not found.", 404, "not_found")

    existing = Report.query.filter_by(
        reporter_id=current_user.id, target_type=target_type, target_id=target_id, status="open"
    ).first()
    if existing:
        return error_response("You have already reported this content.", 409, "report_exists")

    report = Report(
        reporter_id=current_user.id,
        target_type=target_type,
        target_id=target_id,
        reason=reason[:1000],
    )
    db.session.add(report)
    admins = User.query.join(Role, Role.id == User.role_id).filter(Role.name == "admin").all()
    for admin in admins:
        create_notification(
            admin.id,
            "New content report",
            "नई सामग्री रिपोर्ट",
            f"{current_user.name} reported {target_type} #{target_id}.",
            f"{current_user.name} ने {target_type} #{target_id} की रिपोर्ट की।",
            "report",
            "/admin?tab=reports",
        )
    db.session.commit()
    return {"message": "Thank you. Our team will review this content."}, 201
