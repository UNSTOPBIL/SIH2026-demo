"""
rule_engine.py — Rule evaluation and compliance scoring for Legal Metrology Rule 6.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional


def load_guardrails(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load compliance rules from guardrails.json."""
    if not config_path:
        config_path = os.path.join(os.path.dirname(__file__), "guardrails.json")

    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # Fallback minimal rules if file is not found
    return {
        "version": "1.0",
        "domain": "Legal Metrology (Packaged Commodities) Rules, 2011",
        "rules": [
            {
                "id": "mrp",
                "label": "MRP (incl. of all taxes)",
                "rule_ref": "Rule 6(1)(f)",
                "description": "Maximum Retail Price inclusive of all taxes must be clearly stated.",
                "patterns": [
                    r"(?i)(M\.?R\.?P\.?|Maximum\s+Retail\s+Price)[^\n\r]{0,35}?(₹|Rs\.?|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)",
                    r"(?i)\b(Rs\.?|INR|₹)\s*\d+(\.\d{1,2})?\b",
                    r"(?i)(M\.?R\.?P\.?)[\s:.-]*([0-9]+(?:\.[0-9]{1,2})?)"
                ],
                "required": True,
            },
            {
                "id": "net_quantity",
                "label": "Net Quantity (Standard Units)",
                "rule_ref": "Rule 6(1)(b)",
                "description": "Net quantity in standard units of weight, measure or number.",
                "patterns": [
                    r"(?i)(net\s*(?:qty|quantity|wt|weight|vol|volume|content))[\s.:-]*([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gm|gms|grams|kilograms|ml|millilitre|l|ltr|litre|litres|nos|n|units|pieces|pcs)\b",
                    r"(?i)\b([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gm|gms|ml|ltr|litre|litres)\b"
                ],
                "required": True,
            },
            {
                "id": "manufacturer",
                "label": "Manufacturer / Packer Details",
                "rule_ref": "Rule 6(1)(c)",
                "description": "Name and complete address of manufacturer or packer.",
                "patterns": [
                    r"(?i)\b(mfg\.?|manufactured|mfr\.?|packed|distributed|marketed|imported)\s*(by|&|and)?\s*[:\s]",
                    r"(?i)(mfd\.?\s*by|mfg\.?\s*by|manufactured\s+by|packed\s+by|marketed\s+by|distributed\s+by|imported\s+by|pkd\.?\s*by|mfr\.?\s*by)[\s:.-]+([A-Za-z0-9\s,.-]{4,80})",
                    r"(?i)(manufactured\s+and\s+packed\s+by)[\s:.-]+([A-Za-z0-9\s,.-]{4,80})",
                    r"(?i)(mfg|manufactured|packed|distributed|marketed|imported)[\s]+by\b"
                ],
                "required": True,
            },
            {
                "id": "mfg_date",
                "label": "Mfg / Packing Date",
                "rule_ref": "Rule 6(1)(e)",
                "description": "Month and year of manufacture or packing.",
                "patterns": [
                    r"(?i)(mfg\.?\s*date|mfd\.?|pkd\.?|packed\s+on|date\s+of\s+mfg|manufactured\s+on)[\s:.-]*([0-9]{1,2}[/\-.\s][0-9]{2,4}|[A-Za-z]{3,9}[\s-]*[0-9]{2,4})",
                    r"(?i)(mfg|mfd|pkd)[\s:.-]*([0-9]{1,2}[/\-.][0-9]{2,4})"
                ],
                "required": True,
            },
            {
                "id": "expiry_date",
                "label": "Best Before / Expiry Date",
                "rule_ref": "Rule 6(1)(e)",
                "description": "Best before date or expiry date declaration.",
                "patterns": [
                    r"(?i)(best\s+before|use\s+by|exp\.?\s*date|expiry\s*date|exp\.?)[\s:.-]*([0-9]{1,2}[/\-.\s][0-9]{2,4}|[0-9]{1,2}\s*months|[A-Za-z]{3,9}[\s-]*[0-9]{2,4})",
                    r"(?i)(best\s+before)[\s:.-]*([0-9]+\s*(?:months|days|years|year))"
                ],
                "required": True,
            },
            {
                "id": "consumer_care",
                "label": "Consumer Care / Grievance Cell",
                "rule_ref": "Rule 6(1)(k)",
                "description": "Phone number, email or postal address for consumer complaints.",
                "patterns": [
                    r"(?i)(consumer\s*(?:care|cell|helpline|service)|customer\s*(?:care|support|service)|toll\s*free|help\s*line|grievance)[^\n\r]{0,60}?(?:tel|phone|contact|no|call)?[\s:.-]*([0-9]{3,5}[\s-]?[0-9]{5,8}|1800[\s-]?[0-9]{3}[\s-]?[0-9]{3,4}|[0-9]{10})",
                    r"(?i)(?:email|e-mail|write\s+to)[\s:.-]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})",
                    r"(?i)(consumer|customer)\s*(care|cell|grievance)"
                ],
                "required": True,
            },
            {
                "id": "fssai_license",
                "label": "FSSAI / BIS License No.",
                "rule_ref": "Rule 6 (Sector Specific)",
                "description": "Food safety or BIS standardization license number.",
                "patterns": [
                    r"(?i)(fssai|lic\.?\s*no\.?|license\s+no\.?)[\s.:-]*([0-9]{14}|[0-9A-Z-]{8,20})",
                    r"(?i)\b(1[0-9]{13})\b",
                    r"(?i)(isi|bis)[\s:.-]*(cml[\s/-]?[0-9]{6,10}|is\s*:[\s0-9]+)"
                ],
                "required": False,
            }
        ]
    }


def evaluate_compliance(
    ocr_lines: List[str],
    config_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluate OCR text lines against Legal Metrology Rule 6 guardrails.

    Args:
        ocr_lines: List of detected text strings from PaddleOCR.
        config_path: Path to guardrails.json.

    Returns:
        Structured compliance dictionary with card statuses, snippets, and overall verdict.
    """
    config = load_guardrails(config_path)
    rules = config.get("rules", [])

    # Create both consolidated text and space-normalized single line for cross-line matches
    full_text = "\n".join(ocr_lines)
    flat_text = " ".join(ocr_lines)

    evaluated_cards = []
    required_count = 0
    passed_required_count = 0
    total_passed_count = 0

    for rule in rules:
        rule_id = rule["id"]
        label = rule["label"]
        rule_ref = rule["rule_ref"]
        required = rule.get("required", True)
        description = rule.get("description", "")
        patterns = rule.get("patterns", [])

        if required:
            required_count += 1

        matched_snippet: Optional[str] = None
        matched_pattern_index = -1

        # Search across text variations (full text and flat text)
        for idx, pattern in enumerate(patterns):
            # Try matching on full_text first
            match = re.search(pattern, full_text)
            if not match:
                # Try matching on flattened single-line text
                match = re.search(pattern, flat_text)

            if match:
                matched_pattern_index = idx
                start_pos = max(0, match.start() - 10)
                end_pos = min(len(match.string), match.end() + 25)
                raw_snippet = match.string[start_pos:end_pos]
                # Clean up newlines in snippet
                cleaned_snippet = " ".join(raw_snippet.split())
                matched_snippet = cleaned_snippet
                break

        passed = matched_snippet is not None

        if passed:
            total_passed_count += 1
            if required:
                passed_required_count += 1
            status = "PASS"
        else:
            status = "FAIL" if required else "WARN"

        evaluated_cards.append({
            "id": rule_id,
            "label": label,
            "rule_ref": rule_ref,
            "description": description,
            "required": required,
            "passed": passed,
            "status": status,
            "snippet": matched_snippet if passed else "Not detected on packaging label",
            "matched_pattern_idx": matched_pattern_index
        })

    is_compliant = (passed_required_count == required_count) if required_count > 0 else True
    compliance_score = round((passed_required_count / required_count * 100), 1) if required_count > 0 else 100.0

    return {
        "is_compliant": is_compliant,
        "score_percentage": compliance_score,
        "summary": {
            "required_total": required_count,
            "required_passed": passed_required_count,
            "required_failed": required_count - passed_required_count,
            "total_rules": len(rules),
            "total_passed": total_passed_count,
        },
        "cards": evaluated_cards,
        "ocr_line_count": len(ocr_lines),
    }
