# ⚖️ Legal Metrology Compliance Scanner (Rule 6 MVP)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![PaddleOCR](https://img.shields.io/badge/OCR-PaddleOCR%20(PP--OCRv4)-brightgreen.svg)](https://github.com/PaddlePaddle/PaddleOCR)
[![Streamlit](https://img.shields.io/badge/Frontend-Streamlit-red.svg)](https://streamlit.io/)
[![Hackathon](https://img.shields.io/badge/SIH-2026%20Problem%20Statement-orange.svg)]()

An automated Computer Vision and statutory rule-checking system built for **Smart India Hackathon (SIH) 2026**. The system automates the inspection and verification of mandatory packaging declarations specified under **Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011**.

---

## 📌 Problem Statement

Every pre-packaged commodity sold in India must display critical statutory consumer declarations. Currently, verification by enforcement officers and retailers is manual, slow, and prone to human oversight. 

This MVP automates compliance audits by scanning packaging labels (via image upload or live camera) and producing instant **PASS / FAIL** verification cards alongside downloadable audit reports.

---

## 🏛️ Key Statutory Declarations Validated (Rule 6)

The engine enforces mandatory declarations mapped directly to statutory clauses in [`guardrails.json`](guardrails.json):

| Statutory Declaration | Rule Clause | Validation Criteria | Required? |
|---|---|---|:---:|
| **Maximum Retail Price (MRP)** | **Rule 6(1)(f)** | Detects currency indicator (`₹`, `Rs.`, `INR`) + price + tax inclusion statement (`inclusive of all taxes`). | **Yes** |
| **Net Quantity** | **Rule 6(1)(b)** | Verifies numeric quantity with standard SI/metric units (`g`, `kg`, `ml`, `l`, `litre`, `nos`, `units`). | **Yes** |
| **Manufacturer / Packer Info** | **Rule 6(1)(c)** | Identifies complete name and geographical address of manufacturer, packer, or importer. | **Yes** |
| **Date of Manufacture / Packing** | **Rule 6(1)(e)** | Detects month & year of manufacture/packaging (`MM/YYYY` or text format). | **Yes** |
| **Best Before / Expiry Date** | **Rule 6(1)(e)** | Identifies shelf-life statement, expiry date, or best-before period. | **Yes** |
| **Consumer Care / Grievance** | **Rule 6(1)(k)** | Validates consumer complaint channels (toll-free/helpline number or email address). | **Yes** |
| **Sectoral License (FSSAI/BIS)** | Sector Specific | Checks for 14-digit FSSAI food license number or ISI/BIS certification code. | *Optional* |

---

## 🏗️ Core System Architecture

The application adopts a high-efficiency, offline-capable two-stage architecture:

```
[ Packaging Photo / Webcam / Demo Preset ]
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│  Stage 1: Computer Vision Perception (PaddleOCR)       │
│  • EXIF Auto-Orientation & RGB Preprocessing (utils.py)│
│  • PP-OCRv4 DBNet Text Detection                       │
│  • PP-LCNet Textline Angle Rectification               │
│  • PP-OCRv4 Alphanumeric Sequence Recognition          │
└───────────────────────────┬────────────────────────────┘
                            │ Filtered text lines (conf ≥ 0.55)
                            ▼
┌────────────────────────────────────────────────────────┐
│  Stage 2: Statutory Compliance Engine (rule_engine.py) │
│  • Deterministic pattern matching with guardrails.json │
│  • Contextual snippet extraction around matches        │
│  • Mandatory clause validation & violation scoring     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Stage 3: Interactive Split-View Dashboard (app.py)    │
│  • Live camera feed & file dropzone on the left        │
│  • Instant COMPLIANT / NON-COMPLIANT verdict banner    │
│  • Color-coded PASS (✅), FAIL (❌), WARN (⚠️) cards     │
│  • JSON Compliance Audit Certificate download          │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart Installation

### 1. Prerequisites
- Python 3.10, 3.11, 3.12, or 3.13
- Git

### 2. Setup Virtual Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd sih-legal-metrology-scanner

# Create and activate virtual environment
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

# On Linux / macOS:
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

*(Optional) Generate synthetic packaging label assets for judging demo:*
```bash
python create_sample_assets.py
```

### 4. Run the Streamlit Application

```bash
streamlit run app.py
```

Open your browser at `http://localhost:8501`.

---

## 🧪 Running the Test Suite

Run the automated test suite to verify rule matching, unit validation, and missing field detection across synthetic OCR inputs:

```bash
python -m unittest tests/test_rule_engine.py
```

Expected output:
```text
......
----------------------------------------------------------------------
Ran 6 tests in 0.008s

OK
```

---

## 📂 Project Structure

```
d:\.sih\
│
├── app.py                     # Streamlit frontend dashboard (split view)
├── ocr.py                     # PaddleOCR wrapper with caching & angle classification
├── rule_engine.py             # Rule matching and compliance evaluation engine
├── guardrails.json            # Statutory Rule 6 declaration patterns & metadata
├── utils.py                   # Image preprocessing & EXIF correction helpers
├── create_sample_assets.py    # Synthetic compliant & non-compliant label generator
├── requirements.txt           # Pinned project dependencies
├── PROJECT_SPEC.md            # Detailed engineering specification
├── README.md                  # Project documentation
│
├── assets/
│   └── sample_labels/         # Pre-configured test labels for judge demo
│       ├── compliant_sample.png
│       └── non_compliant_sample.png
│
├── documents/
│   └── dataset.pdf            # Reference Legal Metrology (Packaged Commodities) Rules
│
└── tests/
    └── test_rule_engine.py    # Unit tests for rule validation
```

---

## 💡 Why This Design Wins for SIH Demo

1. **100% Offline & Edge-Deployable**: No internet or cloud API required; runs directly on an enforcement officer's laptop or tablet in warehouses and markets.
2. **Zero Hallucination Risk**: Uses deterministic legal guardrails rather than a probabilistic LLM, ensuring legally defensible notices.
3. **One-Click Demo Presets**: Includes the `🧪 Demo Presets` tab to switch between **Compliant** and **Non-Compliant** samples without physical packaging props.
4. **Legally Auditable**: Generates timestamped JSON audit certificates with exact textual evidence snippets.
