"""
tests/test_rule_engine.py — Unit tests for the Legal Metrology Rule 6 matcher.
"""

import unittest
from rule_engine import evaluate_compliance


class TestRuleEngine(unittest.TestCase):

    def setUp(self):
        self.compliant_ocr_lines = [
            "HERBAL ESSENCE ORGANIC TEA",
            "Net Quantity: 250 g",
            "MRP: Rs. 199.00 (Inclusive of all taxes)",
            "Mfg. Date: 05/2024",
            "Best Before: 24 Months from Mfg",
            "Mfg by: NaturePure Organics India Pvt Ltd, Solan, HP",
            "Consumer Care Helpline: 1800-200-8899",
            "Email: care@naturepure.com",
            "FSSAI Lic. No.: 10019022009876"
        ]

    def test_fully_compliant_label(self):
        result = evaluate_compliance(self.compliant_ocr_lines)
        self.assertTrue(result["is_compliant"])
        self.assertEqual(result["summary"]["required_failed"], 0)
        self.assertEqual(result["score_percentage"], 100.0)

        card_statuses = {c["id"]: c["status"] for c in result["cards"]}
        self.assertEqual(card_statuses["mrp"], "PASS")
        self.assertEqual(card_statuses["net_quantity"], "PASS")
        self.assertEqual(card_statuses["manufacturer"], "PASS")
        self.assertEqual(card_statuses["mfg_date"], "PASS")
        self.assertEqual(card_statuses["expiry_date"], "PASS")
        self.assertEqual(card_statuses["consumer_care"], "PASS")
        self.assertEqual(card_statuses["fssai_license"], "PASS")

    def test_missing_mrp(self):
        ocr_lines = [line for line in self.compliant_ocr_lines if "MRP" not in line]
        result = evaluate_compliance(ocr_lines)
        self.assertFalse(result["is_compliant"])
        mrp_card = next(c for c in result["cards"] if c["id"] == "mrp")
        self.assertEqual(mrp_card["status"], "FAIL")
        self.assertFalse(mrp_card["passed"])

    def test_missing_consumer_care(self):
        ocr_lines = [
            line for line in self.compliant_ocr_lines
            if "Consumer Care" not in line and "care@" not in line
        ]
        result = evaluate_compliance(ocr_lines)
        self.assertFalse(result["is_compliant"])
        care_card = next(c for c in result["cards"] if c["id"] == "consumer_care")
        self.assertEqual(care_card["status"], "FAIL")

    def test_missing_net_quantity(self):
        ocr_lines = [line for line in self.compliant_ocr_lines if "Net Quantity" not in line]
        result = evaluate_compliance(ocr_lines)
        self.assertFalse(result["is_compliant"])
        qty_card = next(c for c in result["cards"] if c["id"] == "net_quantity")
        self.assertEqual(qty_card["status"], "FAIL")

    def test_optional_fssai_missing_still_compliant(self):
        ocr_lines = [line for line in self.compliant_ocr_lines if "FSSAI" not in line]
        result = evaluate_compliance(ocr_lines)
        # Required rules all pass, so overall is still compliant
        self.assertTrue(result["is_compliant"])
        fssai_card = next(c for c in result["cards"] if c["id"] == "fssai_license")
        self.assertEqual(fssai_card["status"], "WARN")
        self.assertFalse(fssai_card["passed"])

    def test_net_quantity_alternate_units(self):
        for unit_str in ["Net Wt: 1 kg", "Net Content: 500 ml", "Net Vol: 1 Ltr", "Net Qty: 10 nos"]:
            lines = [unit_str] + [line for line in self.compliant_ocr_lines if "Net Quantity" not in line]
            result = evaluate_compliance(lines)
            qty_card = next(c for c in result["cards"] if c["id"] == "net_quantity")
            self.assertEqual(qty_card["status"], "PASS", f"Failed for unit: {unit_str}")

    def test_mrp_false_positive_words_ending_in_rs(self):
        """Words ending in 'rs' (e.g. 'Total Sugars 19') must not match as MRP / Rs."""
        lines = ["Nutrition Information", "Total Sugars 19 29", "Calories 250"]
        result = evaluate_compliance(lines)
        mrp_card = next(c for c in result["cards"] if c["id"] == "mrp")
        self.assertEqual(mrp_card["status"], "FAIL")
        self.assertFalse(mrp_card["passed"])

    def test_manufacturer_distributed_marketed_imported(self):
        """Labels using 'Distributed by', 'Marketed by', or 'Imported by' must pass Rule 6(1)(c)."""
        for entity_line in [
            "Distributed by: Seeds of Change, Chicago",
            "Marketed by: Global Brands India Pvt Ltd, Mumbai",
            "Imported by: Apex Imports, New Delhi - 110001"
        ]:
            result = evaluate_compliance([entity_line])
            mfr_card = next(c for c in result["cards"] if c["id"] == "manufacturer")
            self.assertEqual(mfr_card["status"], "PASS", f"Failed for entity line: {entity_line}")
            self.assertTrue(mfr_card["passed"])

    def test_user_reported_edge_case(self):
        """Verify the exact sample combination requested: Sugars fails MRP, Distributed by passes Manufacturer."""
        lines = ["Total Sugars 19 29", "Distributed by: Seeds of Change, Chicago"]
        result = evaluate_compliance(lines)
        cards = {c["id"]: c for c in result["cards"]}
        self.assertEqual(cards["mrp"]["status"], "FAIL")
        self.assertEqual(cards["manufacturer"]["status"], "PASS")


if __name__ == "__main__":
    unittest.main()
