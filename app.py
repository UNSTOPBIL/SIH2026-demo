"""
app.py — LexMetric Legal Metrology Compliance Inspection Platform
SIH26034 — Packaged Commodities Compliance Scanner Frontend
"""

from __future__ import annotations

import base64
import datetime
import io
import json
import os
from typing import Any, Dict, List, Optional
from PIL import Image
import streamlit as st

from utils import load_and_preprocess_image, draw_ocr_bounding_boxes, cleanup_temp_file
from ocr import extract_ocr_data
from rule_engine import evaluate_compliance


# Page Configuration
st.set_page_config(
    page_title="LexMetric — Legal Metrology Compliance Intelligence",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Light B2B SaaS Styling Injection
st.markdown("""<script src="https://cdn.tailwindcss.com"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/><style>#MainMenu {visibility: hidden;} footer {visibility: hidden;} header[data-testid="stHeader"] {visibility: hidden; height: 0px;} .block-container {padding-top: 1rem !important; padding-bottom: 2rem !important; padding-left: 1.5rem !important; padding-right: 1.5rem !important; max-width: 100% !important;} body, .stApp {font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #0f172a;} .saas-card {background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);} .saas-badge-pass {background-color: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;} .saas-badge-review {background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a;} .saas-badge-fail {background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;} .saas-badge-na {background-color: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;} ::-webkit-scrollbar {width: 6px; height: 6px;} ::-webkit-scrollbar-track {background: #f8fafc;} ::-webkit-scrollbar-thumb {background: #cbd5e1; border-radius: 9999px;}</style>""", unsafe_allow_html=True)


def make_json_serializable(obj: Any) -> Any:
    """Helper to convert numpy arrays and non-serializable objects to native Python types."""
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_json_serializable(item) for item in obj]
    elif hasattr(obj, "tolist"):
        return obj.tolist()
    elif hasattr(obj, "item"):
        return obj.item()
    return obj


def main():
    # 1. Top Shell Header & Brand Navigation
    st.markdown("""<header class="bg-white border-b border-slate-200 px-6 py-3.5 rounded-xl mb-6 flex items-center justify-between shadow-xs"><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold"><i class="fa-solid fa-scale-balanced text-sm"></i></div><div><h1 class="font-bold text-slate-900 text-base leading-none tracking-tight">LexMetric</h1><p class="text-[11px] font-medium text-slate-500 mt-0.5">Legal Metrology Compliance Intelligence</p></div></div><div class="flex items-center gap-6 text-xs font-semibold text-slate-600"><span class="text-indigo-600 border-b-2 border-indigo-600 pb-1 cursor-pointer">Inspections</span><span class="hover:text-slate-900 cursor-pointer">Products</span><span class="hover:text-slate-900 cursor-pointer">Reports</span><span class="hover:text-slate-900 cursor-pointer">Rules</span><div class="h-4 w-px bg-slate-200"></div><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-[11px] text-slate-500 font-medium">Inspection system online</span></div></div></header>""", unsafe_allow_html=True)

    # 2. Sidebar Inputs & Context Controls
    with st.sidebar:
        st.markdown("### 📌 Inspection Setup")

        input_choice = st.radio(
            "Select Input Method / Preset:",
            [
                "🟢 100% Compliant Sample Label",
                "🔴 Non-Compliant Sample Label",
                "📁 Upload Custom Package Image",
                "📸 Live Camera Capture"
            ],
            index=0
        )

        st.markdown("---")
        st.markdown("### ⚙️ Product Context")
        
        category = st.selectbox(
            "Product Category",
            [
                "Food / Beverage",
                "Cosmetic / Personal Care",
                "Household / Consumer Goods",
                "Industrial Product",
                "Other"
            ],
            index=0
        )

        is_imported = st.checkbox("Imported Commodity (Rule 6(1)(c))", value=False)

        st.markdown("---")
        st.caption("Engine: PaddleOCR (PP-OCRv4, use_angle_cls=True)")

    # Resolve image source
    base_dir = os.path.dirname(os.path.abspath(__file__))
    preset_map = {
        "🟢 100% Compliant Sample Label": os.path.join(base_dir, "assets", "sample_labels", "compliant_sample.png"),
        "🔴 Non-Compliant Sample Label": os.path.join(base_dir, "assets", "sample_labels", "non_compliant_sample.png")
    }

    image_source = None
    source_filename = "sample_label.png"

    if input_choice in preset_map:
        target_path = preset_map[input_choice]
        if os.path.exists(target_path):
            image_source = target_path
            source_filename = os.path.basename(target_path)
    elif input_choice == "📁 Upload Custom Package Image":
        uploaded = st.file_uploader("Upload packaging artwork / photo", type=["jpg", "jpeg", "png", "webp"])
        if uploaded:
            image_source = uploaded
            source_filename = uploaded.name
    elif input_choice == "📸 Live Camera Capture":
        captured = st.camera_input("Capture packaging photo")
        if captured:
            image_source = captured
            source_filename = "webcam_capture.jpg"

    # Landing Page State if no image loaded
    if not image_source:
        st.markdown("""<div class="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-3xl mx-auto my-8 text-center"><div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 text-xl"><i class="fa-solid fa-cloud-arrow-up"></i></div><h2 class="text-xl font-bold text-slate-900">New Compliance Inspection</h2><p class="text-sm text-slate-500 mt-1 max-w-lg mx-auto leading-relaxed">Analyze packaged commodity artwork or product imagery against Legal Metrology Rule 6 requirements.</p><div class="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-2"><p class="font-semibold text-slate-800">📌 How to begin:</p><p>1. Choose a preset sample or upload a package photo in the sidebar menu.</p><p>2. Select the product category (Cosmetic, Food, Consumer Goods).</p><p>3. The automated scanner will extract declarations, verify statutory rules, and generate an evidence-backed report.</p></div></div>""", unsafe_allow_html=True)
        return

    # 3. Real OCR Pipeline Execution
    with st.spinner("Executing OCR & Statutory Guardrail Analysis..."):
        try:
            pil_img, temp_img_path = load_and_preprocess_image(image_source)
            ocr_lines, ocr_details = extract_ocr_data(temp_img_path, confidence_threshold=0.55)
            eval_context = {
                "product_category": category,
                "imported": is_imported
            }
            results = evaluate_compliance(ocr_details if ocr_details else ocr_lines, context=eval_context)
        except Exception as e:
            st.error(f"Error processing inspection: {e}")
            if 'temp_img_path' in locals() and temp_img_path:
                cleanup_temp_file(temp_img_path)
            return

    # 4. Inspection Results View Header
    verdict_state = results.get("verdict_state", "REVIEW_REQUIRED")
    summary = results.get("summary", {})
    findings = results.get("findings", [])

    if verdict_state == "COMPLIANT":
        banner_class = "bg-emerald-50 border-emerald-200 text-emerald-900"
        verdict_icon = "fa-circle-check text-emerald-600"
        verdict_title = "Package Appears Compliant"
        verdict_subtitle = "All evaluated applicable Legal Metrology requirements passed statutory validation."
        badge_pill = "bg-emerald-100 text-emerald-800"
        badge_text = "PASS"
    elif verdict_state == "POTENTIAL_VIOLATION":
        banner_class = "bg-rose-50 border-rose-200 text-rose-900"
        verdict_icon = "fa-circle-xmark text-rose-600"
        verdict_title = "Potential Non-Compliance Detected"
        verdict_subtitle = "One or more mandatory statutory requirements failed validation."
        badge_pill = "bg-rose-100 text-rose-800"
        badge_text = "NON-COMPLIANT"
    else:
        banner_class = "bg-amber-50 border-amber-200 text-amber-900"
        verdict_icon = "fa-triangle-exclamation text-amber-600"
        verdict_title = "Review Required"
        verdict_subtitle = "Some declarations require additional inspector verification due to OCR or semantic ambiguity."
        badge_pill = "bg-amber-100 text-amber-800"
        badge_text = "REVIEW REQUIRED"

    st.markdown(f"""<div class="rounded-xl border p-4 mb-5 flex items-center justify-between {banner_class}"><div class="flex items-center gap-3.5"><div class="text-2xl"><i class="fa-solid {verdict_icon}"></i></div><div><div class="flex items-center gap-2"><h2 class="text-base font-bold">{verdict_title}</h2><span class="text-[10px] font-bold px-2 py-0.5 rounded-full {badge_pill}">{badge_text}</span></div><p class="text-xs opacity-90 mt-0.5">{verdict_subtitle}</p></div></div><div class="text-right"><span class="text-xs font-mono font-semibold text-slate-700">INS-00241</span></div></div>""", unsafe_allow_html=True)

    # 5. Inspection Metadata Bar
    now_str = datetime.datetime.now().strftime("%d %b %Y · %H:%M")
    st.markdown(f"""<div class="bg-white border border-slate-200 rounded-lg px-4 py-2 mb-5 flex items-center justify-between text-xs text-slate-500 font-mono"><div><strong class="text-slate-800">Inspection ID:</strong> INS-00241 &nbsp;•&nbsp; <strong class="text-slate-800">Date:</strong> {now_str} &nbsp;•&nbsp; <strong class="text-slate-800">Category:</strong> {category}</div><div><strong class="text-slate-800">OCR Engine:</strong> PaddleOCR (PP-OCRv4) &nbsp;•&nbsp; <strong class="text-slate-800">Ruleset:</strong> Legal Metrology v0.1</div></div>""", unsafe_allow_html=True)

    # 6. Categorical Metrics Breakdown (No percentage score display)
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.markdown(f"""<div class="bg-white border border-slate-200 rounded-xl p-3 text-center"><p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Declarations Detected</p><p class="text-xl font-extrabold text-slate-800 mt-1">{summary.get('declarations_detected', 0)}</p></div>""", unsafe_allow_html=True)
    with m2:
        st.markdown(f"""<div class="bg-white border border-slate-200 rounded-xl p-3 text-center"><p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Passed Checks</p><p class="text-xl font-extrabold text-emerald-600 mt-1">{summary.get('passed_count', 0)}</p></div>""", unsafe_allow_html=True)
    with m3:
        st.markdown(f"""<div class="bg-white border border-slate-200 rounded-xl p-3 text-center"><p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Review Required</p><p class="text-xl font-extrabold text-amber-600 mt-1">{summary.get('review_count', 0)}</p></div>""", unsafe_allow_html=True)
    with m4:
        st.markdown(f"""<div class="bg-white border border-slate-200 rounded-xl p-3 text-center"><p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Potential Violations</p><p class="text-xl font-extrabold text-rose-600 mt-1">{summary.get('violation_count', 0)}</p></div>""", unsafe_allow_html=True)

    st.markdown("<div class='mb-5'></div>", unsafe_allow_html=True)

    # 7. Main Split View: Left Bounding Box Highlighted Image Canvas + Right Finding Cards
    col_img, col_findings = st.columns([1.1, 1.4], gap="large")

    with col_img:
        st.markdown("#### 📷 Package Artwork Under Inspection")
        
        # Draw actual bounding polygon highlights using PaddleOCR coordinates
        annotated_img = draw_ocr_bounding_boxes(pil_img, findings)
        st.image(annotated_img, use_container_width=True)

        st.caption("ℹ️ Visual outlines display actual OCR bounding box coordinates mapped to extracted declarations.")

    with col_findings:
        st.markdown("#### 📋 Statutory Compliance Findings")

        for finding in findings:
            status = finding.get("status", "NOT_DETECTED")
            
            if status == "PASS":
                status_badge = '<span class="px-2.5 py-1 rounded-md text-xs font-bold saas-badge-pass">✓ VERIFIED PASS</span>'
            elif status == "FAIL":
                status_badge = '<span class="px-2.5 py-1 rounded-md text-xs font-bold saas-badge-fail">✕ POTENTIAL VIOLATION</span>'
            elif status == "REVIEW_REQUIRED":
                status_badge = '<span class="px-2.5 py-1 rounded-md text-xs font-bold saas-badge-review">⚠ REVIEW REQUIRED</span>'
            elif status == "NOT_APPLICABLE":
                status_badge = '<span class="px-2.5 py-1 rounded-md text-xs font-bold saas-badge-na">NOT APPLICABLE</span>'
            else:
                status_badge = '<span class="px-2.5 py-1 rounded-md text-xs font-bold saas-badge-na">NOT DETECTED</span>'

            evidence_data = finding.get("evidence")
            evidence_snippet = evidence_data.get("snippet", "") if evidence_data else ""
            line_ids = evidence_data.get("line_ids", []) if evidence_data else []
            bbox = evidence_data.get("bbox", []) if evidence_data else []

            st.markdown(f"""<div class="saas-card p-4 mb-3"><div class="flex items-center justify-between mb-2"><div><h4 class="text-xs font-bold text-slate-900">{finding['label']}</h4><span class="text-[10px] text-slate-500 font-mono">{finding['rule_ref']}</span></div>{status_badge}</div><p class="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-100 font-mono mb-2">{finding['value']}</p><p class="text-[11px] text-slate-500 mb-2">{finding['description']}</p></div>""", unsafe_allow_html=True)

            # Per-finding expandable evidence viewer
            if evidence_data:
                with st.expander(f"🔍 View Evidence for {finding['label']}", expanded=False):
                    st.markdown(f"""<div class="text-xs font-mono bg-slate-900 text-slate-100 p-3 rounded-lg space-y-1"><p><strong class="text-emerald-400">Extracted Snippet:</strong> "{evidence_snippet}"</p><p><strong class="text-indigo-400">OCR Confidence:</strong> {int(finding.get('confidence', 1.0) * 100)}%</p><p><strong class="text-amber-400">Source Line Index:</strong> Line {line_ids[0] if line_ids else 'N/A'}</p><p><strong class="text-slate-400">Bounding Box Coordinates:</strong> {bbox}</p></div>""", unsafe_allow_html=True)

    # 8. Raw OCR Evidence Collapsible Section
    st.markdown("---")
    with st.expander(f"📄 Full Raw OCR Diagnostic Log ({len(ocr_lines)} Lines Detected)", expanded=False):
        st.caption("PaddleOCR raw line extractions with confidence scores:")
        for det in ocr_details:
            st.markdown(f"""<div class="flex items-center justify-between py-1 px-3 bg-white border-b border-slate-100 text-xs font-mono"><span class="text-slate-700">Line #{det.get('line_id', 0):02d}: <strong>{det.get('text', '')}</strong></span><span class="text-slate-400">conf: {det.get('confidence', 0.0):.2f}</span></div>""", unsafe_allow_html=True)

    # 9. Audit JSON Report Export Action
    st.markdown("---")
    audit_data = {
        "inspection_id": "INS-00241",
        "timestamp": datetime.datetime.now().isoformat(),
        "input_source": source_filename,
        "product_category": category,
        "is_imported": is_imported,
        "verdict_state": verdict_state,
        "summary": summary,
        "findings": findings,
        "ocr_line_count": len(ocr_lines)
    }

    report_json = json.dumps(make_json_serializable(audit_data), indent=2)

    st.download_button(
        label="📥 Export Compliance Audit Report (JSON)",
        data=report_json,
        file_name=f"lexmetric_audit_INS-00241_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
        mime="application/json"
    )

    # Cleanup temporary file
    if 'temp_img_path' in locals() and temp_img_path:
        cleanup_temp_file(temp_img_path)


if __name__ == "__main__":
    main()
