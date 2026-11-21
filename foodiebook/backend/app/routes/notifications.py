from flask import Blueprint
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Notification
from app.utils.helpers import error_response

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notifications_bp.get("")
@notifications_bp.get("/")
@login_required
def list_notifications():
    items = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(40)
        .all()
    )
    unread = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
    return {"items": [item.to_dict() for item in items], "unread_count": unread}


@notifications_bp.patch("/<int:notification_id>/read")
@login_required
def mark_read(notification_id):
    item = Notification.query.filter_by(id=notification_id, user_id=current_user.id).first()
    if not item:
        return error_response("Notification not found.", 404, "not_found")
    item.is_read = True
    db.session.commit()
    return {"notification": item.to_dict(), "message": "Marked as read."}


@notifications_bp.post("/read-all")
@login_required
def mark_all_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return {"message": "All notifications marked as read."}


@notifications_bp.delete("/<int:notification_id>")
@login_required
def delete_notification(notification_id):
    item = Notification.query.filter_by(id=notification_id, user_id=current_user.id).first()
    if not item:
        return error_response("Notification not found.", 404, "not_found")
    db.session.delete(item)
    db.session.commit()
    return {"message": "Notification removed."}
