"""
api.py — FastAPI Backend Bridge for Legal Metrology Rule 6 Compliance Scanner.
Exposes REST endpoints for Next.js frontend to perform packaging OCR, statutory audits,
cryptographic evidence vault generation, font size verification, and AI guided remediation.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ocr import extract_ocr_data
from remediation_engine import generate_remediated_artwork
from rule_engine import (
    evaluate_compliance,
    evaluate_font_compliance,
    evaluate_repeat_offender,
    generate_evidence_vault,
    load_guardrails,
)
from utils import preprocess_image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MetrologyAPI")


def sanitize_json(obj: Any) -> Any:
    """Recursively convert NumPy scalars/arrays and custom types to native JSON serializable types."""
    if obj is None:
        return None
    if isinstance(obj, (np.integer, np.int16, np.int32, np.int64)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return [sanitize_json(item) for item in obj.tolist()]
    if isinstance(obj, (list, tuple, set)):
        return [sanitize_json(x) for x in obj]
    if isinstance(obj, dict):
        return {str(k): sanitize_json(v) for k, v in obj.items()}
    if hasattr(obj, "item") and callable(getattr(obj, "item")):
        try:
            return sanitize_json(obj.item())
        except Exception:
            pass
    return obj


app = FastAPI(
    title="Legal Metrology Compliance API",
    description="Automated Rule 6 statutory declaration inspection, cryptographic evidence vault, and AI remediation.",
    version="2.0.0",
)

# Enable CORS for Next.js frontend (localhost:3000 & all local origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets", "sample_labels")


class Base64ScanRequest(BaseModel):
    image_base64: str
    confidence_threshold: Optional[float] = 0.55
    enhance_quality: Optional[bool] = True
    package_width_mm: Optional[float] = 100.0


class HardwareCameraCaptureRequest(BaseModel):
    device_index: int = 0
    confidence_threshold: Optional[float] = 0.55
    enhance_quality: Optional[bool] = True
    package_width_mm: Optional[float] = 100.0


class RemediateRequest(BaseModel):
    image_base64: str
    cards: List[Dict[str, Any]]
    ocr_details: Optional[List[Dict[str, Any]]] = None


@app.get("/api/health")
def health_check():
    """Returns the operational status of the OCR and rule matching engines."""
    return {
        "status": "healthy",
        "engine": "PaddleOCR PP-OCRv4",
        "device": "CPU (Edge Optimized)",
        "domain": "Legal Metrology (Packaged Commodities) Rules, 2011",
        "version": "2.0.0",
        "features": [
            "Rule 6 Guardrails",
            "Cryptographic Evidence Vault (SHA-256 + GPS)",
            "Millimeter Font Height Sizing",
            "Guided Remediation (Fix It For Me)",
            "Repeat-Offender Entity Tracking"
        ]
    }


@app.get("/api/rules")
def get_statutory_rules():
    """Returns the list of statutory Rule 6 guardrails."""
    guardrails = load_guardrails()
    return guardrails


_preset_cache: Dict[str, dict] = {}


def compute_preset(preset_id: str, package_width_mm: float = 100.0) -> dict:
    """Computes and caches statutory scan for a demonstration preset."""
    if preset_id == "compliant":
        sample_path = os.path.join(ASSETS_DIR, "compliant_sample.png")
        label_name = "Herbal Essence Organic Tea (250 g)"
    elif preset_id == "violation":
        sample_path = os.path.join(ASSETS_DIR, "non_compliant_sample.png")
        label_name = "Crunchy Corn Puffs (100 g)"
    else:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found.")

    if not os.path.exists(sample_path):
        raise HTTPException(status_code=500, detail=f"Sample file not found on server: {sample_path}")

    start_time = time.time()
    pil_img, processed_path = preprocess_image(sample_path)
    width, height = pil_img.size
    ocr_lines, ocr_details = extract_ocr_data(processed_path, confidence_threshold=0.55)
    eval_result = evaluate_compliance(ocr_lines)

    # 1. Physical font compliance
    font_compliance = evaluate_font_compliance(
        ocr_details=ocr_details,
        cards=eval_result["cards"],
        image_width_px=width,
        package_width_mm=package_width_mm,
    )

    # 2. Cryptographic Evidence Vault
    with open(sample_path, "rb") as img_file:
        raw_bytes = img_file.read()
        img_b64 = base64.b64encode(raw_bytes).decode("utf-8")
        image_data_url = f"data:image/png;base64,{img_b64}"

    evidence_vault = generate_evidence_vault(raw_bytes, eval_result)

    # 3. Repeat-Offender Entity Check
    full_text = "\n".join(ocr_lines)
    repeat_offender = evaluate_repeat_offender(full_text)

    # 4. Guided Remediation ("Fix It For Me")
    remediation = generate_remediated_artwork(pil_img, eval_result["cards"], ocr_details)

    latency = round(time.time() - start_time, 3)

    result = sanitize_json({
        "preset_id": preset_id,
        "label_name": label_name,
        "latency_seconds": latency,
        "image_data_url": image_data_url,
        "dimensions": {"width": width, "height": height},
        "ocr_line_count": len(ocr_lines),
        "ocr_lines": ocr_lines,
        "ocr_details": ocr_details,
        "is_compliant": eval_result["is_compliant"],
        "score_percentage": eval_result["score_percentage"],
        "summary": eval_result["summary"],
        "cards": eval_result["cards"],
        "font_compliance": font_compliance,
        "evidence_vault": evidence_vault,
        "repeat_offender": repeat_offender,
        "remediation": remediation,
    })
    _preset_cache[preset_id] = result
    return result


@app.on_event("startup")
def prewarm_cache():
    """Prewarm preset cache on server startup in the background."""
    import threading
    def _worker():
        for pid in ("compliant", "violation"):
            try:
                logger.info("Pre-warming preset cache for '%s'...", pid)
                compute_preset(pid)
                logger.info("Preset '%s' cached successfully.", pid)
            except Exception as e:
                logger.warning("Could not pre-warm preset '%s': %s", pid, e)
    threading.Thread(target=_worker, daemon=True).start()


@app.get("/api/presets/{preset_id}")
def get_preset_scan(preset_id: str):
    """
    Executes or returns a verified compliance scan for preset demonstration specimens.
    """
    if preset_id not in ("compliant", "violation"):
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found. Choose 'compliant' or 'violation'.")

    if preset_id in _preset_cache:
        logger.info("Serving preset '%s' from server memory cache (0ms)", preset_id)
        return JSONResponse(content=_preset_cache[preset_id])

    try:
        result = compute_preset(preset_id)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error("Error processing preset %s: %s", preset_id, e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan")
async def scan_uploaded_file(
    file: Optional[UploadFile] = File(None),
    confidence_threshold: float = Form(0.55),
    package_width_mm: float = Form(100.0),
):
    """
    Processes an uploaded image file through PaddleOCR, Rule 6 Engine, Font Sizing, Evidence Vault, and Remediation.
    """
    if file is None:
        raise HTTPException(status_code=400, detail="No image file provided.")

    start_time = time.time()
    try:
        content = await file.read()
        pil_img, processed_path = preprocess_image(content)
        width, height = pil_img.size
        ocr_lines, ocr_details = extract_ocr_data(processed_path, confidence_threshold=confidence_threshold)
        eval_result = evaluate_compliance(ocr_lines)

        font_compliance = evaluate_font_compliance(
            ocr_details=ocr_details,
            cards=eval_result["cards"],
            image_width_px=width,
            package_width_mm=package_width_mm,
        )

        with open(processed_path, "rb") as f_proc:
            raw_proc = f_proc.read()
            proc_b64 = base64.b64encode(raw_proc).decode("utf-8")
        image_data_url = f"data:image/jpeg;base64,{proc_b64}"

        evidence_vault = generate_evidence_vault(raw_proc, eval_result)
        repeat_offender = evaluate_repeat_offender("\n".join(ocr_lines))
        remediation = generate_remediated_artwork(pil_img, eval_result["cards"], ocr_details)

        latency = round(time.time() - start_time, 3)

        return JSONResponse(content=sanitize_json({
            "filename": file.filename,
            "latency_seconds": latency,
            "image_data_url": image_data_url,
            "dimensions": {"width": width, "height": height},
            "ocr_line_count": len(ocr_lines),
            "ocr_lines": ocr_lines,
            "ocr_details": ocr_details,
            "is_compliant": eval_result["is_compliant"],
            "score_percentage": eval_result["score_percentage"],
            "summary": eval_result["summary"],
            "cards": eval_result["cards"],
            "font_compliance": font_compliance,
            "evidence_vault": evidence_vault,
            "repeat_offender": repeat_offender,
            "remediation": remediation,
        }))
    except Exception as e:
        logger.error("Error scanning uploaded image: %s", e)
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/api/scan-base64")
def scan_base64_image(req: Base64ScanRequest):
    """
    Processes a base64 encoded image (e.g. from webcam capture) with full statutory analysis and remediation.
    """
    start_time = time.time()
    try:
        raw_b64 = req.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        img_bytes = base64.b64decode(raw_b64)

        pil_img, processed_path = preprocess_image(img_bytes, enhance_quality=bool(req.enhance_quality))
        width, height = pil_img.size
        ocr_lines, ocr_details = extract_ocr_data(processed_path, confidence_threshold=req.confidence_threshold)
        eval_result = evaluate_compliance(ocr_lines)

        font_compliance = evaluate_font_compliance(
            ocr_details=ocr_details,
            cards=eval_result["cards"],
            image_width_px=width,
            package_width_mm=req.package_width_mm or 100.0,
        )

        with open(processed_path, "rb") as f_proc:
            raw_proc = f_proc.read()
            proc_b64 = base64.b64encode(raw_proc).decode("utf-8")
        image_data_url = f"data:image/jpeg;base64,{proc_b64}"

        evidence_vault = generate_evidence_vault(raw_proc, eval_result)
        repeat_offender = evaluate_repeat_offender("\n".join(ocr_lines))
        remediation = generate_remediated_artwork(pil_img, eval_result["cards"], ocr_details)

        latency = round(time.time() - start_time, 3)

        return JSONResponse(content=sanitize_json({
            "source": "webcam",
            "latency_seconds": latency,
            "image_data_url": image_data_url,
            "dimensions": {"width": width, "height": height},
            "ocr_line_count": len(ocr_lines),
            "ocr_lines": ocr_lines,
            "ocr_details": ocr_details,
            "is_compliant": eval_result["is_compliant"],
            "score_percentage": eval_result["score_percentage"],
            "summary": eval_result["summary"],
            "cards": eval_result["cards"],
            "font_compliance": font_compliance,
            "evidence_vault": evidence_vault,
            "repeat_offender": repeat_offender,
            "remediation": remediation,
        }))
    except Exception as e:
        logger.error("Error scanning base64 image: %s", e)
        raise HTTPException(status_code=500, detail=f"Webcam scan error: {str(e)}")


@app.post("/api/remediate")
def remediate_label(req: RemediateRequest):
    """
    Direct endpoint to generate an AI-remediated artwork for any given packaging image and cards.
    """
    try:
        raw_b64 = req.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        import io
        from PIL import Image
        img_bytes = base64.b64decode(raw_b64)
        pil_img = Image.open(io.BytesIO(img_bytes))

        remediation = generate_remediated_artwork(pil_img, req.cards, req.ocr_details)
        return JSONResponse(content=sanitize_json(remediation))
    except Exception as e:
        logger.error("Error generating remediation: %s", e)
        raise HTTPException(status_code=500, detail=f"Remediation error: {str(e)}")


@app.get("/api/camera/devices")
def get_camera_devices():
    """
    Probe and enumerate available hardware video devices on Windows DirectShow.
    """
    import cv2
    devices = []
    for idx in range(3):
        try:
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            if cap.isOpened():
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                cap.release()
                devices.append({
                    "id": idx,
                    "name": f"USB / External Camera (Device {idx})" if idx > 0 else "Default Hardware Camera (Device 0)",
                    "resolution": f"{w}x{h}",
                })
        except Exception:
            pass
    return {"devices": devices, "count": len(devices)}


@app.post("/api/camera/capture")
def capture_and_audit_hardware_camera(req: HardwareCameraCaptureRequest = HardwareCameraCaptureRequest()):
    """
    Direct hardware capture from physical USB or integrated laptop webcam using DirectShow.
    """
    import cv2
    from PIL import Image

    start_time = time.time()
    device_idx = req.device_index
    cap = cv2.VideoCapture(device_idx, cv2.CAP_DSHOW)
    if not cap.isOpened():
        found = False
        for alt_idx in [0, 1, 2]:
            if alt_idx == device_idx:
                continue
            alt_cap = cv2.VideoCapture(alt_idx, cv2.CAP_DSHOW)
            if alt_cap.isOpened():
                cap = alt_cap
                device_idx = alt_idx
                found = True
                break
        if not found:
            raise HTTPException(
                status_code=500,
                detail=f"Could not open hardware camera at device index {device_idx}. Ensure camera is plugged in."
            )

    try:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 960)

        frame = None
        for _ in range(6):
            ret, temp_frame = cap.read()
            if ret and temp_frame is not None and temp_frame.size > 0:
                frame = temp_frame
            time.sleep(0.03)

        if frame is None or frame.size == 0:
            raise HTTPException(status_code=500, detail="Failed to capture frame from hardware camera.")

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_raw = Image.fromarray(rgb_frame)

        pil_img, processed_path = preprocess_image(pil_raw, enhance_quality=bool(req.enhance_quality))
        width, height = pil_img.size
        ocr_lines, ocr_details = extract_ocr_data(processed_path, confidence_threshold=req.confidence_threshold)
        eval_result = evaluate_compliance(ocr_lines)

        font_compliance = evaluate_font_compliance(
            ocr_details=ocr_details,
            cards=eval_result["cards"],
            image_width_px=width,
            package_width_mm=req.package_width_mm or 100.0,
        )

        with open(processed_path, "rb") as f_proc:
            raw_proc = f_proc.read()
            proc_b64 = base64.b64encode(raw_proc).decode("utf-8")
        image_data_url = f"data:image/jpeg;base64,{proc_b64}"

        evidence_vault = generate_evidence_vault(raw_proc, eval_result)
        repeat_offender = evaluate_repeat_offender("\n".join(ocr_lines))
        remediation = generate_remediated_artwork(pil_img, eval_result["cards"], ocr_details)

        latency = round(time.time() - start_time, 3)

        return JSONResponse(content=sanitize_json({
            "source": "hardware_camera",
            "label_name": f"Live Hardware Camera (Device {device_idx})",
            "latency_seconds": latency,
            "image_data_url": image_data_url,
            "dimensions": {"width": width, "height": height},
            "ocr_line_count": len(ocr_lines),
            "ocr_lines": ocr_lines,
            "ocr_details": ocr_details,
            "is_compliant": eval_result["is_compliant"],
            "score_percentage": eval_result["score_percentage"],
            "summary": eval_result["summary"],
            "cards": eval_result["cards"],
            "font_compliance": font_compliance,
            "evidence_vault": evidence_vault,
            "repeat_offender": repeat_offender,
            "remediation": remediation,
        }))
    finally:
        cap.release()
