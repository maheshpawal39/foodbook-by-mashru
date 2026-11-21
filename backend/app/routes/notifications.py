from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy import or_

from app.extensions import db
from app.models import Notification
from app.utils.decorators import admin_required
from app.utils.responses import fail, notification_dict, ok
from app.utils.validators import clean_str

notifications_bp = Blueprint("notifications", __name__)


def _query_for_user():
    return Notification.query.filter(or_(Notification.user_id == current_user.id, Notification.user_id.is_(None)))


@notifications_bp.get("")
@login_required
def list_notifications():
    notes = _query_for_user().order_by(Notification.created_at.desc()).limit(30).all()
    unread = _query_for_user().filter(Notification.is_read.is_(False)).count()
    return ok({"notifications": [notification_dict(note) for note in notes], "unread": unread})


@notifications_bp.put("/<int:note_id>/read")
@login_required
def mark_read(note_id):
    note = db.session.get(Notification, note_id)
    if not note or note.user_id not in (None, current_user.id):
        return fail("Notification not found.", 404)
    note.is_read = True
    db.session.commit()
    return ok(notification_dict(note), "Notification marked as read.")


@notifications_bp.put("/read-all")
@login_required
def mark_all_read():
    _query_for_user().filter(Notification.user_id == current_user.id, Notification.is_read.is_(False)).update(
        {"is_read": True}
    )
    db.session.commit()
    return ok(message="All notifications marked as read.")


@notifications_bp.delete("/<int:note_id>")
@login_required
def delete_notification(note_id):
    note = db.session.get(Notification, note_id)
    if not note or note.user_id != current_user.id:
        return fail("Notification not found.", 404)
    db.session.delete(note)
    db.session.commit()
    return ok(message="Notification removed.")


@notifications_bp.post("/broadcast")
@login_required
@admin_required
def broadcast():
    payload = request.get_json(silent=True) or {}
    title = clean_str(payload.get("title"), 200)
    message = clean_str(payload.get("message"), 1000)
    if not title:
        return fail("Notification title is required.", 422, {"title": "Title is required."})
    note = Notification(
        user_id=None, title=title, message=message, type="announcement", link=clean_str(payload.get("link"), 300)
    )
    db.session.add(note)
    db.session.commit()
    return ok(notification_dict(note), "Announcement sent to all users.", 201)
