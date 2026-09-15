import json
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from rule_engine import evaluate_compliance, evaluate_font_compliance

results_file = os.path.join(PROJECT_ROOT, "tests", "mass_test_results.json")
with open(results_file, "r", encoding="utf-8") as f:
    data = json.load(f)

packages = data["packages"]
matches = 0
total = len(packages)

print("=" * 90)
print(f"{'BRAND':18} {'CATEGORY':12} {'EXPECTED':20} {'EVALUATED':20} {'MATCH'}")
print("=" * 90)

for p in packages:
    ocr_lines = [item["text"] for item in p["ocr_details"]]
    res = evaluate_compliance(ocr_lines)
    
    # Check font compliance for physical sizing
    font_res = evaluate_font_compliance(
        ocr_details=p["ocr_details"],
        cards=res["cards"],
        image_width_px=p["dimensions"]["width"],
        package_width_mm=100.0,
    )
    
    statuses = [c.get("actual_status", c.get("status")) for c in res["cards"]]
    has_fail = any(s in ("FAIL", "VIOLATION") for s in statuses)
    has_review = any(s in ("REVIEW_REQUIRED", "WARN", "UNSTAMPED") for s in statuses)
    has_font_issue = not font_res.get("all_fonts_compliant", True)
    
    if has_fail:
        verdict = "POTENTIAL_VIOLATION"
    elif has_review or has_font_issue:
        verdict = "REVIEW_REQUIRED"
    else:
        verdict = "COMPLIANT"
        
    expected = p["expected_verdict"]
    is_match = (verdict == expected)
    if is_match:
        matches += 1
        
    match_str = "MATCH" if is_match else "DIVERGENCE"
    print(f"{p['brand']:18} {p['category']:12} {expected:20} {verdict:20} {match_str} (Score: {res['score_percentage']}%)")

print("=" * 90)
accuracy = (matches / total) * 100
print(f"BENCHMARK ACCURACY: {matches}/{total} ({accuracy:.2f}%)")
print("=" * 90)
