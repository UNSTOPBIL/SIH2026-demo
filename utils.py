"""
utils.py — Image preprocessing and helper functions for SIH Legal Metrology Scanner.
"""

from __future__ import annotations

import io
import os
import tempfile
from typing import Tuple, Union
from PIL import Image, ImageOps


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

    # 5. Save to a temporary file on D: drive
    base_dir = os.path.dirname(os.path.abspath(__file__))
    temp_dir = os.path.join(base_dir, ".temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"sih_scan_{os.getpid()}_{id(img)}.jpg")
    img.save(temp_path, format="JPEG", quality=95)

    return img, temp_path


def cleanup_temp_file(file_path: str) -> None:
    """Safely delete temporary files created during scan."""
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass
