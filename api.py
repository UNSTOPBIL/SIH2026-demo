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
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

import database
import report_generator
from ocr import extract_ocr_data
from remediation_engine import generate_remediated_artwork
from rule_engine import (
    evaluate_compliance,
    evaluate_font_compliance,
    evaluate_placement_compliance,
    evaluate_text_contrast,
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
MASS_TEST_DIR = os.path.join(BASE_DIR, "assets", "mass_test_labels")
MASS_MANIFEST_PATH = os.path.join(MASS_TEST_DIR, "mass_test_manifest.json")
MASS_RESULTS_PATH = os.path.join(BASE_DIR, "tests", "mass_test_results.json")


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


@app.on_event("startup")
def on_startup():
    try:
        database.init_db()
        seeded = database.seed_existing_gallery_scans(MASS_MANIFEST_PATH, MASS_RESULTS_PATH)
        if seeded > 0:
            logger.info("Seeded %d existing scans into Legal Metrology SQLite repository", seeded)
    except Exception as e:
        logger.error("Error initializing SQLite repository: %s", e)


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
        "is_compliant": eval_result.get("is_compliant", False),
        "score_percentage": eval_result.get("score_percentage", 0.0),
        "summary": eval_result.get("summary", {}),
        "cards": eval_result.get("cards", []),
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


@app.get("/api/test-gallery")
def get_test_gallery():
    """
    Returns the catalog of diverse unseen test packages across FMCG categories
    for instant browser testing in the gallery drawer.
    """
    if not os.path.exists(MASS_MANIFEST_PATH):
        return {"packages": [], "count": 0}
    try:
        with open(MASS_MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        for item in manifest:
            item["image_url"] = f"/api/test-gallery/image/{item['filename']}"
        return {"packages": manifest, "count": len(manifest)}
    except Exception as e:
        logger.error("Error reading test gallery manifest: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/test-gallery/image/{filename}")
def get_test_gallery_image(filename: str):
    """
    Serves a test specimen image directly from assets/mass_test_labels/.
    """
    safe_name = os.path.basename(filename)
    img_path = os.path.join(MASS_TEST_DIR, safe_name)
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail=f"Image {filename} not found.")
    return FileResponse(img_path, media_type="image/png")


@app.post("/api/test-gallery/audit/{package_id}")
def audit_gallery_package(package_id: str, package_width_mm: float = 100.0):
    """
    Instant statutory audit for any test gallery specimen package.
    Executes OCR, Rule 6 validation, font sizing, evidence vault, and remediation.
    """
    if not os.path.exists(MASS_MANIFEST_PATH):
        raise HTTPException(status_code=404, detail="Test gallery manifest not found.")
    
    with open(MASS_MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    
    pkg = next((p for p in manifest if p["id"] == package_id), None)
    if not pkg:
        raise HTTPException(status_code=404, detail=f"Package ID '{package_id}' not found in test gallery.")
    
    target_path = os.path.join(MASS_TEST_DIR, pkg["filename"])
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"Target specimen file {pkg['filename']} not found.")

    start_time = time.time()
    try:
        pil_img, processed_path = preprocess_image(target_path, enhance_quality=True)
        width, height = pil_img.size
        ocr_lines, ocr_details = extract_ocr_data(processed_path, confidence_threshold=0.50)
        eval_result = evaluate_compliance(ocr_lines, context={"product_category": pkg.get("category", "Food / Beverage")})

        font_compliance = evaluate_font_compliance(
            ocr_details=ocr_details,
            cards=eval_result["cards"],
            image_width_px=width,
            image_height_px=height,
            package_width_mm=package_width_mm,
        )

        placement_compliance = evaluate_placement_compliance(
            ocr_details=ocr_details,
            cards=eval_result["cards"],
            image_width_px=width,
            image_height_px=height
        )

        contrast_compliance = evaluate_text_contrast(
            ocr_details=ocr_details,
            cards=eval_result["cards"]
        )

        with open(processed_path, "rb") as f_proc:
            raw_proc = f_proc.read()
            proc_b64 = base64.b64encode(raw_proc).decode("utf-8")
        image_data_url = f"data:image/jpeg;base64,{proc_b64}"

        evidence_vault = generate_evidence_vault(raw_proc, eval_result)
        repeat_offender = evaluate_repeat_offender("\n".join(ocr_lines))
        remediation = generate_remediated_artwork(pil_img, eval_result["cards"], ocr_details)

        # Save inspection record to persistent SQLite database
        scan_record_id = f"SCAN-PKG-{pkg['id']}"
        database.save_scan({
            "id": scan_record_id,
            "brand": pkg.get("brand"),
            "product_name": pkg.get("product_name"),
            "category": pkg.get("category"),
            "verdict_state": eval_result.get("verdict_state"),
            "score_percentage": eval_result.get("score_percentage", 0.0),
            "is_compliant": eval_result.get("is_compliant", False),
            "cards": eval_result.get("cards", []),
            "ocr_lines": ocr_lines,
            "summary": eval_result.get("summary", {}),
            "evidence_vault": evidence_vault,
            "font_compliance": font_compliance,
            "placement_compliance": placement_compliance,
            "remediation": remediation,
            "repeat_offender": repeat_offender,
            "image_filename": pkg.get("filename")
        })

        latency = round(time.time() - start_time, 3)

        return JSONResponse(content=sanitize_json({
            "id": scan_record_id,
            "source": "test_gallery",
            "package_id": package_id,
            "brand": pkg.get("brand"),
            "category": pkg.get("category"),
            "expected_verdict": pkg.get("expected_verdict"),
            "label_name": f"{pkg.get('brand')} - {pkg.get('product_name')}",
            "filename": pkg.get("filename"),
            "latency_seconds": latency,
            "image_data_url": image_data_url,
            "dimensions": {"width": width, "height": height},
            "ocr_line_count": len(ocr_lines),
            "ocr_lines": ocr_lines,
            "ocr_details": ocr_details,
            "is_compliant": eval_result.get("is_compliant", False),
            "score_percentage": eval_result.get("score_percentage", 0.0),
            "summary": eval_result.get("summary", {}),
            "cards": eval_result.get("cards", []),
            "font_compliance": font_compliance,
            "placement_compliance": placement_compliance,
            "contrast_compliance": contrast_compliance,
            "evidence_vault": evidence_vault,
            "repeat_offender": repeat_offender,
            "remediation": remediation,
        }))
    except Exception as e:
        logger.error("Error auditing test package %s: %s", package_id, e)
        raise HTTPException(status_code=500, detail=f"Audit error: {str(e)}")


@app.get("/api/batch-audit/results")
def get_batch_audit_results():
    """
    Returns aggregate mass testing benchmark metrics and package results.
    """
    if not os.path.exists(MASS_RESULTS_PATH):
        raise HTTPException(status_code=404, detail="Batch audit benchmark has not been executed yet. Run tests/mass_packet_test_runner.py.")
    try:
        with open(MASS_RESULTS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JSONResponse(content=data)
    except Exception as e:
        logger.error("Error loading batch audit results: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================
# REPOSITORY, HISTORY & ENFORCEMENT OFFICIAL DASHBOARD ENDPOINTS
# =====================================================================

@app.get("/api/scans")
def list_scans(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    verdict: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    """Returns paginated historical packaging inspections filtered by verdict, category, date, or keyword."""
    try:
        data = database.get_scan_history(
            page=page,
            limit=limit,
            verdict=verdict,
            category=category,
            search=search,
            from_date=from_date,
            to_date=to_date
        )
        return JSONResponse(content=sanitize_json(data))
    except Exception as e:
        logger.error("Error retrieving scan history: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scans/{scan_id}")
def get_scan_record(scan_id: str):
    """Returns full forensic audit details for a specific scan ID."""
    rec = database.get_scan_by_id(scan_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Scan ID '{scan_id}' not found in inspection repository.")
    return JSONResponse(content=sanitize_json(rec))


@app.get("/api/products")
def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Returns product compliance repository records showing historical pass/fail track records."""
    try:
        data = database.get_product_repository(
            search=search,
            category=category,
            page=page,
            limit=limit
        )
        return JSONResponse(content=sanitize_json(data))
    except Exception as e:
        logger.error("Error retrieving product repository: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/enforcement/analytics")
def get_enforcement_dashboard():
    """Returns comprehensive real-time KPIs and trends for Legal Metrology enforcement official dashboards."""
    try:
        analytics = database.get_enforcement_analytics()
        return JSONResponse(content=sanitize_json(analytics))
    except Exception as e:
        logger.error("Error generating enforcement analytics: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/inspection/{scan_id}")
def download_inspection_memo(scan_id: str):
    """Generates and downloads a court-admissible Form I Inspection Memo (Panchnama) PDF under Section 15."""
    rec = database.get_scan_by_id(scan_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Inspection record '{scan_id}' not found.")
    try:
        pdf_bytes = report_generator.generate_inspection_pdf(rec)
        filename = f"legal_metrology_form_I_{scan_id}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error("Error generating PDF memo for %s: %s", scan_id, e)
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")


@app.get("/api/exports/scans.csv")
def export_scans_csv(
    verdict: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Exports historical inspections as a CSV spreadsheet for state regulatory records."""
    try:
        data = database.get_scan_history(page=1, limit=1000, verdict=verdict, category=category, search=search)
        csv_text = report_generator.generate_scans_csv(data.get("scans", []))
        filename = f"legal_metrology_inspections_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error("Error exporting CSV: %s", e)
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
            image_height_px=height,
            package_width_mm=package_width_mm,
        )

        placement_compliance = evaluate_placement_compliance(
            ocr_details=ocr_details,
            cards=eval_result["cards"],
            image_width_px=width,
            image_height_px=height
        )

        contrast_compliance = evaluate_text_contrast(
            ocr_details=ocr_details,
            cards=eval_result["cards"]
        )

        with open(processed_path, "rb") as f_proc:
            raw_proc = f_proc.read()
            proc_b64 = base64.b64encode(raw_proc).decode("utf-8")
        image_data_url = f"data:image/jpeg;base64,{proc_b64}"

        evidence_vault = generate_evidence_vault(raw_proc, eval_result)
        repeat_offender = evaluate_repeat_offender("\n".join(ocr_lines))
        remediation = generate_remediated_artwork(pil_img, eval_result["cards"], ocr_details)

        # Detect brand/product name for repository
        brand_guess = ocr_lines[0] if ocr_lines else "Retail Commodity"
        prod_guess = ocr_lines[1] if len(ocr_lines) > 1 else "Packaged Good"

        scan_id = database.save_scan({
            "brand": brand_guess,
            "product_name": prod_guess,
            "category": "Packaged Commodity",
            "verdict_state": eval_result.get("verdict_state"),
            "score_percentage": eval_result.get("score_percentage", 0.0),
            "is_compliant": eval_result.get("is_compliant", False),
            "cards": eval_result.get("cards", []),
            "ocr_lines": ocr_lines,
            "summary": eval_result.get("summary", {}),
            "evidence_vault": evidence_vault,
            "font_compliance": font_compliance,
            "placement_compliance": placement_compliance,
            "remediation": remediation,
            "repeat_offender": repeat_offender,
            "image_filename": file.filename
        })

        latency = round(time.time() - start_time, 3)

        return JSONResponse(content=sanitize_json({
            "id": scan_id,
            "filename": file.filename,
            "latency_seconds": latency,
            "image_data_url": image_data_url,
            "dimensions": {"width": width, "height": height},
            "ocr_line_count": len(ocr_lines),
            "ocr_lines": ocr_lines,
            "ocr_details": ocr_details,
            "is_compliant": eval_result.get("is_compliant", False),
            "score_percentage": eval_result.get("score_percentage", 0.0),
            "summary": eval_result.get("summary", {}),
            "cards": eval_result.get("cards", []),
            "font_compliance": font_compliance,
            "placement_compliance": placement_compliance,
            "contrast_compliance": contrast_compliance,
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
            image_height_px=height,
            package_width_mm=req.package_width_mm or 100.0,
        )

        placement_compliance = evaluate_placement_compliance(
            ocr_details=ocr_details,
            cards=eval_result["cards"],
            image_width_px=width,
            image_height_px=height
        )

        contrast_compliance = evaluate_text_contrast(
            ocr_details=ocr_details,
            cards=eval_result["cards"]
        )

        with open(processed_path, "rb") as f_proc:
            raw_proc = f_proc.read()
            proc_b64 = base64.b64encode(raw_proc).decode("utf-8")
        image_data_url = f"data:image/jpeg;base64,{proc_b64}"

        evidence_vault = generate_evidence_vault(raw_proc, eval_result)
        repeat_offender = evaluate_repeat_offender("\n".join(ocr_lines))
        remediation = generate_remediated_artwork(pil_img, eval_result["cards"], ocr_details)

        brand_guess = ocr_lines[0] if ocr_lines else "Webcam Captured Item"
        prod_guess = ocr_lines[1] if len(ocr_lines) > 1 else "Packaged Specimen"

        scan_id = database.save_scan({
            "brand": brand_guess,
            "product_name": prod_guess,
            "category": "Packaged Commodity",
            "verdict_state": eval_result.get("verdict_state"),
            "score_percentage": eval_result.get("score_percentage", 0.0),
            "is_compliant": eval_result.get("is_compliant", False),
            "cards": eval_result.get("cards", []),
            "ocr_lines": ocr_lines,
            "summary": eval_result.get("summary", {}),
            "evidence_vault": evidence_vault,
            "font_compliance": font_compliance,
            "placement_compliance": placement_compliance,
            "remediation": remediation,
            "repeat_offender": repeat_offender,
            "image_filename": "webcam_scan.jpg"
        })

        latency = round(time.time() - start_time, 3)

        return JSONResponse(content=sanitize_json({
            "id": scan_id,
            "source": "webcam",
            "latency_seconds": latency,
            "image_data_url": image_data_url,
            "dimensions": {"width": width, "height": height},
            "ocr_line_count": len(ocr_lines),
            "ocr_lines": ocr_lines,
            "ocr_details": ocr_details,
            "is_compliant": eval_result.get("is_compliant", False),
            "score_percentage": eval_result.get("score_percentage", 0.0),
            "summary": eval_result.get("summary", {}),
            "cards": eval_result.get("cards", []),
            "font_compliance": font_compliance,
            "placement_compliance": placement_compliance,
            "contrast_compliance": contrast_compliance,
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
            image_height_px=height,
            package_width_mm=req.package_width_mm or 100.0,
        )

        placement_compliance = evaluate_placement_compliance(
            ocr_details=ocr_details,
            cards=eval_result["cards"],
            image_width_px=width,
            image_height_px=height
        )

        contrast_compliance = evaluate_text_contrast(
            ocr_details=ocr_details,
            cards=eval_result["cards"]
        )

        with open(processed_path, "rb") as f_proc:
            raw_proc = f_proc.read()
            proc_b64 = base64.b64encode(raw_proc).decode("utf-8")
        image_data_url = f"data:image/jpeg;base64,{proc_b64}"

        evidence_vault = generate_evidence_vault(raw_proc, eval_result)
        repeat_offender = evaluate_repeat_offender("\n".join(ocr_lines))
        remediation = generate_remediated_artwork(pil_img, eval_result["cards"], ocr_details)

        brand_guess = ocr_lines[0] if ocr_lines else "Direct Camera Capture"
        prod_guess = ocr_lines[1] if len(ocr_lines) > 1 else f"Hardware Camera Item (Dev {device_idx})"

        scan_id = database.save_scan({
            "brand": brand_guess,
            "product_name": prod_guess,
            "category": "Packaged Commodity",
            "verdict_state": eval_result.get("verdict_state"),
            "score_percentage": eval_result.get("score_percentage", 0.0),
            "is_compliant": eval_result.get("is_compliant", False),
            "cards": eval_result.get("cards", []),
            "ocr_lines": ocr_lines,
            "summary": eval_result.get("summary", {}),
            "evidence_vault": evidence_vault,
            "font_compliance": font_compliance,
            "placement_compliance": placement_compliance,
            "remediation": remediation,
            "repeat_offender": repeat_offender,
            "image_filename": f"hardware_camera_dev_{device_idx}.jpg"
        })

        latency = round(time.time() - start_time, 3)

        return JSONResponse(content=sanitize_json({
            "id": scan_id,
            "source": "hardware_camera",
            "label_name": f"Live Hardware Camera (Device {device_idx})",
            "latency_seconds": latency,
            "image_data_url": image_data_url,
            "dimensions": {"width": width, "height": height},
            "ocr_line_count": len(ocr_lines),
            "ocr_lines": ocr_lines,
            "ocr_details": ocr_details,
            "is_compliant": eval_result.get("is_compliant", False),
            "score_percentage": eval_result.get("score_percentage", 0.0),
            "summary": eval_result.get("summary", {}),
            "cards": eval_result.get("cards", []),
            "font_compliance": font_compliance,
            "placement_compliance": placement_compliance,
            "contrast_compliance": contrast_compliance,
            "evidence_vault": evidence_vault,
            "repeat_offender": repeat_offender,
            "remediation": remediation,
        }))
    finally:
        cap.release()
