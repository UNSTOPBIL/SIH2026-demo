"""
tests/test_rule_engine.py — Unit & regression tests for Legal Metrology Rule 6 matcher.
Enforces P0 compliance correctness logic.
"""

import unittest
from rule_engine import evaluate_compliance, normalize_ocr_text


class TestRuleEngine(unittest.TestCase):

    def setUp(self):
        self.food_context = {"product_category": "Food / Beverage", "imported": False}
        self.cosmetic_context = {"product_category": "Cosmetic / Personal Care", "imported": False}

        self.compliant_food_ocr = [
            "HERBAL ESSENCE ORGANIC TEA",
            "Net Quantity: 250 g",
            "MRP: Rs. 199.00 (Inclusive of all taxes)",
            "Unit Sale Price: Rs. 0.80 / g",
            "Mfg. Date: 05/2024",
            "Best Before: 24 Months from Mfg",
            "Mfg by: NaturePure Organics India Pvt Ltd, Solan, HP",
            "Country of Origin: India",
            "Consumer Care Helpline: 1800-200-8899",
            "Email: care@naturepure.com",
            "FSSAI Lic. No.: 10019022009876"
        ]

    def test_text_normalization(self):
        """Verify OCR normalization cleans corruption artifacts."""
        raw = "Mfd.byC)LOreal India Pvt.Ltd. Chakan Pune-410501"
        normalized = normalize_ocr_text(raw)
        self.assertIn("Mfd. by", normalized)
        self.assertIn("L'Oreal", normalized)

    def test_fully_compliant_food_label(self):
        result = evaluate_compliance(self.compliant_food_ocr, context=self.food_context)
        self.assertTrue(result["is_compliant"])
        self.assertEqual(result["verdict_state"], "COMPLIANT")
        self.assertEqual(result["summary"]["violation_count"], 0)

        statuses = {f["field"]: f["status"] for f in result["findings"]}
        self.assertEqual(statuses["mrp"], "PASS")
        self.assertEqual(statuses["net_quantity"], "PASS")
        self.assertEqual(statuses["manufacturer"], "PASS")
        self.assertEqual(statuses["mfg_date"], "PASS")
        self.assertEqual(statuses["expiry_date"], "PASS")
        self.assertEqual(statuses["consumer_care"], "PASS")
        self.assertEqual(statuses["fssai_license"], "PASS")
        self.assertEqual(statuses["unit_sale_price"], "PASS")
        self.assertEqual(statuses["country_of_origin"], "PASS")

    def test_real_garnier_ocr_lines(self):
        """
        Regression Test: Real Garnier photographed OCR text must detect Manufacturer
        and MUST NOT return Manufacturer as 'FAIL' or 'NOT DETECTED'.
        Ambiguous date code 02/2501/28 must return REVIEW_REQUIRED (not PASS or FAIL).
        """
        garnier_ocr_lines = [
            "GARNIER SKIN NATURALS",
            "Bright Complete Vitamin C Face Wash",
            "Net Vol: 50 g",
            "MRP Rs 115.00 (Incl. of all taxes)",
            "Mfd.byC)LOreal India Pvt.Ltd. Chakan Pune-410501",
            "02/2501/28",
            "Any questions/complaints? Call or write Consumer Advisor Desk",
            "1800-22-3000 care@loreal.in"
        ]
        result = evaluate_compliance(garnier_ocr_lines, context=self.cosmetic_context)
        
        mfr_finding = next(f for f in result["findings"] if f["field"] == "manufacturer")
        self.assertIn(mfr_finding["status"], ["PASS", "REVIEW_REQUIRED"])
        self.assertNotEqual(mfr_finding["status"], "FAIL")
        self.assertNotEqual(mfr_finding["status"], "NOT_DETECTED")
        self.assertIn("LOreal", mfr_finding["value"])

        mfg_finding = next(f for f in result["findings"] if f["field"] == "mfg_date")
        self.assertEqual(mfg_finding["status"], "REVIEW_REQUIRED")

    def test_missing_mrp_returns_review_required(self):
        """Absence of MRP evidence returns REVIEW_REQUIRED, never an automatic FAIL."""
        ocr_lines = [line for line in self.compliant_food_ocr if "MRP" not in line]
        result = evaluate_compliance(ocr_lines, context=self.food_context)
        self.assertEqual(result["verdict_state"], "REVIEW_REQUIRED")
        mrp_finding = next(f for f in result["findings"] if f["field"] == "mrp")
        self.assertEqual(mrp_finding["status"], "REVIEW_REQUIRED")

    def test_standalone_price_without_explicit_prefix_returns_violation(self):
        """Standalone price 'Rs. 115' without explicit MRP prefix or taxes clause returns statutory FAIL under Rule 6(1)(f)."""
        lines = [
            "Net Qty: 100g",
            "Rs. 115.00",
            "Mfg by: Sample Organics Pvt Ltd, Delhi"
        ]
        result = evaluate_compliance(lines, context=self.food_context)
        mrp_finding = next(f for f in result["findings"] if f["field"] == "mrp")
        self.assertEqual(mrp_finding["status"], "FAIL")
        self.assertIn("Statutory defect", mrp_finding["value"])

    def test_mrp_vs_unit_sale_price_disambiguation(self):
        """Distinguish Unit Sale Price (Rs.2.30/100g) from explicit MRP (MRP Rs 115.00)."""
        lines = [
            "Unit Sale Price: Rs.2.30/100g",
            "MRP Rs 115.00 (Incl. of all taxes)",
            "Net Qty: 500g",
            "Mfg by: Sample Foods Pvt Ltd, Mumbai - 400001"
        ]
        result = evaluate_compliance(lines, context=self.food_context)
        mrp_finding = next(f for f in result["findings"] if f["field"] == "mrp")
        self.assertEqual(mrp_finding["status"], "PASS")

    def test_manufacturer_without_address_returns_review_required(self):
        """Company name without sufficient address returns REVIEW_REQUIRED."""
        lines = [
            "Net Qty: 100g",
            "MRP: Rs. 100",
            "Mfg by: FastSnacks Foods Ltd"
        ]
        result = evaluate_compliance(lines, context=self.food_context)
        mfr_finding = next(f for f in result["findings"] if f["field"] == "manufacturer")
        self.assertEqual(mfr_finding["status"], "REVIEW_REQUIRED")

    def test_best_before_without_date_returns_review_required(self):
        """Best Before phrase without date or shelf life duration returns REVIEW_REQUIRED."""
        lines = [
            "Net Qty: 100g",
            "MRP: Rs. 100",
            "Best Before"
        ]
        result = evaluate_compliance(lines, context=self.food_context)
        exp_finding = next(f for f in result["findings"] if f["field"] == "expiry_date")
        self.assertEqual(exp_finding["status"], "REVIEW_REQUIRED")

    def test_incomplete_consumer_care_returns_review_required(self):
        """Phrase without complete phone/email details returns REVIEW_REQUIRED."""
        lines = [
            "Net Qty: 100g",
            "MRP: Rs. 50.00",
            "Mfg by: ABC Pvt Ltd, Solan",
            "Any questions/complaints? Call or write to us"
        ]
        result = evaluate_compliance(lines, context=self.cosmetic_context)
        care_finding = next(f for f in result["findings"] if f["field"] == "consumer_care")
        self.assertEqual(care_finding["status"], "REVIEW_REQUIRED")

    def test_cosmetic_context_fssai_not_applicable(self):
        """FSSAI is NOT_APPLICABLE for cosmetics."""
        result = evaluate_compliance(self.compliant_food_ocr, context=self.cosmetic_context)
        fssai_finding = next(f for f in result["findings"] if f["field"] == "fssai_license")
        self.assertEqual(fssai_finding["status"], "NOT_APPLICABLE")

    def test_net_quantity_alternate_units(self):
        for unit_str in ["Net Wt: 1 kg", "Net Content: 500 ml", "Net Vol: 1 Ltr", "Net Qty: 10 nos"]:
            lines = [unit_str] + [line for line in self.compliant_food_ocr if "Net Quantity" not in line]
            result = evaluate_compliance(lines, context=self.food_context)
            qty_finding = next(f for f in result["findings"] if f["field"] == "net_quantity")
            self.assertEqual(qty_finding["status"], "PASS", f"Failed for unit: {unit_str}")


if __name__ == "__main__":
    unittest.main()
