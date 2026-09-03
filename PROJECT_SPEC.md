# PROJECT_SPEC.md — SIH Legal Metrology Compliance Scanner

> **Hackathon**: Smart India Hackathon (SIH)
> **Domain**: Legal Metrology (Packaged Commodities) Rules, 2011
> **Stack**: Python · Streamlit · PaddleOCR · Regex Rule Engine
> **Version**: 1.0 (MVP)

---

## 1. Problem Statement

Enforcement inspectors and retailers currently verify mandatory packaging labels
manually against the **Legal Metrology (Packaged Commodities) Rules, 2011**.
This is error-prone and slow. Our MVP automates the validation of **Rule 6**
mandatory declarations by scanning a package photograph and producing an instant
PASS / FAIL compliance card for each required field.

---

## 2. Target Compliance Fields (Rule 6)

| # | Declaration | Rule Reference | Validation Logic |
|---|-------------|----------------|-----------------|
| 1 | **MRP** (inclusive of all taxes) | Rule 6(1)(f) | Detect `MRP`, `M.R.P`, `Rs.`, `Rs` followed by a numeric value |
| 2 | **Net Quantity** (with SI/standard unit) | Rule 6(1)(b) | Detect number + unit: `g`, `kg`, `ml`, `L`, `litre`, `gm`, `nos` |
| 3 | **Manufacturer / Packer Name & Address** | Rule 6(1)(c) | Detect `Mfg by`, `Manufactured by`, `Packed by`, `Mfr.` |
| 4 | **Manufacturing / Packing Date** | Rule 6(1)(e) | Detect `Mfg. Date`, `MFD`, `Packed on` + `MM/YYYY` pattern |
| 5 | **Best Before / Expiry Date** | Rule 6(1)(e) | Detect `Best Before`, `Exp`, `Use By` + date pattern |
| 6 | **Consumer Grievance Contact** | Rule 6(1)(k) | Detect 10-digit phone or email near `consumer`/`grievance`/`helpline` |
| 7 | **FSSAI / BIS / ISI License No.** | Rule 6 (sector-specific) | Detect `FSSAI Lic. No.`, `BIS`, `IS:` + alphanumeric code |

---

## 3. System Architecture

```
+--------------------------------------------------------------------+
|                       Streamlit App (app.py)                       |
|                                                                    |
|  +----------------------------+   +-----------------------------+  |
|  |  LEFT PANEL                |   |  RIGHT PANEL                |  |
|  |  Image Upload / Camera     |   |  Compliance Checklist Cards |  |
|  |  + Raw OCR Preview         |   |  PASS / FAIL per field      |  |
|  +-------------+--------------+   +-----------------------------+  |
+----------------|---------------------------------------------------+
                 | PIL Image
                 v
+-----------------------------+
|   OCR Engine  (ocr.py)      |
|   PaddleOCR                 |
|   use_angle_cls = True      |
|   lang = 'en'               |
|   --> List[str] of lines    |
+-------------|---------------+
              | raw text lines
              v
+---------------------------------------------+
|   Rule Engine  (rule_engine.py)             |
|   Loads guardrails.json                     |
|   Runs regex patterns per field             |
|   Returns Dict[field, {found, snippet}]     |
+---------------------------------------------+
```

---

## 4. File / Folder Structure

```
d:\.sih\
|
+-- app.py                  # Streamlit entry point
+-- ocr.py                  # PaddleOCR wrapper
+-- rule_engine.py          # Regex rule matcher
+-- guardrails.json         # Compliance rules (patterns + labels)
+-- utils.py                # Image pre-processing helpers
+-- requirements.txt        # Pinned dependencies
+-- PROJECT_SPEC.md         # This file
|
+-- documents/
|   +-- dataset.pdf         # Reference document (Legal Metrology Rules)
|
+-- assets/
|   +-- sample_labels/      # Demo package images for judging
|
+-- tests/
    +-- test_rule_engine.py # Unit tests for pattern matching
```

---

## 5. Component Specifications

### 5.1  app.py — Streamlit Frontend

**Layout**: `st.set_page_config(layout="wide")` + `st.columns([1, 1])`

**Left Panel**
- `st.file_uploader()` accepting .jpg, .jpeg, .png, .webp
- `st.camera_input()` for live capture fallback
- Display uploaded image with `st.image()`
- Expandable "Raw OCR Text" debug section (`st.expander`)

**Right Panel**
- Overall verdict banner:
  - GREEN  COMPLIANT   — all required fields PASS
  - RED    NON-COMPLIANT — one or more required fields FAIL
- One `st.metric` card per compliance field showing PASS / FAIL
- Extracted snippet shown below each card in `st.caption()`
- Download button for a JSON compliance report

**UX Rules**
- Use `st.status()` context manager during OCR processing
- Cache PaddleOCR model init with `@st.cache_resource`
- All UI strings in a top-level `LABELS` dict for easy localisation

---

### 5.2  ocr.py — OCR Engine

```python
from paddleocr import PaddleOCR
import streamlit as st

@st.cache_resource
def load_ocr():
    return PaddleOCR(use_angle_cls=True, lang="en", show_log=False)

def extract_text(image_path: str) -> list[str]:
    ocr = load_ocr()
    result = ocr.ocr(image_path, cls=True)
    lines = []
    for block in result:
        for line in block:
            text, confidence = line[1]
            if confidence > 0.6:        # filter low-confidence noise
                lines.append(text.strip())
    return lines
```

**Pre-processing** (utils.py):
1. Convert to RGB if needed
2. Resize: max dimension 1600 px (preserve aspect ratio)
3. Save to temp file; pass path to PaddleOCR (prefers file paths)

---

### 5.3  guardrails.json — Rule Definitions

```json
{
  "rules": [
    {
      "id": "mrp",
      "label": "MRP (incl. taxes)",
      "rule_ref": "Rule 6(1)(f)",
      "patterns": [
        "(?i)(M\\.?R\\.?P\\.?|Maximum Retail Price)[\\s:Rs.]*\\d+",
        "(?i)\\b(Rs\\.?|INR|₹)\\s*\\d+(\\.\\d{1,2})?\\b"
      ],
      "required": true
    },
    {
      "id": "net_quantity",
      "label": "Net Quantity",
      "rule_ref": "Rule 6(1)(b)",
      "patterns": [
        "(?i)net\\s*(qty|quantity|wt|weight|content)[\\s.:]*[\\d.,]+\\s*(g|gm|kg|ml|l|litre|liter|nos|pcs)",
        "(?i)\\d+(\\.\\d+)?\\s*(g|gm|kg|ml|l|litre|liter)\\b"
      ],
      "required": true
    },
    {
      "id": "manufacturer",
      "label": "Manufacturer / Packer",
      "rule_ref": "Rule 6(1)(c)",
      "patterns": [
        "(?i)\\b(mfg\\.?|manufactured|mfr\\.?|packed|distributed|marketed|imported)\\s*(by|&|and)?\\s*[:\\s]",
        "(?i)(mfg|manufactured|packed|distributed|marketed|imported)\\s+by"
      ],
      "required": true
    },
    {
      "id": "mfg_date",
      "label": "Mfg / Packing Date",
      "rule_ref": "Rule 6(1)(e)",
      "patterns": [
        "(?i)(mfg\\.?\\s*date|mfd|manufactured\\s+on|packed\\s+on)[\\s.:]*\\d{2}[/\\-.\\s]\\d{4}",
        "(?i)(mfg|mfd)[\\s.:]*\\d{2}[/\\-.]\\d{4}"
      ],
      "required": true
    },
    {
      "id": "expiry",
      "label": "Best Before / Expiry",
      "rule_ref": "Rule 6(1)(e)",
      "patterns": [
        "(?i)(best\\s+before|bb|exp(iry|ires)?|use\\s+by)[\\s.:]*\\d{2}[/\\-.]\\d{4}",
        "(?i)(best\\s+before|expiry)\\s+\\d+"
      ],
      "required": true
    },
    {
      "id": "consumer_grievance",
      "label": "Consumer Grievance Contact",
      "rule_ref": "Rule 6(1)(k)",
      "patterns": [
        "(?i)(consumer|grievance|helpline|toll[\\s-]?free|care)[^\\n]{0,60}(\\d{10}|\\d{4}[\\s-]\\d{6})",
        "(?i)(consumer|grievance|care)[^\\n]{0,60}[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}"
      ],
      "required": true
    },
    {
      "id": "license_no",
      "label": "FSSAI / BIS License No.",
      "rule_ref": "Rule 6 (sector-specific)",
      "patterns": [
        "(?i)(fssai|lic\\.?\\s*no\\.?|license\\s+no\\.?)[\\s.:]*[A-Z0-9\\-]{6,}",
        "(?i)(bis|isi|is\\s*:)\\s*[A-Z0-9\\-:]+"
      ],
      "required": false
    }
  ]
}
```

---

### 5.4  rule_engine.py — Matcher

```python
import json, re
from pathlib import Path

GUARDRAILS = json.loads(Path("guardrails.json").read_text())

def run_checks(ocr_lines: list[str]) -> dict:
    full_text = " ".join(ocr_lines)
    results = {}
    for rule in GUARDRAILS["rules"]:
        matched_snippet = None
        for pattern in rule["patterns"]:
            m = re.search(pattern, full_text)
            if m:
                start = max(0, m.start() - 10)
                matched_snippet = full_text[start : m.end() + 20].strip()
                break
        results[rule["id"]] = {
            "label":    rule["label"],
            "rule_ref": rule["rule_ref"],
            "required": rule["required"],
            "passed":   matched_snippet is not None,
            "snippet":  matched_snippet or "-- not detected --",
        }
    return results
```

---

## 6. UI Card Design

Each field renders as a coloured box:

```
PASS  |  MRP (incl. taxes)  [Rule 6(1)(f)]
      |  "MRP Rs. 45.00"
```

Colour coding:
| State          | Background   | Icon |
|----------------|-------------|------|
| PASS           | green tint  | PASS |
| FAIL (required)| red tint    | FAIL |
| FAIL (optional)| amber tint  | WARN |

Use `st.markdown()` with inline CSS `<div style="...">` — no external CSS needed.

---

## 7. Overall Verdict Logic

```python
def overall_verdict(results: dict) -> tuple[bool, int, int]:
    required = [v for v in results.values() if v["required"]]
    passed   = [v for v in required if v["passed"]]
    compliant = len(passed) == len(required)
    return compliant, len(passed), len(required)
```

Display: "COMPLIANT (6/6)" or "NON-COMPLIANT (4/6)".

---

## 8. Demo Flow (Judging Scenario)

1. Inspector uploads a JPEG of a packaged commodity label.
2. PaddleOCR extracts text lines (under 5 s on CPU).
3. Rule engine matches patterns from guardrails.json.
4. Right panel shows instant PASS/FAIL cards per Rule 6 field.
5. JSON report downloadable for audit trail.
6. Camera mode: capture live label and re-run.

---

## 9. Non-Goals (Out of Scope for MVP)

- Font-size / minimum print height validation (focal-length calculations)
- Multi-language label parsing (Hindi / regional scripts)
- Database persistence of scan history
- Network calls or external API integrations
- PDF generation of inspection reports

---

## 10. Installation Commands

Run the following commands in order from your project root (d:\.sih\)
in a fresh virtual environment.

```powershell
# Step 1: Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Step 2: Upgrade pip
python -m pip install --upgrade pip

# Step 3: Install PaddlePaddle (CPU build — no CUDA required)
pip install paddlepaddle==2.6.2 -i https://pypi.tuna.tsinghua.edu.cn/simple

# Step 4: Install PaddleOCR
pip install "paddleocr>=2.9.0"

# Step 5: Install Streamlit and supporting libraries
pip install "streamlit>=1.35.0" "Pillow>=10.0.0"

# Step 6: Install image utilities
pip install opencv-python-headless numpy

# Step 7: Freeze requirements
pip freeze > requirements.txt

# Step 8: Launch the app
streamlit run app.py
```

NOTE — Windows PowerShell execution policy (run once if needed):
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

NOTE — Alternative pip source without mirror (fast connection):
  pip install paddlepaddle==2.6.2

NOTE — PyMuPDF (optional, PDF reference reading only):
  pip install pymupdf

---

## 11. requirements.txt (pinned reference)

```
paddlepaddle==2.6.2
paddleocr>=2.9.0
streamlit>=1.35.0
Pillow>=10.0.0
opencv-python-headless>=4.9.0
numpy>=1.26.0
```

---

## 12. Judging Criteria Alignment

| Criterion      | How MVP Addresses It                                              |
|----------------|------------------------------------------------------------------|
| Innovation     | Fully automated Rule 6 compliance — no manual inspection         |
| Feasibility    | CPU-only Python, runs on a laptop during demo                    |
| Impact         | Direct aid to LMPC inspectors and manufacturers                  |
| Scalability    | guardrails.json is data-driven; new rules = new JSON entries     |
| UI/UX          | Split-view Streamlit: clean PASS/FAIL cards, colour-coded        |
| Accuracy       | PaddleOCR angle correction + confidence threshold + multi-pattern|

---

*Generated: 2026-09-03 | Spec Owner: Lead CV & AI Engineer*
