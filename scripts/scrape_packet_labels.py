"""
scrape_packet_labels.py — Downloads authentic Indian packaging label images from Open Food Facts API.
Saves images and metadata into assets/mass_test_labels/
"""

import os
import json
import time
import requests
from typing import List, Dict, Any

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "mass_test_labels")
USER_AGENT = "SIH-LegalMetrologyAuditor/1.0 (contact: auditor@sih.gov.in)"

CATEGORIES = [
    "snacks",
    "biscuits",
    "beverages",
    "spices",
    "noodles",
    "dairy",
    "sweets"
]


def fetch_indian_products(category: str, page_size: int = 15) -> List[Dict[str, Any]]:
    url = "https://world.openfoodfacts.org/cgi/search.pl"
    params = {
        "action": "process",
        "tagtype_0": "countries",
        "tag_contains_0": "contains",
        "tag_0": "india",
        "tagtype_1": "categories",
        "tag_contains_1": "contains",
        "tag_1": category,
        "page_size": page_size,
        "json": 1
    }
    headers = {"User-Agent": USER_AGENT}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=12)
        if response.status_code == 200:
            return response.json().get("products", [])
    except Exception as e:
        print(f"Error querying Open Food Facts for category '{category}': {e}")
    return []


def get_image_url_for_product(product: Dict[str, Any]) -> str:
    # Check selected images first
    selected = product.get("selected_images", {})
    for img_type in ["ingredients", "packaging", "nutrition", "front"]:
        type_dict = selected.get(img_type, {})
        if isinstance(type_dict, dict):
            for lang in ["en", "in", "hi"]:
                display_url = type_dict.get(lang, {}).get("display")
                if display_url:
                    return display_url

    # Fallback to direct barcode construction if raw images exist
    code = product.get("code")
    images = product.get("images", {})
    if code and images:
        code_str = str(code).zfill(13)
        if len(code_str) == 13:
            path_part = f"{code_str[:3]}/{code_str[3:6]}/{code_str[6:9]}/{code_str[9:]}"
        else:
            path_part = code_str

        # Look for ingredients, packaging, or numeric keys
        for key in ["ingredients_en", "packaging_en", "1", "2", "3", "front_en"]:
            if key in images:
                return f"https://images.openfoodfacts.org/images/products/{path_part}/{key}.400.jpg"

    return ""


def download_image(url: str, output_path: str) -> bool:
    headers = {"User-Agent": USER_AGENT}
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200 and len(resp.content) > 1000:
            with open(output_path, "wb") as f:
                f.write(resp.content)
            return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
    return False


def run_scraping(target_count: int = 10):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    manifest_path = os.path.join(OUTPUT_DIR, "scraped_manifest.json")
    
    downloaded_records = []
    seen_barcodes = set()

    print(f"Starting Open Food Facts scraping for Indian packaging labels (Target: {target_count})...")
    
    for cat in CATEGORIES:
        if len(downloaded_records) >= target_count:
            break
        print(f"Searching category: {cat}...")
        products = fetch_indian_products(cat, page_size=12)
        
        for p in products:
            if len(downloaded_records) >= target_count:
                break
            code = p.get("code")
            if not code or code in seen_barcodes:
                continue
            
            seen_barcodes.add(code)
            brand = p.get("brands", "FMCG Brand")
            product_name = p.get("product_name", cat.title())
            
            img_url = get_image_url_for_product(p)
            if not img_url:
                continue
                
            clean_name = f"scraped_{cat}_{code}.jpg"
            save_path = os.path.join(OUTPUT_DIR, clean_name)
            
            print(f"  Downloading: {brand} - {product_name} ({img_url})...")
            if download_image(img_url, save_path):
                record = {
                    "id": f"scraped_{code}",
                    "filename": clean_name,
                    "filepath": save_path,
                    "brand": brand,
                    "product_name": product_name,
                    "category": cat.title(),
                    "barcode": code,
                    "source_url": img_url,
                    "source": "Open Food Facts (Public Domain / ODbL)"
                }
                downloaded_records.append(record)
                print(f"  Saved ({len(downloaded_records)}/{target_count}): {clean_name}")
            time.sleep(0.5)

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(downloaded_records, f, indent=2)
        
    print(f"Scraping completed! Saved {len(downloaded_records)} packages to {OUTPUT_DIR}")
    return downloaded_records


if __name__ == "__main__":
    run_scraping(target_count=10)
