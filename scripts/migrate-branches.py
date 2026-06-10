#!/usr/bin/env python3
"""For each brand branch, fetch its Icons page from the Figma REST API,
collect all (component-set, filled=off/on) variant node IDs, download each
as SVG, and save to public/raw/elsway/<brand>/<weight>/<icon>.svg."""
import json
import os
import sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.parse

TOKEN = os.environ.get("FIGMA_TOKEN")
if not TOKEN:
    print("Set FIGMA_TOKEN", file=sys.stderr); sys.exit(1)

BRANCHES = [
    ("default",     "4yk7LXdp0BJGIMOMlOlAY5"),
    ("cars24",      "dJ6vMqU4vPW8PrM7FAp1q1"),
    ("carinfo",     "oX8mft6sRv2SwEsC3xWNoI"),
    ("vehicleinfo", "Y5tZBTpAgMuGJGp4TJxPT0"),
    ("teambhp",     "HHyvMGLYjZUEtFVkblOqnZ"),
]

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "raw" / "elsway"
BATCH = 80
WORKERS_DL = 16

def http_get_json(url):
    req = urllib.request.Request(url, headers={"X-Figma-Token": TOKEN})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)

def http_get_text(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read().decode("utf-8")

def find_icons_page_id(file_key):
    """Return the id of the page named 'Icons' (or first page with most icons)."""
    data = http_get_json(f"https://api.figma.com/v1/files/{file_key}?depth=1")
    pages = data["document"]["children"]
    # Pick the page that looks like the icon page
    for p in pages:
        nm = (p.get("name") or "").strip().lower()
        if "icon" in nm:
            return p["id"], p.get("name")
    return pages[0]["id"], pages[0].get("name")

def collect_targets(file_key, page_id, brand):
    """Fetch the page tree and return [{nodeId, icon, brand, weight}, ...]"""
    url = f"https://api.figma.com/v1/files/{file_key}/nodes?ids={urllib.parse.quote(page_id)}&depth=4"
    data = http_get_json(url)
    node_root = data["nodes"][page_id]["document"]
    targets = []
    def walk(n):
        if n.get("type") == "COMPONENT_SET":
            icon_name = n.get("name", "").split(",")[0].strip()
            for v in n.get("children", []):
                vn = v.get("name", "")
                if "filled=off" in vn:
                    targets.append({"nodeId": v["id"], "icon": icon_name,
                                    "brand": brand, "weight": "regular"})
                elif "filled=on" in vn:
                    targets.append({"nodeId": v["id"], "icon": icon_name,
                                    "brand": brand, "weight": "fill"})
            return
        for c in n.get("children", []):
            walk(c)
    walk(node_root)
    return targets

def write_svg(brand, weight, icon, svg):
    p = OUT / brand / weight / f"{icon}.svg"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(svg, encoding="utf-8")

def download_batch(file_key, targets):
    by_id = {t["nodeId"]: t for t in targets}
    ids_all = list(by_id.keys())
    saved = 0; failed = 0
    t0 = time.time()
    batch_count = (len(ids_all) + BATCH - 1) // BATCH
    for bi in range(batch_count):
        chunk = ids_all[bi * BATCH : (bi + 1) * BATCH]
        url = (f"https://api.figma.com/v1/images/{file_key}"
               f"?ids={urllib.parse.quote(','.join(chunk))}&format=svg")
        try:
            data = http_get_json(url)
        except Exception as e:
            print(f"    URL fetch batch {bi+1}/{batch_count} failed: {e}", file=sys.stderr)
            failed += len(chunk); continue
        images = data.get("images") or {}

        def fetch_one(nid):
            t = by_id[nid]
            u = images.get(nid)
            if not u: return ("miss", t, None)
            try: return ("ok", t, http_get_text(u))
            except Exception as e: return ("err", t, str(e))

        with ThreadPoolExecutor(max_workers=WORKERS_DL) as ex:
            futures = [ex.submit(fetch_one, nid) for nid in chunk]
            for fut in as_completed(futures):
                status, t, payload = fut.result()
                if status == "ok":
                    write_svg(t["brand"], t["weight"], t["icon"], payload)
                    saved += 1
                else:
                    failed += 1
        elapsed = time.time() - t0
        rate = (saved + failed) / elapsed if elapsed else 0
        print(f"    batch {bi+1}/{batch_count}  saved={saved}  failed={failed}  rate={rate:.1f}/s",
              file=sys.stderr)
    return saved, failed

def main():
    only = os.environ.get("ONLY_BRAND")
    grand_saved = 0
    grand_failed = 0
    for brand, file_key in BRANCHES:
        if only and brand != only:
            continue
        print(f"\n=== {brand} ({file_key}) ===", file=sys.stderr)
        page_id, page_name = find_icons_page_id(file_key)
        print(f"  page: '{page_name}' id={page_id}", file=sys.stderr)
        targets = collect_targets(file_key, page_id, brand)
        print(f"  targets: {len(targets)}", file=sys.stderr)
        saved, failed = download_batch(file_key, targets)
        print(f"  DONE  saved={saved}  failed={failed}", file=sys.stderr)
        grand_saved += saved
        grand_failed += failed
    print(f"\n=== TOTAL saved={grand_saved}  failed={grand_failed} ===", file=sys.stderr)

if __name__ == "__main__":
    main()
