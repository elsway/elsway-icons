#!/usr/bin/env python3
"""Re-export specific icons from the MAIN Figma file and overwrite them for
every brand + weight in public/raw/elsway/.

The 5 brands are not separate exports here: the main file holds all 30
variants per icon (filled x stroke x radius x join), and each brand is one
(stroke, radius, join) combination. Rather than hard-coding that mapping,
this script DERIVES it: it exports every variant of a control icon that is
NOT being replaced, byte-compares each against the committed brand files,
and only proceeds if all 10 brand/weight slots resolve to exactly one
variant. That way a wrong guess fails loudly instead of shipping icons
that don't match their siblings.

Usage:  FIGMA_TOKEN=... python3 scripts/replace-icons.py [--control 4k] [--dry-run]
"""
import json, os, sys, re, argparse, urllib.request, urllib.parse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

TOKEN = os.environ.get("FIGMA_TOKEN")
if not TOKEN:
    sys.exit("Set FIGMA_TOKEN (Figma personal access token with file read scope)")

FILE_KEY = "R4oNERMgyPCXJnPt1OH4wn"          # Global icon BACKUP (main file)
BRANDS = ["default", "carinfo", "cars24", "teambhp", "vehicleinfo"]
WEIGHTS = ["regular", "fill"]                 # regular = filled=off, fill = filled=on

# The 6 icons being replaced, by their frame node id in the MAIN file.
TARGETS = {
    "adjust-photo":           "11449:32806",
    "arrow":                  "16060:54146",
    "bubble-question":        "8107:24818",
    "bubble-dots":            "8089:37691",
    "bubble-wide-annotation": "5658:58495",
    "circle-info":            "5457:1954",
}

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "raw" / "elsway"


def api(url):
    req = urllib.request.Request(url, headers={"X-Figma-Token": TOKEN})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def fetch_text(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read().decode("utf-8")


def variants_of(frame_id):
    """-> {variant_name: node_id} for one icon frame."""
    url = (f"https://api.figma.com/v1/files/{FILE_KEY}/nodes"
           f"?ids={urllib.parse.quote(frame_id)}&depth=2")
    doc = api(url)["nodes"][frame_id]["document"]
    return {c["name"]: c["id"] for c in doc.get("children", [])}


def find_frame_by_name(name):
    """Locate an icon frame node id by its layer name (for the control icon)."""
    pages = api(f"https://api.figma.com/v1/files/{FILE_KEY}?depth=1")["document"]["children"]
    page = next((p for p in pages if "icon" in (p.get("name") or "").lower()), pages[0])
    url = (f"https://api.figma.com/v1/files/{FILE_KEY}/nodes"
           f"?ids={urllib.parse.quote(page['id'])}&depth=2")
    root = api(url)["nodes"][page["id"]]["document"]
    for child in root.get("children", []):
        if (child.get("name") or "").strip() == name:
            return child["id"]
    raise SystemExit(f"control icon frame {name!r} not found on page {page.get('name')!r}")


def export_svgs(node_ids):
    """-> {node_id: svg_text}, batched."""
    out, ids = {}, list(node_ids)
    for i in range(0, len(ids), 60):
        batch = ids[i:i + 60]
        url = (f"https://api.figma.com/v1/images/{FILE_KEY}"
               f"?ids={urllib.parse.quote(','.join(batch))}&format=svg")
        images = api(url).get("images", {})
        with ThreadPoolExecutor(max_workers=12) as ex:
            futs = {ex.submit(fetch_text, u): nid for nid, u in images.items() if u}
            for f in as_completed(futs):
                out[futs[f]] = f.result()
        for nid in batch:
            if nid not in out:
                print(f"  ! no image returned for {nid}", file=sys.stderr)
    return out


def norm(s):
    """Compare ignoring insignificant whitespace only."""
    return re.sub(r"\s+", " ", s).strip()


def derive_mapping(control):
    """Return {(brand, weight): variant_name} proven against committed files."""
    print(f"Deriving brand -> variant mapping from control icon {control!r} ...")
    frame = find_frame_by_name(control)
    variants = variants_of(frame)
    svgs = export_svgs(variants.values())
    by_name = {vname: svgs.get(nid) for vname, nid in variants.items()}

    mapping, failures = {}, []
    for brand in BRANDS:
        for weight in WEIGHTS:
            path = OUT / brand / weight / f"{control}.svg"
            if not path.exists():
                failures.append(f"{brand}/{weight}: no committed {control}.svg to compare")
                continue
            committed = norm(path.read_text())
            hits = [v for v, svg in by_name.items() if svg and norm(svg) == committed]
            if len(hits) == 1:
                mapping[(brand, weight)] = hits[0]
                print(f"  {brand:12} {weight:8} -> {hits[0]}")
            else:
                failures.append(f"{brand}/{weight}: {len(hits)} variant matches "
                                f"({'; '.join(hits) if hits else 'none'})")
    if failures:
        print("\nCould not derive a unique mapping:", file=sys.stderr)
        for f in failures:
            print("  - " + f, file=sys.stderr)
        sys.exit("Refusing to write files on an unproven mapping.")
    return mapping


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--control", default="4k",
                    help="an icon NOT being replaced, used to prove the variant mapping")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.control in TARGETS:
        sys.exit(f"--control {args.control} is one of the icons being replaced; pick another")

    mapping = derive_mapping(args.control)

    print(f"\nExporting {len(TARGETS)} icons x {len(mapping)} brand/weight slots ...")
    written = 0
    for icon, frame_id in TARGETS.items():
        variants = variants_of(frame_id)
        needed = {v: variants[v] for v in set(mapping.values()) if v in variants}
        missing = set(mapping.values()) - set(variants)
        if missing:
            print(f"  ! {icon}: missing variants {sorted(missing)} — skipped", file=sys.stderr)
            continue
        svgs = export_svgs(needed.values())
        for (brand, weight), vname in mapping.items():
            svg = svgs.get(needed[vname])
            if not svg:
                print(f"  ! {icon} {brand}/{weight}: export failed", file=sys.stderr)
                continue
            dest = OUT / brand / weight / f"{icon}.svg"
            if args.dry_run:
                same = dest.exists() and norm(dest.read_text()) == norm(svg)
                print(f"  [dry] {dest.relative_to(ROOT)} {'unchanged' if same else 'WOULD CHANGE'}")
            else:
                dest.write_text(svg)
            written += 1
        print(f"  {icon}: {len(mapping)} files")
    print(f"\n{'Would write' if args.dry_run else 'Wrote'} {written} files.")


if __name__ == "__main__":
    main()
