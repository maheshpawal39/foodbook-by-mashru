import io
from pathlib import Path
from xml.sax.saxutils import escape

from flask import current_app
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _paragraph(text, style):
    return Paragraph(escape(str(text or "")).replace("\n", "<br/>"), style)


def build_recipe_pdf(recipe):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=recipe.title,
        author="FoodieBook by Marshru",
    )
    styles = getSampleStyleSheet()
    maroon = colors.HexColor("#800020")
    gold = colors.HexColor("#D4AF37")
    brown = colors.HexColor("#3B2417")

    title_style = ParagraphStyle(
        "FBTitle", parent=styles["Title"], fontName="Times-Bold", fontSize=24,
        textColor=maroon, spaceAfter=4, alignment=TA_LEFT,
    )
    brand_style = ParagraphStyle(
        "FBBrand", parent=styles["Normal"], fontName="Times-Bold", fontSize=10,
        textColor=gold, spaceAfter=10,
    )
    heading = ParagraphStyle(
        "FBHeading", parent=styles["Heading2"], fontName="Times-Bold", fontSize=14,
        textColor=maroon, spaceBefore=12, spaceAfter=6,
    )
    body = ParagraphStyle(
        "FBBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=10,
        textColor=brown, leading=15,
    )
    small = ParagraphStyle(
        "FBSmall", parent=body, fontSize=8.5, textColor=colors.HexColor("#7A6255")
    )

    story = [
        _paragraph("FoodieBook by Marshru", brand_style),
        _paragraph(recipe.title, title_style),
        _paragraph(recipe.short_description or "", body),
        Spacer(1, 6),
        HRFlowable(width="100%", thickness=1, color=gold, spaceAfter=10),
    ]

    image_path = None
    if recipe.image and recipe.image.startswith("/uploads/"):
        candidate = Path(current_app.config["UPLOAD_FOLDER"]) / recipe.image.replace("/uploads/", "", 1)
        if candidate.exists():
            image_path = candidate
    if image_path:
        try:
            story.append(Image(str(image_path), width=170 * mm, height=95 * mm, kind="proportional"))
            story.append(Spacer(1, 8))
        except Exception:
            pass

    meta = [
        ["Category", recipe.category.name if recipe.category else "-"],
        ["Cuisine", recipe.cuisine or "-"],
        ["Type", recipe.food_type or "-"],
        ["Prep / Cook", f"{recipe.prep_time} min / {recipe.cook_time} min"],
        ["Total time", f"{recipe.total_time} min"],
        ["Difficulty", recipe.difficulty],
        ["Servings", str(recipe.servings)],
        ["Calories", f"{recipe.calories} kcal" if recipe.calories else "-"],
        ["Author", recipe.author.name if recipe.author else "-"],
    ]
    table = Table(meta, colWidths=[35 * mm, 120 * mm])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, -1), maroon),
                ("TEXTCOLOR", (1, 0), (1, -1), brown),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story += [table, _paragraph("Ingredients", heading)]
    for item in recipe.ingredients:
        amount = " ".join(filter(None, [item.quantity, item.unit]))
        line = f"<b>{escape(amount)}</b> {escape(item.ingredient.name if item.ingredient else '')}"
        if item.note:
            line += f" <i>({escape(item.note)})</i>"
        story.append(_paragraph(line, body))

    story.append(_paragraph("Method", heading))
    for step in recipe.steps:
        story.append(_paragraph(f"<b>Step {step.step_number}.</b> {step.instruction}", body))
        story.append(Spacer(1, 4))

    if recipe.tips:
        story.append(_paragraph("Chef's tips", heading))
        story.append(_paragraph(recipe.tips, body))

    nutrition = recipe.nutrition or {}
    if nutrition:
        story.append(_paragraph("Nutrition (per serving)", heading))
        rows = [[key.title(), str(value)] for key, value in nutrition.items() if value not in (None, "")]
        if rows:
            nut = Table(rows, colWidths=[60 * mm, 60 * mm])
            nut.setStyle(
                TableStyle(
                    [
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("TEXTCOLOR", (0, 0), (0, -1), maroon),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ]
                )
            )
            story.append(nut)

    story += [
        Spacer(1, 14),
        HRFlowable(width="100%", thickness=0.5, color=gold),
        _paragraph("Crafted with love · FoodieBook by Marshru", small),
    ]
    doc.build(story)
    buffer.seek(0)
    return buffer
