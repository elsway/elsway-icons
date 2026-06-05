#!/usr/bin/env python3
"""Reads JSON files from scripts/icons_in/ where each file = {name, svgs:{brand__weight: svgString}}
and writes SVGs to public/raw/elsway/<brand>/<weight>/<name>.svg.
Copies cars24/* to teambhp/* (shared radius=2)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IN = ROOT / "scripts" / "icons_in"
OUT = ROOT / "public" / "raw" / "elsway"

if not IN.exists():
    print(f"No input dir at {IN}", file=sys.stderr)
    sys.exit(1)

written = 0
processed = 0
for fp in sorted(IN.glob("*.json")):
    try:
        entry = json.loads(fp.read_text())
    except Exception as e:
        print(f"skip {fp.name}: {e}", file=sys.stderr)
        continue
    name = entry["name"]
    for key, svg in entry["svgs"].items():
        brand, weight = key.split("__")
        target = OUT / brand / weight / f"{name}.svg"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(svg, encoding="utf-8")
        written += 1
        if brand == "cars24":
            mirror = OUT / "teambhp" / weight / f"{name}.svg"
            mirror.parent.mkdir(parents=True, exist_ok=True)
            mirror.write_text(svg, encoding="utf-8")
            written += 1
    processed += 1
    fp.unlink()  # consume

print(f"Processed {processed} icons, wrote {written} SVGs", file=sys.stderr)
