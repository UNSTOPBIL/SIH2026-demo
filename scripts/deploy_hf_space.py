"""
deploy_hf_space.py — Deploy Legal Metrology API backend to Hugging Face Spaces (Docker SDK).
"""

import os
import shutil
import tempfile
from huggingface_hub import HfApi

HF_TOKEN = os.environ.get("HF_TOKEN", "")
REPO_ID = os.environ.get("HF_REPO_ID", "unstopbil/legal-metrology-api")
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HF_README = """---
title: Legal Metrology Rule 6 Compliance API
emoji: ⚖️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Automated Rule 6 statutory declaration inspection & enforcement engine.
---

# Legal Metrology Rule 6 Compliance API
Automated packaging inspection engine for Legal Metrology (Packaged Commodities) Rules, 2011.

- **Interactive API Documentation**: `/docs`
- **System Health & Diagnostic**: `/api/health`
- **Statutory Packaging Audit**: `POST /api/scan` & `POST /api/scan-base64`
- **Preset Demonstrations**: `GET /api/presets/compliant` & `GET /api/presets/violation`
- **Form I Panchnama PDF Memo**: `GET /api/reports/inspection/{scan_id}`
- **CSV Regulatory Export**: `GET /api/exports/scans.csv`
- **Enforcement Analytics**: `GET /api/enforcement/analytics`
"""

def prepare_and_deploy():
    print(f"[*] Initializing Hugging Face API client...")
    api = HfApi(token=HF_TOKEN)
    
    # 1. Create or verify the Space
    print(f"[*] Ensuring Space repository exists: {REPO_ID} (SDK: docker)...")
    api.create_repo(
        repo_id=REPO_ID,
        repo_type="space",
        space_sdk="docker",
        exist_ok=True,
        private=False
    )
    print(f"[✓] Space verified: https://huggingface.co/spaces/{REPO_ID}")

    # 2. Prepare deployment staging directory
    staging_dir = tempfile.mkdtemp(prefix="hf_deploy_")
    print(f"[*] Staging files in: {staging_dir}")

    try:
        # Write HF README.md
        with open(os.path.join(staging_dir, "README.md"), "w", encoding="utf-8") as f:
            f.write(HF_README)

        # Core backend files
        files_to_copy = [
            "Dockerfile",
            "requirements.txt",
            "api.py",
            "ocr.py",
            "rule_engine.py",
            "database.py",
            "remediation_engine.py",
            "report_generator.py",
            "utils.py",
            "guardrails.json",
            "legal_metrology.db",
        ]

        for fname in files_to_copy:
            src = os.path.join(BASE_DIR, fname)
            dst = os.path.join(staging_dir, fname)
            if os.path.exists(src):
                shutil.copy2(src, dst)
                print(f"  + Copied {fname} ({os.path.getsize(src):,} bytes)")
            else:
                print(f"  ! Warning: {fname} not found at {src}")

        # Assets folder
        src_assets = os.path.join(BASE_DIR, "assets")
        dst_assets = os.path.join(staging_dir, "assets")
        if os.path.exists(src_assets):
            shutil.copytree(src_assets, dst_assets, dirs_exist_ok=True)
            print(f"  + Copied assets/ directory")

        # Tests folder with mass_test_results.json
        dst_tests = os.path.join(staging_dir, "tests")
        os.makedirs(dst_tests, exist_ok=True)
        src_results = os.path.join(BASE_DIR, "tests", "mass_test_results.json")
        if os.path.exists(src_results):
            shutil.copy2(src_results, os.path.join(dst_tests, "mass_test_results.json"))
            print(f"  + Copied tests/mass_test_results.json")

        # 3. Upload to Hugging Face Space
        print(f"[*] Uploading files to Hugging Face Space {REPO_ID}...")
        api.upload_folder(
            folder_path=staging_dir,
            repo_id=REPO_ID,
            repo_type="space",
            commit_message="feat: deploy Legal Metrology Rule 6 Compliance API backend"
        )
        print(f"[✓] Deployment uploaded successfully!")
        print(f"[*] Space URL: https://huggingface.co/spaces/{REPO_ID}")
        print(f"[*] Direct API URL: https://unstopbil-legal-metrology-api.hf.space")

    finally:
        shutil.rmtree(staging_dir, ignore_errors=True)

if __name__ == "__main__":
    prepare_and_deploy()
