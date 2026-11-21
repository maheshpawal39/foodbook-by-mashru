from datetime import datetime, timezone

from app.extensions import db


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ShoppingList(db.Model):
    __tablename__ = "shopping_lists"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(120), default="My Shopping List", nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = db.relationship("User", back_populates="shopping_lists")
    items = db.relationship("ShoppingListItem", back_populates="shopping_list", cascade="all, delete-orphan", lazy="selectin")


class ShoppingListItem(db.Model):
    __tablename__ = "shopping_list_items"

    id = db.Column(db.Integer, primary_key=True)
    shopping_list_id = db.Column(
        db.Integer, db.ForeignKey("shopping_lists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = db.Column(db.String(160), nullable=False)
    quantity = db.Column(db.String(60))
    unit = db.Column(db.String(40))
    category = db.Column(db.String(60), default="Pantry")
    is_purchased = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    shopping_list = db.relationship("ShoppingList", back_populates="items")
