"""
database.py — SQLite persistence layer for Legal Metrology Packaged Commodities.
Maintains:
1. `scans`: Full forensic history of every packaging inspection (Rule 6 findings, font sizing, evidence vault).
2. `products`: Aggregated product catalog tracking multi-scan compliance history over time.
3. `entities`: Registered manufacturer/packer regulatory tracking with Section 36 repeat-offender escalation.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "legal_metrology.db")


def get_db_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db(db_path: str = DB_PATH) -> None:
    """
    Initializes database tables, indices, and seeds default enforcement entities.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # 1. Scans Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            inspector_id TEXT NOT NULL DEFAULT 'DLMO-PUNE-042',
            image_hash TEXT NOT NULL,
            brand TEXT,
            product_name TEXT,
            category TEXT,
            verdict TEXT NOT NULL,
            score REAL NOT NULL,
            is_compliant INTEGER NOT NULL,
            cards_json TEXT NOT NULL,
            ocr_lines_json TEXT NOT NULL,
            summary_json TEXT,
            font_compliance_json TEXT,
            placement_compliance_json TEXT,
            evidence_vault_json TEXT,
            remediation_json TEXT,
            repeat_offender_json TEXT,
            gps_lat REAL DEFAULT 18.5204,
            gps_lon REAL DEFAULT 73.8567,
            district TEXT DEFAULT 'Pune Urban',
            state TEXT DEFAULT 'Maharashtra',
            image_filename TEXT
        );
        """)

        # 2. Products Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            brand TEXT NOT NULL,
            product_name TEXT NOT NULL,
            category TEXT,
            total_scans INTEGER NOT NULL DEFAULT 0,
            pass_count INTEGER NOT NULL DEFAULT 0,
            review_count INTEGER NOT NULL DEFAULT 0,
            violation_count INTEGER NOT NULL DEFAULT 0,
            last_scanned TEXT NOT NULL,
            last_verdict TEXT NOT NULL,
            last_score REAL NOT NULL
        );
        """)

        # 3. Entities Table (Repeat-offender registry)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS entities (
            id TEXT PRIMARY KEY,
            entity_name TEXT NOT NULL,
            normalized_key TEXT UNIQUE NOT NULL,
            offense_count INTEGER NOT NULL DEFAULT 0,
            risk_tier TEXT NOT NULL DEFAULT 'STANDARD',
            violations_json TEXT NOT NULL DEFAULT '[]',
            statutory_action TEXT NOT NULL
        );
        """)

        # Indices for efficient querying
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_verdict ON scans(verdict);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_category ON scans(category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_brand ON scans(brand);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_entities_key ON entities(normalized_key);")

        # Seed baseline entities if table is empty
        cursor.execute("SELECT COUNT(*) FROM entities;")
        if cursor.fetchone()[0] == 0:
            seed_entities = [
                (
                    "ent_crunchy_01",
                    "Crunchy Snacks Industries Pvt Ltd",
                    "crunchy",
                    2,
                    "CRITICAL",
                    json.dumps([
                        {"date": "2025-05-18", "rule": "Rule 6(1)(n) - Missing Unit Sale Price", "penalty": "Rs. 15,000 compounding fine"},
                        {"date": "2026-01-22", "rule": "Rule 6(1)(b) - Non-standard Net Quantity declaration", "penalty": "Statutory Warning Issued"}
                    ]),
                    "MANDATORY ESCALATION TO DISTRICT MAGISTRATE (Section 36(2) of Legal Metrology Act: Subsequent offense carries mandatory enhanced compounding up to Rs 50,000 or imprisonment up to 1 year)."
                ),
                (
                    "ent_naturepure_02",
                    "NaturePure Organics India Pvt Ltd",
                    "naturepure",
                    0,
                    "CLEAN",
                    json.dumps([]),
                    "Clear regulatory record. Fully compliant first-time audit under Section 36(1)."
                ),
                (
                    "ent_balaji_03",
                    "Balaji Wafers Pvt Ltd",
                    "balaji",
                    1,
                    "HIGH",
                    json.dumps([
                        {"date": "2026-02-14", "rule": "Rule 6(1)(f) - Bare Price without MRP prefix", "penalty": "Notice issued under Section 36(1)"}
                    ]),
                    "Prior notice pending compounding under Section 36(1). Increased surveillance warranted."
                ),
                (
                    "ent_havells_04",
                    "Havells India Ltd (Consumer Electricals)",
                    "havells",
                    1,
                    "HIGH",
                    json.dumps([
                        {"date": "2026-03-01", "rule": "Rule 6(1)(k) - Omission of Consumer Care contact on packaging", "penalty": "Compounding proceedings initiated"}
                    ]),
                    "Active compounding case for defective customer grievance declaration."
                ),
                (
                    "ent_hul_05",
                    "Hindustan Unilever Limited (Home Care Division)",
                    "unilever",
                    0,
                    "CLEAN",
                    json.dumps([]),
                    "Large enterprise registrant. Subject to periodic random retail market sampling."
                )
            ]
            cursor.executemany(
                "INSERT INTO entities (id, entity_name, normalized_key, offense_count, risk_tier, violations_json, statutory_action) VALUES (?, ?, ?, ?, ?, ?, ?);",
                seed_entities
            )

        conn.commit()


def get_entity_record(query_text: str, db_path: str = DB_PATH) -> Dict[str, Any]:
    """
    Looks up manufacturer or brand name in the persistent enforcement entities registry.
    """
    lower_text = query_text.lower()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT entity_name, offense_count, risk_tier, violations_json, statutory_action, normalized_key FROM entities;")
        rows = cursor.fetchall()
        for row in rows:
            if row["normalized_key"] in lower_text:
                try:
                    past_violations = json.loads(row["violations_json"])
                except Exception:
                    past_violations = []
                return {
                    "entity_name": row["entity_name"],
                    "offense_count": row["offense_count"],
                    "is_repeat_offender": row["offense_count"] > 0,
                    "risk_tier": row["risk_tier"],
                    "past_violations": past_violations,
                    "statutory_action": row["statutory_action"]
                }

    return {
        "entity_name": "Unregistered / Standard Merchant",
        "offense_count": 0,
        "is_repeat_offender": False,
        "risk_tier": "STANDARD",
        "past_violations": [],
        "statutory_action": "No prior infractions on record. First-time statutory assessment."
    }


def save_scan(
    scan_data: Dict[str, Any],
    db_path: str = DB_PATH
) -> str:
    """
    Persists a complete packaging scan into `scans`, upserts `products`,
    and updates entity compliance history. Returns the generated scan ID.
    """
    scan_id = scan_data.get("id") or f"SCAN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
    now_iso = scan_data.get("timestamp") or datetime.now(timezone.utc).isoformat()
    inspector_id = scan_data.get("inspector_id") or "DLMO-PUNE-042"
    
    brand = scan_data.get("brand") or "Generic FMCG"
    product_name = scan_data.get("product_name") or "Packaged Commodity"
    category = scan_data.get("category") or "Food / Beverage"
    
    eval_result = scan_data.get("eval_result") or {}
    verdict = scan_data.get("verdict_state") or eval_result.get("verdict_state") or ("COMPLIANT" if scan_data.get("is_compliant") else "POTENTIAL_VIOLATION")
    score = float(scan_data.get("score_percentage") or eval_result.get("score_percentage") or 0.0)
    is_compliant = 1 if (scan_data.get("is_compliant") or eval_result.get("is_compliant")) else 0

    cards = scan_data.get("cards") or eval_result.get("cards") or []
    ocr_lines = scan_data.get("ocr_lines") or []
    summary = scan_data.get("summary") or eval_result.get("summary") or {}
    font_compliance = scan_data.get("font_compliance") or {}
    placement_compliance = scan_data.get("placement_compliance") or {}
    evidence_vault = scan_data.get("evidence_vault") or {}
    remediation = scan_data.get("remediation") or {}
    repeat_offender = scan_data.get("repeat_offender") or {}

    image_hash = evidence_vault.get("image_sha256") or scan_data.get("image_sha256") or uuid.uuid4().hex
    gps_lat = float(evidence_vault.get("gps_lat") or 18.5204)
    gps_lon = float(evidence_vault.get("gps_lon") or 73.8567)
    district = evidence_vault.get("district") or "Pune Urban"
    state = evidence_vault.get("state") or "Maharashtra"
    image_filename = scan_data.get("image_filename") or ""

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # 1. Insert or replace into `scans`
        cursor.execute("""
            INSERT OR REPLACE INTO scans (
                id, timestamp, inspector_id, image_hash, brand, product_name, category,
                verdict, score, is_compliant, cards_json, ocr_lines_json, summary_json,
                font_compliance_json, placement_compliance_json, evidence_vault_json,
                remediation_json, repeat_offender_json, gps_lat, gps_lon, district, state, image_filename
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            scan_id, now_iso, inspector_id, image_hash, brand, product_name, category,
            verdict, score, is_compliant,
            json.dumps(cards), json.dumps(ocr_lines), json.dumps(summary),
            json.dumps(font_compliance), json.dumps(placement_compliance),
            json.dumps(evidence_vault), json.dumps(remediation), json.dumps(repeat_offender),
            gps_lat, gps_lon, district, state, image_filename
        ))

        # 2. Upsert into `products`
        prod_id = f"{brand.lower().strip()}_{product_name.lower().strip()}".replace(" ", "_")[:64]
        cursor.execute("SELECT total_scans, pass_count, review_count, violation_count FROM products WHERE id = ?;", (prod_id,))
        existing = cursor.fetchone()

        is_pass = 1 if verdict == "COMPLIANT" else 0
        is_review = 1 if verdict == "REVIEW_REQUIRED" else 0
        is_violation = 1 if verdict == "POTENTIAL_VIOLATION" else 0

        if existing:
            cursor.execute("""
                UPDATE products SET
                    total_scans = total_scans + 1,
                    pass_count = pass_count + ?,
                    review_count = review_count + ?,
                    violation_count = violation_count + ?,
                    last_scanned = ?,
                    last_verdict = ?,
                    last_score = ?
                WHERE id = ?;
            """, (is_pass, is_review, is_violation, now_iso, verdict, score, prod_id))
        else:
            cursor.execute("""
                INSERT INTO products (
                    id, brand, product_name, category, total_scans, pass_count,
                    review_count, violation_count, last_scanned, last_verdict, last_score
                ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?);
            """, (prod_id, brand, product_name, category, is_pass, is_review, is_violation, now_iso, verdict, score))

        # 3. If violation, update entity infraction count if recognized
        if verdict == "POTENTIAL_VIOLATION" and brand:
            brand_key = brand.lower()
            cursor.execute("SELECT id, offense_count, violations_json FROM entities WHERE normalized_key LIKE ?;", (f"%{brand_key}%",))
            ent = cursor.fetchone()
            if ent:
                try:
                    cur_viols = json.loads(ent["violations_json"])
                except Exception:
                    cur_viols = []
                cur_viols.append({
                    "date": now_iso[:10],
                    "rule": "Statutory Defect Detected on Packaging",
                    "penalty": "Pending DLMO Compounding Notice"
                })
                new_offense_count = ent["offense_count"] + 1
                new_risk = "CRITICAL" if new_offense_count >= 2 else "HIGH"
                cursor.execute("""
                    UPDATE entities SET
                        offense_count = ?,
                        risk_tier = ?,
                        violations_json = ?
                    WHERE id = ?;
                """, (new_offense_count, new_risk, json.dumps(cur_viols), ent["id"]))

        conn.commit()

    return scan_id


def get_scan_history(
    page: int = 1,
    limit: int = 20,
    verdict: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """
    Returns a paginated list of scans filtered by statutory status, category, date, or text.
    """
    offset = max(0, (page - 1) * limit)
    conditions: List[str] = []
    params: List[Any] = []

    if verdict and verdict.upper() != "ALL":
        conditions.append("verdict = ?")
        params.append(verdict.upper())

    if category and category.upper() != "ALL":
        conditions.append("category LIKE ?")
        params.append(f"%{category}%")

    if search:
        conditions.append("(brand LIKE ? OR product_name LIKE ? OR inspector_id LIKE ? OR id LIKE ?)")
        term = f"%{search}%"
        params.extend([term, term, term, term])

    if from_date:
        conditions.append("timestamp >= ?")
        params.append(from_date)

    if to_date:
        conditions.append("timestamp <= ?")
        params.append(f"{to_date}T23:59:59")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Count total
        cursor.execute(f"SELECT COUNT(*) FROM scans {where_clause};", params)
        total_records = cursor.fetchone()[0]

        # Fetch records
        query = f"""
            SELECT id, timestamp, inspector_id, brand, product_name, category,
                   verdict, score, is_compliant, cards_json, district, state
            FROM scans
            {where_clause}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?;
        """
        cursor.execute(query, params + [limit, offset])
        rows = cursor.fetchall()

        scans_list = []
        for r in rows:
            try:
                cards = json.loads(r["cards_json"])
            except Exception:
                cards = []
            scans_list.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "inspector_id": r["inspector_id"],
                "brand": r["brand"],
                "product_name": r["product_name"],
                "category": r["category"],
                "verdict": r["verdict"],
                "score": r["score"],
                "is_compliant": bool(r["is_compliant"]),
                "cards_count": len(cards),
                "district": r["district"],
                "state": r["state"]
            })

    total_pages = (total_records + limit - 1) // limit if limit > 0 else 1
    return {
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": total_pages,
        "scans": scans_list
    }


def get_scan_by_id(scan_id: str, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """
    Returns full details of a specific historical scan.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM scans WHERE id = ?;", (scan_id,))
        row = cursor.fetchone()
        if not row:
            return None

        result = dict(row)
        # Parse stored JSON columns
        for col in [
            "cards_json", "ocr_lines_json", "summary_json",
            "font_compliance_json", "placement_compliance_json",
            "evidence_vault_json", "remediation_json", "repeat_offender_json"
        ]:
            key = col.replace("_json", "")
            try:
                result[key] = json.loads(result[col]) if result[col] else {}
            except Exception:
                result[key] = {}

        return result


def get_product_repository(
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """
    Returns paginated product repository records showing compliance track record.
    """
    offset = max(0, (page - 1) * limit)
    conditions: List[str] = []
    params: List[Any] = []

    if search:
        conditions.append("(brand LIKE ? OR product_name LIKE ?)")
        term = f"%{search}%"
        params.extend([term, term])

    if category and category.upper() != "ALL":
        conditions.append("category LIKE ?")
        params.append(f"%{category}%")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM products {where_clause};", params)
        total = cursor.fetchone()[0]

        cursor.execute(f"""
            SELECT * FROM products
            {where_clause}
            ORDER BY total_scans DESC, last_scanned DESC
            LIMIT ? OFFSET ?;
        """, params + [limit, offset])

        rows = cursor.fetchall()
        prods = [dict(r) for r in rows]

    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return {
        "page": page,
        "limit": limit,
        "total_products": total,
        "total_pages": total_pages,
        "products": prods
    }


def get_enforcement_analytics(db_path: str = DB_PATH) -> Dict[str, Any]:
    """
    Aggregates full operational metrics for Legal Metrology enforcement dashboards:
    - High-level KPIs (Total Inspections, Seizure Rate, Compounding Fees Assessed)
    - Verdict breakdown
    - Rule infraction distribution
    - Top repeat-offending entities
    - Category compliance rates
    - Recent inspections timeline
    """
    today_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    month_prefix = datetime.now(timezone.utc).strftime("%Y-%m")

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # 1. Total counts
        cursor.execute("SELECT COUNT(*) FROM scans;")
        total_scans = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM scans WHERE timestamp LIKE ?;", (f"{today_prefix}%",))
        today_scans = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM scans WHERE timestamp LIKE ?;", (f"{month_prefix}%",))
        month_scans = cursor.fetchone()[0]

        # 2. Verdict breakdown
        cursor.execute("""
            SELECT verdict, COUNT(*) as cnt
            FROM scans
            GROUP BY verdict;
        """)
        verdict_rows = cursor.fetchall()
        verdict_counts = {"COMPLIANT": 0, "REVIEW_REQUIRED": 0, "POTENTIAL_VIOLATION": 0}
        for r in verdict_rows:
            v = r["verdict"]
            if v in verdict_counts:
                verdict_counts[v] = r["cnt"]

        compliant_count = verdict_counts["COMPLIANT"]
        review_count = verdict_counts["REVIEW_REQUIRED"]
        violation_count = verdict_counts["POTENTIAL_VIOLATION"]

        compliance_rate = round((compliant_count / total_scans * 100.0), 1) if total_scans > 0 else 100.0
        violation_rate = round((violation_count / total_scans * 100.0), 1) if total_scans > 0 else 0.0

        # Estimated Compounding Fees (Section 36: ₹25,000 for 1st offence, ₹50,000 for repeat)
        estimated_fees = (violation_count * 25000)

        # 3. Rule breakdown by scanning cards_json
        cursor.execute("SELECT cards_json FROM scans;")
        cards_rows = cursor.fetchall()
        rule_stats: Dict[str, Dict[str, int]] = {}

        for r in cards_rows:
            try:
                cards = json.loads(r["cards_json"])
                for c in cards:
                    rule_id = c.get("id") or "other"
                    label = c.get("label") or rule_id
                    status = c.get("actual_status") or c.get("status")
                    if rule_id not in rule_stats:
                        rule_stats[rule_id] = {"label": label, "pass": 0, "review": 0, "fail": 0, "total": 0}
                    rule_stats[rule_id]["total"] += 1
                    if status == "PASS":
                        rule_stats[rule_id]["pass"] += 1
                    elif status in ("REVIEW_REQUIRED", "WARN"):
                        rule_stats[rule_id]["review"] += 1
                    elif status == "FAIL":
                        rule_stats[rule_id]["fail"] += 1
            except Exception:
                continue

        # Sort rules by highest failure rate
        rule_breakdown = []
        for rid, s in rule_stats.items():
            tot = s["total"]
            fail_pct = round((s["fail"] / tot) * 100.0, 1) if tot > 0 else 0.0
            rule_breakdown.append({
                "rule_id": rid,
                "label": s["label"],
                "total": tot,
                "pass": s["pass"],
                "review": s["review"],
                "fail": s["fail"],
                "failure_rate": fail_pct
            })
        rule_breakdown.sort(key=lambda x: (x["fail"], x["review"]), reverse=True)

        # 4. Top Violating Entities
        cursor.execute("""
            SELECT entity_name, offense_count, risk_tier, statutory_action
            FROM entities
            WHERE offense_count > 0
            ORDER BY offense_count DESC
            LIMIT 6;
        """)
        top_violators = [dict(r) for r in cursor.fetchall()]

        # 5. Category breakdown
        cursor.execute("""
            SELECT category, COUNT(*) as total,
                   SUM(CASE WHEN verdict = 'COMPLIANT' THEN 1 ELSE 0 END) as passed,
                   SUM(CASE WHEN verdict = 'POTENTIAL_VIOLATION' THEN 1 ELSE 0 END) as failed
            FROM scans
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY total DESC;
        """)
        category_breakdown = []
        for r in cursor.fetchall():
            tot = r["total"]
            p = r["passed"] or 0
            f = r["failed"] or 0
            rate = round((p / tot) * 100.0, 1) if tot > 0 else 0.0
            category_breakdown.append({
                "category": r["category"],
                "total": tot,
                "passed": p,
                "failed": f,
                "compliance_rate": rate
            })

        # 6. Recent Inspections Feed (Last 15)
        cursor.execute("""
            SELECT id, timestamp, inspector_id, brand, product_name, category, verdict, score
            FROM scans
            ORDER BY timestamp DESC
            LIMIT 15;
        """)
        recent_inspections = [dict(r) for r in cursor.fetchall()]

    return {
        "kpis": {
            "total_inspections": total_scans,
            "today_inspections": today_scans,
            "month_inspections": month_scans,
            "compliance_rate": compliance_rate,
            "violation_rate": violation_rate,
            "compliant_count": compliant_count,
            "review_count": review_count,
            "violation_count": violation_count,
            "estimated_compounding_fines_inr": estimated_fees
        },
        "verdict_distribution": verdict_counts,
        "rule_breakdown": rule_breakdown,
        "category_breakdown": category_breakdown,
        "top_violators": top_violators,
        "recent_inspections": recent_inspections
    }


def seed_existing_gallery_scans(manifest_path: str, results_path: str, db_path: str = DB_PATH) -> int:
    """
    Populates the database with existing mass-test benchmark results so that
    the repository and enforcement dashboard are immediately fully populated with
    real statutory findings.
    """
    if not os.path.exists(results_path):
        return 0

    with open(results_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    packages = data.get("packages", [])
    seeded_count = 0

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM scans;")
        if cursor.fetchone()[0] > 0:
            return 0  # Already has records

    for pkg in packages:
        scan_id = f"SCAN-PKG-{pkg['id']}"
        now_iso = datetime.now(timezone.utc).isoformat()
        scan_data = {
            "id": scan_id,
            "timestamp": now_iso,
            "inspector_id": "DLMO-PUNE-CENTRAL",
            "brand": pkg.get("brand", "Standard FMCG"),
            "product_name": pkg.get("product_name", "Packaged Commodity"),
            "category": pkg.get("category", "Food / Beverage"),
            "verdict_state": pkg.get("evaluated_verdict", "COMPLIANT"),
            "score_percentage": pkg.get("score_percentage", 100.0),
            "is_compliant": pkg.get("evaluated_verdict") == "COMPLIANT",
            "cards": pkg.get("cards", []),
            "ocr_lines": [d.get("text", "") for d in pkg.get("ocr_details", [])],
            "summary": {
                "score_percentage": pkg.get("score_percentage", 100.0),
                "total_rules": len(pkg.get("cards", [])),
                "passed_count": sum(1 for c in pkg.get("cards", []) if c.get("status") == "PASS"),
                "review_count": sum(1 for c in pkg.get("cards", []) if c.get("status") in ("REVIEW_REQUIRED", "WARN")),
                "violation_count": sum(1 for c in pkg.get("cards", []) if c.get("status") == "FAIL"),
            },
            "evidence_vault": {
                "image_sha256": hashlib.sha256(pkg["id"].encode()).hexdigest(),
                "gps_lat": 18.5204,
                "gps_lon": 73.8567,
                "district": "Pune Central Division",
                "state": "Maharashtra",
                "timestamp_utc": now_iso,
                "inspector_id": "DLMO-PUNE-CENTRAL"
            },
            "font_compliance": {
                "package_width_mm": 100.0,
                "all_fonts_compliant": True
            },
            "image_filename": pkg.get("filename", "")
        }
        save_scan(scan_data, db_path=db_path)
        seeded_count += 1

    return seeded_count
