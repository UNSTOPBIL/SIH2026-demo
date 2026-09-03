"""
app.py — Streamlit Frontend for SIH Legal Metrology Compliance Scanner MVP.
"""

from __future__ import annotations

import datetime
import json
import os
from PIL import Image
import streamlit as st

from utils import load_and_preprocess_image, cleanup_temp_file
from ocr import extract_ocr_data
from rule_engine import evaluate_compliance


# Page Configuration
st.set_page_config(
    page_title="Legal Metrology Compliance Scanner | SIH",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for high-contrast, polished judge-ready UI
st.markdown("""
<style>
    /* Metric Cards */
    .compliance-card {
        padding: 14px 18px;
        border-radius: 8px;
        margin-bottom: 12px;
        border-left: 6px solid;
        transition: transform 0.1s ease-in-out;
    }
    .card-pass {
        background-color: #f0fdf4;
        border-color: #16a34a;
        color: #14532d;
    }
    .card-fail {
        background-color: #fef2f2;
        border-color: #dc2626;
        color: #7f1d1d;
    }
    .card-warn {
        background-color: #fffbeb;
        border-color: #d97706;
        color: #78350f;
    }
    .card-title {
        font-size: 1.05rem;
        font-weight: 700;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
    }
    .card-ref {
        font-size: 0.8rem;
        font-weight: 600;
        background: rgba(0,0,0,0.06);
        padding: 2px 8px;
        border-radius: 4px;
    }
    .card-snippet {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.88rem;
        background: rgba(255,255,255,0.75);
        padding: 6px 10px;
        border-radius: 4px;
        margin-top: 6px;
        word-break: break-all;
    }
    .banner-pass {
        background: linear-gradient(135deg, #15803d, #16a34a);
        color: white;
        padding: 16px 20px;
        border-radius: 10px;
        text-align: center;
        margin-bottom: 16px;
    }
    .banner-fail {
        background: linear-gradient(135deg, #b91c1c, #dc2626);
        color: white;
        padding: 16px 20px;
        border-radius: 10px;
        text-align: center;
        margin-bottom: 16px;
    }
</style>
""", unsafe_allow_html=True)


def main():
    # Header Banner
    st.markdown("""
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 18px;">
        <div>
            <h1 style="margin: 0; font-size: 1.85rem; color: #1e293b;">⚖️ Legal Metrology Compliance Scanner</h1>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.95rem;">
                Automated Verification of <strong>Rule 6 Mandatory Packaging Declarations</strong> | <em>Packaged Commodities Rules, 2011</em>
            </p>
        </div>
        <div style="text-align: right;">
            <span style="background: #2563eb; color: white; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 0.82rem;">
                SIH MVP DEMO
            </span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Interactive System Architecture & Edge AI Pipeline
    with st.expander("🏗️ Interactive System Architecture & Edge AI Pipeline (Click to inspect)", expanded=False):
        s1, s2, s3, s4 = st.columns(4)
        with s1:
            st.markdown("""
            <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 12px; height: 100%;">
                <h5 style="color: #1d4ed8; margin: 0 0 6px 0;">1. Ingestion & Preprocessing</h5>
                <p style="font-size: 0.82rem; color: #1e3a8a; margin: 0;">
                    • Webcam & File Uploader<br>
                    • EXIF auto-orientation transpose<br>
                    • Lanczos rescaling (max 1600px)
                </p>
            </div>
            """, unsafe_allow_html=True)
        with s2:
            st.markdown("""
            <div style="background: #f5f3ff; border: 2px solid #8b5cf6; border-radius: 8px; padding: 12px; height: 100%;">
                <h5 style="color: #6d28d9; margin: 0 0 6px 0;">2. Vision AI (PP-OCRv4)</h5>
                <p style="font-size: 0.82rem; color: #4c1d95; margin: 0;">
                    • <strong>DBNet</strong>: Text polygon detection<br>
                    • <strong>LCNet</strong>: Angle classification (0-270°)<br>
                    • <strong>CRNN/SVTR</strong>: Text sequence recognition
                </p>
            </div>
            """, unsafe_allow_html=True)
        with s3:
            st.markdown("""
            <div style="background: #fefce8; border: 2px solid #eab308; border-radius: 8px; padding: 12px; height: 100%;">
                <h5 style="color: #a16207; margin: 0 0 6px 0;">3. Statutory Guardrails</h5>
                <p style="font-size: 0.82rem; color: #713f12; margin: 0;">
                    • Legal Metrology Rule 6 validation<br>
                    • SI metric units verification<br>
                    • Contextual evidence extraction
                </p>
            </div>
            """, unsafe_allow_html=True)
        with s4:
            st.markdown("""
            <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 12px; height: 100%;">
                <h5 style="color: #15803d; margin: 0 0 6px 0;">4. Audit & Decision</h5>
                <p style="font-size: 0.82rem; color: #14532d; margin: 0;">
                    • Color-coded PASS/FAIL cards<br>
                    • Real-time COMPLIANT verdict<br>
                    • Downloadable JSON Audit Report
                </p>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("<div style='margin-bottom: 14px;'></div>", unsafe_allow_html=True)

    # Sidebar: Instructions & Statutory Guidance
    with st.sidebar:
        st.header("📌 Rule 6 Statutory Checklist")
        st.markdown("""
        Every pre-packaged commodity in India must declare:
        - **Rule 6(1)(f)**: MRP inclusive of all taxes (`₹` / `Rs.`)
        - **Rule 6(1)(b)**: Net Quantity in standard units (`g`, `kg`, `ml`, `l`, `nos`)
        - **Rule 6(1)(c)**: Name & address of Manufacturer / Packer
        - **Rule 6(1)(e)**: Month & Year of Manufacture / Packing
        - **Rule 6(1)(e)**: Best Before / Expiry declaration
        - **Rule 6(1)(k)**: Consumer Grievance contact (Phone/Email)
        - **Sectoral**: FSSAI / BIS License (Food/Industrial)
        """)

        st.divider()
        st.subheader("⚙️ OCR Settings")
        conf_threshold = st.slider(
            "Confidence Filter",
            min_value=0.30,
            max_value=0.90,
            value=0.55,
            step=0.05,
            help="Filter noisy background text below this confidence threshold."
        )

        st.caption("Engine: PaddleOCR (use_angle_cls=True, lang='en')")

    # Main Split-View Layout
    left_col, right_col = st.columns([1, 1.15], gap="large")

    image_to_process = None
    source_name = ""

    with left_col:
        st.subheader("📷 Label Input")
        input_tab1, input_tab2, input_tab3 = st.tabs(["📁 Upload Image", "📸 Live Camera", "🧪 Demo Presets"])

        with input_tab1:
            uploaded_file = st.file_uploader(
                "Upload packaging label photo",
                type=["jpg", "jpeg", "png", "webp"],
                help="Accepts high-resolution images of pre-packaged goods."
            )
            if uploaded_file is not None:
                image_to_process = uploaded_file
                source_name = uploaded_file.name

        with input_tab2:
            camera_file = st.camera_input("Capture packaging label via webcam")
            if camera_file is not None:
                image_to_process = camera_file
                source_name = "webcam_capture.jpg"

        with input_tab3:
            st.info("Select a pre-configured sample to test the scanner instantly:")
            preset_choice = st.radio(
                "Select Test Preset:",
                ["None", "🟢 100% Compliant Sample", "🔴 Non-Compliant Sample (Fails MRP & Grievance)"],
                index=0
            )
            preset_paths = {
                "🟢 100% Compliant Sample": os.path.join("assets", "sample_labels", "compliant_sample.png"),
                "🔴 Non-Compliant Sample (Fails MRP & Grievance)": os.path.join("assets", "sample_labels", "non_compliant_sample.png")
            }

            if preset_choice != "None" and image_to_process is None:
                target_path = preset_paths[preset_choice]
                if os.path.exists(target_path):
                    image_to_process = target_path
                    source_name = os.path.basename(target_path)
                else:
                    st.warning(f"Preset file not found at `{target_path}`. Run `create_sample_assets.py` first.")

        # Preview Container
        if image_to_process:
            st.markdown("---")
            st.caption(f"**Loaded Source**: `{source_name}`")
            try:
                processed_pil, temp_img_path = load_and_preprocess_image(image_to_process)
                st.image(processed_pil, caption="Packaging Label under Inspection", use_container_width=True)
            except Exception as e:
                st.error(f"Error loading image: {e}")
                temp_img_path = None
        else:
            temp_img_path = None
            st.markdown("---")
            st.markdown("""
            <div style="text-align: center; padding: 40px 20px; border: 2px dashed #cbd5e1; border-radius: 8px; color: #94a3b8;">
                <p style="font-size: 2.2rem; margin-bottom: 8px;">📦</p>
                <p style="font-weight: 600;">No package image loaded</p>
                <p style="font-size: 0.85rem;">Upload a photo, take a picture, or pick a demo preset above to begin scanning.</p>
            </div>
            """, unsafe_allow_html=True)

    with right_col:
        st.subheader("📋 Compliance Evaluation")

        if temp_img_path:
            with st.status("Analyzing packaging declarations...", expanded=False) as status:
                st.write("🔍 Running PaddleOCR with orientation and angle classification...")
                try:
                    ocr_lines, ocr_details = extract_ocr_data(temp_img_path, confidence_threshold=conf_threshold)
                    st.write(f"✓ Detected {len(ocr_lines)} text lines with confidence ≥ {conf_threshold:.2f}")

                    st.write("⚖️ Matching against Legal Metrology Rule 6 Guardrails...")
                    results = evaluate_compliance(ocr_lines)
                    status.update(label="Analysis Completed!", state="complete", expanded=False)
                except Exception as ex:
                    status.update(label=f"Analysis Failed: {ex}", state="error")
                    st.error(f"Failed to process image: {ex}")
                    results = None
                finally:
                    cleanup_temp_file(temp_img_path)

            if results:
                # 1. Overall Verdict Banner
                summary = results["summary"]
                if results["is_compliant"]:
                    st.markdown(f"""
                    <div class="banner-pass">
                        <h2 style="margin: 0; font-size: 1.6rem; color: white;">✅ COMPLIANT PACKAGE</h2>
                        <p style="margin: 4px 0 0 0; font-size: 0.95rem; opacity: 0.95;">
                            All {summary['required_passed']}/{summary['required_total']} mandatory Rule 6 declarations successfully verified.
                        </p>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div class="banner-fail">
                        <h2 style="margin: 0; font-size: 1.6rem; color: white;">❌ NON-COMPLIANT PACKAGE</h2>
                        <p style="margin: 4px 0 0 0; font-size: 0.95rem; opacity: 0.95;">
                            {summary['required_failed']} mandatory declaration(s) missing or violated under Rule 6!
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                # 2. Metric Row
                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Compliance Score", f"{results['score_percentage']}%")
                m2.metric("Mandatory Passed", f"{summary['required_passed']}/{summary['required_total']}")
                m3.metric("Violations", f"{summary['required_failed']}")
                m4.metric("OCR Lines", f"{results['ocr_line_count']}")

                st.markdown("<br>", unsafe_allow_html=True)

                # 3. Rule Compliance Checklist Cards
                for card in results["cards"]:
                    status_class = "card-pass" if card["status"] == "PASS" else ("card-fail" if card["status"] == "FAIL" else "card-warn")
                    icon = "✅ PASS" if card["status"] == "PASS" else ("❌ FAIL" if card["status"] == "FAIL" else "⚠️ OPTIONAL / WARN")
                    badge_style = "color: #16a34a;" if card["status"] == "PASS" else ("color: #dc2626;" if card["status"] == "FAIL" else "color: #d97706;")

                    st.markdown(f"""
                    <div class="compliance-card {status_class}">
                        <div class="card-title">
                            <span>{card['label']}</span>
                            <span class="card-ref">{card['rule_ref']}</span>
                        </div>
                        <div style="font-size: 0.85rem; margin-bottom: 4px;">
                            <strong>Status:</strong> <span style="{badge_style} font-weight: 700;">{icon}</span>
                            {" · <em style='color: #dc2626;'>(Mandatory)</em>" if card['required'] else " · <em>(Optional)</em>"}
                        </div>
                        <div class="card-snippet">
                            "{card['snippet']}"
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                # 4. JSON Audit Report Download
                st.markdown("---")
                audit_report = {
                    "timestamp": datetime.datetime.now().isoformat(),
                    "source": source_name,
                    "overall_verdict": "COMPLIANT" if results["is_compliant"] else "NON-COMPLIANT",
                    "compliance_score": results["score_percentage"],
                    "summary": summary,
                    "detailed_rules": results["cards"],
                    "raw_ocr_lines": ocr_lines
                }

                report_json = json.dumps(audit_report, indent=2)
                st.download_button(
                    label="📥 Download Compliance Audit Report (JSON)",
                    data=report_json,
                    file_name=f"legal_metrology_report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                    mime="application/json",
                    use_container_width=True
                )

                # 5. Raw OCR Text Expander (in left column or bottom)
                with left_col:
                    with st.expander("🔍 Raw OCR Text Inspector", expanded=False):
                        st.markdown(f"**Total Detected Lines:** `{len(ocr_lines)}`")
                        for idx, det in enumerate(ocr_details):
                            st.text(f"[{det['confidence']:.2f}] Line {idx+1}: {det['text']}")

        else:
            st.markdown("""
            <div style="padding: 24px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="margin-top: 0; color: #334155;">Ready to Inspect</h4>
                <p style="color: #64748b; font-size: 0.9rem;">
                    Load a package label on the left panel. The scanner will run:
                </p>
                <ol style="color: #475569; font-size: 0.88rem; padding-left: 20px;">
                    <li><strong>PaddleOCR Text Extraction</strong> with angle classification.</li>
                    <li><strong>Rule 6 Guardrail Validation</strong> (MRP, Net Qty, Mfg Date, Expiry, Grievance).</li>
                    <li><strong>Instant Compliance Determination</strong> with statutory references.</li>
                </ol>
            </div>
            """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
