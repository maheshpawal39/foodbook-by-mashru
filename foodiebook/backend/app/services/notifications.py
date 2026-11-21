from app.extensions import db
from app.models import Notification


def create_notification(user_id, title, title_hi, message, message_hi, kind="system", link=None):
    notification = Notification(
        user_id=user_id,
        title=title,
        title_hi=title_hi,
        message=message,
        message_hi=message_hi,
        type=kind,
        link=link,
    )
    db.session.add(notification)
    return notification
