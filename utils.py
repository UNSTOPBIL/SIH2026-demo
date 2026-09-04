"""
utils.py — Image preprocessing and bounding box drawing for SIH Legal Metrology Scanner.
"""

from __future__ import annotations

import io
import os
import tempfile
from typing import Any, Dict, List, Tuple, Union
from PIL import Image, ImageDraw, ImageFont, ImageOps


def load_and_preprocess_image(
    image_source: Union[str, bytes, io.BytesIO, Image.Image],
    max_dimension: int = 1600,
) -> Tuple[Image.Image, str]:
    """
    Load an image from various sources, apply EXIF orientation correction,
    ensure RGB mode, downscale if excessively large (for fast CPU inference),
    and save to a temporary file path for PaddleOCR consumption.

    Returns:
        Tuple[Image.Image, str]: The processed PIL Image and the temporary file path.
    """
    # 1. Load into PIL
    if isinstance(image_source, Image.Image):
        img = image_source
    elif isinstance(image_source, (str, os.PathLike)):
        img = Image.open(str(image_source))
    elif isinstance(image_source, bytes):
        img = Image.open(io.BytesIO(image_source))
    elif isinstance(image_source, io.BytesIO):
        img = Image.open(image_source)
    else:
        raise ValueError(f"Unsupported image input type: {type(image_source)}")

    # 2. Fix EXIF orientation (crucial for mobile camera captures)
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    # 3. Ensure RGB
    if img.mode != "RGB":
        img = img.convert("RGB")

    # 4. Downscale if greater than max_dimension to preserve CPU speed
    width, height = img.size
    if max(width, height) > max_dimension:
        scale = max_dimension / max(width, height)
        new_width = int(width * scale)
        new_height = int(height * scale)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # 5. Save to a temporary file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    temp_dir = os.path.join(base_dir, ".temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"sih_scan_{os.getpid()}_{id(img)}.jpg")
    img.save(temp_path, format="JPEG", quality=95)

    return img, temp_path


def draw_ocr_bounding_boxes(
    pil_img: Image.Image,
    findings: List[Dict[str, Any]]
) -> Image.Image:
    """
    Draw real OCR bounding polygon highlights directly on the image copy
    using PaddleOCR bounding box coordinates.
    """
    annotated = pil_img.copy()
    draw = ImageDraw.Draw(annotated)

    color_map = {
        "PASS": (22, 163, 74),       # Emerald #16a34a
        "REVIEW_REQUIRED": (217, 119, 6),  # Amber #d97706
        "FAIL": (220, 38, 38),        # Rose #dc2626
        "NOT_APPLICABLE": (100, 116, 139) # Slate #64748b
    }

    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except Exception:
        font = ImageFont.load_default()

    for finding in findings:
        evidence = finding.get("evidence")
        if not evidence:
            continue
        
        box = evidence.get("bbox", [])
        status = finding.get("status", "PASS")
        outline_color = color_map.get(status, (217, 119, 6))

        if isinstance(box, (list, tuple)) and len(box) >= 4:
            try:
                # Convert 4 points [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] to polygon tuple
                points = [(float(pt[0]), float(pt[1])) for pt in box[:4]]
                
                # Draw thick bounding polygon
                draw.polygon(points, outline=outline_color, width=4)

                # Draw label text box
                x0, y0 = points[0]
                label_text = f"{finding.get('label', '')}"
                
                # Draw small background tag for text
                text_bbox = draw.textbbox((x0, max(0, y0 - 20)), label_text, font=font)
                draw.rectangle(text_bbox, fill=outline_color)
                draw.text((x0 + 2, max(0, y0 - 18)), label_text, fill=(255, 255, 255), font=font)
            except Exception:
                pass

    return annotated


def cleanup_temp_file(file_path: str) -> None:
    """Safely delete temporary files created during scan."""
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass
