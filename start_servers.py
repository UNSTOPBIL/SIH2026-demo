"""
start_servers.py — Concurrent launcher for FastAPI Backend & Next.js Modern Frontend.
Usage: python start_servers.py
"""

import os
import subprocess
import sys
import time
import webbrowser

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


import socket

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main():
    print("=" * 65)
    print("  LEGAL METROLOGY COMPLIANCE SCANNER (SIH 2026)")
    print("  Starting FastAPI Backend & Next.js 15 AgentFlow Frontend...")
    print("=" * 65)

    local_ip = get_local_ip()

    # 1. Start FastAPI backend on port 8000 (bind 0.0.0.0 for LAN access)
    print(f"[1/2] Launching FastAPI Backend Bridge on http://{local_ip}:8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=BASE_DIR,
    )

    # 2. Start Next.js frontend on port 3000
    print(f"[2/2] Launching Next.js Frontend on http://{local_ip}:3000...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR,
    )

    print("\n✓ Both services are active!")
    print(f"  - Local Dashboard:     http://localhost:3000")
    print(f"  - Mobile / LAN Access: http://{local_ip}:3000")
    print(f"  - API & Swagger Docs:  http://{local_ip}:8000/docs")
    print("  (Tip: Ensure your mobile phone is connected to the same Wi-Fi network)\n")


    time.sleep(2)
    webbrowser.open("http://localhost:3000")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Done.")


if __name__ == "__main__":
    main()
