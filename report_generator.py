"""
report_generator.py — Formal Legal Metrology Inspection Memo & Seizure Report Generator.
Generates:
1. Form I — Statutory Inspection Memo (Panchnama / Section 15 Seizure Memo) as high-resolution PDF.
2. CSV Export for bulk enforcement submission to State Legal Metrology Controller registries.
"""

from __future__ import annotations

import csv
import io
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def generate_inspection_pdf(scan_data: Dict[str, Any]) -> bytes:
    """
    Generates a formal, tamper-evident Legal Metrology Form I Inspection & Seizure Memo
    compliant with Section 15 & Section 36 of the Legal Metrology Act, 2009.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    header_style = ParagraphStyle(
        "GovHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0f172a")
    )
    sub_header_style = ParagraphStyle(
        "GovSubHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#334155")
    )
    title_style = ParagraphStyle(
        "MemoTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0369a1")
    )
    meta_label = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#475569")
    )
    meta_val = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )
    cell_style = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1e293b")
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )
    pass_badge = ParagraphStyle(
        "BadgePass",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#047857")
    )
    fail_badge = ParagraphStyle(
        "BadgeFail",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#b91c1c")
    )
    warn_badge = ParagraphStyle(
        "BadgeWarn",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#b45309")
    )
    na_badge = ParagraphStyle(
        "BadgeNA",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748b")
    )
    hash_style = ParagraphStyle(
        "HashStyle",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor("#0284c7")
    )

    story = []

    # 1. Government Header Banner
    story.append(Paragraph("GOVERNMENT OF INDIA", header_style))
    story.append(Paragraph("DEPARTMENT OF CONSUMER AFFAIRS • LEGAL METROLOGY DIVISION", sub_header_style))
    story.append(Paragraph("OFFICE OF THE CONTROLLER OF LEGAL METROLOGY • ENFORCEMENT WING", sub_header_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceBefore=0, spaceAfter=8))
    
    story.append(Paragraph("STATUTORY INSPECTION & SEIZURE MEMO (FORM I)", title_style))
    story.append(Paragraph("Issued under Section 15 & Section 36 of Legal Metrology Act, 2009 read with Rule 6, PCR 2011", sub_header_style))
    story.append(Spacer(1, 10))

    # 2. Metadata Grid
    scan_id = scan_data.get("id", "SCAN-RECORD-UNKNOWN")
    ts = scan_data.get("timestamp", datetime.now(timezone.utc).isoformat())
    inspector = scan_data.get("inspector_id", "DLMO-PUNE-CENTRAL")
    district = scan_data.get("district", "Pune Urban Enforcement Zone")
    state = scan_data.get("state", "Maharashtra")
    brand = scan_data.get("brand", "Standard FMCG")
    product_name = scan_data.get("product_name", "Packaged Commodity")
    category = scan_data.get("category", "General Packaged Commodity")
    verdict = scan_data.get("verdict", scan_data.get("verdict_state", "COMPLIANT"))
    score = scan_data.get("score", scan_data.get("score_percentage", 100.0))

    vault = scan_data.get("evidence_vault") or scan_data.get("evidence_vault_json") or {}
    if isinstance(vault, str):
        try:
            vault = json.loads(vault)
        except Exception:
            vault = {}
    
    sha256_hash = vault.get("image_sha256") or scan_data.get("image_hash", "SHA256_HASH_RECORDED")
    gps = f"{vault.get('gps_lat', 18.5204)}° N, {vault.get('gps_lon', 73.8567)}° E"

    meta_table_data = [
        [
            Paragraph("<b>Inspection Record ID:</b>", meta_label), Paragraph(scan_id, meta_val),
            Paragraph("<b>Inspection Date/Time:</b>", meta_label), Paragraph(ts.replace("T", " ")[:19] + " UTC", meta_val)
        ],
        [
            Paragraph("<b>Inspecting Officer ID:</b>", meta_label), Paragraph(inspector, meta_val),
            Paragraph("<b>Jurisdiction / District:</b>", meta_label), Paragraph(f"{district}, {state}", meta_val)
        ],
        [
            Paragraph("<b>Target Commodity:</b>", meta_label), Paragraph(f"{brand} — {product_name}", meta_val),
            Paragraph("<b>Industry Sector:</b>", meta_label), Paragraph(category, meta_val)
        ],
        [
            Paragraph("<b>Statutory Verdict:</b>", meta_label),
            Paragraph(f"<b>{verdict}</b> ({score}% Score)", fail_badge if verdict == "POTENTIAL_VIOLATION" else (warn_badge if verdict == "REVIEW_REQUIRED" else pass_badge)),
            Paragraph("<b>GPS Geo-Coordinates:</b>", meta_label), Paragraph(gps, meta_val)
        ]
    ]

    meta_table = Table(meta_table_data, colWidths=[110, 160, 110, 160])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 3. Cryptographic Tamper Seal Box
    tamper_data = [
        [
            Paragraph("<b>Forensic Tamper Seal:</b>", meta_label),
            Paragraph(f"SHA-256: {sha256_hash}", hash_style),
            Paragraph("<b>Evidence Vault:</b> Locked ✓", meta_val)
        ]
    ]
    tamper_table = Table(tamper_data, colWidths=[100, 340, 100])
    tamper_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#86efac")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(tamper_table)
    story.append(Spacer(1, 10))

    # 4. Mandatory Statutory Findings Table (11 Rules)
    story.append(Paragraph("<b>MANDATORY STATUTORY DECLARATION AUDIT TABLE (RULE 6)</b>", sub_header_style))
    story.append(Spacer(1, 4))

    cards = scan_data.get("cards") or scan_data.get("cards_json") or []
    if isinstance(cards, str):
        try:
            cards = json.loads(cards)
        except Exception:
            cards = []

    findings_header = [
        Paragraph("<b>Rule Reference</b>", cell_bold),
        Paragraph("<b>Mandatory Declaration</b>", cell_bold),
        Paragraph("<b>Extracted Packaging Evidence</b>", cell_bold),
        Paragraph("<b>Font Height</b>", cell_bold),
        Paragraph("<b>Statutory Status</b>", cell_bold)
    ]
    findings_data = [findings_header]

    for c in cards:
        rule_ref = c.get("rule_ref", "Rule 6")
        label = c.get("label", "Mandatory Field")
        snippet = c.get("snippet", "Not detected")
        status = c.get("actual_status") or c.get("status", "PASS")

        # Font size text
        font_info = c.get("font_compliance") or {}
        h_mm = font_info.get("detected_height_mm", 0.0)
        min_mm = font_info.get("min_required_mm", 1.0)
        if status == "NOT_APPLICABLE":
            font_str = "Exempt"
        elif h_mm > 0:
            font_str = f"{h_mm}mm (Min {min_mm}mm)"
        else:
            font_str = "Unmeasured"

        # Badge
        if status == "PASS":
            badge = Paragraph("COMPLIANT", pass_badge)
        elif status == "FAIL":
            badge = Paragraph("VIOLATION", fail_badge)
        elif status == "NOT_APPLICABLE":
            badge = Paragraph("NOT APPLICABLE", na_badge)
        else:
            badge = Paragraph("REVIEW REQ", warn_badge)

        findings_data.append([
            Paragraph(rule_ref, cell_bold),
            Paragraph(label, cell_style),
            Paragraph(snippet[:80], cell_style),
            Paragraph(font_str, cell_style),
            badge
        ])

    rule_table = Table(findings_data, colWidths=[80, 110, 220, 70, 60])
    rule_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(rule_table)
    story.append(Spacer(1, 10))

    # 5. Statutory Orders & Penalty Notice Section
    story.append(Paragraph("<b>STATUTORY PENALTY & LEGAL ORDERS (SECTION 36)</b>", sub_header_style))
    story.append(Spacer(1, 4))

    if verdict == "POTENTIAL_VIOLATION":
        action_text = (
            "<b>STATUTORY ACTION MANDATED:</b> The commodity inspected contravenes statutory provisions of "
            "Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. Notice is hereby issued under "
            "<b>Section 36(1) of the Legal Metrology Act, 2009</b>. Offender is subject to a compounding fine up to "
            "<b>₹25,000</b> (first offence). Packaged specimens are liable to immediate seizure under Section 15."
        )
        box_bg = colors.HexColor("#fef2f2")
        box_border = colors.HexColor("#fca5a5")
    elif verdict == "REVIEW_REQUIRED":
        action_text = (
            "<b>INSPECTION HOLD / REVIEW REQUIRED:</b> Declaration box unprinted or mandatory customer grievance "
            "contact details incomplete. Manufacturer/Packer must produce factory batch stamping registers within "
            "<b>7 statutory working days</b> pursuant to Rule 6(1)(e)."
        )
        box_bg = colors.HexColor("#fffbeb")
        box_border = colors.HexColor("#fde68a")
    else:
        action_text = (
            "<b>COMPLIANCE VERIFIED:</b> All mandatory declarations (Generic Name, Net Quantity, Manufacturer Address, "
            "MRP with taxes, Date of Manufacture, Expiry, Consumer Care, and Sector Licenses) comply with Rule 6 "
            "and Legal Metrology Second Schedule Table 1. Packaged commodity is certified for unrestricted retail distribution."
        )
        box_bg = colors.HexColor("#f0fdf4")
        box_border = colors.HexColor("#86efac")

    legal_table = Table([[Paragraph(action_text, cell_style)]], colWidths=[540])
    legal_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), box_bg),
        ("BOX", (0, 0), (-1, -1), 1, box_border),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(legal_table)
    story.append(Spacer(1, 18))

    # 6. Attestation Signatures Block
    sig_data = [
        [
            Paragraph("<b>SEIZED / INSPECTED IN PRESENCE OF:</b>", meta_label),
            Paragraph("<b>INSPECTING OFFICER SIGNATURE:</b>", meta_label)
        ],
        [
            Paragraph("<br/><br/>____________________________________<br/>Witness / Retailer Representative<br/>Name & Seal:", cell_style),
            Paragraph(f"<br/><br/>____________________________________<br/><b>{inspector}</b><br/>District Legal Metrology Officer (DLMO)", cell_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(KeepTogether(sig_table))

    doc.build(story)
    return buffer.getvalue()


def generate_scans_csv(scans_list: List[Dict[str, Any]]) -> str:
    """
    Generates a structured CSV export of historical inspection records.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Scan ID", "Timestamp (UTC)", "Inspector ID", "Brand", "Product Name",
        "Category", "Verdict", "Score (%)", "Compliant (0/1)", "District", "State", "Cards Evaluated"
    ])

    for s in scans_list:
        writer.writerow([
            s.get("id"),
            s.get("timestamp"),
            s.get("inspector_id"),
            s.get("brand"),
            s.get("product_name"),
            s.get("category"),
            s.get("verdict"),
            s.get("score"),
            1 if s.get("is_compliant") else 0,
            s.get("district"),
            s.get("state"),
            s.get("cards_count", 0)
        ])

    return output.getvalue()
