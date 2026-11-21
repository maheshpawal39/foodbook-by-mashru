import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, request
from flask_login import current_user, login_required, login_user, logout_user

from app.extensions import db
from app.models import PasswordResetToken, Role, ShoppingList, User
from app.utils.helpers import (
    csrf_token,
    error_response,
    json_body,
    mask_email,
    validate_email,
    validate_password,
)
from app.services.notifications import create_notification

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.get("/csrf")
def csrf():
    return {"csrf_token": csrf_token()}


@auth_bp.post("/register")
def register():
    data = json_body()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    errors = {}
    if len(name) < 2:
        errors["name"] = "Name must be at least 2 characters."
    if not validate_email(email):
        errors["email"] = "Enter a valid email address."
    password_error = validate_password(password)
    if password_error:
        errors["password"] = password_error
    if errors:
        return error_response("Please correct the highlighted fields.", 422, "validation_error", errors)

    if User.query.filter_by(email=email).first():
        return error_response("An account with this email already exists.", 409, "email_exists")

    role = Role.query.filter_by(name="user").first()
    if not role:
        role = Role(name="user", description="Standard member")
        db.session.add(role)
        db.session.flush()

    user = User(name=name, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    db.session.add(ShoppingList(user_id=user.id))
    create_notification(
        user.id,
        "Welcome to FoodieBook",
        "स्वागत है FoodieBook में",
        "Your kitchen story starts here. Explore recipes, save favourites and cook something wonderful.",
        "यहाँ से आपकी रसोई की कहानी शुरू होती है। रेसिपी खोजें, पसंदीदा सहेजें और कुछ स्वादिष्ट बनाएँ।",
        "welcome",
        "/dashboard",
    )
    db.session.commit()
    login_user(user, remember=True)
    user.touch_login()
    db.session.commit()
    return {"user": user.to_dict(private=True), "message": "Welcome to FoodieBook!"}, 201


@auth_bp.post("/login")
def login():
    data = json_body()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    remember = bool(data.get("remember"))

    if not email or not password:
        return error_response("Email and password are required.", 422, "validation_error")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return error_response("Email or password is incorrect.", 401, "invalid_credentials")
    if not user.is_active:
        return error_response("This account has been deactivated.", 403, "account_disabled")

    login_user(user, remember=remember)
    user.touch_login()
    db.session.commit()
    return {"user": user.to_dict(private=True), "message": "Signed in successfully."}


@auth_bp.post("/logout")
@login_required
def logout():
    logout_user()
    return {"message": "You have been signed out."}


@auth_bp.get("/me")
@login_required
def me():
    return {"user": current_user.to_dict(private=True)}


@auth_bp.put("/profile")
@login_required
def update_profile():
    data = json_body()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    bio = (data.get("bio") or "").strip()
    profile_image = data.get("profile_image")

    if len(name) < 2:
        return error_response("Name must be at least 2 characters.", 422, "validation_error")
    if not validate_email(email):
        return error_response("Enter a valid email address.", 422, "validation_error")
    existing = User.query.filter(User.email == email, User.id != current_user.id).first()
    if existing:
        return error_response("An account with this email already exists.", 409, "email_exists")
    if profile_image and not (str(profile_image).startswith("/uploads/") or str(profile_image).startswith("http")):
        return error_response("Invalid profile image path.", 422, "validation_error")

    current_user.name = name
    current_user.email = email
    current_user.bio = bio[:1000]
    if profile_image is not None:
        current_user.profile_image = profile_image
    db.session.commit()
    return {"user": current_user.to_dict(private=True), "message": "Profile updated."}


@auth_bp.post("/change-password")
@login_required
def change_password():
    data = json_body()
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    if not current_user.check_password(current_password):
        return error_response("Current password is incorrect.", 400, "invalid_password")
    password_error = validate_password(new_password)
    if password_error:
        return error_response(password_error, 422, "validation_error")
    if current_user.check_password(new_password):
        return error_response("New password must be different from the current one.", 422, "validation_error")
    current_user.set_password(new_password)
    db.session.commit()
    return {"message": "Password changed successfully."}


@auth_bp.post("/forgot-password")
def forgot_password():
    data = json_body()
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    response = {
        "message": "If an account exists for this email, a reset link has been created.",
        "email": mask_email(email),
    }
    if not user:
        return response

    # Invalidate previous tokens
    PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({"used": True})
    raw_token = secrets.token_urlsafe(40)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expiry = datetime.now(timezone.utc) + timedelta(
        minutes=current_app.config["RESET_TOKEN_TTL_MINUTES"]
    )
    db.session.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expiry))
    db.session.commit()

    if current_app.config["SHOW_RESET_TOKEN"]:
        response["reset_token"] = raw_token
        response["reset_url"] = f"{current_app.config['FRONTEND_URL']}/reset-password?token={raw_token}"
        response["expires_in_minutes"] = current_app.config["RESET_TOKEN_TTL_MINUTES"]
    return response


@auth_bp.post("/reset-password")
def reset_password():
    data = json_body()
    token = data.get("token") or request.args.get("token") or ""
    new_password = data.get("password") or ""
    password_error = validate_password(new_password)
    if password_error:
        return error_response(password_error, 422, "validation_error")
    if not token:
        return error_response("Reset token is missing.", 422, "invalid_token")

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    entry = PasswordResetToken.query.filter_by(token_hash=token_hash, used=False).first()
    if not entry:
        return error_response("This reset link is invalid or has already been used.", 400, "invalid_token")
    expires_at = entry.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        entry.used = True
        db.session.commit()
        return error_response("This reset link has expired.", 400, "token_expired")

    entry.user.set_password(new_password)
    entry.used = True
    db.session.commit()
    return {"message": "Password reset successfully. You can now sign in."}
