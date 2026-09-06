#!/usr/bin/env node
// Generates class-based CSS files — one per brand+weight — where each
// icon is a `.ai-{name}` class using a CSS mask (not a real webfont, no glyph
// encoding needed). Usage is <link> the one brand+weight you want, then
// <i class="ai ai-4k"></i> anywhere.
//
// CSS masks only use the referenced image's alpha channel, not its own
// fill color, so the original SVGs (fill="#0F172B") can be embedded as-is —
// `background-color: currentColor` on `.ai` supplies the actual visible
// color, exactly like an icon font glyph would.
//
// Usage: node scripts/generate-css-icons.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const RAW_DIR = path.join(REPO_ROOT, "public/raw/elsway");
const OUT_DIR = path.join(REPO_ROOT, "public/cdn");

const BRANDS = ["default", "carinfo", "cars24", "teambhp", "vehicleinfo"];
const WEIGHTS = ["regular", "fill"];

fs.mkdirSync(OUT_DIR, { recursive: true });

const manifest = JSON.parse(
  fs.readFileSync(path.join(RAW_DIR, "manifest.json"), "utf8")
);

// Minimal, safe URL-encoding for an SVG data URI — much smaller than base64
// for text-heavy SVG path data. Leaves most characters (digits, letters,
// path commands, punctuation) untouched; only escapes what data: URIs and
// CSS url() actually require.
function encodeSvgForDataUri(svg) {
  return svg
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim()
    .replace(/"/g, "'")
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\n/g, "");
}

const BASE_RULE = `.ai{display:inline-block;width:1em;height:1em;background-color:currentColor;vertical-align:-.125em;flex-shrink:0;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain}\n`;

let report = [];

for (const brand of BRANDS) {
  for (const weight of WEIGHTS) {
    const dir = path.join(RAW_DIR, brand, weight);
    const rules = [BASE_RULE];
    let missing = 0;
    for (const name of manifest) {
      const file = path.join(dir, `${name}.svg`);
      if (!fs.existsSync(file)) {
        missing++;
        continue;
      }
      const svg = fs.readFileSync(file, "utf8");
      const encoded = encodeSvgForDataUri(svg);
      const dataUri = `data:image/svg+xml,${encoded}`;
      rules.push(
        `.ai-${name}{-webkit-mask-image:url("${dataUri}");mask-image:url("${dataUri}")}\n`
      );
    }
    if (missing > 0) {
      console.warn(`[generate-css] ${brand}/${weight}: ${missing} icon(s) missing`);
    }
    const css = rules.join("");
    const outFile = path.join(OUT_DIR, `${brand}-${weight}.css`);
    fs.writeFileSync(outFile, css);
    report.push({ brand, weight, bytes: css.length, icons: rules.length - 1 });
  }
}

console.log("[generate-css] done:");
for (const r of report) {
  console.log(
    `  ${r.brand}-${r.weight}.css — ${r.icons} icons, ${(r.bytes / 1024 / 1024).toFixed(2)} MB`
  );
}
const total = report.reduce((s, r) => s + r.bytes, 0);
console.log(`[generate-css] total: ${(total / 1024 / 1024).toFixed(2)} MB across ${report.length} files`);
