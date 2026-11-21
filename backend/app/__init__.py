import hmac
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_login import current_user
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge

from app.extensions import cors, db, login_manager, migrate
from app.utils.images import new_csrf_token
from app.utils.responses import fail
from config import BASE_DIR, get_config

CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


def create_app(config_class=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class or get_config())

    upload_folder = app.config["UPLOAD_FOLDER"]
    if not os.path.isabs(upload_folder):
        upload_folder = str(BASE_DIR / upload_folder)
    app.config["UPLOAD_FOLDER"] = upload_folder
    Path(upload_folder, "recipes").mkdir(parents=True, exist_ok=True)
    Path(upload_folder, "avatars").mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.session_protection = "strong"

    cors.init_app(
        app,
        resources={
            r"/api/*": {"origins": app.config["CORS_ORIGINS"]},
            r"/uploads/*": {"origins": app.config["CORS_ORIGINS"]},
        },
        supports_credentials=True,
        allow_headers=["Content-Type", "X-CSRF-Token", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        max_age=600,
    )

    from app import models  # noqa: F401
    from app.routes.admin import admin_bp
    from app.routes.auth import auth_bp
    from app.routes.categories import categories_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.interactions import interactions_bp
    from app.routes.notifications import notifications_bp
    from app.routes.recipes import recipes_bp
    from app.routes.settings import settings_bp
    from app.routes.shopping import shopping_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(recipes_bp, url_prefix="/api/recipes")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(interactions_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(shopping_bp, url_prefix="/api/shopping-list")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(settings_bp, url_prefix="/api")

    @app.before_request
    def csrf_protect():
        if app.config.get("TESTING") or not app.config.get("CSRF_ENABLED", True):
            return None
        if not request.path.startswith("/api/") or request.method in CSRF_SAFE_METHODS:
            return None
        cookie = request.cookies.get("foodiebook_csrf")
        header = request.headers.get("X-CSRF-Token")
        if not cookie or not header or not hmac.compare_digest(cookie, header):
            return fail("Security token missing or invalid. Refresh the page and try again.", 403)
        return None

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=()")
        if request.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    @app.errorhandler(RequestEntityTooLarge)
    def handle_large_upload(error):
        return fail(
            f"File is too large. Maximum upload size is {app.config['MAX_CONTENT_LENGTH'] // (1024 * 1024)} MB.",
            413,
        )

    @app.errorhandler(404)
    def handle_404(error):
        return fail("Resource not found.", 404)

    @app.errorhandler(405)
    def handle_405(error):
        return fail("Method not allowed for this endpoint.", 405)

    @app.errorhandler(Exception)
    def handle_error(error):
        if isinstance(error, HTTPException):
            return fail(error.description or "Request failed.", error.code or 400)
        db.session.rollback()
        app.logger.exception("Unhandled API error")
        if app.config.get("DEBUG"):
            return fail(f"Server error: {error}", 500)
        return fail("Something went wrong on the server. Please try again.", 500)

    @app.route("/api/health")
    def health():
        return jsonify({"success": True, "data": {"status": "healthy", "service": "FoodieBook API"}})

    @app.route("/api/auth/csrf", methods=["GET"])
    def csrf_token():
        token = new_csrf_token()
        response = jsonify({"success": True, "data": {"csrf_token": token}})
        response.set_cookie(
            "foodiebook_csrf",
            token,
            max_age=60 * 60 * 12,
            httponly=False,
            samesite=app.config["SESSION_COOKIE_SAMESITE"],
            secure=app.config["SESSION_COOKIE_SECURE"],
        )
        return response

    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        response = send_from_directory(app.config["UPLOAD_FOLDER"], filename, max_age=60 * 60 * 24 * 30)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.route("/")
    def index():
        return jsonify(
            {
                "success": True,
                "name": "FoodieBook by Marshru API",
                "version": "1.0.0",
                "health": "/api/health",
            }
        )

    @app.shell_context_processor
    def shell_context():
        return {"db": db, "current_user": current_user}

    return app


@login_manager.user_loader
def load_user(user_id):
    from app.models import User

    try:
        return db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None


@login_manager.unauthorized_handler
def unauthorized():
    return fail("Authentication required. Please sign in.", 401)
