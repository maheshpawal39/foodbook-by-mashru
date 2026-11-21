"""Seed FoodieBook with realistic sample data.

Usage (from backend/):
    python seed.py --fresh     # drop/recreate tables and seed
    python seed.py             # seed only when the database is empty
"""
import argparse
import sys
from datetime import datetime, timedelta, timezone

from app import create_app
from app.extensions import db
from app.models import (
    Category,
    Favorite,
    Ingredient,
    Notification,
    Recipe,
    RecipeIngredient,
    RecipeStep,
    Report,
    Review,
    Role,
    ShoppingListItem,
    SiteSetting,
    User,
)

UNSPLASH = "https://images.unsplash.com/photo-{photo}?auto=format&fit=crop&w=1400&q=80"


def img(photo):
    return UNSPLASH.format(photo=photo)


CATEGORIES = [
    ("Breakfast", "नाश्ता", "breakfast", "EggFried", "1517686469429-8bdb88b9f907"),
    ("Lunch", "दोपहर का खाना", "lunch", "Sun", "1547592180-85f173990554"),
    ("Dinner", "रात का खाना", "dinner", "Moon", "1544025162-d76694265947"),
    ("Snacks", "स्नैक्स", "snacks", "Cookie", "1599490659213-e2b9527bd087"),
    ("Desserts", "मिठाई", "desserts", "CakeSlice", "1551024506-0bccd828d307"),
    ("Drinks", "पेय", "drinks", "CupSoda", "1544145945-f90425340c7e"),
    ("Indian Cuisine", "भारतीय व्यंजन", "indian-cuisine", "Flame", "1585937421612-70a008356fbe"),
    ("Chinese Cuisine", "चीनी व्यंजन", "chinese-cuisine", "Soup", "1569718212165-3a8278d5f624"),
    ("Italian Cuisine", "इतालवी व्यंजन", "italian-cuisine", "Pizza", "1513104890138-7c749659a591"),
    ("Street Food", "स्ट्रीट फूड", "street-food", "Store", "1565299585323-38d6b0865b47"),
    ("Healthy Food", "स्वस्थ भोजन", "healthy-food", "Leaf", "1512621776951-a57141f2eefd"),
    ("Vegetarian", "शाकाहारी", "vegetarian", "Sprout", "1518977676601-b53f82aba655"),
    ("Non-Vegetarian", "मांसाहारी", "non-vegetarian", "Drumstick", "1604908176997-125f25cc6f3d"),
]

INGREDIENTS = {
    "Paneer": ("पनीर", "Dairy"), "Butter": ("मक्खन", "Dairy"), "Ghee": ("घी", "Dairy"),
    "Fresh Cream": ("ताज़ी क्रीम", "Dairy"), "Milk": ("दूध", "Dairy"), "Curd": ("दही", "Dairy"),
    "Cheddar Cheese": ("चेडर चीज़", "Dairy"), "Eggs": ("अंडे", "Dairy"),
    "Chicken": ("चिकन", "Meat"), "Chicken Thighs": ("चिकन जांघ", "Meat"),
    "Basmati Rice": ("बासमती चावल", "Pantry"), "Sona Masoori Rice": ("सोना मसूरी चावल", "Pantry"),
    "Poha": ("पोहा", "Pantry"), "Semolina": ("सूजी", "Pantry"),
    "All-Purpose Flour": ("मैदा", "Bakery"), "Whole Wheat Flour": ("गेहूं का आटा", "Bakery"),
    "Bread Crumbs": ("ब्रेड क्रम्ब्स", "Bakery"), "Pav Buns": ("पाव", "Bakery"),
    "Spaghetti": ("स्पेगेटी", "Pantry"), "Hakka Noodles": ("हक्का नूडल्स", "Pantry"),
    "Quinoa": ("किनोआ", "Pantry"), "Chickpeas": ("छोले", "Pantry"),
    "Kidney Beans": ("राजमा", "Pantry"), "Green Peas": ("हरी मटर", "Produce"),
    "Tomatoes": ("टमाटर", "Produce"), "Tomato Puree": ("टमाटर प्यूरी", "Pantry"),
    "Onion": ("प्याज", "Produce"), "Garlic": ("लहसुन", "Produce"), "Ginger": ("अदरक", "Produce"),
    "Green Chilli": ("हरी मिर्च", "Produce"), "Red Chilli Powder": ("लाल मिर्च पाउडर", "Spices"),
    "Kashmiri Chilli Powder": ("कश्मीरी मिर्च पाउडर", "Spices"), "Turmeric": ("हल्दी", "Spices"),
    "Coriander Powder": ("धनिया पाउडर", "Spices"), "Garam Masala": ("गरम मसाला", "Spices"),
    "Cumin Seeds": ("जीरा", "Spices"), "Mustard Seeds": ("राई", "Spices"),
    "Cardamom": ("इलायची", "Spices"), "Cinnamon": ("दालचीनी", "Spices"),
    "Cloves": ("लौंग", "Spices"), "Bay Leaf": ("तेज पत्ता", "Spices"), "Star Anise": ("चक्र फूल", "Spices"),
    "Saffron": ("केसर", "Spices"), "Kasuri Methi": ("कसूरी मेथी", "Spices"),
    "Salt": ("नमक", "Spices"), "Black Pepper": ("काली मिर्च", "Spices"), "Sugar": ("चीनी", "Pantry"),
    "Jaggery": ("गुड़", "Pantry"), "Honey": ("शहद", "Pantry"), "Dark Chocolate": ("डार्क चॉकलेट", "Bakery"),
    "Cocoa Powder": ("कोको पाउडर", "Bakery"), "Vanilla Essence": ("वनीला एसेंस", "Bakery"),
    "Baking Powder": ("बेकिंग पाउडर", "Bakery"), "Baking Soda": ("बेकिंग सोडा", "Bakery"),
    "Olive Oil": ("ऑलिव ऑयल", "Pantry"), "Sunflower Oil": ("सूरजमुखी तेल", "Pantry"),
    "Sesame Oil": ("तिल का तेल", "Pantry"), "Soy Sauce": ("सोया सॉस", "Pantry"),
    "Vinegar": ("सिरका", "Pantry"), "Tea Leaves": ("चाय पत्ती", "Pantry"), "Coffee": ("कॉफ़ी", "Pantry"),
    "Potato": ("आलू", "Produce"), "Sweet Potato": ("शकरकंद", "Produce"), "Carrot": ("गाजर", "Produce"),
    "Cucumber": ("खीरा", "Produce"), "Bell Pepper": ("शिमला मिर्च", "Produce"),
    "Cabbage": ("पत्ता गोभी", "Produce"), "Spinach": ("पालक", "Produce"),
    "Cauliflower": ("फूलगोभी", "Produce"), "Broccoli": ("ब्रोकली", "Produce"),
    "Mushrooms": ("मशरूम", "Produce"), "Zucchini": ("ज़ुकीनी", "Produce"), "Lemon": ("नींबू", "Produce"),
    "Coriander Leaves": ("धनिया पत्ती", "Produce"), "Mint Leaves": ("पुदीना", "Produce"),
    "Curry Leaves": ("करी पत्ता", "Produce"), "Spring Onion": ("हरा प्याज", "Produce"),
    "Avocado": ("एवोकाडो", "Produce"), "Cherry Tomatoes": ("चेरी टमाटर", "Produce"),
    "Basil": ("तुलसी", "Produce"), "Parsley": ("पार्सले", "Produce"),
    "Baby Spinach": ("बेबी पालक", "Produce"), "Lettuce": ("लेट्यूस", "Produce"),
    "Chickpea Flour": ("बेसन", "Pantry"), "Tamarind": ("इमली", "Pantry"),
    "Peanuts": ("मूंगफली", "Pantry"), "Cashews": ("काजू", "Pantry"), "Almonds": ("बादाम", "Pantry"),
    "Sesame Seeds": ("तिल", "Pantry"), "Water": ("पानी", "Other"), "Vegetable Stock": ("सब्ज़ी स्टॉक", "Pantry"),
}


def I(name, qty, unit="", notes=""):
    return {"name": name, "quantity": qty, "unit": unit, "notes": notes}


RECIPES = [
    {
        "title": "Paneer Butter Masala", "category": "Dinner", "author": "priya@foodiebook.com",
        "image": img("1631452180519-c014fe946bc7"), "cuisine": "Indian", "diet": "veg",
        "prep": 20, "cook": 30, "servings": 4, "difficulty": "Easy", "calories": 420,
        "featured": True, "views": 1840,
        "short": "Silky tomato-cashew gravy with pillowy paneer, finished with kasuri methi and cream.",
        "description": "A restaurant favourite made simple at home. Sweet tomatoes, toasted cashews and a gentle warmth of spices create a glossy gravy that clings to every cube of paneer. Serve with butter naan or jeera rice for a dinner that feels celebratory.",
        "ingredients": [I("Paneer", "400", "g", "cubed"), I("Tomatoes", "5", "medium"), I("Cashews", "15", "whole", "soaked"),
                        I("Butter", "3", "tbsp"), I("Fresh Cream", "3", "tbsp"), I("Onion", "1", "medium"),
                        I("Ginger", "1", "inch"), I("Garlic", "4", "cloves"), I("Kashmiri Chilli Powder", "1", "tsp"),
                        I("Garam Masala", "1", "tsp"), I("Kasuri Methi", "1", "tsp", "crushed"), I("Sugar", "1", "tsp"), I("Salt", "to taste")],
        "steps": [
            ("Melt 1 tbsp butter and sauté onion, ginger and garlic until soft and lightly golden.", 0),
            ("Add tomatoes, cashews and salt. Cover and simmer for 10 minutes until the tomatoes collapse.", 600),
            ("Cool slightly, blend to a smooth purée and strain for a silkier finish.", 0),
            ("Melt the remaining butter, add chilli powder off the heat, then pour in the purée.", 30),
            ("Simmer for 8–10 minutes, stirring often, until the gravy deepens in colour.", 540),
            ("Add garam masala, sugar, kasuri methi and paneer. Warm gently for 4 minutes.", 240),
            ("Swirl in cream, taste for salt and serve hot.", 0),
        ],
        "nutrition": {"protein": "22 g", "carbs": "18 g", "fat": "28 g", "fiber": "3 g", "sugar": "8 g", "sodium": "620 mg"},
        "tips": "Soak cashews in warm water for 15 minutes for a luxurious body without extra cream. Add paneer at the very end.",
    },
    {
        "title": "Hyderabadi Chicken Biryani", "category": "Indian Cuisine", "author": "aarav@foodiebook.com",
        "image": img("1642821373181-696a54913e93"), "cuisine": "Indian", "diet": "nonveg",
        "prep": 30, "cook": 60, "servings": 6, "difficulty": "Hard", "calories": 650,
        "featured": True, "views": 2210,
        "short": "Layered basmati and saffron chicken, sealed and slow-cooked in true dum style.",
        "description": "The crown jewel of Indian cooking: long-grained basmati layered with marinated chicken, fried onions, saffron milk and mint. The pot is sealed and cooked on low heat so every grain absorbs the aroma of whole spices.",
        "ingredients": [I("Chicken", "1", "kg", "bone-in"), I("Basmati Rice", "700", "g", "soaked"), I("Curd", "1", "cup"),
                        I("Onion", "3", "large", "fried"), I("Ginger", "2", "tbsp"), I("Garlic", "2", "tbsp"),
                        I("Garam Masala", "2", "tsp"), I("Kashmiri Chilli Powder", "2", "tsp"), I("Turmeric", "1/2", "tsp"),
                        I("Saffron", "1", "pinch"), I("Mint Leaves", "1", "cup"), I("Coriander Leaves", "1", "cup"),
                        I("Ghee", "4", "tbsp"), I("Cardamom", "4", "pods"), I("Cinnamon", "1", "stick"),
                        I("Cloves", "5", "whole"), I("Star Anise", "1", "whole"), I("Salt", "to taste")],
        "steps": [
            ("Marinate chicken with curd, ginger, garlic, spices and salt for at least 2 hours.", 7200),
            ("Boil water with whole spices. Parboil soaked rice until 70% done and drain.", 480),
            ("Cook the marinated chicken in ghee for 8 minutes in a heavy pot and spread evenly.", 480),
            ("Layer parboiled rice over the chicken. Scatter onions, herbs, saffron milk and ghee.", 0),
            ("Seal the pot and cook on the lowest flame for 30 minutes. Rest for 10 minutes.", 1800),
            ("Open at the table, fluff gently and serve with raita.", 0),
        ],
        "nutrition": {"protein": "38 g", "carbs": "72 g", "fat": "22 g", "fiber": "3 g", "sugar": "5 g", "sodium": "780 mg"},
        "tips": "Do not stir biryani while it cooks. Resting is as important as cooking.",
    },
    {
        "title": "Crispy Masala Dosa", "category": "Breakfast", "author": "meera@foodiebook.com",
        "image": img("1630383249896-424e482df921"), "cuisine": "Indian", "diet": "veg",
        "prep": 20, "cook": 25, "servings": 3, "difficulty": "Medium", "calories": 380, "views": 1520,
        "short": "Golden, crackling dosa wrapped around spiced potato masala with coconut chutney.",
        "description": "A South Indian breakfast icon. A thin fermented rice-lentil batter is spread over a hot griddle until shatteringly crisp, then folded around soft turmeric-scented potatoes.",
        "ingredients": [I("Sona Masoori Rice", "2", "cups"), I("Poha", "1/4", "cup"), I("Mustard Seeds", "1", "tsp"),
                        I("Onion", "1", "large"), I("Potato", "4", "medium", "boiled"), I("Green Chilli", "2", "chopped"),
                        I("Curry Leaves", "1", "sprig"), I("Turmeric", "1/2", "tsp"), I("Ginger", "1", "inch"),
                        I("Coriander Leaves", "2", "tbsp"), I("Sunflower Oil", "3", "tbsp"), I("Salt", "to taste")],
        "steps": [
            ("Blend soaked rice and poha with water. Ferment for 8–10 hours until risen and pleasantly sour.", 36000),
            ("Temper mustard seeds, add onion, chilli, ginger and curry leaves and cook until soft.", 0),
            ("Add turmeric, potatoes and salt. Cook for 5 minutes and finish with coriander.", 300),
            ("Heat a griddle, wipe with oil, pour a ladle of batter and spread in a spiral.", 0),
            ("Drizzle oil and cook until the base is golden and crisp. Add masala and fold.", 120),
            ("Serve immediately with coconut chutney and sambar.", 0),
        ],
        "nutrition": {"protein": "8 g", "carbs": "58 g", "fat": "12 g", "fiber": "4 g", "sugar": "3 g", "sodium": "540 mg"},
        "tips": "Sprinkle a little water on the hot griddle before the first dosa for an even, crisp surface.",
    },
    {
        "title": "Creamy Tomato Basil Pasta", "category": "Italian Cuisine", "author": "rohan@foodiebook.com",
        "image": img("1621996346565-e3dbc646d9a9"), "cuisine": "Italian", "diet": "veg",
        "prep": 10, "cook": 25, "servings": 2, "difficulty": "Easy", "calories": 480, "views": 980,
        "short": "Al dente spaghetti in a velvety tomato-cream sauce with fresh basil.",
        "description": "A weeknight pasta that tastes like a slow Sunday. Sweet tomatoes reduce into a glossy sauce, cream rounds it out, and basil keeps everything fresh.",
        "ingredients": [I("Spaghetti", "250", "g"), I("Tomatoes", "4", "ripe"), I("Tomato Puree", "1", "cup"),
                        I("Garlic", "3", "cloves"), I("Fresh Cream", "1/2", "cup"), I("Olive Oil", "2", "tbsp"),
                        I("Basil", "10", "leaves"), I("Cheddar Cheese", "2", "tbsp"), I("Black Pepper", "1/2", "tsp"), I("Salt", "to taste")],
        "steps": [
            ("Cook spaghetti in salted water until al dente. Reserve a cup of pasta water.", 540),
            ("Warm olive oil and gently cook garlic until fragrant.", 60),
            ("Add tomatoes and purée. Simmer for 10 minutes, crushing the tomatoes.", 600),
            ("Stir in cream and a splash of pasta water. Season with salt and pepper.", 120),
            ("Toss in the pasta and basil and cook for a minute.", 60),
            ("Finish with cheese and a drizzle of olive oil.", 0),
        ],
        "nutrition": {"protein": "16 g", "carbs": "68 g", "fat": "18 g", "fiber": "5 g", "sugar": "10 g", "sodium": "480 mg"},
        "tips": "Starchy pasta water is the secret to a sauce that clings to every strand.",
    },
    {
        "title": "Smoky Paneer Tikka", "category": "Snacks", "author": "priya@foodiebook.com",
        "image": img("1599487488170-d11ec9c172f0"), "cuisine": "Indian", "diet": "veg",
        "prep": 15, "cook": 15, "servings": 4, "difficulty": "Easy", "calories": 290, "views": 760,
        "short": "Charred paneer and peppers in a tangy yoghurt-spice marinade.",
        "description": "Smoky char outside, soft centre, and a bright yoghurt marinade spiked with ginger, chilli and garam masala. Cook on a grill pan, in the oven, or over charcoal.",
        "ingredients": [I("Paneer", "400", "g"), I("Curd", "1/2", "cup", "hung"), I("Bell Pepper", "1", "large"),
                        I("Onion", "1", "large"), I("Ginger", "1", "tbsp"), I("Garlic", "1", "tbsp"),
                        I("Kashmiri Chilli Powder", "1", "tsp"), I("Garam Masala", "1", "tsp"),
                        I("Chickpea Flour", "1", "tbsp"), I("Lemon", "1/2", "juice"), I("Salt", "to taste")],
        "steps": [
            ("Whisk hung curd with ginger, garlic, spices, roasted besan, lemon and salt.", 0),
            ("Fold in paneer, peppers and onion. Marinate for at least 30 minutes.", 1800),
            ("Thread onto skewers, leaving a little space between pieces.", 0),
            ("Grill on a hot pan for 10–12 minutes, turning until charred.", 720),
            ("Finish with chaat masala, lemon and mint chutney.", 0),
        ],
        "nutrition": {"protein": "20 g", "carbs": "10 g", "fat": "18 g", "fiber": "2 g", "sugar": "4 g", "sodium": "420 mg"},
        "tips": "Hung curd is essential — watery curd slides off the paneer.",
    },
    {
        "title": "Rainbow Buddha Bowl", "category": "Healthy Food", "author": "meera@foodiebook.com",
        "image": img("1512621776951-a57141f2eefd"), "cuisine": "Mediterranean", "diet": "veg",
        "prep": 15, "cook": 20, "servings": 2, "difficulty": "Easy", "calories": 350, "views": 640,
        "short": "Roasted vegetables, quinoa and chickpeas with a lemon-tahini dressing.",
        "description": "A colourful make-ahead lunch that keeps you full without feeling heavy. Warm roasted vegetables meet cool greens, nutty quinoa and crisp chickpeas.",
        "ingredients": [I("Quinoa", "3/4", "cup"), I("Chickpeas", "1", "cup"), I("Sweet Potato", "1", "medium"),
                        I("Broccoli", "1", "head"), I("Cherry Tomatoes", "8", "whole"), I("Avocado", "1", "ripe"),
                        I("Baby Spinach", "2", "cups"), I("Lemon", "1", "juice"), I("Olive Oil", "2", "tbsp"),
                        I("Sesame Seeds", "1", "tbsp"), I("Cumin Seeds", "1", "tsp"), I("Salt", "to taste")],
        "steps": [
            ("Roast sweet potato, broccoli and chickpeas with oil, cumin and salt at 220°C for 20 minutes.", 1200),
            ("Cook quinoa in double the water for 15 minutes, rest and fluff.", 900),
            ("Whisk lemon juice, olive oil, salt and a little water into a dressing.", 0),
            ("Arrange quinoa, greens, roasted vegetables and avocado in bowls.", 0),
            ("Spoon over dressing and scatter with toasted sesame seeds.", 0),
        ],
        "nutrition": {"protein": "14 g", "carbs": "46 g", "fat": "15 g", "fiber": "11 g", "sugar": "7 g", "sodium": "380 mg"},
        "tips": "Roast chickpeas separately until they rattle — that is how you get the crunch.",
    },
    {
        "title": "Old Delhi Butter Chicken", "category": "Non-Vegetarian", "author": "aarav@foodiebook.com",
        "image": img("1603894584373-5ac82b2ae398"), "cuisine": "Indian", "diet": "nonveg",
        "prep": 20, "cook": 35, "servings": 4, "difficulty": "Medium", "calories": 590, "views": 1760,
        "short": "Charred chicken simmered in a rich, buttery tomato gravy.",
        "description": "Butter chicken is a study in balance: smoky chicken, tangy tomato, sweet cream and the warmth of dried fenugreek. The gravy is blended smooth then finished with butter.",
        "ingredients": [I("Chicken", "600", "g"), I("Curd", "1/2", "cup"), I("Tomatoes", "6", "ripe"),
                        I("Butter", "4", "tbsp"), I("Fresh Cream", "1/2", "cup"), I("Cashews", "12", "whole"),
                        I("Ginger", "1", "tbsp"), I("Garlic", "1", "tbsp"), I("Kashmiri Chilli Powder", "1.5", "tsp"),
                        I("Garam Masala", "1", "tsp"), I("Kasuri Methi", "1", "tsp"), I("Honey", "1", "tsp"), I("Salt", "to taste")],
        "steps": [
            ("Marinate chicken with curd, ginger, garlic, chilli and salt. Grill until charred.", 1800),
            ("Simmer tomatoes with cashews for 15 minutes, then blend and strain.", 900),
            ("Melt butter, add tomato purée and cook for 10 minutes until glossy.", 600),
            ("Season with garam masala, honey and crushed kasuri methi.", 0),
            ("Add grilled chicken and cream. Simmer for 5 minutes and rest off the heat.", 300),
            ("Serve with naan and pickled onions.", 0),
        ],
        "nutrition": {"protein": "36 g", "carbs": "15 g", "fat": "38 g", "fiber": "3 g", "sugar": "9 g", "sodium": "690 mg"},
        "tips": "Rest the gravy for 10 minutes before serving so the flavours settle.",
    },
    {
        "title": "Veg Hakka Noodles", "category": "Chinese Cuisine", "author": "rohan@foodiebook.com",
        "image": img("1585032226651-759b368d7246"), "cuisine": "Chinese", "diet": "veg",
        "prep": 10, "cook": 15, "servings": 3, "difficulty": "Easy", "calories": 410, "views": 890,
        "short": "Wok-tossed noodles with crunchy vegetables and a savoury soy glaze.",
        "description": "Indo-Chinese street-style noodles with unmistakable wok energy. The trick is high heat, quick tossing and vegetables that stay crisp.",
        "ingredients": [I("Hakka Noodles", "250", "g"), I("Cabbage", "1", "cup"), I("Carrot", "1", "large"),
                        I("Bell Pepper", "1", "sliced"), I("Spring Onion", "3", "stalks"), I("Garlic", "4", "cloves"),
                        I("Ginger", "1", "inch"), I("Soy Sauce", "2", "tbsp"), I("Vinegar", "1", "tsp"),
                        I("Sesame Oil", "1", "tsp"), I("Black Pepper", "1/2", "tsp"), I("Salt", "to taste")],
        "steps": [
            ("Cook noodles according to the packet, drain and toss with a little oil.", 300),
            ("Heat a wok until very hot. Add oil, garlic and ginger for 20 seconds.", 20),
            ("Add vegetables and stir-fry on high heat for 3 minutes.", 180),
            ("Add soy sauce, vinegar, pepper and salt, then toss in the noodles.", 0),
            ("Finish with spring onion greens and sesame oil.", 0),
        ],
        "nutrition": {"protein": "11 g", "carbs": "64 g", "fat": "11 g", "fiber": "5 g", "sugar": "6 g", "sodium": "860 mg"},
        "tips": "Do not overcrowd the wok. Cook in two batches so the noodles sear instead of steam.",
    },
    {
        "title": "Mumbai Vada Pav", "category": "Street Food", "author": "priya@foodiebook.com",
        "image": img("1606491956689-2ea866880c84"), "cuisine": "Indian", "diet": "veg",
        "prep": 20, "cook": 20, "servings": 4, "difficulty": "Medium", "calories": 330, "views": 1120,
        "short": "Spiced potato vada tucked into a soft pav with fiery garlic chutney.",
        "description": "Mumbai's favourite handheld meal. A crisp gram-flour shell around soft garlicky potato, layered into a buttered pav with green chutney and dry garlic chutney.",
        "ingredients": [I("Potato", "4", "medium"), I("Pav Buns", "4", "whole"), I("Chickpea Flour", "1.5", "cups"),
                        I("Mustard Seeds", "1", "tsp"), I("Curry Leaves", "1", "sprig"), I("Green Chilli", "3", "chopped"),
                        I("Garlic", "8", "cloves"), I("Ginger", "1", "inch"), I("Turmeric", "1/2", "tsp"),
                        I("Red Chilli Powder", "1", "tsp"), I("Sunflower Oil", "for frying"), I("Salt", "to taste")],
        "steps": [
            ("Temper mustard seeds and curry leaves, add aromatics and mash in potatoes.", 300),
            ("Shape potato mixture into balls and make a thick besan batter.", 0),
            ("Dip each ball in batter and fry until golden.", 480),
            ("Blend garlic, chilli powder and peanuts with oil for the dry chutney.", 0),
            ("Slit the pav, spread chutneys, add the vada and press gently.", 0),
            ("Serve immediately with fried green chillies.", 0),
        ],
        "nutrition": {"protein": "9 g", "carbs": "48 g", "fat": "13 g", "fiber": "5 g", "sugar": "3 g", "sodium": "620 mg"},
        "tips": "Add a pinch of baking soda to the batter for a lighter, crisper shell.",
    },
    {
        "title": "Molten Chocolate Lava Cake", "category": "Desserts", "author": "admin@foodiebook.com",
        "image": img("1578985545062-69928b1d9587"), "cuisine": "French", "diet": "veg",
        "prep": 10, "cook": 12, "servings": 2, "difficulty": "Medium", "calories": 480,
        "featured": True, "views": 2030,
        "short": "A warm chocolate cake with a molten centre, ready in twelve minutes.",
        "description": "The ultimate dinner-party dessert: crisp-edged, deeply chocolatey and flowing in the middle. Use the best dark chocolate you have, and do not overbake.",
        "ingredients": [I("Dark Chocolate", "120", "g"), I("Butter", "100", "g"), I("Eggs", "2", "large"),
                        I("Sugar", "60", "g"), I("All-Purpose Flour", "2", "tbsp"), I("Cocoa Powder", "1", "tbsp"),
                        I("Vanilla Essence", "1/2", "tsp"), I("Salt", "1", "pinch")],
        "steps": [
            ("Heat the oven to 200°C. Butter two ramekins and dust with cocoa.", 0),
            ("Melt chocolate and butter over a water bath. Cool for 2 minutes.", 180),
            ("Whisk eggs, sugar, vanilla and salt until pale and doubled.", 180),
            ("Fold in chocolate, then sift in flour and fold gently.", 0),
            ("Bake for 11–12 minutes until edges are set but the centre still wobbles.", 720),
            ("Rest for 1 minute, invert onto plates and serve.", 60),
        ],
        "nutrition": {"protein": "8 g", "carbs": "34 g", "fat": "32 g", "fiber": "3 g", "sugar": "26 g", "sodium": "160 mg"},
        "tips": "Chill the batter for 20 minutes for a more controlled molten centre.",
    },
    {
        "title": "Masala Chai", "category": "Drinks", "author": "meera@foodiebook.com",
        "image": img("1544787219-7f47ccb76574"), "cuisine": "Indian", "diet": "veg",
        "prep": 5, "cook": 10, "servings": 2, "difficulty": "Easy", "calories": 90, "views": 1320,
        "short": "Strong tea simmered with ginger, cardamom and a hint of jaggery.",
        "description": "Not just tea with spices — a proper simmered chai where milk, water, tea and aromatics come together slowly. Warming, malty and just sweet enough.",
        "ingredients": [I("Milk", "1", "cup"), I("Water", "1", "cup"), I("Tea Leaves", "2", "tsp"),
                        I("Ginger", "1", "inch"), I("Cardamom", "3", "pods"), I("Cinnamon", "1", "piece"),
                        I("Cloves", "2", "whole"), I("Jaggery", "1", "tsp")],
        "steps": [
            ("Crush ginger, cardamom, cinnamon and cloves lightly.", 0),
            ("Bring water and spices to a boil. Simmer for 3 minutes.", 180),
            ("Add tea leaves and simmer for 2 minutes.", 120),
            ("Pour in milk, bring to a boil, then simmer for 4 minutes.", 240),
            ("Stir in jaggery, strain and serve hot.", 0),
        ],
        "nutrition": {"protein": "4 g", "carbs": "12 g", "fat": "4 g", "fiber": "0 g", "sugar": "10 g", "sodium": "60 mg"},
        "tips": "Crush, do not grind, the whole spices. Boil tea with water first for a stronger flavour.",
    },
    {
        "title": "पालक पनीर", "category": "Vegetarian", "author": "priya@foodiebook.com",
        "image": img("1618449840665-9ed506d73a34"), "cuisine": "Indian", "diet": "veg",
        "prep": 15, "cook": 25, "servings": 4, "difficulty": "Easy", "calories": 310, "views": 890,
        "short": "मलाईदार पालक ग्रेवी में नरम पनीर — घर का पारंपरिक स्वाद।",
        "description": "पालक पनीर हर भारतीय घर की पसंदीदा सब्ज़ी है। ताज़ी पालक को उबालकर, ठंडा करके पीसा जाता है और फिर अदरक-लहसुन, टमाटर और मसालों के साथ पकाया जाता है। अंत में मलाई और पनीर मिलाकर यह व्यंजन रोटी, पराठा या चावल के साथ बेहतरीन लगता है।",
        "ingredients": [I("Spinach", "500", "g", "धोई हुई"), I("Paneer", "250", "g", "क्यूब्स"), I("Tomatoes", "3", "medium"),
                        I("Onion", "1", "medium"), I("Ginger", "1", "inch"), I("Garlic", "4", "cloves"),
                        I("Green Chilli", "1", "whole"), I("Cumin Seeds", "1", "tsp"), I("Garam Masala", "1/2", "tsp"),
                        I("Fresh Cream", "2", "tbsp"), I("Ghee", "1", "tbsp"), I("Salt", "स्वादानुसार")],
        "steps": [
            ("पालक को उबलते पानी में 2 मिनट डालें, फिर ठंडे पानी में निकालें और पीस लें।", 120),
            ("कड़ाही में घी गरम करें, जीरा और लहसुन डालकर हल्का सुनहरा होने तक भूनें।", 60),
            ("प्याज़ और अदरक डालकर पारदर्शी होने तक पकाएँ। फिर टमाटर और हरी मिर्च डालें।", 300),
            ("टमाटर गलने तक पकाएँ, मसाले डालें और पालक की प्यूरी मिलाएँ।", 0),
            ("5 मिनट तक धीमी आँच पर पकाएँ, फिर पनीर और मलाई डालें।", 300),
            ("गरमा-गरम रोटी या पराठे के साथ परोसें।", 0),
        ],
        "nutrition": {"protein": "18 g", "carbs": "14 g", "fat": "20 g", "fiber": "4 g", "sugar": "5 g", "sodium": "480 mg"},
        "tips": "पालक को उबालने के बाद तुरंत ठंडे पानी में डालें, इससे उसका हरा रंग बना रहता है।",
    },
    {
        "title": "Sunday Dal Tadka", "category": "Dinner", "author": "demo@foodiebook.com",
        "image": img("1546833999-b9f581a1996d"), "cuisine": "Indian", "diet": "veg",
        "prep": 10, "cook": 30, "servings": 4, "difficulty": "Easy", "calories": 260,
        "status": "draft", "views": 0,
        "short": "Comforting yellow dal with a sizzling ghee and cumin tadka.",
        "description": "Simple, soulful and endlessly comforting. Yellow lentils are cooked until creamy, then crowned with a sizzling tadka of ghee, cumin, garlic and dried red chilli.",
        "ingredients": [I("Chickpeas", "1", "cup"), I("Turmeric", "1/2", "tsp"), I("Ghee", "2", "tbsp"),
                        I("Cumin Seeds", "1", "tsp"), I("Garlic", "4", "cloves"), I("Onion", "1", "small"),
                        I("Tomatoes", "2", "medium"), I("Coriander Leaves", "2", "tbsp"), I("Lemon", "1/2", "juice"), I("Salt", "to taste")],
        "steps": [
            ("Pressure cook soaked chickpeas with turmeric and salt until soft.", 1800),
            ("Heat ghee, add cumin, garlic and onion and fry until golden.", 240),
            ("Add tomatoes and cook until they break down.", 300),
            ("Pour in the cooked dal, adjust consistency and simmer for 5 minutes.", 300),
            ("Finish with lemon juice, coriander and a final spoon of ghee.", 0),
        ],
        "nutrition": {"protein": "13 g", "carbs": "32 g", "fat": "9 g", "fiber": "8 g", "sugar": "4 g", "sodium": "420 mg"},
        "tips": "Save the dal cooking water — it is full of flavour and perfect for adjusting consistency.",
    },
]

REVIEWS = [
    (0, "demo@foodiebook.com", 5, "Restaurant-quality at home. The cashew paste makes all the difference!"),
    (0, "aarav@foodiebook.com", 5, "Silky gravy, perfect balance. Added extra kasuri methi."),
    (0, "meera@foodiebook.com", 4, "Lovely recipe. I used less cream and it was still rich."),
    (1, "demo@foodiebook.com", 5, "The dum method works beautifully. My whole family loved it."),
    (1, "priya@foodiebook.com", 4, "Took longer than expected but worth every minute."),
    (2, "demo@foodiebook.com", 5, "Crisp dosa on the first try! The poha tip is gold."),
    (2, "rohan@foodiebook.com", 4, "Fermentation is key. Batter was perfect after 9 hours."),
    (3, "demo@foodiebook.com", 4, "Quick and comforting. Added chilli flakes for heat."),
    (3, "meera@foodiebook.com", 5, "Weeknight hero. The pasta water trick makes it so glossy."),
    (4, "demo@foodiebook.com", 5, "Smoky and tender. The charcoal trick works."),
    (5, "demo@foodiebook.com", 4, "Fresh and filling. The dressing is excellent."),
    (5, "aarav@foodiebook.com", 5, "My new meal-prep lunch. Keeps well for two days."),
    (6, "demo@foodiebook.com", 5, "The gravy is unreal. Better than takeaway."),
    (6, "meera@foodiebook.com", 4, "Rich but balanced. Great with garlic naan."),
    (7, "demo@foodiebook.com", 4, "So fast and full of wok flavour."),
    (8, "demo@foodiebook.com", 5, "Perfect street-food fix. The garlic chutney is fiery!"),
    (9, "demo@foodiebook.com", 5, "Molten centre on the first attempt. 11 minutes exactly."),
    (9, "priya@foodiebook.com", 5, "Elegant dessert that looks harder than it is."),
    (10, "demo@foodiebook.com", 5, "My morning ritual now. Perfect spice ratio."),
    (11, "demo@foodiebook.com", 5, "बिल्कुल घर जैसा स्वाद। पालक का रंग भी बहुत अच्छा आया।"),
    (11, "rohan@foodiebook.com", 4, "आसान रेसिपी और बहुत स्वादिष्ट।"),
]


def seed(fresh: bool = False):
    app = create_app()
    with app.app_context():
        if fresh:
            db.drop_all()
        db.create_all()

        if Recipe.query.count() and not fresh:
            print("Database already contains recipes. Use --fresh to rebuild sample data.")
            return

        now = datetime.now(timezone.utc)

        roles = {}
        for name, description in (("admin", "Platform administrator"), ("user", "Recipe lover")):
            role = Role.query.filter_by(name=name).first() or Role(name=name, description=description)
            db.session.add(role)
            roles[name] = role
        db.session.flush()

        users = {}
        user_defs = [
            (app.config["ADMIN_EMAIL"], app.config["ADMIN_NAME"], "admin", app.config["ADMIN_PASSWORD"],
             "Creator of FoodieBook. Lover of slow-cooked food, strong chai and generous tables."),
            ("aarav@foodiebook.com", "Aarav Mehta", "admin", "Chef@123", "Chef and recipe developer chasing the perfect biryani."),
            ("priya@foodiebook.com", "Priya Sharma", "user", "Chef@123", "Home cook, cookbook collector and paneer enthusiast."),
            ("meera@foodiebook.com", "Meera Iyer", "user", "Chef@123", "Plant-forward cooking with a South Indian heart."),
            ("rohan@foodiebook.com", "Rohan Kapoor", "user", "Chef@123", "Pasta, woks and everything in between."),
            ("demo@foodiebook.com", "Demo Foodie", "user", "Demo@123", "Testing every recipe so you don't have to."),
        ]
        for email, name, role_name, password, bio in user_defs:
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(name=name, email=email, role_id=roles[role_name].id, bio=bio)
                user.set_password(password)
                user.created_at = now - timedelta(days=60 - len(name))
                db.session.add(user)
            users[email] = user
        db.session.flush()

        categories = {}
        for order, (name, name_hi, slug, icon, photo) in enumerate(CATEGORIES):
            category = Category.query.filter_by(slug=slug).first()
            if not category:
                category = Category(
                    name=name, name_hi=name_hi, slug=slug, icon=icon, image=img(photo),
                    description=f"Discover our {name.lower()} collection.", sort_order=order,
                )
                db.session.add(category)
            categories[name] = category
        db.session.flush()

        ingredients_index = {}
        for name, (name_hi, category_name) in INGREDIENTS.items():
            ingredient = Ingredient.query.filter_by(name=name).first()
            if not ingredient:
                ingredient = Ingredient(name=name, name_hi=name_hi, category=category_name)
                db.session.add(ingredient)
            ingredients_index[name.lower()] = ingredient
        db.session.flush()

        recipes = []
        for index, defn in enumerate(RECIPES):
            ingredient = db.session.query(Recipe).count()  # noqa: F841
            recipe = Recipe(
                title=defn["title"],
                slug=f"{''.join(ch.lower() if ch.isalnum() else '-' for ch in defn['title']).strip('-')}-{index + 1}",
                short_description=defn["short"],
                description=defn["description"],
                image=defn["image"],
                category_id=categories[defn["category"]].id,
                author_id=users[defn["author"]].id,
                cuisine=defn["cuisine"],
                diet=defn["diet"],
                prep_time=defn["prep"],
                cook_time=defn["cook"],
                total_time=defn["prep"] + defn["cook"],
                difficulty=defn["difficulty"],
                servings=defn["servings"],
                calories=defn["calories"],
                tips=defn["tips"],
                status=defn.get("status", "published"),
                is_featured=defn.get("featured", False),
                view_count=defn.get("views", 0),
                nutrition=defn["nutrition"],
                created_at=now - timedelta(days=28 - index),
            )
            db.session.add(recipe)
            db.session.flush()
            for item in defn["ingredients"]:
                master = ingredients_index.get(item["name"].lower())
                if not master:
                    master = Ingredient(name=item["name"], category="Other")
                    db.session.add(master)
                    db.session.flush()
                    ingredients_index[item["name"].lower()] = master
                recipe.ingredients.append(
                    RecipeIngredient(ingredient_id=master.id, quantity=item["quantity"], unit=item["unit"], notes=item["notes"])
                )
            for number, (instruction, timer) in enumerate(defn["steps"], start=1):
                recipe.steps.append(RecipeStep(step_number=number, instruction=instruction, timer_seconds=timer))
            recipes.append(recipe)
        db.session.flush()

        for recipe_index, email, rating, comment in REVIEWS:
            db.session.add(
                Review(
                    user_id=users[email].id,
                    recipe_id=recipes[recipe_index].id,
                    rating=rating,
                    comment=comment,
                    created_at=now - timedelta(days=recipe_index % 7, hours=rating),
                )
            )

        favorites = {
            "demo@foodiebook.com": [0, 2, 5, 9, 10, 11],
            "aarav@foodiebook.com": [9, 2],
            "meera@foodiebook.com": [1, 6],
            "priya@foodiebook.com": [5, 7, 11],
            "rohan@foodiebook.com": [0, 3],
        }
        for email, indexes in favorites.items():
            for index in indexes:
                db.session.add(Favorite(user_id=users[email].id, recipe_id=recipes[index].id))

        demo_list = users["demo@foodiebook.com"].default_list()
        for name, quantity, unit, category, purchased in [
            ("Paneer", "400", "g", "Dairy", False), ("Tomatoes", "6", "medium", "Produce", False),
            ("Basmati Rice", "1", "kg", "Pantry", True), ("Fresh Cream", "200", "ml", "Dairy", False),
            ("Coriander Leaves", "1", "bunch", "Produce", True), ("Garam Masala", "1", "box", "Spices", False),
        ]:
            db.session.add(
                ShoppingListItem(
                    shopping_list_id=demo_list.id, name=name, quantity=quantity, unit=unit,
                    category=category, is_purchased=purchased,
                )
            )

        notifications = [
            ("demo@foodiebook.com", "Welcome to FoodieBook!", "Your bilingual cookbook is ready. Start exploring recipes today.", "success", "/dashboard"),
            ("demo@foodiebook.com", "New recipe from Meera", "Rainbow Buddha Bowl was just published. Perfect for meal prep.", "recipe", f"/recipes/{recipes[5].id}"),
            ("admin@foodiebook.com", "Weekly platform summary", "You have new reviews and reports waiting in the admin dashboard.", "info", "/admin"),
        ]
        for email, title, message, kind, link in notifications:
            db.session.add(Notification(user_id=users[email].id, title=title, message=message, type=kind, link=link))
        db.session.add(
            Notification(
                user_id=None, title="Festive recipe collection is live 🎉",
                message="Discover our curated collection of celebratory recipes for the season.",
                type="announcement", link="/explore",
            )
        )

        db.session.add(
            Report(
                reporter_id=users["meera@foodiebook.com"].id, recipe_id=recipes[8].id,
                reason="Misleading image", details="The image does not match the ingredients described.",
                status="pending",
            )
        )
        db.session.add(
            Report(
                reporter_id=users["rohan@foodiebook.com"].id, recipe_id=recipes[3].id,
                reason="Spam or promotional content", details="This looks promotional rather than genuine.",
                status="resolved",
            )
        )

        settings = {
            "site_name": "FoodieBook", "site_tagline": "by Marshru",
            "site_description": "A premium home for recipes, flavours and the people who cook them.",
            "about_text": "FoodieBook by Marshru is a bilingual recipe management and food discovery platform built for passionate home cooks.",
            "contact_email": "hello@foodiebook.app", "instagram_url": "https://instagram.com",
            "youtube_url": "https://youtube.com",
            "featured_recipe_ids": f"{recipes[0].id},{recipes[1].id},{recipes[9].id}",
            "maintenance_mode": "false",
        }
        for key, value in settings.items():
            db.session.add(SiteSetting(key=key, value=value))

        db.session.commit()
        print("Seed complete.")
        print(f"  Users: {User.query.count()}   Recipes: {Recipe.query.count()}   Categories: {Category.query.count()}")
        print(f"  Ingredients: {Ingredient.query.count()}   Reviews: {Review.query.count()}")
        print("  Admin: admin@foodiebook.com / Admin@123")
        print("  Demo:  demo@foodiebook.com / Demo@123")
        print("  Chefs: aarav@, priya@, meera@, rohan@foodiebook.com / Chef@123")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fresh", action="store_true")
    args = parser.parse_args()
    if args.fresh:
        confirm = input("This will delete all existing data. Type 'yes' to continue: ")
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            sys.exit(1)
    seed(fresh=args.fresh)
