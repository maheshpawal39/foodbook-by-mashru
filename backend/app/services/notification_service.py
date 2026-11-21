from app.extensions import db
from app.models import Notification


def notify(user_id, title, message="", type="info", link=None):
    note = Notification(user_id=user_id, title=title, message=message, type=type, link=link)
    db.session.add(note)
    return note
