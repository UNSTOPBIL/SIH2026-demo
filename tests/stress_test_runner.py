"""
stress_test_runner.py — High-Concurrency & Payload Boundary Stress Test Suite for Legal Metrology System.
Measures latency (p50, p95, p99), throughput (RPS), error rates, and security payload boundaries.
"""

from __future__ import annotations

import base64
import concurrent.futures
import io
import json
import statistics
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Tuple
from PIL import Image

BASE_URL = "http://127.0.0.1:8000"
FRONTEND_PROXY_URL = "http://localhost:3000"


def make_request(url: str, method: str = "GET", data: bytes = None, headers: dict = None) -> Tuple[int, float, str]:
    """Execute a single HTTP request and measure latency."""
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            body = res.read()
            latency = (time.perf_counter() - start) * 1000.0  # ms
            return res.status, latency, ""
    except urllib.error.HTTPError as e:
        latency = (time.perf_counter() - start) * 1000.0
        return e.code, latency, str(e.reason)
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000.0
        return 0, latency, str(e)


def run_concurrency_stress(endpoint: str, concurrency: int, total_requests: int) -> Dict[str, Any]:
    """Run concurrent workers against an endpoint and collect telemetry."""
    url = f"{BASE_URL}{endpoint}"
    latencies: List[float] = []
    status_codes: Dict[int, int] = {}
    errors: List[str] = []

    start_wall_time = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_request, url) for _ in range(total_requests)]
        for fut in concurrent.futures.as_completed(futures):
            code, lat, err = fut.result()
            latencies.append(lat)
            status_codes[code] = status_codes.get(code, 0) + 1
            if code != 200:
                errors.append(f"HTTP {code}: {err}")

    wall_duration = time.perf_counter() - start_wall_time
    rps = total_requests / wall_duration if wall_duration > 0 else 0

    latencies.sort()
    p50 = statistics.median(latencies)
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0
    p99 = latencies[int(len(latencies) * 0.99)] if latencies else 0
    avg = statistics.mean(latencies) if latencies else 0

    return {
        "endpoint": endpoint,
        "concurrency": concurrency,
        "total_requests": total_requests,
        "duration_sec": round(wall_duration, 3),
        "rps": round(rps, 1),
        "status_codes": status_codes,
        "avg_ms": round(avg, 2),
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
        "errors": errors[:5],
        "passed": status_codes.get(200, 0) == total_requests
    }


def test_payload_boundaries() -> List[Dict[str, Any]]:
    """Test image payload boundaries: normal, oversized (>15MB), and corrupt."""
    results = []

    # 1. Normal Image Payload Test (500x500 PNG)
    print("\n[Payload Test 1] Standard 500x500 PNG base64 upload...")
    img = Image.new("RGB", (500, 500), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    payload = json.dumps({"image_base64": b64_str, "confidence_threshold": 0.55}).encode("utf-8")

    code, lat, err = make_request(
        f"{BASE_URL}/api/scan-base64",
        method="POST",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    passed_normal = (code == 200)
    print(f"  Result: HTTP {code} ({round(lat, 1)}ms) - {'PASS' if passed_normal else 'FAIL'}")
    results.append({"name": "Standard Valid Image", "code": code, "lat_ms": round(lat, 1), "passed": passed_normal})

    # 2. Oversized Payload (>15MB cap)
    print("\n[Payload Test 2] Oversized 18MB payload boundary check...")
    oversized_data = b"A" * (18 * 1024 * 1024)
    oversized_b64 = base64.b64encode(oversized_data).decode("utf-8")
    oversized_payload = json.dumps({"image_base64": oversized_b64}).encode("utf-8")

    code, lat, err = make_request(
        f"{BASE_URL}/api/scan-base64",
        method="POST",
        data=oversized_payload,
        headers={"Content-Type": "application/json"}
    )
    # Server should return 413 Payload Too Large
    passed_oversized = (code == 413)
    print(f"  Result: HTTP {code} ({round(lat, 1)}ms) - {'PASS (Properly Rejected with 413)' if passed_oversized else 'FAIL'}")
    results.append({"name": "Oversized 18MB Payload", "code": code, "lat_ms": round(lat, 1), "passed": passed_oversized})

    # 3. Corrupted / Malformed Image Bytes
    print("\n[Payload Test 3] Corrupted non-image byte stream test...")
    garbage_bytes = b"NOT_AN_IMAGE_DATA_CORRUPT_BYTES_XYZ" * 100
    garbage_b64 = base64.b64encode(garbage_bytes).decode("utf-8")
    garbage_payload = json.dumps({"image_base64": garbage_b64}).encode("utf-8")

    code, lat, err = make_request(
        f"{BASE_URL}/api/scan-base64",
        method="POST",
        data=garbage_payload,
        headers={"Content-Type": "application/json"}
    )
    # Server should safely return 400 Bad Request
    passed_corrupt = (code == 400)
    print(f"  Result: HTTP {code} ({round(lat, 1)}ms) - {'PASS (Safely Handled with 400)' if passed_corrupt else 'FAIL'}")
    results.append({"name": "Corrupted Bytes Payload", "code": code, "lat_ms": round(lat, 1), "passed": passed_corrupt})

    return results


def main():
    print("==================================================")
    print(">>  LEGAL METROLOGY SYSTEM STRESS TEST RUNNER")
    print("==================================================")

    # Concurrency Stress Tests
    endpoints_to_stress = [
        ("/api/health", 50, 100),
        ("/api/presets/compliant", 30, 60),
        ("/api/presets/violation", 30, 60),
        ("/api/enforcement/analytics", 25, 50),
        ("/api/scans", 25, 50),
        ("/api/products", 25, 50),
        ("/api/test-gallery", 25, 50),
    ]

    summary_records = []
    for ep, conc, total in endpoints_to_stress:
        print(f"\n[Stress] Testing {ep} (Concurrency: {conc}, Total Requests: {total})...")
        res = run_concurrency_stress(ep, conc, total)
        print(f"  * RPS: {res['rps']} req/s | Avg: {res['avg_ms']}ms | P50: {res['p50_ms']}ms | P95: {res['p95_ms']}ms | P99: {res['p99_ms']}ms")
        print(f"  * Status Codes: {res['status_codes']}")
        summary_records.append(res)

    # Boundary & DoS Defense Tests
    boundary_records = test_payload_boundaries()

    print("\n==================================================")
    print("[REPORT] STRESS TESTING SUMMARY REPORT")
    print("==================================================")
    print(f"{'Endpoint':<30} | {'Conc':<5} | {'RPS':<8} | {'P50 (ms)':<8} | {'P95 (ms)':<8} | {'Success':<8}")
    print("-" * 75)
    for r in summary_records:
        succ = "100%" if r["passed"] else f"{r['status_codes'].get(200, 0)}/{r['total_requests']}"
        print(f"{r['endpoint']:<30} | {r['concurrency']:<5} | {r['rps']:<8} | {r['p50_ms']:<8} | {r['p95_ms']:<8} | {succ:<8}")

    print("\nSecurity Boundary Summary:")
    for b in boundary_records:
        status_str = "PASS" if b["passed"] else "FAIL"
        print(f"  - {b['name']:<25}: HTTP {b['code']} in {b['lat_ms']}ms -> [{status_str}]")
    print("==================================================\n")


if __name__ == "__main__":
    main()
