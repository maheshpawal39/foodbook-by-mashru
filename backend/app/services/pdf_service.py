import io
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

MAROON = colors.HexColor("#800020")
GOLD = colors.HexColor("#D4AF37")
BROWN = colors.HexColor("#3A2A24")

FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

WINDOWS_FONTS = [
    ("C:/Windows/Fonts/Nirmala.ttf", "Nirmala"),
    ("C:/Windows/Fonts/mangal.ttf", "Mangal"),
    ("/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf", "NotoDevanagari"),
]


def _register_fonts():
    for path, name in WINDOWS_FONTS:
        if Path(path).exists():
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                return name
            except Exception:
                continue
    return None


def _escape(text) -> str:
    if not text:
        return ""
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_recipe_pdf(recipe) -> bytes:
    unicode_font = _register_fonts()
    font_regular = unicode_font or FONT_REGULAR
    font_bold = unicode_font or FONT_BOLD

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"FoodieBook - {recipe.title}",
        author=recipe.author.name if recipe.author else "FoodieBook",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "FBTitle", parent=styles["Title"], fontName=font_bold, fontSize=24, leading=30, textColor=MAROON, alignment=TA_CENTER
    )
    brand_style = ParagraphStyle(
        "FBBrand", parent=styles["Normal"], fontName=font_bold, fontSize=10, leading=14, textColor=GOLD, alignment=TA_CENTER
    )
    sub_style = ParagraphStyle(
        "FBSub", parent=styles["Normal"], fontName=font_regular, fontSize=10.5, leading=15, textColor=BROWN, alignment=TA_CENTER
    )
    heading = ParagraphStyle(
        "FBHeading", parent=styles["Heading2"], fontName=font_bold, fontSize=13, leading=18, textColor=MAROON, spaceBefore=10, spaceAfter=5
    )
    body = ParagraphStyle("FBBody", parent=styles["Normal"], fontName=font_regular, fontSize=9.5, leading=14, textColor=BROWN)
    small = ParagraphStyle("FBSmall", parent=styles["Normal"], fontName=font_regular, fontSize=8.5, leading=12, textColor=BROWN)

    story = [
        Paragraph("FOODIEBOOK <font color='#D4AF37'>by Marshru</font>", brand_style),
        Spacer(1, 6),
        Paragraph(_escape(recipe.title), title_style),
        Spacer(1, 2),
        Paragraph(_escape(recipe.short_description or recipe.cuisine or ""), sub_style),
        Spacer(1, 6),
        HRFlowable(width="100%", thickness=1.2, color=GOLD, spaceAfter=8),
    ]

    author_name = recipe.author.name if recipe.author else "FoodieBook"
    story.append(
        Paragraph(
            f"By {_escape(author_name)} &nbsp;|&nbsp; {_escape(recipe.cuisine or 'Global')} cuisine &nbsp;|&nbsp; "
            f"{_escape(recipe.difficulty)} &nbsp;|&nbsp; {recipe.average_rating or '—'} / 5 rating",
            sub_style,
        )
    )
    story.append(Spacer(1, 8))

    meta_rows = [
        ["Preparation", "Cooking", "Total", "Servings", "Calories"],
        [
            f"{recipe.prep_time} min",
            f"{recipe.cook_time} min",
            f"{recipe.total_time} min",
            str(recipe.servings),
            f"{recipe.calories or '—'} kcal",
        ],
    ]
    table = Table(meta_rows, colWidths=[34 * mm] * 5)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5E6B3")),
                ("TEXTCOLOR", (0, 0), (-1, 0), MAROON),
                ("FONTNAME", (0, 0), (-1, 0), font_bold),
                ("FONTNAME", (0, 1), (-1, 1), font_regular),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8D5A4")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 6))

    if recipe.description:
        story.append(Paragraph("About this recipe", heading))
        story.append(Paragraph(_escape(recipe.description).replace("\n", "<br/>"), body))

    story.append(Paragraph("Ingredients", heading))
    for link in recipe.ingredients:
        amount = " ".join(part for part in [link.quantity, link.unit] if part)
        line = f"<b>{_escape(link.ingredient.name)}</b>"
        if amount:
            line += f" — {_escape(amount)}"
        if link.notes:
            line += f" ({_escape(link.notes)})"
        story.append(Paragraph(f"• {line}", body))

    story.append(Paragraph("Method", heading))
    for step in recipe.steps:
        story.append(Paragraph(f"<b>Step {step.step_number}.</b> {_escape(step.instruction)}", body))
        story.append(Spacer(1, 3))

    nutrition = recipe.nutrition or {}
    if nutrition:
        story.append(Paragraph("Nutrition (per serving)", heading))
        nutrition_items = [(str(key).replace("_", " ").title(), str(value)) for key, value in nutrition.items() if value]
        if nutrition_items:
            rows = [["Nutrient", "Amount"]] + [list(item) for item in nutrition_items]
            ntable = Table(rows, colWidths=[70 * mm, 70 * mm])
            ntable.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4A001F")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), font_bold),
                        ("FONTNAME", (0, 1), (-1, -1), font_regular),
                        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E8D5A4")),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(ntable)

    if recipe.tips:
        story.append(Paragraph("Chef's tips", heading))
        story.append(Paragraph(_escape(recipe.tips).replace("\n", "<br/>"), body))

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.6, color=GOLD, spaceAfter=4))
    story.append(
        Paragraph(
            f"Generated from FoodieBook by Marshru &nbsp;•&nbsp; foodiebook.app &nbsp;•&nbsp; Recipe #{recipe.id}",
            small,
        )
    )

    doc.build(story)
    return buffer.getvalue()
