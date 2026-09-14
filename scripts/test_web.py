import urllib.request, re

try:
    with urllib.request.urlopen("http://localhost:3000", timeout=5) as res:
        html = res.read().decode("utf-8")
        print(f"Root HTML: {res.status}")
        scripts = re.findall(r'src="(/_next/[^"]+)"', html)
        print(f"Checking {len(scripts)} scripts...")
        for s in scripts:
            with urllib.request.urlopen("http://localhost:3000" + s, timeout=5) as s_res:
                if s_res.status != 200:
                    print(f"Error on {s}: {s_res.status}")
        print("All scripts loaded successfully!")
except Exception as e:
    print("Failed:", e)
