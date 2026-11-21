from app.extensions import db
from app.models import Ingredient


def resolve_ingredient(name, name_hi=None):
    cleaned = (name or "").strip()
    if not cleaned:
        return None
    ingredient = Ingredient.query.filter(db.func.lower(Ingredient.name) == cleaned.lower()).first()
    if not ingredient:
        ingredient = Ingredient(name=cleaned[:120], name_hi=(name_hi or None))
        db.session.add(ingredient)
        db.session.flush()
    elif name_hi and not ingredient.name_hi:
        ingredient.name_hi = name_hi[:120]
    return ingredient
