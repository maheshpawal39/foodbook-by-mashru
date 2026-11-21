from datetime import datetime, timezone

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models.base import TimestampMixin, utcnow


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(40), unique=True, nullable=False)
    description = db.Column(db.String(160))

    users = db.relationship("User", back_populates="role")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "description": self.description}


class User(UserMixin, TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    profile_image = db.Column(db.String(500))
    bio = db.Column(db.Text)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login_at = db.Column(db.DateTime(timezone=True))

    role = db.relationship("Role", back_populates="users")
    recipes = db.relationship(
        "Recipe", back_populates="author", cascade="all, delete-orphan", lazy="dynamic"
    )
    favorites = db.relationship(
        "Favorite", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )
    reviews = db.relationship(
        "Review", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )
    notifications = db.relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )
    shopping_list = db.relationship(
        "ShoppingList",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def is_admin(self) -> bool:
        return bool(self.role and self.role.name == "admin")

    def touch_login(self):
        self.last_login_at = utcnow()

    def to_dict(self, private=False):
        data = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "profile_image": self.profile_image,
            "bio": self.bio,
            "role": self.role.name if self.role else "user",
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "recipe_count": self.recipes.filter_by(status="published").count(),
        }
        if private:
            data["email"] = self.email
            data["favorites_count"] = self.favorites.count()
            data["reviews_count"] = self.reviews.count()
        else:
            data.pop("email", None)
        return data


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash = db.Column(db.String(128), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = db.relationship("User")
