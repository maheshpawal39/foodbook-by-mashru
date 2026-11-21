"""Idempotent seed data for FoodieBook by Marshru."""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

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
    SiteSetting,
    ShoppingList,
    ShoppingListItem,
    User,
)

BASE_DIR = Path(__file__).resolve().parent

CATEGORIES = [
    ("Breakfast", "नाश्ता", "breakfast", "Coffee", "Bright, comforting mornings."),
    ("Lunch", "दोपहर का खाना", "lunch", "Sun", "Midday meals worth slowing down for."),
    ("Dinner", "रात का खाना", "dinner", "MoonStar", "Soulful plates for the evening table."),
    ("Snacks", "स्नैक्स", "snacks", "Cookie", "Small bites, big cravings."),
    ("Desserts", "मिठाई", "desserts", "CakeSlice", "A little sweetness to end well."),
    ("Drinks", "पेय", "drinks", "CupSoda", "Sips, shakes and warm cups."),
    ("Indian", "भारतीय", "indian", "Flame", "Regional classics and family favourites."),
    ("Chinese", "चीनी", "chinese", "Soup", "Wok-tossed comfort with bold flavour."),
    ("Italian", "इतालवी", "italian", "Pizza", "Simple ingredients, generous heart."),
    ("Street Food", "स्ट्रीट फूड", "street-food", "Store", "The joyful chaos of Indian streets."),
    ("Healthy", "स्वस्थ", "healthy", "Salad", "Nourishing bowls and lighter indulgences."),
    ("Vegetarian", "शाकाहारी", "vegetarian", "Leaf", "Vegetable-forward cooking at its best."),
    ("Non-Vegetarian", "मांसाहारी", "non-vegetarian", "Drumstick", "Rich, robust meat and seafood dishes."),
]

HI_INGREDIENTS = {
    "water": "पानी", "milk": "दूध", "black tea leaves": "काली चाय पत्ती",
    "ginger": "अदरक", "green cardamom": "हरी इलायची", "sugar": "चीनी",
    "paneer": "पनीर", "tomatoes": "टमाटर", "butter": "मक्खन", "cream": "क्रीम",
    "onion": "प्याज", "garam masala": "गरम मसाला", "ginger garlic paste": "अदरक-लहसुन पेस्ट",
    "chicken": "चिकन", "basmati rice": "बासमती चावल", "yogurt": "दही",
    "fried onions": "तला हुआ प्याज", "biryani masala": "बिरयानी मसाला",
    "saffron": "केसर", "mint leaves": "पुदीने की पत्तियाँ", "ghee": "घी",
    "potatoes": "आलू", "cauliflower": "फूलगोभी", "green peas": "हरी मटर",
    "pav bhaji masala": "पाव भाजी मसाला", "pav buns": "पाव", "dosa batter": "डोसा बैटर",
    "mustard seeds": "राई", "curry leaves": "करी पत्ते", "turmeric": "हल्दी",
    "pasta": "पास्ता", "garlic": "लहसुन", "olive oil": "जैतून का तेल",
    "basil": "तुलसी", "parmesan": "परमेज़ान", "noodles": "नूडल्स",
    "green chilli": "हरी मिर्च", "soy sauce": "सोया सॉस", "spring onion": "हरा प्याज",
    "sesame oil": "तिल का तेल", "capsicum": "शिमला मिर्च", "quinoa": "क्विनोआ",
    "sweet potato": "शकरकंद", "chickpeas": "छोले", "spinach": "पालक",
    "lemon": "नींबू", "feta": "फेटा", "milk powder": "दूध पाउडर",
    "all-purpose flour": "मैदा", "rose water": "गुलाब जल", "tandoori masala": "तंदूरी मसाला",
    "black lentils": "काली उड़द दाल", "kidney beans": "राजमा", "kashmiri chilli": "कश्मीरी मिर्च",
    "chicken legs": "चिकन टाँगें", "sourdough": "सोरडो ब्रेड", "avocado": "एवोकाडो",
    "red chilli flakes": "लाल मिर्च फ्लेक्स", "cherry tomatoes": "चेरी टमाटर",
    "pizza dough": "पिज़्ज़ा डो", "tomato puree": "टमाटर प्यूरी", "mozzarella": "मोज़ेरेला",
    "cumin": "जीरा", "coriander powder": "धनिया पाउडर", "mango": "आम",
    "ice cubes": "बर्फ के टुकड़े", "cabbage": "पत्तागोभी", "carrot": "गाजर",
    "kasuri methi": "कसूरी मेथी", "dark chocolate": "डार्क चॉकलेट", "eggs": "अंडे",
    "cocoa": "कोको", "cucumber": "खीरा", "olives": "ऑलिव", "red onion": "लाल प्याज",
    "oregano": "अजवाइन", "condensed milk": "कंडेंस्ड मिल्क", "pistachios": "पिस्ता",
    "almonds": "बादाम", "eggplant": "बैंगन", "sesame seeds": "तिल",
    "green chillies": "हरी मिर्च", "coriander": "धनिया", "salt": "नमक",
    "oil": "तेल", "flour": "आटा", "baking powder": "बेकिंग पाउडर",
    "vanilla essence": "वनीला एसेंस", "honey": "शहद",
}

PUBLISHED_RECIPES = [
    {
        "slug": "masala-chai", "title": "Masala Chai", "title_hi": "मसाला चाय",
        "short": "A warming cup of spiced tea simmered with ginger and cardamom.",
        "short_hi": "अदरक और इलायची के साथ उबली हुई सुगंधित मसाला चाय।",
        "desc": "The heartbeat of an Indian home: strong tea leaves, whole spices and just enough milk. Let it simmer slowly so the spices open up.",
        "desc_hi": "भारतीय घर की धड़कन — कड़क चाय पत्ती, साबुत मसाले और उतना ही दूध। धीमी आँच पर उबालें ताकि मसालों की खुशबू खुल जाए।",
        "category": "drinks", "cuisine": "Indian", "cuisine_hi": "भारतीय", "food_type": "veg",
        "prep": 5, "cook": 10, "difficulty": "Easy", "servings": 2, "calories": 90,
        "featured": True, "author": "demo@foodiebook.com",
        "nutrition": {"protein": "3 g", "carbs": "12 g", "fat": "3 g", "fiber": "0 g", "sugar": "10 g", "sodium": "45 mg"},
        "tips": "Crush the cardamom pods lightly before adding them — the oils release faster.",
        "tips_hi": "इलायची को हल्का कुचलकर डालें, इससे उसकी खुशबू जल्दी निकलती है।",
        "ingredients": [("water", "2", "cups"), ("milk", "1", "cup"), ("black tea leaves", "2", "tsp"), ("ginger", "1", "inch"), ("green cardamom", "3", "pods"), ("sugar", "2", "tsp")],
        "steps": [
            ("Bring water, grated ginger and crushed cardamom to a boil in a saucepan.", "एक पैन में पानी, कद्दूकस किया अदरक और कुचली इलायची उबालें।"),
            ("Add tea leaves and simmer for 2 minutes until the water turns deep amber.", "चाय पत्ती डालें और 2 मिनट धीमी आँच पर उबालें, जब तक पानी गहरा हो जाए।"),
            ("Pour in milk and sugar, then simmer gently for 4–5 minutes.", "दूध और चीनी डालें, फिर 4–5 मिनट धीमी आँच पर उबालें।"),
            ("Strain into warm cups and serve immediately with your favourite biscuits.", "छानकर गरम कप में डालें और बिस्कुट के साथ तुरंत परोसें।"),
        ],
    },
    {
        "slug": "paneer-butter-masala", "title": "Paneer Butter Masala", "title_hi": "पनीर बटर मसाला",
        "short": "Silky tomato-butter gravy folding in soft cubes of paneer.",
        "short_hi": "मक्खन और टमाटर की मखमली ग्रेवी में नरम पनीर के टुकड़े।",
        "desc": "A restaurant-style classic made simply at home. Roasted tomatoes, a touch of cream and plenty of butter create a gravy that tastes luxurious but comes together in half an hour.",
        "desc_hi": "घर पर आसानी से बनने वाला रेस्टोरेंट-स्टाइल क्लासिक। भुने टमाटर, थोड़ी क्रीम और भरपूर मक्खन से ऐसी ग्रेवी बनती है जो बेहद स्वादिष्ट लगती है।",
        "category": "dinner", "cuisine": "Indian", "cuisine_hi": "भारतीय", "food_type": "veg",
        "prep": 15, "cook": 25, "difficulty": "Medium", "servings": 4, "calories": 420,
        "featured": True, "author": "chef.kunal@foodiebook.com",
        "nutrition": {"protein": "18 g", "carbs": "16 g", "fat": "31 g", "fiber": "3 g", "sugar": "8 g", "sodium": "520 mg"},
        "tips": "Soak paneer in warm salted water for 10 minutes before adding to the gravy to keep it soft.",
        "tips_hi": "ग्रेवी में डालने से पहले पनीर को 10 मिनट गरम नमकीन पानी में रखें, वह नरम रहेगा।",
        "ingredients": [("paneer", "400", "g"), ("tomatoes", "4", "large"), ("butter", "3", "tbsp"), ("cream", "1/2", "cup"), ("onion", "1", "large"), ("garam masala", "1", "tsp"), ("ginger garlic paste", "1", "tbsp")],
        "steps": [
            ("Blanch and puree the tomatoes. Finely chop the onion.", "टमाटर उबालकर छीलें और प्यूरी बनाएँ। प्याज बारीक काटें।"),
            ("Melt butter, saute onion until golden, then add ginger garlic paste and cook for a minute.", "मक्खन पिघलाएँ, प्याज सुनहरा होने तक भूनें, फिर अदरक-लहसुन पेस्ट डालकर एक मिनट पकाएँ।"),
            ("Add tomato puree, garam masala and salt. Simmer for 10 minutes until glossy.", "टमाटर प्यूरी, गरम मसाला और नमक डालें। 10 मिनट चमकदार होने तक पकाएँ।"),
            ("Stir in cream and paneer cubes, simmer for 5 minutes and finish with a knob of butter.", "क्रीम और पनीर के टुकड़े डालें, 5 मिनट पकाएँ और ऊपर से मक्खन डालें।"),
        ],
    },
    {
        "slug": "hyderabadi-chicken-biryani", "title": "Hyderabadi Chicken Biryani", "title_hi": "हैदराबादी चिकन बिरयानी",
        "short": "Fragrant layered rice with saffron, mint and tender chicken.",
        "short_hi": "केसर, पुदीना और नरम चिकन के साथ सुगंधित परतदार चावल।",
        "desc": "A celebratory dum biryani built in layers: marinated chicken at the bottom, par-boiled basmati above, then saffron milk, fried onions and mint. Patience is the secret ingredient.",
        "desc_hi": "जश्न वाली दम बिरयानी परतों में — नीचे मैरिनेट किया चिकन, ऊपर आधा उबला बासमती, फिर केसर वाला दूध, तला प्याज और पुदीना। सबसे ज़रूरी सामग्री है धैर्य।",
        "category": "indian", "cuisine": "Hyderabadi", "cuisine_hi": "हैदराबादी", "food_type": "non-veg",
        "prep": 30, "cook": 45, "difficulty": "Hard", "servings": 4, "calories": 610,
        "featured": True, "author": "chef.kunal@foodiebook.com",
        "nutrition": {"protein": "34 g", "carbs": "68 g", "fat": "22 g", "fiber": "4 g", "sugar": "6 g", "sodium": "720 mg"},
        "tips": "Do not stir the biryani after layering. Steam it sealed on low heat so every grain stays separate.",
        "tips_hi": "परत लगाने के बाद बिरयानी न हिलाएँ। धीमी आँच पर ढककर पकाएँ ताकि हर दाना अलग रहे।",
        "ingredients": [("chicken", "700", "g"), ("basmati rice", "2", "cups"), ("yogurt", "1", "cup"), ("fried onions", "1", "cup"), ("biryani masala", "2", "tbsp"), ("saffron", "1", "pinch"), ("mint leaves", "1/2", "cup"), ("ghee", "3", "tbsp")],
        "steps": [
            ("Marinate chicken with yogurt, biryani masala, half the fried onions and salt for 30 minutes.", "चिकन को दही, बिरयानी मसाला, आधा तला प्याज और नमक के साथ 30 मिनट मैरिनेट करें।"),
            ("Soak rice for 20 minutes, then boil with whole spices until 70% cooked. Drain.", "चावल 20 मिनट भिगोएँ, फिर साबुत मसालों के साथ 70% पकने तक उबालें और छान लें।"),
            ("Spread the marinated chicken in a heavy pot. Layer rice, mint, fried onions, saffron milk and ghee.", "भारी तले वाले बर्तन में मैरिनेट चिकन फैलाएँ। ऊपर चावल, पुदीना, तला प्याज, केसर वाला दूध और घी की परत लगाएँ।"),
            ("Seal with foil and a lid. Cook on low heat for 25 minutes, then rest for 10 minutes before opening.", "फॉयल और ढक्कन से सील करें। धीमी आँच पर 25 मिनट पकाएँ, फिर 10 मिनट रखकर खोलें।"),
        ],
    },
    {
        "slug": "mumbai-pav-bhaji", "title": "Mumbai Pav Bhaji", "title_hi": "मुंबई पाव भाजी",
        "short": "Buttery mashed vegetables served with toasted pav and raw onions.",
        "short_hi": "मक्खन में मैश की सब्जियाँ, सिके पाव और कच्चे प्याज के साथ।",
        "desc": "The sound of pav bhaji being made on a Mumbai street is unmistakable: the rhythmic mash of vegetables on a hot tawa, butter sizzling, and a squeeze of lemon at the end.",
        "desc_hi": "मुंबई की गली में पाव भाजी बनने की आवाज़ अलग ही होती है — गरम तवे पर सब्जियाँ मैश होने की लय, मक्खन की चटक, और अंत में नींबू का रस।",
        "category": "street-food", "cuisine": "Maharashtrian", "cuisine_hi": "महाराष्ट्रीयन", "food_type": "veg",
        "prep": 15, "cook": 25, "difficulty": "Easy", "servings": 4, "calories": 380,
        "featured": False, "author": "chef.ananya@foodiebook.com",
        "nutrition": {"protein": "9 g", "carbs": "48 g", "fat": "17 g", "fiber": "7 g", "sugar": "8 g", "sodium": "640 mg"},
        "tips": "Mash the vegetables while they are still hot; the bhaji becomes silkier.",
        "tips_hi": "सब्जियों को गरम रहते ही मैश करें, भाजी ज़्यादा मखमली बनेगी।",
        "ingredients": [("potatoes", "4", "boiled"), ("cauliflower", "1", "cup"), ("green peas", "1/2", "cup"), ("butter", "4", "tbsp"), ("pav bhaji masala", "2", "tbsp"), ("tomatoes", "3", "large"), ("onion", "1", "large"), ("pav buns", "8", "pieces")],
        "steps": [
            ("Boil potatoes, cauliflower and peas until soft. Mash coarsely.", "आलू, फूलगोभी और मटर को नरम होने तक उबालें और मोटा मैश करें।"),
            ("Saute onion in butter, add tomatoes and cook until they collapse.", "मक्खन में प्याज भूनें, टमाटर डालें और गलने तक पकाएँ।"),
            ("Add pav bhaji masala, mashed vegetables and 1 cup water. Simmer and mash until thick.", "पाव भाजी मसाला, मैश की सब्जियाँ और 1 कप पानी डालें। गाढ़ा होने तक पकाते हुए मैश करें।"),
            ("Toast pav in butter. Serve bhaji with onions, lemon and extra butter.", "पाव को मक्खन में सेंकें। भाजी को प्याज, नींबू और अतिरिक्त मक्खन के साथ परोसें।"),
        ],
    },
    {
        "slug": "crispy-masala-dosa", "title": "Crispy Masala Dosa", "title_hi": "कुरकुरा मसाला डोसा",
        "short": "Golden dosa wrapped around spiced potato filling.",
        "short_hi": "मसालेदार आलू भरावन से लिपटा सुनहरा डोसा।",
        "desc": "A proper masala dosa needs a well-fermented batter and a hot, seasoned tawa. The reward is a paper-thin, crackling shell around soft, turmeric-yellow potatoes.",
        "desc_hi": "अच्छे मसाला डोसे के लिए अच्छी तरह फर्मेंट हुआ बैटर और गरम तवा चाहिए। इनाम है — कागज़ जैसा कुरकुरा डोसा और अंदर नरम, हल्दी वाले आलू।",
        "category": "breakfast", "cuisine": "South Indian", "cuisine_hi": "दक्षिण भारतीय", "food_type": "veg",
        "prep": 20, "cook": 20, "difficulty": "Medium", "servings": 3, "calories": 310,
        "featured": False, "author": "chef.ananya@foodiebook.com",
        "nutrition": {"protein": "7 g", "carbs": "52 g", "fat": "8 g", "fiber": "5 g", "sugar": "4 g", "sodium": "480 mg"},
        "tips": "Spread the batter quickly in a spiral once it hits the tawa; a thin dosa is a crisp dosa.",
        "tips_hi": "बैटर तवे पर डालते ही तेज़ी से गोल फैलाएँ; पतला डोसा ही कुरकुरा बनता है।",
        "ingredients": [("dosa batter", "3", "cups"), ("potatoes", "4", "boiled"), ("mustard seeds", "1", "tsp"), ("curry leaves", "10", "leaves"), ("onion", "1", "sliced"), ("turmeric", "1/2", "tsp"), ("ghee", "2", "tbsp")],
        "steps": [
            ("Heat oil, pop mustard seeds, add curry leaves and sliced onion. Cook until soft.", "तेल गरम करें, राई चटकाएँ, करी पत्ते और प्याज डालें। नरम होने तक पकाएँ।"),
            ("Add turmeric, salt and crumbled boiled potatoes. Mix well and keep warm.", "हल्दी, नमक और टूटे उबले आलू डालें। अच्छी तरह मिलाएँ और गरम रखें।"),
            ("Spread a ladle of batter on a hot tawa, drizzle ghee and cook until the edges lift.", "गरम तवे पर एक करछी बैटर फैलाएँ, घी डालें और किनारे उठने तक पकाएँ।"),
            ("Place potato filling in the centre, fold and serve with coconut chutney and sambar.", "आलू का भरावन बीच में रखें, मोड़ें और नारियल चटनी व सांभर के साथ परोसें।"),
        ],
    },
    {
        "slug": "creamy-tomato-pasta", "title": "Creamy Tomato Pasta", "title_hi": "क्रीमी टमाटर पास्ता",
        "short": "A glossy tomato-cream sauce clinging to al dente pasta.",
        "short_hi": "टमाटर-क्रीम की चमकदार सॉस में लिपटा अल डेंटे पास्ता।",
        "desc": "Minimal ingredients, maximum comfort. Sweet tomatoes, garlic, a splash of cream and fresh basil turn a weeknight pasta into something you would happily serve to guests.",
        "desc_hi": "कम सामग्री, भरपूर आराम। मीठे टमाटर, लहसुन, थोड़ी क्रीम और ताज़ा तुलसी से आम दिन का पास्ता भी खास बन जाता है।",
        "category": "italian", "cuisine": "Italian", "cuisine_hi": "इतालवी", "food_type": "veg",
        "prep": 10, "cook": 25, "difficulty": "Easy", "servings": 3, "calories": 460,
        "featured": False, "author": "chef.rohan@foodiebook.com",
        "nutrition": {"protein": "14 g", "carbs": "58 g", "fat": "18 g", "fiber": "5 g", "sugar": "9 g", "sodium": "560 mg"},
        "tips": "Reserve a cup of pasta water. A splash of it makes the sauce cling beautifully.",
        "tips_hi": "पास्ता का एक कप पानी बचा लें। थोड़ा सा पानी सॉस को पास्ते से चिपकने में मदद करता है।",
        "ingredients": [("pasta", "250", "g"), ("tomatoes", "5", "ripe"), ("garlic", "4", "cloves"), ("cream", "1/2", "cup"), ("olive oil", "2", "tbsp"), ("basil", "10", "leaves"), ("parmesan", "1/4", "cup")],
        "steps": [
            ("Cook pasta in salted water until al dente. Reserve 1 cup pasta water.", "नमकीन पानी में पास्ता अल डेंटे तक पकाएँ। 1 कप पानी बचा लें।"),
            ("Gently fry sliced garlic in olive oil, then add chopped tomatoes and salt.", "जैतून के तेल में लहसुन भूनें, फिर कटे टमाटर और नमक डालें।"),
            ("Simmer tomatoes for 12 minutes, then stir in cream and torn basil.", "टमाटर 12 मिनट पकाएँ, फिर क्रीम और तुलसी डालें।"),
            ("Toss pasta with the sauce, loosening with pasta water. Finish with parmesan.", "पास्ता को सॉस में मिलाएँ, ज़रूरत हो तो पास्ता का पानी डालें। परमेज़ान छिड़कें।"),
        ],
    },
    {
        "slug": "chilli-garlic-noodles", "title": "Chilli Garlic Noodles", "title_hi": "चिल्ली गार्लिक नूडल्स",
        "short": "Wok-tossed noodles with a fiery garlic-chilli kick.",
        "short_hi": "तेज़ लहसुन-मिर्च के स्वाद वाले वोक में भुने नूडल्स।",
        "desc": "A five-ingredient wonder for late nights and lazy lunches. High heat, plenty of garlic and a final drizzle of sesame oil are what make these noodles sing.",
        "desc_hi": "देर रात या आलसी दोपहर के लिए पाँच सामग्री वाला कमाल। तेज़ आँच, भरपूर लहसुन और अंत में तिल का तेल इन नूडल्स को खास बनाते हैं।",
        "category": "chinese", "cuisine": "Indo-Chinese", "cuisine_hi": "इंडो-चीनी", "food_type": "veg",
        "prep": 10, "cook": 15, "difficulty": "Easy", "servings": 2, "calories": 390,
        "featured": False, "author": "chef.sana@foodiebook.com",
        "nutrition": {"protein": "9 g", "carbs": "62 g", "fat": "12 g", "fiber": "4 g", "sugar": "5 g", "sodium": "820 mg"},
        "tips": "Don't overcrowd the wok. Cook in batches if needed so the noodles stay springy.",
        "tips_hi": "वोक में ज़्यादा सामग्री न डालें। ज़रूरत हो तो दो बार में पकाएँ ताकि नूडल्स चिपके नहीं।",
        "ingredients": [("noodles", "200", "g"), ("garlic", "6", "cloves"), ("green chilli", "2", "pieces"), ("soy sauce", "2", "tbsp"), ("spring onion", "3", "stalks"), ("sesame oil", "1", "tbsp"), ("capsicum", "1", "sliced")],
        "steps": [
            ("Boil noodles according to the packet, drain and toss with a little oil.", "पैकेट के अनुसार नूडल्स उबालें, छानें और थोड़े तेल में मिलाएँ।"),
            ("Heat sesame oil and fry chopped garlic and green chilli until fragrant.", "तिल का तेल गरम करें और कटा लहसुन व हरी मिर्च सुगंधित होने तक भूनें।"),
            ("Add capsicum and spring onion whites, then noodles and soy sauce. Toss on high heat.", "शिमला मिर्च और हरे प्याज के सफेद हिस्से डालें, फिर नूडल्स और सोया सॉस। तेज़ आँच पर चलाएँ।"),
            ("Finish with spring onion greens and serve hot.", "हरे प्याज की पत्तियाँ डालकर गरम परोसें।"),
        ],
    },
    {
        "slug": "roasted-vegetable-quinoa-bowl", "title": "Roasted Vegetable Quinoa Bowl", "title_hi": "भुनी सब्ज़ियों का क्विनोआ बाउल",
        "short": "A nourishing bowl of quinoa, roast vegetables and lemony dressing.",
        "short_hi": "क्विनोआ, भुनी सब्ज़ियों और नींबू ड्रेसिंग वाला पौष्टिक बाउल।",
        "desc": "Colourful, filling and endlessly adaptable. Roast whatever vegetables are in season, add chickpeas for protein, and finish with a sharp lemon-olive oil dressing.",
        "desc_hi": "रंगीन, भरपेट और हर बार बदलने वाला। मौसमी सब्ज़ियाँ भूनें, प्रोटीन के लिए छोले डालें और नींबू-तेल की ड्रेसिंग से पूरा करें।",
        "category": "lunch", "cuisine": "Mediterranean", "cuisine_hi": "भूमध्यसागरीय", "food_type": "veg",
        "prep": 15, "cook": 20, "difficulty": "Easy", "servings": 2, "calories": 340,
        "featured": False, "author": "demo@foodiebook.com",
        "nutrition": {"protein": "13 g", "carbs": "46 g", "fat": "12 g", "fiber": "9 g", "sugar": "8 g", "sodium": "390 mg"},
        "tips": "Rinse quinoa well before cooking to remove its natural bitterness.",
        "tips_hi": "क्विनोआ पकाने से पहले अच्छी तरह धोएँ ताकि उसकी कड़वाहट निकल जाए।",
        "ingredients": [("quinoa", "1", "cup"), ("sweet potato", "1", "medium"), ("chickpeas", "1", "cup"), ("spinach", "2", "cups"), ("olive oil", "2", "tbsp"), ("lemon", "1", "whole"), ("feta", "50", "g")],
        "steps": [
            ("Rinse quinoa and cook in 2 cups water for 15 minutes. Fluff with a fork.", "क्विनोआ धोकर 2 कप पानी में 15 मिनट पकाएँ। काँटे से फुलाएँ।"),
            ("Cube sweet potato, toss with olive oil and salt. Roast at 200°C for 20 minutes.", "शकरकंद के टुकड़े करें, जैतून के तेल और नमक में मिलाएँ। 200°C पर 20 मिनट भूनें।"),
            ("Wilt spinach and warm the chickpeas. Whisk lemon juice with olive oil.", "पालक मुरझाएँ और छोले गरम करें। नींबू के रस में जैतून का तेल फेंटें।"),
            ("Assemble quinoa, vegetables and chickpeas. Drizzle dressing and crumble feta.", "क्विनोआ, सब्ज़ियाँ और छोले सजाएँ। ड्रेसिंग डालें और फेटा क्रम्बल करें।"),
        ],
    },
    {
        "slug": "gulab-jamun", "title": "Gulab Jamun", "title_hi": "गुलाब जामुन",
        "short": "Soft golden dumplings soaking in rose-cardamom syrup.",
        "short_hi": "गुलाब-इलायची की चाशनी में भीगे नरम सुनहरे गुलाब जामुन।",
        "desc": "Festive desserts don't get more loved than this. The dough comes together in minutes; the magic happens when warm jamuns drink up cool cardamom syrup.",
        "desc_hi": "त्योहारों की मिठाइयों में सबसे प्यारी — गुलाब जामुन। आटा मिनटों में तैयार होता है; जादू तब होता है जब गरम जामुन ठंडी इलायची की चाशनी सोख लेते हैं।",
        "category": "desserts", "cuisine": "Indian", "cuisine_hi": "भारतीय", "food_type": "veg",
        "prep": 20, "cook": 25, "difficulty": "Medium", "servings": 6, "calories": 280,
        "featured": True, "author": "chef.ananya@foodiebook.com",
        "nutrition": {"protein": "4 g", "carbs": "44 g", "fat": "10 g", "fiber": "0 g", "sugar": "34 g", "sodium": "70 mg"},
        "tips": "Keep the oil on medium-low. High heat browns the outside before the centre cooks.",
        "tips_hi": "तेल मध्यम-धीमी आँच पर रखें। तेज़ आँच से बाहर जल्दी भूरा हो जाता है और अंदर कच्चा रह जाता है।",
        "ingredients": [("milk powder", "1", "cup"), ("all-purpose flour", "1/4", "cup"), ("ghee", "2", "tbsp"), ("sugar", "1.5", "cups"), ("water", "1.5", "cups"), ("green cardamom", "4", "pods"), ("rose water", "1", "tsp")],
        "steps": [
            ("Make syrup by boiling sugar, water and cardamom for 8 minutes. Add rose water.", "चीनी, पानी और इलायची को 8 मिनट उबालकर चाशनी बनाएँ। गुलाब जल मिलाएँ।"),
            ("Mix milk powder, flour and ghee into a soft dough with 2–3 tbsp milk.", "दूध पाउडर, मैदा और घी को 2–3 चम्मच दूध से मिलाकर नरम आटा बनाएँ।"),
            ("Roll small smooth balls and fry on low heat until deep golden.", "छोटी चिकनी गोलियाँ बनाएँ और धीमी आँच पर गहरा सुनहरा होने तक तलें।"),
            ("Drop hot jamuns into warm syrup and rest for at least 30 minutes.", "गरम जामुन गुनगुनी चाशनी में डालें और कम से कम 30 मिनट रखें।"),
        ],
    },
    {
        "slug": "paneer-tikka", "title": "Paneer Tikka", "title_hi": "पनीर टिक्का",
        "short": "Charred, smoky paneer skewers with peppers and onions.",
        "short_hi": "शिमला मिर्च और प्याज के साथ भुने धुएँदार पनीर टिक्का।",
        "desc": "Yogurt and tandoori spices do the heavy lifting here. Thread paneer and vegetables onto skewers, then char them on a grill, in the oven, or on a cast-iron pan.",
        "desc_hi": "दही और तंदूरी मसाले यहाँ असली जादू करते हैं। पनीर और सब्ज़ियाँ सीखों में पिरोएँ और ग्रिल, ओवन या लोहे के पैन पर भूनें।",
        "category": "snacks", "cuisine": "Indian", "cuisine_hi": "भारतीय", "food_type": "veg",
        "prep": 20, "cook": 15, "difficulty": "Easy", "servings": 4, "calories": 290,
        "featured": False, "author": "chef.kunal@foodiebook.com",
        "nutrition": {"protein": "17 g", "carbs": "11 g", "fat": "20 g", "fiber": "2 g", "sugar": "4 g", "sodium": "600 mg"},
        "tips": "A final brush of butter and a squeeze of lemon just before serving adds restaurant-style shine.",
        "tips_hi": "परोसने से ठीक पहले मक्खन लगाएँ और नींबू निचोड़ें, रेस्टोरेंट जैसी चमक आएगी।",
        "ingredients": [("paneer", "400", "g"), ("yogurt", "1/2", "cup"), ("tandoori masala", "2", "tbsp"), ("capsicum", "1", "cubed"), ("onion", "1", "cubed"), ("lemon", "1", "whole"), ("oil", "1", "tbsp")],
        "steps": [
            ("Whisk yogurt with tandoori masala, salt, oil and lemon juice.", "दही को तंदूरी मसाला, नमक, तेल और नींबू के रस के साथ फेंटें।"),
            ("Coat paneer and vegetables in the marinade. Rest for 20 minutes.", "पनीर और सब्ज़ियों को मैरिनेड में लपेटें। 20 मिनट रखें।"),
            ("Thread onto skewers and grill or pan-sear until charred at the edges.", "सीखों में पिरोएँ और किनारों पर चार होने तक ग्रिल या पैन में भूनें।"),
            ("Serve with mint chutney, onion rings and lemon wedges.", "पुदीना चटनी, प्याज के छल्ले और नींबू के साथ परोसें।"),
        ],
    },
    {
        "slug": "dal-makhani", "title": "Dal Makhani", "title_hi": "दाल मखनी",
        "short": "Slow-simmered black lentils enriched with butter and cream.",
        "short_hi": "मक्खन और क्रीम से समृद्ध, धीमी आँच पर पकी काली दाल।",
        "desc": "This is a dish that rewards time. Black lentils and rajma simmer for nearly an hour, then finish with butter, cream and a smoky tempering. Make it a day ahead if you can.",
        "desc_hi": "यह व्यंजन समय देने पर ही खिलता है। काली उड़द और राजमा लगभग एक घंटा पकते हैं, फिर मक्खन, क्रीम और धुएँदार तड़का। एक दिन पहले बनाएँ तो और भी स्वादिष्ट।",
        "category": "vegetarian", "cuisine": "Punjabi", "cuisine_hi": "पंजाबी", "food_type": "veg",
        "prep": 10, "cook": 50, "difficulty": "Medium", "servings": 4, "calories": 350,
        "featured": False, "author": "admin@foodiebook.com",
        "nutrition": {"protein": "16 g", "carbs": "38 g", "fat": "16 g", "fiber": "11 g", "sugar": "5 g", "sodium": "540 mg"},
        "tips": "Mash a few lentils against the side of the pot for a naturally creamy texture without extra cream.",
        "tips_hi": "बर्तन के किनारे कुछ दालें मैश करें, बिना अतिरिक्त क्रीम के भी मलाईदार बनावट आएगी।",
        "ingredients": [("black lentils", "1", "cup"), ("kidney beans", "1/2", "cup"), ("butter", "3", "tbsp"), ("cream", "1/2", "cup"), ("tomatoes", "3", "large"), ("ginger garlic paste", "1", "tbsp"), ("garam masala", "1", "tsp")],
        "steps": [
            ("Soak lentils and rajma overnight. Pressure cook until very soft.", "दाल और राजमा रातभर भिगोएँ। प्रेशर कुकर में बहुत नरम होने तक पकाएँ।"),
            ("Cook tomato puree with ginger garlic paste, butter and spices until thick.", "टमाटर प्यूरी को अदरक-लहसुन पेस्ट, मक्खन और मसालों के साथ गाढ़ा होने तक पकाएँ।"),
            ("Add cooked lentils with water and simmer on low for 30 minutes, stirring often.", "पकी दाल पानी के साथ डालें और 30 मिनट धीमी आँच पर चलाते हुए पकाएँ।"),
            ("Stir in cream and butter. Finish with garam masala and serve with naan.", "क्रीम और मक्खन मिलाएँ। गरम मसाला डालकर नान के साथ परोसें।"),
        ],
    },
    {
        "slug": "tandoori-chicken", "title": "Tandoori Chicken", "title_hi": "तंदूरी चिकन",
        "short": "Yogurt-marinated chicken with a smoky, spiced crust.",
        "short_hi": "दही में मैरिनेट किया चिकन, धुएँदार मसालेदार ऊपरी परत के साथ।",
        "desc": "The marinade is everything: thick yogurt, ginger, garlic, lemon and Kashmiri chilli for colour. A hot oven gives you the closest thing to a tandoor at home.",
        "desc_hi": "सब कुछ मैरिनेड में है — गाढ़ा दही, अदरक, लहसुन, नींबू और रंग के लिए कश्मीरी मिर्च। तेज़ ओवन आपको घर पर तंदूर का एहसास देता है।",
        "category": "non-vegetarian", "cuisine": "Indian", "cuisine_hi": "भारतीय", "food_type": "non-veg",
        "prep": 25, "cook": 30, "difficulty": "Medium", "servings": 4, "calories": 480,
        "featured": False, "author": "chef.kunal@foodiebook.com",
        "nutrition": {"protein": "42 g", "carbs": "8 g", "fat": "30 g", "fiber": "1 g", "sugar": "4 g", "sodium": "760 mg"},
        "tips": "Score the chicken with shallow cuts before marinating so the spices reach the centre.",
        "tips_hi": "मैरिनेट करने से पहले चिकन पर हल्के कट लगाएँ ताकि मसाले अंदर तक पहुँचें।",
        "ingredients": [("chicken legs", "4", "pieces"), ("yogurt", "1", "cup"), ("tandoori masala", "2", "tbsp"), ("lemon", "1", "whole"), ("ginger garlic paste", "1", "tbsp"), ("kashmiri chilli", "1", "tbsp"), ("oil", "2", "tbsp")],
        "steps": [
            ("Make deep slits in the chicken and rub with lemon, salt and chilli powder.", "चिकन पर गहरे कट लगाएँ और नींबू, नमक व मिर्च पाउडर लगाएँ।"),
            ("Mix yogurt, tandoori masala, ginger garlic paste and oil. Coat the chicken well.", "दही, तंदूरी मसाला, अदरक-लहसुन पेस्ट और तेल मिलाएँ। चिकन को अच्छी तरह लपेटें।"),
            ("Marinate for at least 4 hours or overnight in the refrigerator.", "कम से कम 4 घंटे या रातभर फ्रिज में मैरिनेट करें।"),
            ("Roast at 220°C for 25–30 minutes, turning once, until charred and cooked through.", "220°C पर 25–30 मिनट भूनें, एक बार पलटें, जब तक चार होकर पूरा पक जाए।"),
        ],
    },
    {
        "slug": "avocado-toast", "title": "Avocado Toast", "title_hi": "एवोकाडो टोस्ट",
        "short": "Crushed avocado on toasted sourdough with chilli and lemon.",
        "short_hi": "सिंकी सोरडो पर नींबू और मिर्च के साथ मैश किया एवोकाडो।",
        "desc": "Breakfast in five minutes, no compromises. Good bread, ripe avocado, flaky salt and something acidic — that's all you need.",
        "desc_hi": "पाँच मिनट का नाश्ता, बिना समझौते के। अच्छी ब्रेड, पका एवोकाडो, नमक और थोड़ा खट्टा स्वाद — बस इतना ही चाहिए।",
        "category": "breakfast", "cuisine": "Modern", "cuisine_hi": "आधुनिक", "food_type": "veg",
        "prep": 5, "cook": 5, "difficulty": "Easy", "servings": 2, "calories": 240,
        "featured": False, "author": "chef.rohan@foodiebook.com",
        "nutrition": {"protein": "7 g", "carbs": "24 g", "fat": "14 g", "fiber": "7 g", "sugar": "3 g", "sodium": "320 mg"},
        "tips": "Ripe avocado should yield gently to a thumb, not feel mushy.",
        "tips_hi": "पका एवोकाडो अंगूठे से हल्का दबने चाहिए, बहुत ज़्यादा मुलायम नहीं।",
        "ingredients": [("sourdough", "4", "slices"), ("avocado", "2", "ripe"), ("lemon", "1", "whole"), ("red chilli flakes", "1", "tsp"), ("olive oil", "1", "tbsp"), ("cherry tomatoes", "6", "halved")],
        "steps": [
            ("Toast sourdough slices until crisp and golden.", "सोरडो के टुकड़ों को कुरकुरा और सुनहरा होने तक सेंकें।"),
            ("Mash avocado with lemon juice, salt and a little olive oil.", "एवोकाडो को नींबू के रस, नमक और थोड़े जैतून के तेल के साथ मैश करें।"),
            ("Spread generously on toast and top with cherry tomatoes.", "टोस्ट पर भरपूर फैलाएँ और चेरी टमाटर रखें।"),
            ("Finish with chilli flakes, flaky salt and a drizzle of olive oil.", "मिर्च फ्लेक्स, नमक और जैतून का तेल डालकर परोसें।"),
        ],
    },
    {
        "slug": "margherita-pizza", "title": "Margherita Pizza", "title_hi": "मार्गेरिटा पिज़्ज़ा",
        "short": "Blistered crust, sweet tomato sauce and melting mozzarella.",
        "short_hi": "कुरकुरा किनारा, मीठी टमाटर सॉस और पिघला मोज़ेरेला।",
        "desc": "The pizza that proves less is more. A very hot oven, a thin layer of sauce and good mozzarella are all it takes to make something memorable.",
        "desc_hi": "यह पिज़्ज़ा साबित करता है कि कम ही ज़्यादा है। बहुत गरम ओवन, पतली सॉस और अच्छा मोज़ेरेला — बस इतना ही काफी है।",
        "category": "italian", "cuisine": "Italian", "cuisine_hi": "इतालवी", "food_type": "veg",
        "prep": 20, "cook": 20, "difficulty": "Medium", "servings": 3, "calories": 520,
        "featured": False, "author": "chef.rohan@foodiebook.com",
        "nutrition": {"protein": "21 g", "carbs": "64 g", "fat": "20 g", "fiber": "4 g", "sugar": "8 g", "sodium": "880 mg"},
        "tips": "Preheat the tray or stone for at least 20 minutes. A screaming-hot surface gives a crisp base.",
        "tips_hi": "ट्रे या पिज़्ज़ा स्टोन को कम से कम 20 मिनट पहले गरम करें। तेज़ गरम सतह कुरकुरा आधार देती है।",
        "ingredients": [("pizza dough", "400", "g"), ("tomato puree", "1", "cup"), ("mozzarella", "200", "g"), ("basil", "12", "leaves"), ("olive oil", "2", "tbsp"), ("garlic", "2", "cloves")],
        "steps": [
            ("Mix tomato puree with grated garlic, salt and olive oil for the sauce.", "टमाटर प्यूरी में कद्दूकस लहसुन, नमक और जैतून का तेल मिलाकर सॉस बनाएँ।"),
            ("Stretch dough into a thin round on a floured surface.", "आटे वाली सतह पर डो को पतला गोल फैलाएँ।"),
            ("Spread sauce, scatter mozzarella and drizzle olive oil.", "सॉस फैलाएँ, मोज़ेरेला बिखेरें और जैतून का तेल डालें।"),
            ("Bake at 250°C for 10–12 minutes. Finish with fresh basil.", "250°C पर 10–12 मिनट बेक करें। ताज़ा तुलसी से सजाएँ।"),
        ],
    },
    {
        "slug": "punjabi-samosa", "title": "Punjabi Samosa", "title_hi": "पंजाबी समोसा",
        "short": "Flaky triangles filled with spiced potatoes and peas.",
        "short_hi": "मसालेदार आलू और मटर से भरे कुरकुरे समोसे।",
        "desc": "Crisp, flaky and generously spiced. The dough needs a rest, the filling needs a good mash, and the oil needs to be steady at medium heat for even cooking.",
        "desc_hi": "कुरकुरे, परतदार और भरपूर मसालेदार। आटे को आराम चाहिए, भरावन को अच्छा मैश और तेल को मध्यम आँच पर स्थिर रहना चाहिए।",
        "category": "street-food", "cuisine": "Punjabi", "cuisine_hi": "पंजाबी", "food_type": "veg",
        "prep": 30, "cook": 25, "difficulty": "Medium", "servings": 6, "calories": 310,
        "featured": False, "author": "chef.ananya@foodiebook.com",
        "nutrition": {"protein": "6 g", "carbs": "38 g", "fat": "15 g", "fiber": "4 g", "sugar": "3 g", "sodium": "420 mg"},
        "tips": "Fry samosas on medium-low heat. Hot oil makes bubbles and leaves the filling undercooked.",
        "tips_hi": "समोसे मध्यम-धीमी आँच पर तलें। तेज़ तेल में बुलबुले बनते हैं और अंदर कच्चा रह जाता है।",
        "ingredients": [("all-purpose flour", "1.5", "cups"), ("potatoes", "4", "boiled"), ("green peas", "1/2", "cup"), ("cumin", "1", "tsp"), ("coriander powder", "1", "tbsp"), ("garam masala", "1", "tsp"), ("oil", "1", "cup")],
        "steps": [
            ("Mix flour, salt, 3 tbsp oil and water into a stiff dough. Rest for 20 minutes.", "मैदा, नमक, 3 चम्मच तेल और पानी से सख्त आटा गूँदें। 20 मिनट रखें।"),
            ("Saute cumin, then add mashed potatoes, peas and spices. Cool the filling.", "जीरा भूनें, फिर मैश आलू, मटर और मसाले डालें। भरावन ठंडा करें।"),
            ("Roll dough into ovals, cut in half, form cones and fill. Seal the edges.", "आटे को अंडाकार बेलें, आधा काटें, शंकु बनाएँ और भरें। किनारे सील करें।"),
            ("Fry on medium-low heat until golden and crisp. Serve with tamarind chutney.", "मध्यम-धीमी आँच पर सुनहरा और कुरकुरा होने तक तलें। इमली की चटनी के साथ परोसें।"),
        ],
    },
    {
        "slug": "mango-lassi", "title": "Mango Lassi", "title_hi": "आम की लस्सी",
        "short": "A cool, creamy mango-yogurt drink for hot afternoons.",
        "short_hi": "गरम दोपहरों के लिए ठंडी, मलाईदार आम-दही की लस्सी।",
        "desc": "Thick, sweet and refreshing. Use the ripest mangoes you can find and blend with chilled yogurt until velvety.",
        "desc_hi": "गाढ़ी, मीठी और ताज़गी भरी। जितने पके आम मिलें उन्हें ठंडे दही के साथ मिलाकर मखमली बनाएँ।",
        "category": "drinks", "cuisine": "Indian", "cuisine_hi": "भारतीय", "food_type": "veg",
        "prep": 5, "cook": 0, "difficulty": "Easy", "servings": 2, "calories": 220,
        "featured": False, "author": "chef.sana@foodiebook.com",
        "nutrition": {"protein": "8 g", "carbs": "34 g", "fat": "5 g", "fiber": "2 g", "sugar": "30 g", "sodium": "90 mg"},
        "tips": "For a restaurant-thick lassi, use Greek yogurt and skip the ice.",
        "tips_hi": "रेस्टोरेंट जैसी गाढ़ी लस्सी के लिए ग्रीक योगर्ट लें और बर्फ न डालें।",
        "ingredients": [("mango", "2", "ripe"), ("yogurt", "1", "cup"), ("milk", "1/2", "cup"), ("sugar", "2", "tbsp"), ("green cardamom", "2", "pods"), ("ice cubes", "6", "pieces")],
        "steps": [
            ("Peel and chop the mangoes, reserving a few cubes for garnish.", "आम छीलकर काटें, कुछ टुकड़े सजाने के लिए बचाएँ।"),
            ("Blend mango, yogurt, milk, sugar and cardamom until smooth.", "आम, दही, दूध, चीनी और इलायची को चिकना होने तक ब्लेंड करें।"),
            ("Add ice and pulse briefly until frothy.", "बर्फ डालें और झागदार होने तक थोड़ा ब्लेंड करें।"),
            ("Pour into chilled glasses and top with mango cubes.", "ठंडे गिलास में डालें और आम के टुकड़ों से सजाएँ।"),
        ],
    },
    {
        "slug": "veg-hakka-noodles", "title": "Veg Hakka Noodles", "title_hi": "वेज हक्का नूडल्स",
        "short": "Colorful stir-fried noodles with crunchy vegetables.",
        "short_hi": "कुरकुरी सब्ज़ियों के साथ रंगीन स्टिर-फ्राइड नूडल्स।",
        "desc": "A family-friendly Indo-Chinese staple. Cook the noodles just shy of done, then finish them in a hot wok with crisp vegetables and soy.",
        "desc_hi": "परिवार के लिए पसंदीदा इंडो-चीनी व्यंजन। नूडल्स को थोड़ा कम पकाएँ, फिर गरम वोक में कुरकुरी सब्ज़ियों और सोया सॉस के साथ भूनें।",
        "category": "chinese", "cuisine": "Indo-Chinese", "cuisine_hi": "इंडो-चीनी", "food_type": "veg",
        "prep": 10, "cook": 15, "difficulty": "Easy", "servings": 3, "calories": 360,
        "featured": False, "author": "chef.sana@foodiebook.com",
        "nutrition": {"protein": "10 g", "carbs": "58 g", "fat": "9 g", "fiber": "5 g", "sugar": "5 g", "sodium": "760 mg"},
        "tips": "Keep the vegetables crunchy — they should still have bite when the noodles are served.",
        "tips_hi": "सब्ज़ियों को कुरकुरा रखें — परोसते समय भी उनमें थोड़ा क्रंच रहना चाहिए।",
        "ingredients": [("noodles", "250", "g"), ("cabbage", "1", "cup"), ("carrot", "1", "julienned"), ("capsicum", "1", "sliced"), ("soy sauce", "2", "tbsp"), ("garlic", "4", "cloves"), ("spring onion", "3", "stalks")],
        "steps": [
            ("Boil noodles until just tender, drain and rinse with cold water.", "नूडल्स को थोड़ा नरम होने तक उबालें, छानें और ठंडे पानी से धोएँ।"),
            ("Stir-fry garlic in hot oil, then add carrot, cabbage and capsicum.", "गरम तेल में लहसुन भूनें, फिर गाजर, पत्तागोभी और शिमला मिर्च डालें।"),
            ("Add noodles, soy sauce and salt. Toss over high heat for 2 minutes.", "नूडल्स, सोया सॉस और नमक डालें। तेज़ आँच पर 2 मिनट चलाएँ।"),
            ("Finish with spring onion and serve immediately.", "हरे प्याज से सजाकर तुरंत परोसें।"),
        ],
    },
    {
        "slug": "butter-chicken", "title": "Butter Chicken", "title_hi": "बटर चिकन",
        "short": "Tender chicken in a velvety tomato-butter sauce.",
        "short_hi": "मखमली टमाटर-मक्खन सॉस में नरम चिकन।",
        "desc": "The beloved Delhi classic. Char the marinated chicken first, then let it finish cooking in a silky tomato gravy enriched with butter and cream.",
        "desc_hi": "दिल्ली का प्यारा क्लासिक। मैरिनेट चिकन को पहले भूनें, फिर मक्खन और क्रीम से समृद्ध मखमली टमाटर ग्रेवी में पकाएँ।",
        "category": "dinner", "cuisine": "North Indian", "cuisine_hi": "उत्तर भारतीय", "food_type": "non-veg",
        "prep": 20, "cook": 35, "difficulty": "Medium", "servings": 4, "calories": 580,
        "featured": False, "author": "chef.kunal@foodiebook.com",
        "nutrition": {"protein": "38 g", "carbs": "18 g", "fat": "39 g", "fiber": "3 g", "sugar": "9 g", "sodium": "820 mg"},
        "tips": "Add a pinch of sugar if the tomatoes are sharp — it balances the sauce beautifully.",
        "tips_hi": "अगर टमाटर खट्टे हों तो चुटकी भर चीनी डालें, सॉस का संतुलन बेहतर होगा।",
        "ingredients": [("chicken", "700", "g"), ("yogurt", "1/2", "cup"), ("butter", "4", "tbsp"), ("tomato puree", "2", "cups"), ("cream", "1/2", "cup"), ("garam masala", "1", "tsp"), ("kasuri methi", "1", "tbsp"), ("ginger garlic paste", "1", "tbsp")],
        "steps": [
            ("Marinate chicken in yogurt, ginger garlic paste, salt and chilli for 20 minutes.", "चिकन को दही, अदरक-लहसुन पेस्ट, नमक और मिर्च में 20 मिनट मैरिनेट करें।"),
            ("Sear chicken in butter until browned. Remove and set aside.", "मक्खन में चिकन को सुनहरा होने तक भूनें। निकालकर रखें।"),
            ("In the same pan, cook tomato puree with butter and spices for 15 minutes.", "उसी पैन में मक्खन और मसालों के साथ टमाटर प्यूरी 15 मिनट पकाएँ।"),
            ("Return chicken, add cream and crushed kasuri methi. Simmer for 10 minutes.", "चिकन वापस डालें, क्रीम और कसूरी मेथी मिलाएँ। 10 मिनट पकाएँ।"),
        ],
    },
    {
        "slug": "chocolate-lava-cake", "title": "Chocolate Lava Cake", "title_hi": "चॉकलेट लावा केक",
        "short": "A warm chocolate cake with a molten center.",
        "short_hi": "गरम चॉकलेट केक जिसके बीच में पिघला चॉकलेट।",
        "desc": "An elegant dessert that takes less than twenty minutes. The trick is timing: pull the cakes out when the edges are set but the center still wobbles.",
        "desc_hi": "बीस मिनट से कम में बनने वाली खूबसूरत मिठाई। राज़ है समय — किनारे जम जाएँ लेकिन बीच थोड़ा हिले, तभी निकालें।",
        "category": "desserts", "cuisine": "French", "cuisine_hi": "फ्रेंच", "food_type": "veg",
        "prep": 10, "cook": 12, "difficulty": "Easy", "servings": 2, "calories": 440,
        "featured": False, "author": "chef.rohan@foodiebook.com",
        "nutrition": {"protein": "8 g", "carbs": "42 g", "fat": "28 g", "fiber": "3 g", "sugar": "30 g", "sodium": "180 mg"},
        "tips": "Butter and cocoa the ramekins thoroughly so the cakes release cleanly.",
        "tips_hi": "रामेकिन में मक्खन और कोको अच्छी तरह लगाएँ ताकि केक आसानी से निकलें।",
        "ingredients": [("dark chocolate", "120", "g"), ("butter", "100", "g"), ("eggs", "2", "whole"), ("sugar", "1/2", "cup"), ("flour", "1/4", "cup"), ("cocoa", "1", "tbsp")],
        "steps": [
            ("Melt chocolate and butter together over a double boiler. Cool slightly.", "डबल बॉयलर पर चॉकलेट और मक्खन पिघलाएँ। थोड़ा ठंडा करें।"),
            ("Whisk eggs and sugar until pale, then fold in chocolate and flour.", "अंडे और चीनी को हल्का होने तक फेंटें, फिर चॉकलेट और मैदा मिलाएँ।"),
            ("Pour into buttered ramekins and bake at 200°C for 10–12 minutes.", "मक्खन लगे रामेकिन में डालें और 200°C पर 10–12 मिनट बेक करें।"),
            ("Rest for 1 minute, invert onto plates and serve warm with ice cream.", "1 मिनट रखें, प्लेट पर पलटें और आइसक्रीम के साथ गरम परोसें।"),
        ],
    },
    {
        "slug": "greek-salad", "title": "Greek Salad", "title_hi": "ग्रीक सलाद",
        "short": "Crisp cucumbers, tomatoes, olives and feta with oregano.",
        "short_hi": "कुरकुरे खीरे, टमाटर, ऑलिव और फेटा के साथ ओरेगानो।",
        "desc": "Summer on a plate. No lettuce needed — just ripe tomatoes, cucumber, red onion, olives and a generous slab of feta with good olive oil.",
        "desc_hi": "प्लेट में गर्मियाँ। सलाद पत्ता ज़रूरी नहीं — पके टमाटर, खीरा, लाल प्याज, ऑलिव और अच्छे जैतून के तेल के साथ फेटा।",
        "category": "healthy", "cuisine": "Greek", "cuisine_hi": "ग्रीक", "food_type": "veg",
        "prep": 10, "cook": 0, "difficulty": "Easy", "servings": 2, "calories": 260,
        "featured": False, "author": "demo@foodiebook.com",
        "nutrition": {"protein": "9 g", "carbs": "13 g", "fat": "20 g", "fiber": "4 g", "sugar": "8 g", "sodium": "610 mg"},
        "tips": "Salt the tomatoes 10 minutes before serving so they release their juices into the dressing.",
        "tips_hi": "परोसने से 10 मिनट पहले टमाटर पर नमक डालें, उनका रस ड्रेसिंग में मिल जाएगा।",
        "ingredients": [("cucumber", "1", "large"), ("cherry tomatoes", "2", "cups"), ("feta", "100", "g"), ("olives", "1/2", "cup"), ("red onion", "1", "small"), ("olive oil", "3", "tbsp"), ("oregano", "1", "tsp")],
        "steps": [
            ("Cut cucumber into chunks and halve the cherry tomatoes.", "खीरे के टुकड़े करें और चेरी टमाटर आधे काटें।"),
            ("Thinly slice the red onion and soak in cold water for 5 minutes.", "लाल प्याज पतला काटें और 5 मिनट ठंडे पानी में भिगोएँ।"),
            ("Toss vegetables with olives, olive oil, oregano and salt.", "सब्ज़ियों को ऑलिव, जैतून के तेल, ओरेगानो और नमक के साथ मिलाएँ।"),
            ("Top with feta and an extra drizzle of olive oil.", "ऊपर फेटा और थोड़ा जैतून का तेल डालें।"),
        ],
    },
]

DRAFT_RECIPES = [
    {
        "slug": "kesar-pista-kulfi", "title": "Kesar Pista Kulfi", "title_hi": "केसर पिस्ता कुल्फी",
        "short": "A slow-cooked saffron and pistachio frozen dessert.",
        "short_hi": "धीमी आँच पर पका केसर और पिस्ता वाला ठंडा डेज़र्ट।",
        "desc": "Draft recipe: creamy kulfi with saffron and pistachios, still being perfected.",
        "desc_hi": "ड्राफ्ट रेसिपी: केसर और पिस्ता वाली मलाईदार कुल्फी, अभी निखारी जा रही है।",
        "category": "desserts", "cuisine": "Indian", "cuisine_hi": "भारतीय", "food_type": "veg",
        "prep": 15, "cook": 30, "difficulty": "Medium", "servings": 4, "calories": 320,
        "featured": False, "author": "demo@foodiebook.com", "status": "draft",
        "nutrition": {"protein": "8 g", "carbs": "28 g", "fat": "19 g", "fiber": "1 g", "sugar": "24 g", "sodium": "110 mg"},
        "tips": "Stir continuously while reducing the milk to avoid scorching.",
        "tips_hi": "दूध को गाढ़ा करते समय लगातार चलाएँ ताकि जले नहीं।",
        "ingredients": [("milk", "1", "litre"), ("condensed milk", "1/2", "cup"), ("pistachios", "1/4", "cup"), ("saffron", "1", "pinch"), ("green cardamom", "3", "pods")],
        "steps": [
            ("Reduce milk on low heat for 25 minutes, stirring often.", "दूध को धीमी आँच पर 25 मिनट गाढ़ा करें, चलाते रहें।"),
            ("Add condensed milk, cardamom and saffron. Cook for 5 more minutes.", "कंडेंस्ड मिल्क, इलायची और केसर डालें। 5 मिनट और पकाएँ।"),
            ("Fold in chopped pistachios and pour into kulfi moulds.", "कटे पिस्ता मिलाएँ और कुल्फी मोल्ड में डालें।"),
            ("Freeze for at least 6 hours before serving.", "परोसने से पहले कम से कम 6 घंटे फ्रीज़ करें।"),
        ],
    },
    {
        "slug": "smoky-baingan-dip", "title": "Smoky Baingan Dip", "title_hi": "स्मोकी बैंगन डिप",
        "short": "Charred eggplant dip with garlic, lemon and olive oil.",
        "short_hi": "लहसुन, नींबू और जैतून के तेल के साथ भुना बैंगन डिप।",
        "desc": "Draft recipe: a smoky eggplant dip inspired by baingan bharta, served with crisp flatbread.",
        "desc_hi": "ड्राफ्ट रेसिपी: बैंगन भरता से प्रेरित धुएँदार डिप, कुरकुरी रोटी के साथ।",
        "category": "snacks", "cuisine": "Middle Eastern", "cuisine_hi": "मध्य-पूर्वी", "food_type": "veg",
        "prep": 10, "cook": 25, "difficulty": "Easy", "servings": 3, "calories": 180,
        "featured": False, "author": "chef.ananya@foodiebook.com", "status": "draft",
        "nutrition": {"protein": "4 g", "carbs": "14 g", "fat": "12 g", "fiber": "6 g", "sugar": "7 g", "sodium": "310 mg"},
        "tips": "Let the eggplant cool completely before mashing for the best texture.",
        "tips_hi": "मैश करने से पहले बैंगन पूरी तरह ठंडा होने दें, बनावट बेहतर होगी।",
        "ingredients": [("eggplant", "1", "large"), ("garlic", "2", "cloves"), ("lemon", "1", "whole"), ("olive oil", "2", "tbsp"), ("coriander", "1/4", "cup"), ("sesame seeds", "1", "tbsp")],
        "steps": [
            ("Roast eggplant directly over flame or under a grill until collapsed and charred.", "बैंगन को सीधे आँच पर या ग्रिल में पूरी तरह चार होने तक भूनें।"),
            ("Cool, peel and mash the flesh with roasted garlic.", "ठंडा करें, छीलें और भुने लहसुन के साथ मैश करें।"),
            ("Mix in lemon juice, olive oil, sesame and coriander.", "नींबू का रस, जैतून का तेल, तिल और धनिया मिलाएँ।"),
            ("Serve with warm flatbread or vegetable sticks.", "गरम रोटी या सब्ज़ियों की स्टिक्स के साथ परोसें।"),
        ],
    },
]

REVIEWS = [
    ("masala-chai", "chef.kunal@foodiebook.com", 5, "The cardamom and ginger balance is perfect. Made it twice already."),
    ("paneer-butter-masala", "demo@foodiebook.com", 5, "Restaurant quality at home. The paneer stayed so soft."),
    ("paneer-butter-masala", "chef.sana@foodiebook.com", 4, "Rich and lovely. I added a little extra cream."),
    ("hyderabadi-chicken-biryani", "chef.rohan@foodiebook.com", 5, "Layered perfectly and the saffron aroma was incredible."),
    ("mumbai-pav-bhaji", "demo@foodiebook.com", 4, "Tastes just like the street version. Extra butter is essential."),
    ("crispy-masala-dosa", "admin@foodiebook.com", 5, "Crisp edges, soft centre. The potato filling is spot on."),
    ("creamy-tomato-pasta", "chef.ananya@foodiebook.com", 4, "Simple and comforting. Used fresh basil from the balcony."),
    ("gulab-jamun", "demo@foodiebook.com", 5, "So soft they melted in my mouth. The rose water makes it."),
    ("dal-makhani", "chef.kunal@foodiebook.com", 5, "Slow cooking really pays off here. Deep, buttery flavour."),
    ("margherita-pizza", "chef.sana@foodiebook.com", 4, "Great crust tip. The hot tray made a big difference."),
    ("mango-lassi", "chef.rohan@foodiebook.com", 5, "Thick and refreshing. Perfect for summer."),
    ("butter-chicken", "demo@foodiebook.com", 5, "The gravy is silky and not too sweet. Family loved it."),
    ("greek-salad", "chef.ananya@foodiebook.com", 4, "Fresh and light. I added some cucumber ribbons."),
    ("punjabi-samosa", "chef.kunal@foodiebook.com", 4, "Great filling. Frying on low heat is the key."),
    ("paneer-tikka", "chef.rohan@foodiebook.com", 5, "Smoky and juicy. The lemon finish is lovely."),
]


def _font(size, bold=False, hindi=False):
    candidates = []
    if hindi:
        candidates += [r"C:\Windows\Fonts\Nirmala.ttf", r"C:\Windows\Fonts\mangal.ttf"]
    candidates += [
        r"C:\Windows\Fonts\georgiab.ttf" if bold else r"C:\Windows\Fonts\georgia.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


PALETTES = {
    "drinks": ((38, 24, 18), (128, 0, 32)),
    "dinner": ((34, 16, 18), (96, 20, 28)),
    "indian": ((52, 26, 12), (146, 68, 18)),
    "street-food": ((40, 22, 10), (150, 74, 20)),
    "breakfast": ((44, 32, 16), (164, 124, 48)),
    "italian": ((28, 34, 20), (102, 128, 58)),
    "chinese": ((22, 28, 30), (118, 34, 28)),
    "lunch": ((26, 30, 20), (84, 104, 52)),
    "desserts": ((40, 20, 32), (138, 52, 74)),
    "snacks": ((36, 24, 14), (132, 82, 30)),
    "vegetarian": ((22, 32, 20), (74, 108, 52)),
    "non-vegetarian": ((38, 16, 16), (110, 28, 28)),
    "healthy": ((20, 32, 26), (58, 112, 86)),
}


def _gradient(size, top, bottom):
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    width, height = size
    for y in range(height):
        ratio = y / max(1, height - 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    return image


def _decorate(image, slug, title, category, kind="recipe"):
    """Create elegant, text-free culinary artwork used behind UI content."""
    width, height = image.size
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    rng = random.Random(slug)

    # Soft atmospheric pools of gold and cream.
    for _ in range(6):
        radius = rng.randint(70, 300)
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        color = (212, 175, 55, rng.randint(14, 40)) if rng.random() > 0.45 else (245, 230, 179, rng.randint(8, 22))
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)
    overlay = overlay.filter(ImageFilter.GaussianBlur(70))
    image = Image.alpha_composite(image.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(image)

    # Fine gold geometry.
    line_color = (212, 175, 55, 90)
    for index, radius in enumerate((width * 0.42, width * 0.52, width * 0.64)):
        cx = width * 0.72
        cy = height * 0.46
        draw.ellipse(
            [cx - radius, cy - radius * 0.62, cx + radius, cy + radius * 0.62],
            outline=(212, 175, 55, 55 + index * 12),
            width=2,
        )

    if kind in ("recipe", "banner"):
        # Ceramic plate with abstract, ingredient-inspired food styling.
        plate_w = width * (0.34 if kind == "recipe" else 0.4)
        plate_x = width * (0.73 if kind == "recipe" else 0.7)
        plate_y = height * 0.47
        plate_box = [plate_x - plate_w, plate_y - plate_w, plate_x + plate_w, plate_y + plate_w]
        draw.ellipse(plate_box, fill=(247, 241, 231, 232), outline=(212, 175, 55, 190), width=4)
        inner = [plate_box[0] + 22, plate_box[1] + 22, plate_box[2] - 22, plate_box[3] - 22]
        draw.ellipse(inner, outline=(128, 0, 32, 38), width=2)

        cx, cy = plate_x, plate_y
        palette = {
            "drinks": [(196, 124, 52), (232, 190, 104), (118, 76, 44), (245, 224, 170)],
            "dinner": [(190, 92, 42), (222, 150, 58), (104, 126, 62), (176, 56, 52)],
            "indian": [(214, 142, 44), (244, 205, 114), (150, 74, 36), (92, 116, 52)],
            "street-food": [(216, 150, 46), (245, 206, 112), (176, 66, 42), (108, 120, 54)],
            "breakfast": [(232, 186, 96), (246, 222, 158), (180, 106, 44), (106, 124, 62)],
            "italian": [(194, 62, 44), (230, 168, 68), (102, 132, 66), (244, 232, 194)],
            "chinese": [(186, 74, 48), (222, 148, 54), (86, 118, 64), (236, 206, 140)],
            "lunch": [(104, 138, 64), (212, 156, 64), (166, 82, 44), (238, 214, 154)],
            "desserts": [(198, 122, 142), (232, 178, 172), (130, 72, 62), (246, 224, 186)],
            "snacks": [(214, 142, 56), (244, 200, 110), (156, 84, 48), (108, 126, 62)],
            "vegetarian": [(104, 140, 68), (186, 156, 62), (212, 110, 52), (238, 218, 160)],
            "non-vegetarian": [(176, 62, 52), (208, 118, 54), (116, 78, 52), (228, 186, 112)],
            "healthy": [(104, 148, 94), (172, 178, 82), (226, 154, 82), (238, 224, 164)],
        }.get(category, [(190, 100, 46), (226, 162, 72), (110, 126, 64), (238, 214, 154)])
        for i in range(9):
            angle = rng.uniform(0, math.tau)
            distance = rng.uniform(10, plate_w * 0.56)
            x = cx + math.cos(angle) * distance
            y = cy + math.sin(angle) * distance * 0.82
            radius = rng.randint(int(plate_w * 0.12), int(plate_w * 0.27))
            color = palette[i % len(palette)]
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color + (225,))
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], outline=(255, 248, 235, 55), width=2)
        # Herb garnish and a gold drizzle.
        draw.ellipse([cx - plate_w * 0.14, cy - plate_w * 0.14, cx + plate_w * 0.06, cy + plate_w * 0.06], fill=(74, 110, 58, 235))
        draw.arc(
            [cx - plate_w * 0.5, cy - plate_w * 0.4, cx + plate_w * 0.5, cy + plate_w * 0.4],
            start=200, end=330, fill=(212, 175, 55, 200), width=3,
        )
        for i in range(5):
            draw.ellipse(
                [cx + plate_w * (0.1 + i * 0.07), cy + plate_w * (0.2 + (i % 2) * 0.05),
                 cx + plate_w * (0.12 + i * 0.07), cy + plate_w * (0.22 + (i % 2) * 0.05)],
                fill=(212, 175, 55, 170),
            )

    # Scattered spice specks for texture.
    for _ in range(34):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        r = rng.randint(1, 3)
        draw.ellipse([x, y, x + r, y + r], fill=(245, 230, 179, rng.randint(20, 65)))

    # Gentle vignette so overlaid interface text stays readable.
    vignette = Image.new("L", image.size, 0)
    vd = ImageDraw.Draw(vignette)
    vd.ellipse([-width * 0.2, -height * 0.3, width * 1.2, height * 1.3], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(120))
    black = Image.new("RGBA", image.size, (10, 4, 8, 90))
    image = Image.composite(image, Image.alpha_composite(image, black), vignette)
    return image.convert("RGB")


def generate_images(upload_dir: Path):
    seed = upload_dir / "seed"
    seed.mkdir(parents=True, exist_ok=True)
    for recipe in PUBLISHED_RECIPES + DRAFT_RECIPES:
        target = seed / f"{recipe['slug']}.jpg"
        if target.exists():
            continue
        palette = PALETTES.get(recipe["category"], PALETTES["dinner"])
        image = _gradient((1200, 800), palette[0], palette[1])
        image = _decorate(image, recipe["slug"], recipe["title"], recipe["category"])
        image.save(target, quality=90, optimize=True)

    for name, name_hi, slug, icon, description in CATEGORIES:
        target = seed / f"category-{slug}.jpg"
        if target.exists():
            continue
        palette = PALETTES.get(slug, PALETTES["dinner"])
        image = _gradient((800, 520), palette[0], palette[1])
        image = _decorate(image, f"category-{slug}", name, "collection", kind="category")
        image.save(target, quality=88, optimize=True)

    banner = seed / "banner.jpg"
    if not banner.exists():
        image = _gradient((1600, 640), (48, 4, 22), (128, 0, 32))
        image = _decorate(image, "banner-art", "FoodieBook", "dinner", kind="banner")
        image.save(banner, quality=92, optimize=True)

    default = upload_dir / "defaults" / "recipe-default.jpg"
    default.parent.mkdir(parents=True, exist_ok=True)
    if not default.exists():
        image = _gradient((1200, 800), (38, 24, 18), (96, 20, 28))
        image = _decorate(image, "default-image", "A little something delicious", "recipes")
        image.save(default, quality=88, optimize=True)

    avatar_default = upload_dir / "defaults" / "avatar-default.jpg"
    if not avatar_default.exists():
        image = _gradient((500, 500), (74, 0, 31), (128, 0, 32))
        draw = ImageDraw.Draw(image)
        draw.ellipse([110, 110, 390, 390], outline=(212, 175, 55), width=5)
        draw.ellipse([180, 150, 320, 290], fill=(245, 230, 179))
        draw.ellipse([140, 300, 360, 480], fill=(245, 230, 179))
        image.save(avatar_default, quality=90, optimize=True)

    for name, initials, palette in [
        ("admin", "AM", ((50, 20, 18), (128, 0, 32))),
        ("demo", "MS", ((34, 30, 20), (146, 108, 48))),
        ("kunal", "KM", ((24, 30, 28), (66, 104, 92))),
        ("ananya", "AI", ((38, 22, 34), (130, 54, 88))),
        ("rohan", "RK", ((24, 26, 36), (62, 76, 116))),
        ("sana", "SQ", ((36, 26, 16), (126, 82, 34))),
    ]:
        target = seed / f"avatar-{name}.jpg"
        if target.exists():
            continue
        image = _gradient((500, 500), palette[0], palette[1])
        draw = ImageDraw.Draw(image)
        draw.ellipse([90, 90, 410, 410], outline=(212, 175, 55), width=3)
        font = _font(150, bold=True)
        bbox = draw.textbbox((0, 0), initials, font=font)
        draw.text(((500 - (bbox[2] - bbox[0])) / 2, (500 - (bbox[3] - bbox[1])) / 2 - 30), initials, font=font, fill=(245, 230, 179))
        image.save(target, quality=90, optimize=True)


def _upsert_setting(key, value):
    setting = SiteSetting.query.filter_by(key=key).first()
    if not setting:
        setting = SiteSetting(key=key)
        db.session.add(setting)
    setting.value = value


def _make_user(name, email, password, role, bio, avatar, admin=False):
    user = User.query.filter_by(email=email).first()
    role_obj = Role.query.filter_by(name=role).first()
    if not user:
        user = User(name=name, email=email, role=role_obj, bio=bio)
        user.set_password(password)
        db.session.add(user)
        db.session.flush()
    else:
        user.name = user.name or name
        user.role = role_obj
        if not user.profile_image:
            user.profile_image = avatar
    if not user.profile_image:
        user.profile_image = avatar
    if not ShoppingList.query.filter_by(user_id=user.id).first():
        db.session.add(ShoppingList(user_id=user.id))
    return user


def _add_recipe(recipe_data, author, category, status="published"):
    existing = Recipe.query.filter_by(title=recipe_data["title"]).first()
    if existing:
        return existing
    image_path = f"/uploads/seed/{recipe_data['slug']}.jpg"
    prep = recipe_data["prep"]
    cook = recipe_data["cook"]
    recipe = Recipe(
        title=recipe_data["title"],
        title_hi=recipe_data["title_hi"],
        short_description=recipe_data["short"],
        short_description_hi=recipe_data["short_hi"],
        description=recipe_data["desc"],
        description_hi=recipe_data["desc_hi"],
        image=image_path,
        category_id=category.id,
        cuisine=recipe_data["cuisine"],
        cuisine_hi=recipe_data["cuisine_hi"],
        food_type=recipe_data["food_type"],
        prep_time=prep,
        cook_time=cook,
        total_time=prep + cook,
        difficulty=recipe_data["difficulty"],
        servings=recipe_data["servings"],
        calories=recipe_data["calories"],
        tips=recipe_data["tips"],
        tips_hi=recipe_data["tips_hi"],
        nutrition=recipe_data["nutrition"],
        status=recipe_data.get("status", status),
        is_featured=recipe_data["featured"],
        author_id=author.id,
    )
    db.session.add(recipe)
    db.session.flush()
    for name, quantity, unit in recipe_data["ingredients"]:
        name_lower = name.lower()
        ingredient = Ingredient.query.filter_by(name=name_lower).first()
        if not ingredient:
            ingredient = Ingredient(name=name_lower, name_hi=HI_INGREDIENTS.get(name_lower))
            db.session.add(ingredient)
            db.session.flush()
        recipe.ingredients.append(
            RecipeIngredient(ingredient_id=ingredient.id, quantity=quantity, unit=unit)
        )
    for number, (instruction, instruction_hi) in enumerate(recipe_data["steps"], start=1):
        recipe.steps.append(
            RecipeStep(step_number=number, instruction=instruction, instruction_hi=instruction_hi)
        )
    return recipe


def run_seed(app=None):
    with app.app_context() if app else _nullcontext():
        upload_dir = Path(app.config["UPLOAD_FOLDER"]) if app else BASE_DIR / "uploads"
        print("Generating sample imagery…")
        generate_images(upload_dir)

        print("Seeding roles, categories and settings…")
        for name, description in [
            ("admin", "Platform administrator"),
            ("user", "Recipe lover and home cook"),
        ]:
            if not Role.query.filter_by(name=name).first():
                db.session.add(Role(name=name, description=description))
        db.session.flush()

        category_map = {}
        for name, name_hi, slug, icon, description in CATEGORIES:
            category = Category.query.filter_by(slug=slug).first()
            if not category:
                category = Category(
                    name=name,
                    name_hi=name_hi,
                    slug=slug,
                    icon=icon,
                    description=description,
                    description_hi=f"{name_hi} — {description}",
                    image=f"/uploads/seed/category-{slug}.jpg",
                )
                db.session.add(category)
                db.session.flush()
            category_map[slug] = category

        settings = {
            "site_name": "FoodieBook",
            "tagline": "Recipes, memories & the joy of cooking",
            "contact_email": "hello@foodiebook.com",
            "banner_title": "Cook something unforgettable today",
            "banner_subtitle": "A curated collection of soulful recipes, from everyday comfort food to festive feasts.",
            "banner_image": "/uploads/seed/banner.jpg",
            "about_text": "FoodieBook by Marshru is a bilingual home for recipes, stories and the people who cook them.",
            "maintenance_mode": "false",
        }
        for key, value in settings.items():
            _upsert_setting(key, value)
        db.session.commit()

        print("Seeding users…")
        admin = _make_user("Aarav Marshru", "admin@foodiebook.com", "Admin@12345", "admin",
                           "Founder of FoodieBook. Loves slow cooking and old family recipes.",
                           "/uploads/seed/avatar-admin.jpg")
        demo = _make_user("Meera Sharma", "demo@foodiebook.com", "Demo@12345", "user",
                          "Home cook in Mumbai. Chasing the perfect cup of chai.",
                          "/uploads/seed/avatar-demo.jpg")
        kunal = _make_user("Chef Kunal Mehra", "chef.kunal@foodiebook.com", "Chef@12345", "user",
                           "Chef, recipe writer and biryani obsessive.",
                           "/uploads/seed/avatar-kunal.jpg")
        ananya = _make_user("Ananya Iyer", "chef.ananya@foodiebook.com", "Chef@12345", "user",
                            "South Indian kitchen stories, filter coffee and crisp dosas.",
                            "/uploads/seed/avatar-ananya.jpg")
        rohan = _make_user("Rohan Kapoor", "chef.rohan@foodiebook.com", "Chef@12345", "user",
                           "Pasta, bread and everything baked on weekends.",
                           "/uploads/seed/avatar-rohan.jpg")
        sana = _make_user("Sana Qureshi", "chef.sana@foodiebook.com", "Chef@12345", "user",
                          "Wok hei, street food and bold Indo-Chinese flavours.",
                          "/uploads/seed/avatar-sana.jpg")
        db.session.commit()
        users = {
            "admin@foodiebook.com": admin,
            "demo@foodiebook.com": demo,
            "chef.kunal@foodiebook.com": kunal,
            "chef.ananya@foodiebook.com": ananya,
            "chef.rohan@foodiebook.com": rohan,
            "chef.sana@foodiebook.com": sana,
        }

        existing_recipes = Recipe.query.count()
        if existing_recipes == 0:
            print("Seeding recipes…")
            for data in PUBLISHED_RECIPES:
                _add_recipe(data, users[data["author"]], category_map[data["category"]])
            for data in DRAFT_RECIPES:
                _add_recipe(data, users[data["author"]], category_map[data["category"]], status="draft")
            db.session.commit()
        else:
            print(f"Recipes already present ({existing_recipes}); skipping recipe inserts.")

        if Review.query.count() == 0:
            print("Seeding reviews…")
            for slug, email, rating, comment in REVIEWS:
                recipe = Recipe.query.filter_by(title=next(
                    (r["title"] for r in PUBLISHED_RECIPES + DRAFT_RECIPES if r["slug"] == slug), ""
                )).first()
                user = users.get(email)
                if not recipe or not user or recipe.author_id == user.id:
                    continue
                if Review.query.filter_by(user_id=user.id, recipe_id=recipe.id).first():
                    continue
                db.session.add(Review(user_id=user.id, recipe_id=recipe.id, rating=rating, comment=comment))
            db.session.commit()

        for recipe in Recipe.query.all():
            recipe.refresh_rating()
        db.session.commit()

        if Favorite.query.count() == 0:
            favourite_titles = [
                ("demo@foodiebook.com", "Butter Chicken"),
                ("demo@foodiebook.com", "Gulab Jamun"),
                ("demo@foodiebook.com", "Crispy Masala Dosa"),
                ("demo@foodiebook.com", "Margherita Pizza"),
                ("chef.kunal@foodiebook.com", "Dal Makhani"),
                ("chef.ananya@foodiebook.com", "Masala Chai"),
                ("chef.rohan@foodiebook.com", "Mango Lassi"),
                ("chef.sana@foodiebook.com", "Chilli Garlic Noodles"),
            ]
            for email, title in favourite_titles:
                recipe = Recipe.query.filter_by(title=title).first()
                user = users.get(email)
                if recipe and user and not Favorite.query.filter_by(user_id=user.id, recipe_id=recipe.id).first():
                    db.session.add(Favorite(user_id=user.id, recipe_id=recipe.id))
            db.session.commit()

        shopping = ShoppingList.query.filter_by(user_id=demo.id).first()
        if shopping and not shopping.items:
            for name, qty, unit in [
                ("Basmati rice", "2", "cups"),
                ("Paneer", "400", "g"),
                ("Tomatoes", "6", "pieces"),
                ("Fresh cream", "1", "cup"),
                ("Coriander", "1", "bunch"),
            ]:
                db.session.add(ShoppingListItem(shopping_list_id=shopping.id, name=name, quantity=qty, unit=unit))
            db.session.commit()

        if Notification.query.count() == 0:
            print("Seeding notifications…")
            db.session.add_all([
                Notification(user_id=demo.id, title="Welcome to FoodieBook", title_hi="FoodieBook में स्वागत है",
                             message="Your kitchen story starts here. Explore recipes, save favourites and cook something wonderful.",
                             message_hi="यहाँ से आपकी रसोई की कहानी शुरू होती है। रेसिपी खोजें, पसंदीदा सहेजें और कुछ स्वादिष्ट बनाएँ।",
                             type="welcome", link="/dashboard"),
                Notification(user_id=demo.id, title="Trending this week", title_hi="इस हफ्ते ट्रेंडिंग",
                             message="Butter Chicken is being saved by home cooks everywhere. Take a look!",
                             message_hi="बटर चिकन को हर जगह होम कुक्स सहेज रहे हैं। एक नज़र डालें!",
                             type="trending", link="/explore?sort=popular"),
                Notification(user_id=admin.id, title="New report needs review", title_hi="नई रिपोर्ट की समीक्षा करें",
                             message="A review was reported by a member of the community.",
                             message_hi="समुदाय के एक सदस्य ने एक रिव्यू की रिपोर्ट की है।",
                             type="report", link="/admin?tab=reports"),
            ])
            db.session.commit()

        if Report.query.count() == 0:
            review = Review.query.filter_by(comment="Great filling. Frying on low heat is the key.").first()
            if review:
                db.session.add(Report(
                    reporter_id=demo.id, target_type="review", target_id=review.id,
                    reason="This review mentions a different recipe than the one shown.",
                ))
                db.session.commit()

        print("Seed complete.")
        print("Admin: admin@foodiebook.com / Admin@12345")
        print("Demo:  demo@foodiebook.com / Demo@12345")


class _nullcontext:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


if __name__ == "__main__":
    from dotenv import load_dotenv
    import os

    load_dotenv(Path(__file__).resolve().parent / ".env")
    from app import create_app

    run_seed(create_app())
