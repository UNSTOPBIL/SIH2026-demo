"""
generate_mass_test_labels.py — Generates a comprehensive dataset of 25+ realistic Indian packaging
commodity labels for mass testing the Legal Metrology (Rule 6) OCR and statutory rule engine.
"""

import os
import json
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Any

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "mass_test_labels")


def get_font(size: int, bold: bool = False):
    font_name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(font_name, size)
    except Exception:
        try:
            return ImageFont.truetype("arial.ttf", size)
        except Exception:
            return ImageFont.load_default()


def render_label(spec: Dict[str, Any], output_path: str):
    width, height = spec.get("width", 850), spec.get("height", 680)
    bg_color = spec.get("bg_color", (255, 255, 255))
    theme_color = spec.get("theme_color", (30, 41, 59))
    banner_text_color = spec.get("banner_text_color", (255, 255, 255))
    
    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    # 1. Outer Border
    border_color = (60, 60, 60)
    draw.rectangle([(15, 15), (width - 15, height - 15)], outline=border_color, width=2)

    # 2. Header Banner
    banner_height = 80
    draw.rectangle([(20, 20), (width - 20, banner_height)], fill=theme_color)
    
    brand_font = get_font(26, bold=True)
    draw.text((35, 28), spec["brand"].upper(), fill=banner_text_color, font=brand_font)
    
    prod_font = get_font(18, bold=False)
    draw.text((35, 58), spec["product_name"], fill=banner_text_color, font=prod_font)
    
    cat_font = get_font(14, bold=True)
    draw.text((width - 180, 40), f"[{spec['category'].upper()}]", fill=banner_text_color, font=cat_font)

    # 3. Render Mandatory Declarations Box
    y = banner_height + 25
    body_font = get_font(spec.get("body_font_size", 20))
    label_font = get_font(spec.get("label_font_size", 18), bold=True)
    small_font = get_font(15)

    # Optional Unprinted/Stamped Batch Box (simulating Lay's or batch printer stamp)
    if spec.get("has_unprinted_box", False):
        box_top = y
        box_height = 160
        box_width = 380
        draw.rectangle([(30, box_top), (30 + box_width, box_top + box_height)], fill=(255, 255, 255), outline=(50, 100, 220), width=2)
        draw.text((40, box_top + 8), "MANDATORY DECLARATIONS (BATCH CODE AREA)", fill=(50, 100, 220), font=get_font(12, bold=True))
        
        # Headers inside box
        draw.text((40, box_top + 32), "*MRP Rs. :", fill=(30, 30, 30), font=label_font)
        draw.text((40, box_top + 60), "N. QTY.  :", fill=(30, 30, 30), font=label_font)
        draw.text((40, box_top + 88), "B. NO.   :", fill=(30, 30, 30), font=label_font)
        draw.text((40, box_top + 116), "MFD.     :", fill=(30, 30, 30), font=label_font)
        draw.text((220, box_top + 116), "USE BY :", fill=(30, 30, 30), font=label_font)

        if spec.get("is_stamped", False):
            # Stamped values by industrial printer
            stamp_font = get_font(18, bold=True)
            draw.text((150, box_top + 32), spec.get("stamped_mrp", "₹ 20.00"), fill=(20, 20, 90), font=stamp_font)
            draw.text((150, box_top + 60), spec.get("stamped_qty", "52 g"), fill=(20, 20, 90), font=stamp_font)
            draw.text((150, box_top + 88), spec.get("stamped_batch", "B24X0812"), fill=(20, 20, 90), font=stamp_font)
            draw.text((120, box_top + 116), spec.get("stamped_mfd", "07/24"), fill=(20, 20, 90), font=stamp_font)
            draw.text((290, box_top + 116), spec.get("stamped_exp", "01/25"), fill=(20, 20, 90), font=stamp_font)
        else:
            # Physically blank inside the box!
            pass

        y += box_height + 20
    else:
        # Standard printed declarations layout
        for section in spec.get("sections", []):
            sec_h = section.get("height", 46)
            draw.rectangle([(30, y), (width - 30, y + sec_h)], fill=(248, 250, 252), outline=(226, 232, 240), width=1)
            
            # Label
            draw.text((45, y + 10), section["text"], fill=(15, 23, 42), font=body_font)
            if "subtext" in section:
                draw.text((45, y + 32), section["subtext"], fill=(71, 85, 105), font=small_font)
            y += sec_h + 12

    # Footer declarations (Manufacturer, Consumer Care, FSSAI)
    footer_sections = spec.get("footer_sections", [])
    for sec in footer_sections:
        sec_h = sec.get("height", 50)
        draw.rectangle([(30, y), (width - 30, y + sec_h)], fill=(241, 245, 249), outline=(203, 213, 225), width=1)
        draw.text((45, y + 8), sec["title"], fill=(30, 41, 59), font=label_font)
        if "detail" in sec:
            draw.text((45, y + 28), sec["detail"], fill=(71, 85, 105), font=small_font)
        y += sec_h + 12

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=95)


def build_mass_test_suite() -> List[Dict[str, Any]]:
    packages: List[Dict[str, Any]] = [
        # --- 1. SNACKS & CHIPS ---
        {
            "id": "haldiram_bhujia_compliant",
            "filename": "haldiram_aloo_bhujia_compliant.png",
            "brand": "Haldiram's",
            "product_name": "Nagpur Special Aloo Bhujia (Crispy Potato & Gram Flour Snack)",
            "category": "Snacks",
            "theme_color": (194, 65, 12),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 400 g", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 115.00  |  USP: Rs. 0.28 / g", "height": 45},
                {"text": "Mfg Date: 12/08/2026   |   Best Before: 6 Months from Packaging", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured & Packed by: Haldiram Snacks Pvt. Ltd.",
                    "detail": "B-1/H-8, Mohan Co-op Industrial Estate, Main Mathura Road, New Delhi - 110044",
                    "height": 55
                },
                {
                    "title": "Consumer Care Cell Helpline: 1800-419-0099",
                    "detail": "For feedback or queries email: customercare@haldirams.com | PO Box 102",
                    "height": 55
                },
                {
                    "title": "FSSAI Lic. No.: 10012011000676  |  100% Vegetarian Product",
                    "detail": "Standardized under Food Safety and Standards (Packaging) Regulations",
                    "height": 50
                }
            ]
        },
        {
            "id": "lays_mockup_unstamped",
            "filename": "lays_classic_salted_unstamped_mockup.png",
            "brand": "Lay's",
            "product_name": "Classic Salted Potato Chips (Specimen Blank Box)",
            "category": "Snacks",
            "theme_color": (2, 132, 199),
            "has_unprinted_box": True,
            "is_stamped": False,
            "expected_verdict": "REVIEW_REQUIRED",
            "footer_sections": [
                {
                    "title": "Marketed by: PepsiCo India Holdings Pvt. Ltd.",
                    "detail": "Regd Office: Tower-A, 5th Floor, DLF Phase-III, Gurugram - 122002, Haryana, India",
                    "height": 55
                },
                {
                    "title": "OR CALL US AT: 1800 22 4020",
                    "detail": "Write to Consumer Response Manager at feedback@pepsico.com | PO Box 27",
                    "height": 55
                },
                {
                    "title": "fssai Lic. No. 10014064000435",
                    "detail": "Central Licensing Authority - FSSAI Food Category 15.1",
                    "height": 50
                }
            ]
        },
        {
            "id": "kurkure_masala_munch_pass",
            "filename": "kurkure_masala_munch_pass.png",
            "brand": "Kurkure",
            "product_name": "Masala Munch Tedhe Medhe Snacks",
            "category": "Snacks",
            "theme_color": (217, 119, 6),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Wt.: 85 g", "height": 45},
                {"text": "Maximum Retail Price (incl of all taxes): ₹ 20.00 (USP: 0.24/g)", "height": 45},
                {"text": "Date of Mfg: 15/07/2026   |   Use By: 4 Months from Date of Packing", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Mfd by: PepsiCo India Holdings Pvt. Ltd. (Foods Division)",
                    "detail": "Village Channo, Patiala-Sangrur Road, District Sangrur, Punjab - 148026",
                    "height": 55
                },
                {
                    "title": "Customer Helpline: 1800 22 4020  |  Email: feedback@pepsico.com",
                    "detail": "Consumer Grievance Redressal Officer, Gurgaon, Haryana",
                    "height": 55
                },
                {
                    "title": "FSSAI Lic. No. 10012063000078",
                    "detail": "Govt of India Food Standardization Registry",
                    "height": 50
                }
            ]
        },
        {
            "id": "balaji_wafers_violation_mrp",
            "filename": "balaji_wafers_violation_mrp.png",
            "brand": "Balaji Wafers",
            "product_name": "Chataka Pataka Masala Balls",
            "category": "Snacks",
            "theme_color": (220, 38, 38),
            "expected_verdict": "POTENTIAL_VIOLATION",
            "sections": [
                {"text": "Net Weight: 60 g", "height": 45},
                {"text": "Price: 10 (Taxes missing from declaration)", "height": 45}, # Missing MRP prefix and taxes
                {"text": "Packed on: 02/08/2026", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Mfd by: Balaji Wafers Pvt. Ltd.",
                    "detail": "Vajdi (Vad), Kalawad Road, Taluka Lodhika, Rajkot, Gujarat - 360021",
                    "height": 55
                },
                {
                    "title": "Consumer Support: support@balajiwafers.com",
                    "detail": "Call: 0281-2782788 | Rajkot Office",
                    "height": 55
                },
                {
                    "title": "Lic. No. 10012021000109",
                    "detail": "FSSAI State License Gujarat",
                    "height": 50
                }
            ]
        },

        # --- 2. BISCUITS & COOKIES ---
        {
            "id": "parle_g_compliant",
            "filename": "parle_g_gluco_biscuit_compliant.png",
            "brand": "Parle",
            "product_name": "Parle-G Original Gluco Biscuits",
            "category": "Biscuits",
            "theme_color": (202, 138, 4),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 130 g", "height": 45},
                {"text": "M.R.P. (incl. of all taxes): Rs. 10.00  |  USP: 0.08 / g", "height": 45},
                {"text": "Mfg: 01/08/2026   |   Best Before: 6 Months from Packaging", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured by: Parle Products Pvt. Ltd.",
                    "detail": "North Level Crossing, Vile Parle East, Mumbai, Maharashtra - 400057",
                    "height": 55
                },
                {
                    "title": "Toll Free Helpline: 1800-22-7799",
                    "detail": "Consumer care executive email: cs@parle.biz | PO Box 1888",
                    "height": 55
                },
                {
                    "title": "fssai Lic. No. 10013022002253",
                    "detail": "National Food License Registrar",
                    "height": 50
                }
            ]
        },
        {
            "id": "britannia_bourbon_pass",
            "filename": "britannia_bourbon_chocolate_pass.png",
            "brand": "Britannia",
            "product_name": "Bourbon The Original Chocolate Cream Biscuits",
            "category": "Biscuits",
            "theme_color": (159, 18, 57),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 150 g", "height": 45},
                {"text": "MRP (incl of all taxes): < 35.00/- USP: 0.23/g", "height": 45}, # OCR glyph < for ₹
                {"text": "Mfg Date: 20/07/2026   |   Best Before 9 Months from Pkg", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Mfd by: Britannia Industries Limited",
                    "detail": "5/1A Hungerford Street, Kolkata, West Bengal - 700017",
                    "height": 55
                },
                {
                    "title": "Consumer Advisor Toll Free: 1800-425-4449",
                    "detail": "Email inquiries: feedback@britindia.com | Britannia Grievance Desk",
                    "height": 55
                },
                {
                    "title": "FSSAI License No. 10015043001129",
                    "detail": "Food Safety Authority Standards Registration",
                    "height": 50
                }
            ]
        },
        {
            "id": "sunfeast_dark_fantasy_violation_address",
            "filename": "sunfeast_dark_fantasy_violation_address.png",
            "brand": "ITC Sunfeast",
            "product_name": "Dark Fantasy Choco Fills Premium Cookies",
            "category": "Biscuits",
            "theme_color": (136, 19, 55),
            "expected_verdict": "REVIEW_REQUIRED",
            "sections": [
                {"text": "Net Quantity: 75 g", "height": 45},
                {"text": "Maximum Retail Price (inclusive of all taxes): Rs. 40.00", "height": 45},
                {"text": "Packed: 10/08/2026   |   Best Before 6 Months", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured by: ITC Limited",
                    "detail": "Factory Unit 4, Gate No. 2, Sector A", # Incomplete address: missing city, state, and PIN code
                    "height": 55
                },
                {
                    "title": "Customer Care Toll Free: 1800-345-8888",
                    "detail": "Consumer inquiries: itccares@itc.in",
                    "height": 55
                },
                {
                    "title": "FSSAI Lic. No. 10012031000312",
                    "detail": "Central Licensing FSSAI New Delhi",
                    "height": 50
                }
            ]
        },

        # --- 3. STAPLES & COOKING OILS ---
        {
            "id": "tata_salt_compliant",
            "filename": "tata_salt_vacuum_evaporated_compliant.png",
            "brand": "Tata Consumer",
            "product_name": "Tata Salt Desh Ka Namak (Vacuum Evaporated Iodized Salt)",
            "category": "Staples",
            "theme_color": (30, 58, 138),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 1 kg", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 28.00  |  USP: Rs. 28.00 / kg", "height": 45},
                {"text": "Mfg. Date: 05/2026   |   Best Before 24 Months from Packaging", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Packed by: Tata Consumer Products Limited",
                    "detail": "1, Bishop Lefroy Road, Kolkata, West Bengal - 700020",
                    "height": 55
                },
                {
                    "title": "Consumer Care Helpline: 1800-345-1720",
                    "detail": "Write to care@tataconsumer.com | PO Box 1100",
                    "height": 55
                },
                {
                    "title": "fssai Lic. No.: 10014031001025",
                    "detail": "Standards of Weights and Measures Rule 6 Compliance",
                    "height": 50
                }
            ]
        },
        {
            "id": "fortune_sunflower_oil_pass",
            "filename": "fortune_sunlite_oil_pass.png",
            "brand": "Fortune",
            "product_name": "Sunlite Refined Sunflower Cooking Oil",
            "category": "Staples",
            "theme_color": (234, 88, 12),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 1 L (910 g at 30°C)", "height": 45},
                {"text": "MRP (incl of all taxes): Rs. 145.00  |  USP: 145.00/L", "height": 45},
                {"text": "Packed On: 18/07/2026   |   Best Before: 9 Months from Packaging", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured & Marketed by: Adani Wilmar Limited",
                    "detail": "Fortune House, Near Navrangpura Railway Crossing, Ahmedabad, Gujarat - 380009",
                    "height": 55
                },
                {
                    "title": "Toll Free Helpline: 1800 233 9999",
                    "detail": "Customer Grievance Desk: consumercare@adaniwilmar.in",
                    "height": 55
                },
                {
                    "title": "FSSAI Central Lic. No. 10013021000853",
                    "detail": "FSS (Packaging and Labelling) Act Verified",
                    "height": 50
                }
            ]
        },
        {
            "id": "mdh_deggi_mirch_violation_care",
            "filename": "mdh_deggi_mirch_violation_care.png",
            "brand": "MDH Spices",
            "product_name": "Deggi Mirch Natural Red Pepper Powder",
            "category": "Spices",
            "theme_color": (185, 28, 28),
            "expected_verdict": "REVIEW_REQUIRED",
            "sections": [
                {"text": "Net Weight: 100 g", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 82.00", "height": 45},
                {"text": "Mfg Date: 06/2026   |   Best Before 12 Months", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Mfd & Packed by: Mahashian Di Hatti Pvt. Ltd.",
                    "detail": "9/44, Industrial Area, Kirti Nagar, New Delhi - 110015",
                    "height": 55
                },
                {
                    "title": "Consumer Care: Delhi Office", # Missing phone number and email
                    "detail": "Contact for complaints at head office (No phone or email provided)",
                    "height": 55
                },
                {
                    "title": "Lic. No. 10012011000140",
                    "detail": "FSSAI Spices Registration",
                    "height": 50
                }
            ]
        },

        # --- 4. BEVERAGES & DAIRY ---
        {
            "id": "amul_butter_compliant",
            "filename": "amul_pasteurized_butter_compliant.png",
            "brand": "Amul",
            "product_name": "Pasteurized Salted Butter (Utterly Butterly Delicious)",
            "category": "Dairy",
            "theme_color": (29, 78, 216),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 500 g", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 275.00  |  USP: 0.55 / g", "height": 45},
                {"text": "Pkg Date: 08/08/2026   |   Best Before 12 Months when stored below 4°C", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Marketed by: Gujarat Co-operative Milk Marketing Federation Ltd.",
                    "detail": "Amul Dairy Road, Anand, Gujarat - 388001, India",
                    "height": 55
                },
                {
                    "title": "Toll Free Helpline: 1800-258-3333",
                    "detail": "Customer feedback: customercare@amul.coop | PO Box 10",
                    "height": 55
                },
                {
                    "title": "fssai Lic. No.: 10012021000071",
                    "detail": "FSSAI Dairy Standardization Authority",
                    "height": 50
                }
            ]
        },
        {
            "id": "red_label_tea_pass",
            "filename": "brooke_bond_red_label_pass.png",
            "brand": "Brooke Bond",
            "product_name": "Red Label Swad Apnepanko Natural Care Tea",
            "category": "Beverages",
            "theme_color": (180, 83, 9),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Weight: 250 g", "height": 45},
                {"text": "M.R.P. (incl of all taxes): ₹ 140.00  |  USP: 0.56/g", "height": 45},
                {"text": "Packed: 04/08/2026   |   Best Before: 12 Months from Packing", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Packed & Marketed by: Hindustan Unilever Limited (HUL)",
                    "detail": "Unilever House, B. D. Sawant Marg, Chakala, Andheri East, Mumbai - 400099",
                    "height": 55
                },
                {
                    "title": "Consumer Care Manager Toll Free: 1800-10-22-221",
                    "detail": "Email grievances: lever.care@unilever.com | PO Box 14760",
                    "height": 55
                },
                {
                    "title": "FSSAI License No. 10013022001897",
                    "detail": "Tea Board of India TM Registration No. 2021",
                    "height": 50
                }
            ]
        },
        {
            "id": "nescafe_classic_pass",
            "filename": "nescafe_classic_coffee_pass.png",
            "brand": "Nescafe",
            "product_name": "Classic 100% Pure Instant Coffee",
            "category": "Beverages",
            "theme_color": (120, 53, 15),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 50 g", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 185.00  |  USP: 3.70 / g", "height": 45},
                {"text": "Mfg: 14/06/2026   |   Best Before 18 Months from Manufacture", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured by: Nestle India Limited",
                    "detail": "100/101, World Trade Centre, Barakhamba Lane, New Delhi - 110001",
                    "height": 55
                },
                {
                    "title": "Consumer Services Toll Free: 1800 103 1947",
                    "detail": "Email complaints: wecare@in.nestle.com | Nestle India Grievance Redressal",
                    "height": 55
                },
                {
                    "title": "fssai Lic. No.: 10012011000168",
                    "detail": "Central Licensing Authority FSSAI India",
                    "height": 50
                }
            ]
        },

        # --- 5. PERSONAL CARE & COSMETICS ---
        {
            "id": "dabur_red_paste_compliant",
            "filename": "dabur_red_ayurvedic_paste_compliant.png",
            "brand": "Dabur",
            "product_name": "Dabur Red Ayurvedic Toothpaste (Dant Suraksha)",
            "category": "Personal Care",
            "theme_color": (153, 27, 27),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Wt.: 150 g + 50 g Extra (200 g Total)", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 110.00  |  USP: Rs. 0.55 / g", "height": 45},
                {"text": "Mfg. Date: 03/2026   |   Expiry Date: 24 Months from Mfd.", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured by: Dabur India Limited",
                    "detail": "8/3, Asaf Ali Road, New Delhi - 110002, India",
                    "height": 55
                },
                {
                    "title": "Customer Helpline: 1800-103-1644 (Toll-free)",
                    "detail": "For customer feedback write to: daburcares@dabur.com",
                    "height": 55
                },
                {
                    "title": "Ayush Ayurvedic License No. HP-234-AY",
                    "detail": "Cosmetics and Ayurvedic Drug Formulation Standard",
                    "height": 50
                }
            ]
        },
        {
            "id": "dettol_soap_pass",
            "filename": "dettol_antiseptic_soap_pass.png",
            "brand": "Dettol",
            "product_name": "Original Germ Protection Bathing Soap Bar",
            "category": "Personal Care",
            "theme_color": (21, 128, 61),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 125 g (when packed)", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 55.00  |  USP: 0.44 / g", "height": 45},
                {"text": "Mfg: 05/2026   |   Use Before: 36 Months from Date of Mfg", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Marketed by: Reckitt Benckiser (India) Pvt. Ltd.",
                    "detail": "DLF Cyber Park, 6th Floor, Tower C, 405 B, Udyog Vihar Phase III, Gurugram, Haryana - 122016",
                    "height": 55
                },
                {
                    "title": "Consumer Contact: 1800 102 2730 (Toll Free)",
                    "detail": "Consumer Relations Officer: consumercare_india@reckitt.com",
                    "height": 55
                },
                {
                    "title": "Drug & Cosmetic Lic. No. M-GC/1029",
                    "detail": "Standards of Weights and Measures Rule 6 Compliance Verified",
                    "height": 50
                }
            ]
        },
        {
            "id": "parachute_coconut_oil_pass",
            "filename": "parachute_pure_coconut_oil_pass.png",
            "brand": "Parachute",
            "product_name": "100% Pure Coconut Hair Oil",
            "category": "Personal Care",
            "theme_color": (3, 105, 161),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Volume: 200 ml (182 g)", "height": 45},
                {"text": "Maximum Retail Price (incl of all taxes): ₹ 90.00", "height": 45},
                {"text": "Packed On: 11/06/2026   |   Best Before: 18 Months from Packing", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured by: Marico Limited",
                    "detail": "7th Floor, Grande Palladium, 175 CST Road, Kalina, Santacruz East, Mumbai - 400098",
                    "height": 55
                },
                {
                    "title": "Customer Care Toll Free: 1800 222 248",
                    "detail": "For queries or grievances email: ccc@marico.com | PO Box 9411",
                    "height": 55
                },
                {
                    "title": "fssai Lic. No. 10012022000258  |  100% Edible Grade",
                    "detail": "Conforms to BIS Standards IS:542",
                    "height": 50
                }
            ]
        },
        {
            "id": "loreal_shampoo_undersized_font",
            "filename": "loreal_total_repair_undersized_font.png",
            "brand": "L'Oreal Paris",
            "product_name": "Total Repair 5 Restoring Shampoo",
            "category": "Personal Care",
            "theme_color": (202, 138, 4),
            "body_font_size": 11, # Deliberately tiny font (0.8mm physical equivalent) to trigger font height rule
            "label_font_size": 12,
            "expected_verdict": "REVIEW_REQUIRED",
            "sections": [
                {"text": "Net Content: 180 ml", "height": 35},
                {"text": "MRP (incl. of all taxes): Rs. 165.00 (Undersized typography < 1.0mm)", "height": 35},
                {"text": "Mfg: 02/2026   |   Exp: 36 Months", "height": 35},
            ],
            "footer_sections": [
                {
                    "title": "Mfd by: L'Oreal India Pvt. Ltd.",
                    "detail": "A-Wing, 8th Floor, Marathon Futurex, N.M. Joshi Marg, Lower Parel, Mumbai - 400013",
                    "height": 45
                },
                {
                    "title": "Consumer Care Helpline: 1800-22-3000",
                    "detail": "Contact advisor email: advisor@loreal.com",
                    "height": 45
                },
                {
                    "title": "Cosmetics Mfg. Lic. No. M-KD-C/313",
                    "detail": "Second Schedule Minimum Height Violation Check",
                    "height": 40
                }
            ]
        },

        # --- 6. HOUSEHOLD & CLEANING ---
        {
            "id": "surf_excel_detergent_pass",
            "filename": "surf_excel_easy_wash_pass.png",
            "brand": "Surf Excel",
            "product_name": "Easy Wash Super Detergent Powder",
            "category": "Household",
            "theme_color": (30, 64, 175),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Weight: 1 kg", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 140.00  |  USP: Rs. 140.00 / kg", "height": 45},
                {"text": "Mfg Date: 16/07/2026   |   Best Before 24 Months from Mfd", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured & Marketed by: Hindustan Unilever Limited",
                    "detail": "B.D. Sawant Marg, Chakala, Andheri East, Mumbai, Maharashtra - 400099",
                    "height": 55
                },
                {
                    "title": "Consumer Engagement Cell: 1800-10-22-221 (Toll Free)",
                    "detail": "Write to lever.care@unilever.com | PO Box 14760, Mumbai",
                    "height": 55
                },
                {
                    "title": "Country of Origin: India  |  Rule 6(1)(n) Compliant",
                    "detail": "Non-food household packaged commodity declaration",
                    "height": 50
                }
            ]
        },
        {
            "id": "vim_dishwash_bar_violation_mrp",
            "filename": "vim_dishwash_bar_violation_mrp.png",
            "brand": "Vim",
            "product_name": "Dishwash Bar with Real Lemon Juice",
            "category": "Household",
            "theme_color": (161, 98, 7),
            "expected_verdict": "POTENTIAL_VIOLATION",
            "sections": [
                {"text": "Net Wt.: 300 g", "height": 45},
                {"text": "Rs. 20 (Explicit MRP prefix and taxes omitted)", "height": 45}, # Violation of Rule 6(1)(f)
                {"text": "Mfg: 04/2026   |   Best Before 2 Years", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Mfd by: Hindustan Unilever Ltd.",
                    "detail": "Plot No. 1, Industrial Area, Haridwar, Uttarakhand - 249403",
                    "height": 55
                },
                {
                    "title": "Toll Free Help Line: 1800 10 22221",
                    "detail": "Feedback email: lever.care@unilever.com",
                    "height": 55
                },
                {
                    "title": "Consumer Product Standard Reg: 2026",
                    "detail": "Weights and Measures Legal Metrology Audit Test",
                    "height": 50
                }
            ]
        },
        # --- 6. INSTANT NOODLES & BREAKFAST CEREALS ---
        {
            "id": "maggi_noodles_compliant",
            "filename": "maggi_2_minute_noodles_compliant.png",
            "brand": "Maggi",
            "product_name": "2-Minute Instant Noodles Masala (Taste Bhi Health Bhi)",
            "category": "Snacks",
            "theme_color": (202, 138, 4),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 70 g", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 14.00  |  USP: Rs. 0.20 / g", "height": 45},
                {"text": "Mfg Date: 18/06/2026   |   Best Before 9 Months from Mfd", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured by: Nestlé India Limited",
                    "detail": "100/101, World Trade Centre, Barakhamba Lane, New Delhi - 110001",
                    "height": 55
                },
                {
                    "title": "Consumer Services Cell: 1800-103-1947",
                    "detail": "Email: wecare@in.nestle.com | Reach out for nutritional queries",
                    "height": 55
                },
                {
                    "title": "FSSAI Lic. No.: 10012011000168  |  Green Dot 100% Veg",
                    "detail": "Proprietary Food - Instant Noodles with Seasoning Mix",
                    "height": 50
                }
            ]
        },
        {
            "id": "kelloggs_corn_flakes_pass",
            "filename": "kelloggs_corn_flakes_pass.png",
            "brand": "Kellogg's",
            "product_name": "Real Almond and Honey Corn Flakes (High in Iron & B-Group Vitamins)",
            "category": "Breakfast",
            "theme_color": (185, 28, 28),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Weight: 300 g", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 195.00  |  USP: Rs. 0.65 / g", "height": 45},
                {"text": "Mfg: 05/08/2026   |   Best Before 12 Months from Packaging", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured by: Kellogg India Private Limited",
                    "detail": "Plot No. L2 & L3, Taloja MIDC, District Raigad, Maharashtra - 410208",
                    "height": 55
                },
                {
                    "title": "Consumer Complaints Officer: 1800-223-500",
                    "detail": "Email: consumerfeedback@kellogg.com | Write for feedback",
                    "height": 55
                },
                {
                    "title": "FSSAI Lic. No.: 10013022002031  |  100% Vegetarian",
                    "detail": "Food Safety Standards (Packaging & Labelling) Regulations 2011",
                    "height": 50
                }
            ]
        },
        # --- 7. BEVERAGES & JUICE ---
        {
            "id": "frooti_mango_drink_pass",
            "filename": "frooti_mango_drink_pass.png",
            "brand": "Frooti",
            "product_name": "Fresh 'N' Juicy Real Mango Drink (Ready to Serve Beverage)",
            "category": "Beverages",
            "theme_color": (234, 88, 12),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 160 ml", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 10.00  |  USP: Rs. 0.06 / ml", "height": 45},
                {"text": "Mfg Date: 22/07/2026   |   Best Before 6 Months from Mfg", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured by: Parle Agro Pvt. Ltd.",
                    "detail": "Western Express Highway, Sahar, Andheri East, Mumbai, Maharashtra - 400099",
                    "height": 55
                },
                {
                    "title": "Consumer Relations Desk: 1800-22-7965 (Toll Free)",
                    "detail": "Email: consumercare@parleagro.com | Customer Support Office",
                    "height": 55
                },
                {
                    "title": "FSSAI Lic. No.: 10012022000226  |  Contains Fruit Juice",
                    "detail": "Legal Metrology Packaged Commodities Rule 6 Compliant",
                    "height": 50
                }
            ]
        },
        # --- 8. OTC HEALTHCARE & WELLNESS ---
        {
            "id": "vicks_vaporub_pass",
            "filename": "vicks_vaporub_pass.png",
            "brand": "Vicks",
            "product_name": "VapoRub Ayurvedic Pain Relief and Cold Balm",
            "category": "Healthcare",
            "theme_color": (13, 148, 136),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Content: 50 ml", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 165.00  |  USP: Rs. 3.30 / ml", "height": 45},
                {"text": "Mfg: 10/2026   |   Exp: 09/2029", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Mfd by: Procter & Gamble Hygiene and Health Care Limited",
                    "detail": "P&G Plaza, Cardinal Gracias Road, Chakala, Andheri East, Mumbai - 400099",
                    "height": 55
                },
                {
                    "title": "Consumer Relations Toll-Free: 1800-202-1364",
                    "detail": "Email: inntouch@in.pg.com | For adverse event or product quality report",
                    "height": 55
                },
                {
                    "title": "Ayurvedic Proprietary Medicine  |  Mfg Lic No: HP-AYU-128",
                    "detail": "Packaged under Drugs & Cosmetics and Legal Metrology Act",
                    "height": 50
                }
            ]
        },
        # --- 9. ELECTRICAL & HARDWARE (NON-FOOD COMMODITIES) ---
        {
            "id": "syska_led_bulb_compliant",
            "filename": "syska_led_bulb_compliant.png",
            "brand": "Syska",
            "product_name": "SSK-SRL-9W B22 LED Cool Day Light Bulb (850 Lumens)",
            "category": "Electronics",
            "theme_color": (3, 105, 161),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Quantity: 1 Unit (9W LED Lamp)", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 120.00", "height": 45},
                {"text": "Month & Year of Import/Mfg: 06/2026   |   Rated Voltage: 220-240V AC", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured & Marketed by: Syska LED Lights Private Limited",
                    "detail": "Syska House, Office No. 6, Sakore Nagar, Viman Nagar, Pune, Maharashtra - 411014",
                    "height": 55
                },
                {
                    "title": "Customer Care Officer: 1800-102-8787",
                    "detail": "Email: support@syska.co.in | Service center helpline available 9AM-6PM",
                    "height": 55
                },
                {
                    "title": "Country of Origin: India  |  IS 16102 (Part 1) : 2012 / R-83000845",
                    "detail": "Non-food Packaged Commodity under Rule 6(1)(n) of Legal Metrology",
                    "height": 50
                }
            ]
        },
        {
            "id": "havells_extension_cord_violation_mrp",
            "filename": "havells_extension_cord_violation_mrp.png",
            "brand": "Havells",
            "product_name": "4-Way Surge & Spike Guard Extension Strip with 2m Heavy Duty Cord",
            "category": "Electronics",
            "theme_color": (120, 53, 15),
            "expected_verdict": "POTENTIAL_VIOLATION",
            "sections": [
                {"text": "Net Quantity: 1 Piece", "height": 45},
                {"text": "Maximum Price: Rs. 540.00 (Omitted mandatory '(incl. of all taxes)' format)", "height": 45},
                {"text": "Year of Manufacture: 2026   |   Warranty: 1 Year", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Marketed by: Havells India Ltd.",
                    "detail": "QRG Towers, 2D, Expressway, Sector 126, Noida, Uttar Pradesh - 201304",
                    "height": 55
                },
                {
                    "title": "Toll Free Helpline: 1800 103 1313",
                    "detail": "Email: customercare@havells.com | Grievance cell registered",
                    "height": 55
                },
                {
                    "title": "BIS Standard: IS 1293:2005  |  Legal Metrology Audit Specimen",
                    "detail": "Potential Violation: Rule 6(1)(e) - Price format not compliant",
                    "height": 50
                }
            ]
        },
        # --- 10. HOUSEHOLD CLEANING ---
        {
            "id": "lizol_disinfectant_compliant",
            "filename": "lizol_disinfectant_citrus_compliant.png",
            "brand": "Lizol",
            "product_name": "Disinfectant Surface Cleaner Citrus (Kills 99.9% Germs)",
            "category": "Household",
            "theme_color": (21, 128, 61),
            "expected_verdict": "COMPLIANT",
            "sections": [
                {"text": "Net Volume: 500 ml", "height": 45},
                {"text": "MRP (incl. of all taxes): Rs. 109.00  |  USP: Rs. 0.22 / ml", "height": 45},
                {"text": "Mfg Date: 14/05/2026   |   Best Before 24 Months from Mfd", "height": 45},
            ],
            "footer_sections": [
                {
                    "title": "Manufactured by: Reckitt Benckiser (India) Pvt. Ltd.",
                    "detail": "DLF Cyber Park, 6th Floor, Tower C, 405 B, Udyog Vihar Phase 3, Gurugram, Haryana - 122016",
                    "height": 55
                },
                {
                    "title": "Consumer Care Helpline: 1800-102-2732 (Toll Free)",
                    "detail": "Email: consumer.care@reckitt.com | Product enquiry & safety guidelines",
                    "height": 55
                },
                {
                    "title": "Country of Origin: India  |  Legal Metrology Rule 6 Compliant",
                    "detail": "Safe Disinfectant Formulation for Household Surfaces",
                    "height": 50
                }
            ]
        }
    ]
    return packages


def generate_all_packages():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    manifest_path = os.path.join(OUTPUT_DIR, "mass_test_manifest.json")
    
    packages = build_mass_test_suite()
    print(f"Generating {len(packages)} realistic Indian packaging labels in {OUTPUT_DIR}...")

    manifest = []
    for pkg in packages:
        out_file = os.path.join(OUTPUT_DIR, pkg["filename"])
        render_label(pkg, out_file)
        print(f"  Generated: {pkg['brand']} - {pkg['product_name']} -> {pkg['filename']}")
        
        manifest.append({
            "id": pkg["id"],
            "filename": pkg["filename"],
            "filepath": out_file,
            "brand": pkg["brand"],
            "product_name": pkg["product_name"],
            "category": pkg["category"],
            "expected_verdict": pkg["expected_verdict"],
            "has_unprinted_box": pkg.get("has_unprinted_box", False),
            "is_stamped": pkg.get("is_stamped", True),
        })

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"All {len(packages)} labels generated and registered in {manifest_path}!")
    return manifest


if __name__ == "__main__":
    generate_all_packages()
