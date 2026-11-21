from datetime import datetime, timezone

from flask import Blueprint, current_app, request
from flask_login import current_user, login_required, login_user, logout_user

from app.extensions import db
from app.models import PasswordResetToken, Role, User
from app.services.mail_service import send_password_reset_email
from app.services.notification_service import notify
from app.utils.images import delete_upload, generate_reset_token, hash_token, reset_expiry, save_image
from app.utils.responses import fail, ok, user_dict
from app.utils.validators import clean_str, parse_bool, validate_email_address, validate_password

auth_bp = Blueprint("auth", __name__)


def _user_payload(user):
    data = user_dict(user, include_email=True)
    data["authenticated"] = True
    return data


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    name = clean_str(payload.get("name"), 120)
    email = clean_str(payload.get("email"), 255).lower()
    password = payload.get("password") or ""

    errors = {}
    if len(name) < 2:
        errors["name"] = "Name must be at least 2 characters."
    email_error = validate_email_address(email)
    if email_error:
        errors["email"] = email_error
    password_error = validate_password(password)
    if password_error:
        errors["password"] = password_error
    if errors:
        return fail("Please correct the highlighted fields.", 422, errors)

    if User.query.filter_by(email=email).first():
        return fail("An account with this email already exists.", 409, {"email": "This email is already registered."})

    role = Role.query.filter_by(name="user").first()
    if not role:
        role = Role(name="user", description="Standard recipe lover")
        db.session.add(role)
        db.session.flush()

    user = User(name=name, email=email, role_id=role.id)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    notify(
        user.id,
        "Welcome to FoodieBook 🍽️",
        "Explore recipes, save favourites and start your own cookbook.",
        "success",
        "/dashboard",
    )
    db.session.commit()

    login_user(user, remember=True)
    current_user.last_login_at = datetime.now(timezone.utc)
    db.session.commit()
    return ok(_user_payload(user), "Your account is ready. Welcome to FoodieBook!", 201)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = clean_str(payload.get("email"), 255).lower()
    password = payload.get("password") or ""
    remember = parse_bool(payload.get("remember"), False)

    if not email or not password:
        return fail(
            "Email and password are required.",
            422,
            {"email": "Email is required.", "password": "Password is required."},
        )

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return fail("Incorrect email or password.", 401)
    if not user.is_active:
        return fail("This account has been deactivated. Please contact support.", 403)

    login_user(user, remember=remember)
    user.last_login_at = datetime.now(timezone.utc)
    db.session.commit()
    return ok(_user_payload(user), "Welcome back!")


@auth_bp.post("/logout")
def logout():
    if current_user.is_authenticated:
        logout_user()
    return ok(message="You have been signed out.")


@auth_bp.get("/me")
def me():
    if not current_user.is_authenticated:
        return ok({"authenticated": False, "user": None})
    return ok({"authenticated": True, "user": _user_payload(current_user)})


@auth_bp.put("/profile")
@login_required
def update_profile():
    payload = request.get_json(silent=True) or {}
    name = clean_str(payload.get("name"), 120)
    email = clean_str(payload.get("email"), 255).lower()
    bio = clean_str(payload.get("bio"), 500)

    errors = {}
    if len(name) < 2:
        errors["name"] = "Name must be at least 2 characters."
    email_error = validate_email_address(email)
    if email_error:
        errors["email"] = email_error
    if errors:
        return fail("Please correct the highlighted fields.", 422, errors)

    duplicate = User.query.filter(User.email == email, User.id != current_user.id).first()
    if duplicate:
        return fail("An account with this email already exists.", 409, {"email": "This email is already registered."})

    current_user.name = name
    current_user.email = email
    current_user.bio = bio
    db.session.commit()
    return ok(_user_payload(current_user), "Profile updated successfully.")


@auth_bp.post("/profile/avatar")
@login_required
def update_avatar():
    file = request.files.get("avatar")
    if not file:
        return fail("Choose an image to upload.", 422, {"avatar": "Image is required."})
    try:
        path = save_image(file, "avatars")
    except ValueError as exc:
        return fail(str(exc), 422, {"avatar": str(exc)})
    old = current_user.avatar
    current_user.avatar = path
    db.session.commit()
    delete_upload(old)
    return ok(_user_payload(current_user), "Profile picture updated.")


@auth_bp.post("/change-password")
@login_required
def change_password():
    payload = request.get_json(silent=True) or {}
    current_password = payload.get("current_password") or ""
    new_password = payload.get("new_password") or ""

    if not current_user.check_password(current_password):
        return fail("Your current password is incorrect.", 422, {"current_password": "Incorrect password."})
    if current_user.check_password(new_password):
        return fail("Choose a password different from your current one.", 422, {"new_password": "Use a new password."})
    password_error = validate_password(new_password)
    if password_error:
        return fail(password_error, 422, {"new_password": password_error})

    current_user.set_password(new_password)
    db.session.commit()
    return ok(message="Password changed successfully.")


@auth_bp.post("/forgot-password")
def forgot_password():
    payload = request.get_json(silent=True) or {}
    email = clean_str(payload.get("email"), 255).lower()
    email_error = validate_email_address(email)
    if email_error:
        return fail(email_error, 422, {"email": email_error})

    generic = "If an account exists for that email, a reset link has been sent."
    user = User.query.filter_by(email=email).first()
    response_payload = {}
    if user:
        PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({"used": True})
        token, token_hash = generate_reset_token()
        db.session.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=reset_expiry()))
        db.session.commit()
        reset_url = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
        sent = send_password_reset_email(user.email, user.name, reset_url)
        if not sent and current_app.config.get("DEBUG"):
            response_payload["dev_reset_url"] = reset_url

    return ok(response_payload or None, generic)


@auth_bp.post("/reset-password")
def reset_password():
    payload = request.get_json(silent=True) or {}
    token = clean_str(payload.get("token"), 200)
    password = payload.get("password") or ""
    if not token:
        return fail("Reset token is missing.", 422, {"token": "Reset token is missing."})
    password_error = validate_password(password)
    if password_error:
        return fail(password_error, 422, {"password": password_error})

    record = PasswordResetToken.query.filter_by(token_hash=hash_token(token), used=False).first()
    if not record:
        return fail("This reset link is invalid or has already been used.", 400)
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        return fail("This reset link has expired. Please request a new one.", 400)
    if not record.user or not record.user.is_active:
        return fail("This account is not available.", 403)

    record.user.set_password(password)
    record.used = True
    PasswordResetToken.query.filter_by(user_id=record.user_id, used=False).update({"used": True})
    db.session.commit()
    return ok(message="Your password has been reset. You can now sign in.")
