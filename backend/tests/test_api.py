"""Automated API smoke tests for FoodieBook.

Run from backend/:
    python -m unittest discover -s tests -v

The suite uses an in-memory SQLite database so it never touches your
development or production PostgreSQL data.
"""
import io
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PIL import Image

from app import create_app
from app.extensions import db
from app.models import Category, Ingredient, Recipe, RecipeIngredient, RecipeStep, Role, User
from config import Config


class TestConfig(Config):
    TESTING = True
    CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    UPLOAD_FOLDER = str(Path(__file__).resolve().parent / ".uploads")
    SECRET_KEY = "test-secret"


class ApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app(TestConfig)

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()
            admin_role = Role(name="admin", description="Administrator")
            user_role = Role(name="user", description="User")
            db.session.add_all([admin_role, user_role])
            db.session.flush()

            admin = User(name="Admin Marshru", email="admin@test.com", role_id=admin_role.id)
            admin.set_password("Admin@123")
            demo = User(name="Demo Cook", email="demo@test.com", role_id=user_role.id)
            demo.set_password("Demo@123")
            db.session.add_all([admin, demo])

            dinner = Category(name="Dinner", name_hi="रात का खाना", slug="dinner")
            drinks = Category(name="Drinks", name_hi="पेय", slug="drinks")
            db.session.add_all([dinner, drinks])
            db.session.flush()

            recipe = Recipe(
                title="Test Paneer Curry",
                slug="test-paneer-curry",
                short_description="A test curry",
                description="A recipe created for automated tests.",
                category_id=dinner.id,
                author_id=demo.id,
                cuisine="Indian",
                diet="veg",
                prep_time=10,
                cook_time=20,
                total_time=30,
                difficulty="Easy",
                servings=2,
                calories=300,
                status="published",
                nutrition={"protein": "18 g"},
            )
            db.session.add(recipe)
            db.session.flush()
            paneer = Ingredient(name="Paneer", name_hi="पनीर", category="Dairy")
            tomato = Ingredient(name="Tomatoes", name_hi="टमाटर", category="Produce")
            db.session.add_all([paneer, tomato])
            db.session.flush()
            recipe.ingredients.append(RecipeIngredient(ingredient_id=paneer.id, quantity="200", unit="g"))
            recipe.ingredients.append(RecipeIngredient(ingredient_id=tomato.id, quantity="2", unit="medium"))
            recipe.steps.append(RecipeStep(step_number=1, instruction="Cook everything gently.", timer_seconds=300))
            db.session.commit()
            self.recipe_id = recipe.id

        self.client = self.app.test_client()

    # ------------------------------------------------------------------ helpers
    def login(self, email="demo@test.com", password="Demo@123"):
        return self.client.post("/api/auth/login", json={"email": email, "password": password})

    def auth_headers(self):
        return {"Content-Type": "application/json"}

    def create_recipe_payload(self, title="Test New Recipe", status="published"):
        return {
            "title": title,
            "short_description": "Created in tests",
            "description": "A test recipe body.",
            "category_id": 1,
            "cuisine": "Indian",
            "diet": "veg",
            "prep_time": 5,
            "cook_time": 10,
            "servings": 2,
            "difficulty": "Easy",
            "calories": 250,
            "status": status,
            "ingredients": [{"name": "Paneer", "quantity": "150", "unit": "g"}],
            "steps": [{"instruction": "Cook it.", "timer_seconds": 60}],
            "nutrition": {"protein": "12 g"},
        }

    # -------------------------------------------------------------------- tests
    def test_health_and_public_recipes(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])

        response = self.client.get("/api/recipes")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["pagination"]["total"], 1)
        self.assertEqual(body["data"][0]["title"], "Test Paneer Curry")

        response = self.client.get(f"/api/recipes/{self.recipe_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()["data"]["ingredients"]), 2)

        response = self.client.get("/api/recipes/kitchen", query_string={"ingredients": "Paneer,Tomatoes"})
        self.assertEqual(response.status_code, 200)
        results = response.get_json()["data"]["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["match_percentage"], 100)

    def test_registration_login_and_me(self):
        response = self.client.post(
            "/api/auth/register",
            json={"name": "New Cook", "email": "new@test.com", "password": "Secret123"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.get_json()["data"]["authenticated"])

        response = self.client.get("/api/auth/me")
        self.assertTrue(response.get_json()["data"]["authenticated"])

        self.client.post("/api/auth/logout")
        response = self.client.get("/api/dashboard")
        self.assertEqual(response.status_code, 401)

        response = self.login(email="new@test.com", password="Secret123")
        self.assertEqual(response.status_code, 200)
        response = self.client.get("/api/dashboard")
        self.assertEqual(response.status_code, 200)

    def test_profile_and_password_change(self):
        self.login()
        response = self.client.put("/api/auth/profile", json={"name": "Demo Updated", "email": "demo@test.com", "bio": "Hi"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"]["name"], "Demo Updated")

        response = self.client.post(
            "/api/auth/change-password",
            json={"current_password": "Demo@123", "new_password": "NewPass123"},
        )
        self.assertEqual(response.status_code, 200)
        self.client.post("/api/auth/logout")
        self.assertEqual(self.login(password="NewPass123").status_code, 200)

    def test_recipe_crud_publish_and_permissions(self):
        self.login()
        response = self.client.post("/api/recipes", json=self.create_recipe_payload("Test CRUD Recipe", "draft"))
        self.assertEqual(response.status_code, 201)
        recipe_id = response.get_json()["data"]["id"]
        self.assertEqual(response.get_json()["data"]["status"], "draft")

        response = self.client.patch(f"/api/recipes/{recipe_id}/status", json={"status": "published"})
        self.assertEqual(response.status_code, 200)

        payload = self.create_recipe_payload("Test CRUD Recipe Updated")
        response = self.client.put(f"/api/recipes/{recipe_id}", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"]["title"], "Test CRUD Recipe Updated")

        # Another user cannot edit it.
        self.client.post("/api/auth/logout")
        self.login(email="admin@test.com", password="Admin@123")
        response = self.client.put(f"/api/recipes/{recipe_id}", json=payload)
        self.assertEqual(response.status_code, 200)  # admins may edit

        response = self.client.delete(f"/api/recipes/{recipe_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get(f"/api/recipes/{recipe_id}").status_code, 404)

    def test_image_upload_validation(self):
        self.login()
        image = io.BytesIO()
        Image.new("RGB", (120, 90), (140, 30, 50)).save(image, "JPEG")
        image.seek(0)
        data = self.create_recipe_payload("Recipe With Image")
        data["ingredients"] = json.dumps(data["ingredients"])
        data["steps"] = json.dumps(data["steps"])
        data["nutrition"] = json.dumps(data["nutrition"])
        data["image"] = (image, "dish.jpg")
        response = self.client.post("/api/recipes", data=data, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 201)
        self.assertIn("/uploads/recipes/", response.get_json()["data"]["image"])

        bad = io.BytesIO(b"not an image")
        data = self.create_recipe_payload("Bad Image Recipe")
        data["ingredients"] = json.dumps(data["ingredients"])
        data["steps"] = json.dumps(data["steps"])
        data["nutrition"] = json.dumps(data["nutrition"])
        data["image"] = (bad, "evil.jpg")
        response = self.client.post("/api/recipes", data=data, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 422)

    def test_favorites_and_reviews(self):
        self.login()
        response = self.client.post(f"/api/recipes/{self.recipe_id}/favorite")
        self.assertEqual(response.status_code, 201)
        response = self.client.post(f"/api/recipes/{self.recipe_id}/favorite")
        self.assertEqual(response.status_code, 200)  # duplicate prevented

        response = self.client.get("/api/favorites")
        self.assertEqual(response.get_json()["pagination"]["total"], 1)

        response = self.client.post(
            f"/api/recipes/{self.recipe_id}/reviews", json={"rating": 5, "comment": "Beautiful curry"}
        )
        self.assertEqual(response.status_code, 201)
        review_id = response.get_json()["data"]["id"]
        response = self.client.post(
            f"/api/recipes/{self.recipe_id}/reviews", json={"rating": 4, "comment": "Duplicate"}
        )
        self.assertEqual(response.status_code, 409)

        response = self.client.put(f"/api/reviews/{review_id}", json={"rating": 4, "comment": "Updated review"})
        self.assertEqual(response.status_code, 200)
        response = self.client.delete(f"/api/reviews/{review_id}")
        self.assertEqual(response.status_code, 200)
        self.client.delete(f"/api/recipes/{self.recipe_id}/favorite")

    def test_shopping_list_flow(self):
        self.login()
        response = self.client.post("/api/shopping-list/items", json={"name": "Basil", "category": "Produce"})
        self.assertEqual(response.status_code, 201)
        data = response.get_json()["data"]
        item_id = data["items"][0]["id"]

        response = self.client.put(f"/api/shopping-list/items/{item_id}", json={"is_purchased": True})
        self.assertEqual(response.get_json()["data"]["purchased"], 1)

        response = self.client.post(f"/api/shopping-list/from-recipe/{self.recipe_id}")
        self.assertEqual(response.status_code, 201)
        self.assertGreaterEqual(response.get_json()["data"]["total"], 2)

        response = self.client.delete("/api/shopping-list/purchased")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"]["purchased"], 0)

    def test_admin_authorization(self):
        self.login()
        self.assertEqual(self.client.get("/api/admin/stats").status_code, 403)

        self.client.post("/api/auth/logout")
        self.login(email="admin@test.com", password="Admin@123")
        response = self.client.get("/api/admin/stats")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"]["users"], 2)

        response = self.client.get("/api/admin/users")
        self.assertEqual(response.status_code, 200)
        response = self.client.get("/api/admin/reports")
        self.assertEqual(response.status_code, 200)

    def test_password_reset_flow(self):
        response = self.client.post("/api/auth/forgot-password", json={"email": "demo@test.com"})
        self.assertEqual(response.status_code, 200)
        reset_url = response.get_json()["data"]["dev_reset_url"]
        token = reset_url.split("token=")[1]

        response = self.client.post("/api/auth/reset-password", json={"token": token, "password": "Reset1234"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.login(password="Reset1234").status_code, 200)

        response = self.client.post("/api/auth/reset-password", json={"token": token, "password": "Reset5678"})
        self.assertEqual(response.status_code, 400)

    def test_settings_and_notifications(self):
        self.login(email="admin@test.com", password="Admin@123")
        response = self.client.put("/api/settings", json={"site_name": "FoodieBook Test"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/settings").get_json()["data"]["site_name"], "FoodieBook Test")

        response = self.client.post("/api/notifications/broadcast", json={"title": "Test", "message": "Hello"})
        self.assertEqual(response.status_code, 201)
        response = self.client.get("/api/notifications")
        self.assertGreaterEqual(len(response.get_json()["data"]["notifications"]), 1)


if __name__ == "__main__":
    unittest.main()
