"""
utils.py — Image preprocessing and helper functions for SIH Legal Metrology Scanner.
"""

from __future__ import annotations

import io
import os
import tempfile
from typing import Tuple, Union
import cv2
import numpy as np
from PIL import Image, ImageOps


def enhance_webcam_image(
    image: Union[Image.Image, np.ndarray],
    upscale_if_small: bool = True,
    min_dimension: int = 1080,
) -> Image.Image:
    """
    Enhance low-quality webcam captures of packaging and text:
    1. Upscale low-resolution frames (e.g. 640x480) with Lanczos interpolation
       so fine print meets OCR text detection thresholds.
    2. Boost text contrast using CLAHE on the luminance channel in LAB color space.
    3. Sharpen soft character edges using unsharp masking.
    4. Smooth flat background noise with edge-preserving bilateral filtering.
    """
    if isinstance(image, Image.Image):
        # Convert PIL RGB to OpenCV BGR
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    elif isinstance(image, np.ndarray):
        cv_img = image.copy()
    else:
        raise ValueError(f"Unsupported image type for enhancement: {type(image)}")

    h, w = cv_img.shape[:2]

    # 1. Upscale if below min_dimension for better small-font OCR recall
    if upscale_if_small and max(h, w) < min_dimension:
        scale = min_dimension / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        cv_img = cv2.resize(cv_img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    # 2. CLAHE contrast enhancement on Luminance channel
    lab = cv2.cvtColor(cv_img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    enhanced_lab = cv2.merge((cl, a, b))
    enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

    # 3. Text edge unsharp masking
    gaussian_blur = cv2.GaussianBlur(enhanced_bgr, (0, 0), sigmaX=2.0)
    sharpened = cv2.addWeighted(enhanced_bgr, 1.4, gaussian_blur, -0.4, 0)

    # 4. Bilateral filtering for noise suppression on paper backgrounds
    filtered = cv2.bilateralFilter(sharpened, d=5, sigmaColor=35, sigmaSpace=35)

    # Convert back to PIL RGB
    rgb_result = cv2.cvtColor(filtered, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb_result)


def load_and_preprocess_image(
    image_source: Union[str, bytes, io.BytesIO, Image.Image],
    max_dimension: int = 1600,
    enhance_quality: bool = False,
):
    """
    Load an image from various sources, apply EXIF orientation correction,
    ensure RGB mode, optionally apply webcam quality enhancement (CLAHE + unsharp mask),
    downscale if excessively large (for fast CPU inference),
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

    # 4. Apply webcam enhancement if requested
    if enhance_quality:
        img = enhance_webcam_image(img)

    # 5. Downscale if greater than max_dimension to preserve CPU speed
    width, height = img.size
    if max(width, height) > max_dimension:
        scale = max_dimension / max(width, height)
        new_width = int(width * scale)
        new_height = int(height * scale)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # 6. Save to a temporary file on D: drive
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


# Alias for concise import
preprocess_image = load_and_preprocess_image
