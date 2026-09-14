"""
ocr.py — PaddleOCR wrapper with caching, angle classification, and confidence filtering.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Tuple

# Route all AI model weights, HuggingFace, and Paddle caches to D: drive
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, ".cache")
os.environ["PADDLE_PDX_CACHE_HOME"] = os.path.join(CACHE_DIR, "paddlex")
os.environ["PADDLE_HOME"] = os.path.join(CACHE_DIR, "paddle")
os.environ["HF_HOME"] = os.path.join(CACHE_DIR, "huggingface")
os.environ["MODELSCOPE_CACHE"] = os.path.join(CACHE_DIR, "modelscope")
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OCR_Engine")

_GLOBAL_OCR_INSTANCE = None


def _apply_windows_cpu_fix():
    """
    PaddlePaddle 3.3+ on Windows CPU has an unimplemented PIR DoubleAttribute
    conversion in onednn_instruction.cc:118. Disabling oneDNN on the inference
    config forces the robust, standard CPU instruction runner.
    """
    try:
        import paddle.inference as p_inf
        if not getattr(p_inf, "_sih_patched", False):
            _orig_create_predictor = p_inf.create_predictor

            def _safe_create_predictor(config):
                if hasattr(config, "disable_onednn"):
                    config.disable_onednn()
                if hasattr(config, "disable_mkldnn"):
                    config.disable_mkldnn()
                if hasattr(config, "set_cpu_math_library_num_threads"):
                    try:
                        num_threads = min(8, max(2, os.cpu_count() or 4))
                        config.set_cpu_math_library_num_threads(num_threads)
                    except Exception:
                        pass
                return _orig_create_predictor(config)

            p_inf.create_predictor = _safe_create_predictor
            p_inf._sih_patched = True
    except Exception as e:
        logger.debug("Failed to apply paddle inference patch: %s", e)


_apply_windows_cpu_fix()


def create_paddle_engine():
    """
    Instantiate PaddleOCR engine with PP-OCRv4 architecture.
    Explicitly disable document unwarping (UVDoc) and document orientation
    classification so that detected polygon coordinates remain in the exact
    coordinate space of the packaging specimen, preventing distorted or shifted bounding boxes.
    Enables batched recognition (text_recognition_batch_size=16) for accelerated multi-core throughput.
    """
    _apply_windows_cpu_fix()
    from paddleocr import PaddleOCR
    return PaddleOCR(
        ocr_version="PP-OCRv4",
        use_angle_cls=True,
        use_doc_unwarping=False,
        use_doc_orientation_classify=False,
        text_recognition_batch_size=16,
        lang="en",
    )


def get_ocr_engine():
    """
    Get or initialize the PaddleOCR instance with angle classification enabled.
    Uses Streamlit cache_resource if running under an active Streamlit session,
    otherwise uses a module-level singleton.
    """
    global _GLOBAL_OCR_INSTANCE

    try:
        import streamlit as st
        from streamlit.runtime.scriptrunner import get_script_run_ctx
        if get_script_run_ctx() is not None:
            @st.cache_resource(show_spinner="Initializing PaddleOCR Engine (PP-OCRv4, use_angle_cls=True)...")
            def _cached_loader():
                return create_paddle_engine()
            return _cached_loader()
    except Exception as e:
        logger.debug("Running outside Streamlit or context not present: %s", e)

    if _GLOBAL_OCR_INSTANCE is None:
        _GLOBAL_OCR_INSTANCE = create_paddle_engine()
    return _GLOBAL_OCR_INSTANCE


def extract_ocr_data(
    image_path: str,
    confidence_threshold: float = 0.55
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Execute text detection and recognition on the specified image file.

    Args:
        image_path: Absolute or relative file path to the processed packaging image.
        confidence_threshold: Minimum confidence score [0.0 - 1.0] to filter noisy text blocks.

    Returns:
        Tuple containing:
            - text_lines (List[str]): Extracted text lines.
            - detailed_results (List[Dict[str, Any]]): List of dicts with text, confidence, and bounding box.
    """
    text_lines: List[str] = []
    detailed_results: List[Dict[str, Any]] = []

    try:
        ocr_engine = get_ocr_engine()
        if hasattr(ocr_engine, "predict"):
            results = list(ocr_engine.predict(image_path))
        else:
            results = ocr_engine.ocr(image_path, cls=True)

        if not results:
            logger.warning("PaddleOCR returned no detections for image: %s", image_path)
            return text_lines, detailed_results

        # PaddleOCR 2.x & 3.x result parsing
        # results is typically a list of pages: [[[box, (text, score)], ...]]
        # or in some paddlex pipelines, a list of dicts or objects
        for page in results:
            if not page:
                continue

            # If page is list of line tuples [box, (text, score)]
            if isinstance(page, list):
                for item in page:
                    if not item:
                        continue
                    if isinstance(item, (list, tuple)) and len(item) >= 2:
                        raw_box = item[0]
                        box = raw_box.tolist() if hasattr(raw_box, "tolist") else list(raw_box)
                        text_info = item[1]
                        if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                            text, confidence = text_info[0], text_info[1]
                        elif isinstance(text_info, str):
                            text, confidence = text_info, 1.0
                        else:
                            continue

                        text = str(text).strip()
                        conf_val = float(confidence) if confidence is not None else 0.0

                        if conf_val >= confidence_threshold and len(text) > 0:
                            line_index = len(text_lines)
                            text_lines.append(text)
                            detailed_results.append({
                                "line_id": line_index,
                                "text": text,
                                "confidence": round(conf_val, 3),
                                "box": box
                            })
            elif isinstance(page, dict):
                # Paddlex dict output compatibility
                rec_texts = page.get("rec_texts", [])
                rec_scores = page.get("rec_scores", [])
                dt_boxes = page.get("dt_polys", page.get("dt_boxes", []))
                for idx, text in enumerate(rec_texts):
                    score = rec_scores[idx] if idx < len(rec_scores) else 1.0
                    raw_box = dt_boxes[idx] if idx < len(dt_boxes) else []
                    box = raw_box.tolist() if hasattr(raw_box, "tolist") else list(raw_box)
                    text = str(text).strip()
                    conf_val = float(score) if score is not None else 0.0
                    if conf_val >= confidence_threshold and len(text) > 0:
                        line_index = len(text_lines)
                        text_lines.append(text)
                        detailed_results.append({
                            "line_id": line_index,
                            "text": text,
                            "confidence": round(conf_val, 3),
                            "box": box
                        })

    except Exception as exc:
        logger.error("Error during OCR execution: %s", exc, exc_info=True)
        raise exc

    return text_lines, detailed_results
