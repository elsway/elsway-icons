#!/usr/bin/env python3
"""Bulk-download SVGs from Figma via REST API and save them under
public/raw/elsway/<brand>/<weight>/<icon>.svg. Mirrors cars24 → teambhp."""
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
    print("Set FIGMA_TOKEN env var", file=sys.stderr); sys.exit(1)

FILE_KEY = "R4oNERMgyPCXJnPt1OH4wn"
TARGETS = "/tmp/figma-targets.json"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "raw" / "elsway"
BATCH = 80   # node IDs per /v1/images call
WORKERS_DL = 16

def http_get_json(url):
    req = urllib.request.Request(url, headers={"X-Figma-Token": TOKEN})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)

def http_get_text(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read().decode("utf-8")

def write_svg(brand, weight, icon, svg):
    p = OUT / brand / weight / f"{icon}.svg"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(svg, encoding="utf-8")
    if brand == "cars24":
        p2 = OUT / "teambhp" / weight / f"{icon}.svg"
        p2.parent.mkdir(parents=True, exist_ok=True)
        p2.write_text(svg, encoding="utf-8")

def main():
    targets = json.load(open(TARGETS))
    by_id = {t["nodeId"]: t for t in targets}
    ids_all = list(by_id.keys())
    print(f"Total targets: {len(ids_all)}", file=sys.stderr)

    saved = 0
    failed = 0
    t0 = time.time()
    batch_count = (len(ids_all) + BATCH - 1) // BATCH
    for bi in range(batch_count):
        chunk = ids_all[bi * BATCH : (bi + 1) * BATCH]
        # /v1/images returns {images: {id: url}}
        url = (
            f"https://api.figma.com/v1/images/{FILE_KEY}"
            f"?ids={urllib.parse.quote(','.join(chunk))}&format=svg"
        )
        try:
            data = http_get_json(url)
        except Exception as e:
            print(f"  batch {bi+1}/{batch_count} ERROR fetching URLs: {e}",
                  file=sys.stderr)
            failed += len(chunk)
            continue
        images = data.get("images") or {}

        # Download in parallel
        def fetch_one(node_id):
            t = by_id[node_id]
            u = images.get(node_id)
            if not u:
                return ("miss-url", t, None)
            try:
                svg = http_get_text(u)
            except Exception as e:
                return ("err", t, str(e))
            return ("ok", t, svg)

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
        remaining = len(ids_all) - (saved + failed)
        eta = remaining / rate if rate else 0
        print(
            f"  batch {bi+1}/{batch_count}  saved={saved}  failed={failed}  "
            f"rate={rate:.1f}/s  eta={eta:.0f}s",
            file=sys.stderr,
        )

    print(f"\nDONE  saved={saved}  failed={failed}", file=sys.stderr)

if __name__ == "__main__":
    main()
