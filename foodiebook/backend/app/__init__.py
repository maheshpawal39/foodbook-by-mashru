import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge

from app.extensions import cors, db, login_manager, migrate
from app.utils.helpers import error_response, init_csrf


def create_app(config_class=None):
    from config import Config

    app = Flask(__name__)
    app.config.from_object(config_class or Config)

    upload_folder = Path(app.config["UPLOAD_FOLDER"])
    for folder in ("recipes", "avatars", "seed", "defaults"):
        (upload_folder / folder).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = None
    login_manager.session_protection = "strong"

    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "X-CSRF-Token", "Authorization"],
        expose_headers=["Content-Disposition"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    from app.models import User  # noqa: F401  (register models with SQLAlchemy)

    @login_manager.user_loader
    def load_user(user_id):
        try:
            user = db.session.get(User, int(user_id))
        except (TypeError, ValueError):
            return None
        return user if user and user.is_active else None

    @login_manager.unauthorized_handler
    def unauthorized():
        return error_response("Please sign in to continue.", 401, "auth_required")

    from app.routes.admin import admin_bp
    from app.routes.auth import auth_bp
    from app.routes.categories import categories_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.ingredients import ingredients_bp
    from app.routes.notifications import notifications_bp
    from app.routes.recipes import recipes_bp
    from app.routes.reports import reports_bp
    from app.routes.settings import settings_bp
    from app.routes.shopping import shopping_bp
    from app.routes.uploads import uploads_bp
    from app.routes.users import users_bp

    for blueprint in (
        auth_bp,
        recipes_bp,
        categories_bp,
        dashboard_bp,
        ingredients_bp,
        shopping_bp,
        notifications_bp,
        users_bp,
        uploads_bp,
        settings_bp,
        reports_bp,
        admin_bp,
    ):
        app.register_blueprint(blueprint)

    init_csrf(app)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "FoodieBook API"}

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename, max_age=86400)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if request.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    @app.errorhandler(RequestEntityTooLarge)
    def too_large(_):
        return error_response("Uploaded file is too large.", 413, "file_too_large")

    @app.errorhandler(404)
    def not_found(_):
        if request.path.startswith("/api/") or request.path.startswith("/uploads/"):
            return error_response("The requested resource was not found.", 404, "not_found")
        return jsonify({"message": "Not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_):
        return error_response("This method is not allowed.", 405, "method_not_allowed")

    @app.errorhandler(HTTPException)
    def http_error(exc):
        return error_response(exc.description or "Request failed.", exc.code or 400, "http_error")

    @app.errorhandler(Exception)
    def unhandled(exc):
        db.session.rollback()
        app.logger.exception("Unhandled error: %s", exc)
        if app.debug:
            return error_response(str(exc), 500, "server_error")
        return error_response("Something went wrong on our side. Please try again.", 500, "server_error")

    @app.cli.command("seed")
    def seed_command():
        """Populate roles, categories, users and sample recipes."""
        from seed import run_seed

        run_seed(app)

    return app
