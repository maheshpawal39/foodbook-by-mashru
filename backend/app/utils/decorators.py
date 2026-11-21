from functools import wraps

from flask_login import current_user

from app.utils.responses import fail


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            return fail("Authentication required.", 401)
        if not current_user.is_admin:
            return fail("Administrator access required.", 403)
        return view(*args, **kwargs)

    return wrapped
