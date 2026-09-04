"""
create_sample_assets.py — Generates synthetic packaging label mockups for testing & SIH judging demo.
Creates:
  1. assets/sample_labels/compliant_sample.png (100% compliant with Rule 6)
  2. assets/sample_labels/non_compliant_sample.png (Fails MRP & Consumer Care)
"""

import os
from PIL import Image, ImageDraw, ImageFont


def get_font(size: int):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def create_compliant_label(output_path: str):
    width, height = 900, 700
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Outer border and banner
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=(40, 40, 40), width=3)
    draw.rectangle([(25, 25), (width - 25, 95)], fill=(34, 139, 34))

    # Header title
    title_font = get_font(32)
    sub_font = get_font(20)
    body_font = get_font(22)
    small_font = get_font(18)

    draw.text((45, 40), "HERBAL ESSENCE ORGANIC TEA", fill=(255, 255, 255), font=title_font)

    y = 120
    draw.text((45, y), "Product: Premium Green Tea Leaves", fill=(20, 20, 20), font=sub_font)
    y += 40

    # Rule 6(1)(b) - Net Quantity
    draw.rectangle([(40, y), (width - 40, y + 45)], fill=(245, 245, 245), outline=(200, 200, 200), width=1)
    draw.text((50, y + 10), "Net Quantity: 250 g", fill=(10, 10, 10), font=body_font)
    y += 65

    # Rule 6(1)(f) - MRP incl. of taxes
    draw.rectangle([(40, y), (width - 40, y + 45)], fill=(245, 245, 245), outline=(200, 200, 200), width=1)
    draw.text((50, y + 10), "MRP: Rs. 199.00 (Inclusive of all taxes)", fill=(10, 10, 10), font=body_font)
    y += 65

    # Rule 6(1)(e) - Mfg Date & Expiry Date
    draw.rectangle([(40, y), (width - 40, y + 45)], fill=(245, 245, 245), outline=(200, 200, 200), width=1)
    draw.text((50, y + 10), "Mfg. Date: 05/2024      |      Best Before: 24 Months from Mfg", fill=(10, 10, 10), font=body_font)
    y += 65

    # Rule 6(1)(c) - Manufacturer Details
    draw.rectangle([(40, y), (width - 40, y + 55)], fill=(245, 245, 245), outline=(200, 200, 200), width=1)
    draw.text((50, y + 8), "Mfg by: NaturePure Organics India Pvt Ltd", fill=(10, 10, 10), font=body_font)
    draw.text((50, y + 32), "Plot 12, Industrial Area, Solan, Himachal Pradesh - 173212", fill=(60, 60, 60), font=small_font)
    y += 75

    # Rule 6(1)(k) - Consumer Care & Grievance
    draw.rectangle([(40, y), (width - 40, y + 55)], fill=(245, 245, 245), outline=(200, 200, 200), width=1)
    draw.text((50, y + 8), "Consumer Care Helpline: 1800-200-8899", fill=(10, 10, 10), font=body_font)
    draw.text((50, y + 32), "For grievances email: support@naturepure.com", fill=(60, 60, 60), font=small_font)
    y += 75

    # Rule 6 - FSSAI
    draw.rectangle([(40, y), (width - 40, y + 45)], fill=(245, 245, 245), outline=(200, 200, 200), width=1)
    draw.text((50, y + 10), "FSSAI Lic. No.: 10019022009876", fill=(10, 10, 10), font=body_font)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=95)
    print(f"Created compliant sample: {output_path}")


def create_non_compliant_label(output_path: str):
    width, height = 900, 600
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Outer border and red banner
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=(40, 40, 40), width=3)
    draw.rectangle([(25, 25), (width - 25, 95)], fill=(180, 50, 50))

    title_font = get_font(32)
    sub_font = get_font(20)
    body_font = get_font(22)

    draw.text((45, 40), "CRUNCHY CORN PUFFS", fill=(255, 255, 255), font=title_font)

    y = 120
    draw.text((45, y), "Product: Roasted Corn Snack", fill=(20, 20, 20), font=sub_font)
    y += 45

    # Rule 6(1)(b) - Net Quantity (Present)
    draw.rectangle([(40, y), (width - 40, y + 45)], fill=(245, 245, 245), outline=(200, 200, 200), width=1)
    draw.text((50, y + 10), "Net Quantity: 100 g", fill=(10, 10, 10), font=body_font)
    y += 65

    # VIOLATION: Missing MRP and taxes (Only says "Price 25")
    draw.rectangle([(40, y), (width - 40, y + 45)], fill=(255, 235, 235), outline=(220, 180, 180), width=1)
    draw.text((50, y + 10), "Price: 25", fill=(180, 20, 20), font=body_font)
    y += 65

    # Rule 6(1)(e) - Mfg Date (Present)
    draw.rectangle([(40, y), (width - 40, y + 45)], fill=(245, 245, 245), outline=(200, 200, 200), width=1)
    draw.text((50, y + 10), "Mfg. Date: 02/2024      |      Best Before: 6 Months", fill=(10, 10, 10), font=body_font)
    y += 65

    # Rule 6(1)(c) - Manufacturer (Present)
    draw.rectangle([(40, y), (width - 40, y + 45)], fill=(245, 245, 245), outline=(200, 200, 200), width=1)
    draw.text((50, y + 10), "Packed by: FastSnacks Foods Ltd, Delhi, India", fill=(10, 10, 10), font=body_font)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=95)
    print(f"Created non-compliant sample: {output_path}")


if __name__ == "__main__":
    base_dir = os.path.join(os.path.dirname(__file__), "assets", "sample_labels")
    create_compliant_label(os.path.join(base_dir, "compliant_sample.png"))
    create_non_compliant_label(os.path.join(base_dir, "non_compliant_sample.png"))
