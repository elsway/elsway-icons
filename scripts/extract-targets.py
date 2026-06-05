#!/usr/bin/env python3
"""Parse Figma API response and emit list of {iconName, brand, weight, nodeId}
for every target variant (stroke=1.5 × filled × radius/join combos)."""
import json
import sys
from pathlib import Path

INFILE = "/tmp/figma-icons-page.json"
OUT = "/tmp/figma-targets.json"

# brand -> (radius, join)
BRANDS = {
    "default":     ("0", "square"),
    "carinfo":     ("1", "round"),
    "cars24":      ("2", "round"),
    "vehicleinfo": ("3", "round"),
}
WEIGHTS = {"regular": "off", "fill": "on"}

print("Loading...", file=sys.stderr)
data = json.load(open(INFILE))

# Navigate: data.nodes['7:118'].document.children = top-level frames on page
page_node = data["nodes"]["7:118"]["document"]

def walk(node, out):
    if node.get("type") == "COMPONENT_SET":
        out.append(node)
        return  # don't recurse into its variants here
    for c in node.get("children", []) or []:
        walk(c, out)

sets = []
walk(page_node, sets)
print(f"Found {len(sets)} component sets", file=sys.stderr)

targets = []
missing = 0
for cs in sets:
    icon_name = cs["name"]
    children = cs.get("children", [])
    for brand, (radius, join) in BRANDS.items():
        for weight, filled in WEIGHTS.items():
            key = f"filled={filled}, stroke=1.5, radius={radius}, join={join}"
            v = next((c for c in children if c["name"] == key), None)
            if not v:
                missing += 1
                continue
            targets.append({
                "icon": icon_name,
                "brand": brand,
                "weight": weight,
                "nodeId": v["id"],
            })

print(f"Targets: {len(targets)} | Missing: {missing}", file=sys.stderr)
json.dump(targets, open(OUT, "w"))
print(f"Wrote {OUT}", file=sys.stderr)
