from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    name_hi = db.Column(db.String(120))
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    icon = db.Column(db.String(40), default="UtensilsCrossed")
    image = db.Column(db.String(500))
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    recipes = db.relationship("Recipe", back_populates="category", lazy="dynamic")


class Recipe(db.Model):
    __tablename__ = "recipes"
    __table_args__ = (
        CheckConstraint("prep_time >= 0", name="ck_recipe_prep_time"),
        CheckConstraint("cook_time >= 0", name="ck_recipe_cook_time"),
        CheckConstraint("servings > 0", name="ck_recipe_servings"),
        CheckConstraint("status IN ('draft','published')", name="ck_recipe_status"),
        CheckConstraint("difficulty IN ('Easy','Medium','Hard')", name="ck_recipe_difficulty"),
    )

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, index=True)
    slug = db.Column(db.String(240), unique=True, nullable=False, index=True)
    short_description = db.Column(db.String(400))
    description = db.Column(db.Text)
    image = db.Column(db.String(500))
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id", ondelete="SET NULL"), index=True)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    cuisine = db.Column(db.String(80), index=True)
    diet = db.Column(db.String(20), default="veg", nullable=False, index=True)
    prep_time = db.Column(db.Integer, default=0, nullable=False)
    cook_time = db.Column(db.Integer, default=0, nullable=False)
    total_time = db.Column(db.Integer, default=0, nullable=False)
    difficulty = db.Column(db.String(20), default="Easy", nullable=False, index=True)
    servings = db.Column(db.Integer, default=2, nullable=False)
    calories = db.Column(db.Integer)
    tips = db.Column(db.Text)
    video_url = db.Column(db.String(500))
    status = db.Column(db.String(20), default="draft", nullable=False, index=True)
    is_featured = db.Column(db.Boolean, default=False, nullable=False, index=True)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    nutrition = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    category = db.relationship("Category", back_populates="recipes")
    author = db.relationship("User", back_populates="recipes")
    ingredients = db.relationship(
        "RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan", order_by="RecipeIngredient.id"
    )
    steps = db.relationship(
        "RecipeStep", back_populates="recipe", cascade="all, delete-orphan", order_by="RecipeStep.step_number"
    )
    favorites = db.relationship("Favorite", back_populates="recipe", cascade="all, delete-orphan", lazy="dynamic")
    reviews = db.relationship("Review", back_populates="recipe", cascade="all, delete-orphan", lazy="selectin")
    reports = db.relationship("Report", back_populates="recipe", cascade="all, delete-orphan", lazy="dynamic")

    @property
    def average_rating(self) -> float:
        ratings = [review.rating for review in self.reviews]
        return round(sum(ratings) / len(ratings), 1) if ratings else 0.0

    @property
    def review_count(self) -> int:
        return len(self.reviews)

    @property
    def favorite_count(self) -> int:
        return self.favorites.count()


class Ingredient(db.Model):
    __tablename__ = "ingredients"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False, index=True)
    name_hi = db.Column(db.String(160))
    category = db.Column(db.String(60), default="Pantry")
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    recipe_links = db.relationship("RecipeIngredient", back_populates="ingredient", cascade="all, delete-orphan")


class RecipeIngredient(db.Model):
    __tablename__ = "recipe_ingredients"
    __table_args__ = (UniqueConstraint("recipe_id", "ingredient_id", name="uq_recipe_ingredient"),)

    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = db.Column(db.String(60))
    unit = db.Column(db.String(40))
    notes = db.Column(db.String(160))

    recipe = db.relationship("Recipe", back_populates="ingredients")
    ingredient = db.relationship("Ingredient", back_populates="recipe_links")


class RecipeStep(db.Model):
    __tablename__ = "recipe_steps"
    __table_args__ = (UniqueConstraint("recipe_id", "step_number", name="uq_recipe_step_number"),)

    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = db.Column(db.Integer, nullable=False)
    instruction = db.Column(db.Text, nullable=False)
    timer_seconds = db.Column(db.Integer, default=0)

    recipe = db.relationship("Recipe", back_populates="steps")
