from sqlalchemy import CheckConstraint, UniqueConstraint, func

from app.extensions import db
from app.models.base import TimestampMixin


class Category(TimestampMixin, db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    name_hi = db.Column(db.String(80), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    description_hi = db.Column(db.Text)
    image = db.Column(db.String(500))
    icon = db.Column(db.String(50), default="Utensils")
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    recipes = db.relationship("Recipe", back_populates="category", lazy="dynamic")

    def to_dict(self, with_count=True):
        data = {
            "id": self.id,
            "name": self.name,
            "name_hi": self.name_hi,
            "slug": self.slug,
            "description": self.description,
            "description_hi": self.description_hi,
            "image": self.image,
            "icon": self.icon,
            "is_active": self.is_active,
        }
        if with_count:
            data["recipe_count"] = self.recipes.filter_by(status="published").count()
        return data


class Recipe(TimestampMixin, db.Model):
    __tablename__ = "recipes"
    __table_args__ = (
        db.Index("ix_recipes_status_created", "status", "created_at"),
        db.Index("ix_recipes_author", "author_id"),
        db.Index("ix_recipes_category", "category_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, index=True)
    title_hi = db.Column(db.String(200))
    short_description = db.Column(db.String(500), nullable=False)
    short_description_hi = db.Column(db.String(500))
    description = db.Column(db.Text)
    description_hi = db.Column(db.Text)
    image = db.Column(db.String(500))
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    cuisine = db.Column(db.String(80), default="Indian")
    cuisine_hi = db.Column(db.String(80))
    food_type = db.Column(db.String(20), default="veg", nullable=False)
    prep_time = db.Column(db.Integer, default=0, nullable=False)
    cook_time = db.Column(db.Integer, default=0, nullable=False)
    total_time = db.Column(db.Integer, default=0, nullable=False)
    difficulty = db.Column(db.String(20), default="Easy", nullable=False)
    servings = db.Column(db.Integer, default=2, nullable=False)
    calories = db.Column(db.Integer, default=0)
    tips = db.Column(db.Text)
    tips_hi = db.Column(db.Text)
    video_url = db.Column(db.String(500))
    nutrition = db.Column(db.JSON, default=dict)
    status = db.Column(db.String(20), default="draft", nullable=False, index=True)
    is_featured = db.Column(db.Boolean, default=False, nullable=False)
    rating_avg = db.Column(db.Float, default=0, nullable=False)
    rating_count = db.Column(db.Integer, default=0, nullable=False)

    author_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    author = db.relationship("User", back_populates="recipes")
    category = db.relationship("Category", back_populates="recipes")
    ingredients = db.relationship(
        "RecipeIngredient",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeIngredient.id",
        lazy="selectin",
    )
    steps = db.relationship(
        "RecipeStep",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeStep.step_number",
        lazy="selectin",
    )
    reviews = db.relationship(
        "Review", back_populates="recipe", cascade="all, delete-orphan", lazy="dynamic"
    )
    favorites = db.relationship(
        "Favorite", back_populates="recipe", cascade="all, delete-orphan", lazy="dynamic"
    )

    def refresh_rating(self):
        avg, count = (
            db.session.query(func.avg(Review.rating), func.count(Review.id))
            .filter(Review.recipe_id == self.id)
            .one()
        )
        self.rating_avg = round(float(avg or 0), 2)
        self.rating_count = int(count or 0)

    def to_dict(self, detail=False, viewer=None):
        data = {
            "id": self.id,
            "title": self.title,
            "title_hi": self.title_hi,
            "short_description": self.short_description,
            "short_description_hi": self.short_description_hi,
            "image": self.image,
            "category": self.category.to_dict(with_count=False) if self.category else None,
            "cuisine": self.cuisine,
            "cuisine_hi": self.cuisine_hi,
            "food_type": self.food_type,
            "prep_time": self.prep_time,
            "cook_time": self.cook_time,
            "total_time": self.total_time,
            "difficulty": self.difficulty,
            "servings": self.servings,
            "calories": self.calories,
            "status": self.status,
            "is_featured": self.is_featured,
            "rating_avg": round(self.rating_avg or 0, 2),
            "rating_count": self.rating_count or 0,
            "author": self.author.to_dict() if self.author else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "favorite_count": self.favorites.count(),
        }
        if viewer and getattr(viewer, "is_authenticated", False):
            data["is_favorited"] = (
                db.session.query(Favorite.id)
                .filter_by(user_id=viewer.id, recipe_id=self.id)
                .first()
                is not None
            )
        else:
            data["is_favorited"] = False
        if detail:
            data.update(
                {
                    "description": self.description,
                    "description_hi": self.description_hi,
                    "tips": self.tips,
                    "tips_hi": self.tips_hi,
                    "video_url": self.video_url,
                    "nutrition": self.nutrition or {},
                    "ingredients": [item.to_dict() for item in self.ingredients],
                    "steps": [step.to_dict() for step in self.steps],
                    "user_review": self._viewer_review(viewer),
                }
            )
        return data

    def _viewer_review(self, viewer):
        if not viewer or not getattr(viewer, "is_authenticated", False):
            return None
        review = Review.query.filter_by(user_id=viewer.id, recipe_id=self.id).first()
        return review.to_dict() if review else None


class Ingredient(TimestampMixin, db.Model):
    __tablename__ = "ingredients"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False, index=True)
    name_hi = db.Column(db.String(120))

    def to_dict(self):
        return {"id": self.id, "name": self.name, "name_hi": self.name_hi}


class RecipeIngredient(db.Model):
    __tablename__ = "recipe_ingredients"
    __table_args__ = (
        UniqueConstraint("recipe_id", "ingredient_id", name="uq_recipe_ingredient"),
    )

    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(
        db.Integer, db.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ingredient_id = db.Column(
        db.Integer, db.ForeignKey("ingredients.id"), nullable=False, index=True
    )
    quantity = db.Column(db.String(50), nullable=False)
    unit = db.Column(db.String(50))
    note = db.Column(db.String(160))

    recipe = db.relationship("Recipe", back_populates="ingredients")
    ingredient = db.relationship("Ingredient")

    def to_dict(self):
        return {
            "id": self.id,
            "ingredient_id": self.ingredient_id,
            "name": self.ingredient.name if self.ingredient else None,
            "name_hi": self.ingredient.name_hi if self.ingredient else None,
            "quantity": self.quantity,
            "unit": self.unit,
            "note": self.note,
        }


class RecipeStep(db.Model):
    __tablename__ = "recipe_steps"
    __table_args__ = (
        UniqueConstraint("recipe_id", "step_number", name="uq_recipe_step_number"),
    )

    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(
        db.Integer, db.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_number = db.Column(db.Integer, nullable=False)
    instruction = db.Column(db.Text, nullable=False)
    instruction_hi = db.Column(db.Text)
    image = db.Column(db.String(500))

    recipe = db.relationship("Recipe", back_populates="steps")

    def to_dict(self):
        return {
            "id": self.id,
            "step_number": self.step_number,
            "instruction": self.instruction,
            "instruction_hi": self.instruction_hi,
            "image": self.image,
        }


class Favorite(db.Model):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "recipe_id", name="uq_user_recipe_fav"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipe_id = db.Column(
        db.Integer, db.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = db.Column(
        db.DateTime(timezone=True), default=db.func.now(), nullable=False
    )

    user = db.relationship("User", back_populates="favorites")
    recipe = db.relationship("Recipe", back_populates="favorites")


class Review(TimestampMixin, db.Model):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "recipe_id", name="uq_user_recipe_review"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating"),
        db.Index("ix_reviews_recipe", "recipe_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    recipe_id = db.Column(
        db.Integer, db.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False
    )
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)

    user = db.relationship("User", back_populates="reviews")
    recipe = db.relationship("Recipe", back_populates="reviews")

    def to_dict(self):
        return {
            "id": self.id,
            "rating": self.rating,
            "comment": self.comment,
            "user": self.user.to_dict() if self.user else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Report(TimestampMixin, db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    target_type = db.Column(db.String(20), nullable=False)  # recipe | review
    target_id = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="open", nullable=False, index=True)
    resolved_at = db.Column(db.DateTime(timezone=True))

    reporter = db.relationship("User")

    def to_dict(self):
        target = None
        if self.target_type == "recipe":
            recipe = db.session.get(Recipe, self.target_id)
            if recipe:
                target = {"id": recipe.id, "label": recipe.title, "kind": "recipe"}
        else:
            review = db.session.get(Review, self.target_id)
            if review:
                target = {
                    "id": review.id,
                    "label": (review.comment or "")[:120],
                    "kind": "review",
                    "recipe_id": review.recipe_id,
                }
        return {
            "id": self.id,
            "reporter": self.reporter.to_dict() if self.reporter else None,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "target": target,
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
