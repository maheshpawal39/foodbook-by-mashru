from app.extensions import db
from app.models.base import TimestampMixin


class ShoppingList(TimestampMixin, db.Model):
    __tablename__ = "shopping_lists"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    name = db.Column(db.String(120), default="My Shopping List", nullable=False)

    user = db.relationship("User", back_populates="shopping_list")
    items = db.relationship(
        "ShoppingListItem",
        back_populates="shopping_list",
        cascade="all, delete-orphan",
        order_by="ShoppingListItem.is_purchased, ShoppingListItem.created_at",
    )

    def to_dict(self):
        items = [item.to_dict() for item in self.items]
        return {
            "id": self.id,
            "name": self.name,
            "items": items,
            "total": len(items),
            "purchased": sum(1 for item in items if item["is_purchased"]),
        }


class ShoppingListItem(db.Model):
    __tablename__ = "shopping_list_items"

    id = db.Column(db.Integer, primary_key=True)
    shopping_list_id = db.Column(
        db.Integer,
        db.ForeignKey("shopping_lists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = db.Column(db.String(160), nullable=False)
    quantity = db.Column(db.String(50))
    unit = db.Column(db.String(50))
    is_purchased = db.Column(db.Boolean, default=False, nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey("recipes.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)

    shopping_list = db.relationship("ShoppingList", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "quantity": self.quantity,
            "unit": self.unit,
            "is_purchased": self.is_purchased,
            "recipe_id": self.recipe_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = db.Column(db.String(200), nullable=False)
    title_hi = db.Column(db.String(200))
    message = db.Column(db.Text, nullable=False)
    message_hi = db.Column(db.Text)
    type = db.Column(db.String(40), default="system", nullable=False)
    link = db.Column(db.String(300))
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True), default=db.func.now(), nullable=False
    )

    user = db.relationship("User", back_populates="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "title_hi": self.title_hi,
            "message": self.message,
            "message_hi": self.message_hi,
            "type": self.type,
            "link": self.link,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SiteSetting(db.Model):
    __tablename__ = "site_settings"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.Text)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {"key": self.key, "value": self.value}
