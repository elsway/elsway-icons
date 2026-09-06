#!/usr/bin/env node
/**
 * Builds one icon font per brand from the SVGs in public/raw/elsway. Both
 * weights live in the same file, so a project installs a single font; glyphs
 * are named "<icon>-<weight>", e.g. heart-regular / heart-fill.
 *
 * Codepoints start at U+E900 — the base of the Unicode Private Use Area, where
 * icon fonts conventionally live. Regular occupies one contiguous block and
 * fill the next, both ordered by the icon's index in manifest.json, which is
 * sorted alphabetically. That makes a codepoint mean the same icon in every
 * brand and stable across rebuilds — as long as icons are only ever appended.
 * Renaming or deleting an icon shifts every codepoint after it, which would
 * break already-shipped fonts; see the ordering guard below.
 *
 * Usage: node scripts/generate-fonts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { SVGIcons2SVGFontStream } from "svgicons2svgfont";

const require = createRequire(import.meta.url);
const svg2ttf = require("svg2ttf");
const ttf2woff = require("ttf2woff");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "public/raw/elsway");
const OUT = path.join(ROOT, "public/font");

const BRANDS = ["default", "cars24", "carinfo", "teambhp", "vehicleinfo"];
const WEIGHTS = ["regular", "fill"];
const START_CODEPOINT = 0xe900;
const EM = 1024; // em square the glyph outlines are scaled into
const PREFIX = "ai-";

const names = JSON.parse(
  fs.readFileSync(path.join(RAW, "manifest.json"), "utf8")
);

// A font's whole value is that a codepoint keeps meaning the same glyph. If the
// manifest ever stops being sorted, indexes shift and previously shipped fonts
// silently point at the wrong icons.
const sorted = [...names].sort();
if (names.some((n, i) => n !== sorted[i])) {
  console.error(
    "manifest.json is not alphabetically sorted — codepoints would shift.\n" +
      "Sort it before regenerating, or shipped fonts will break."
  );
  process.exit(1);
}

const glyphName = (name, weight) => `${name}-${weight}`;
// regular fills [E900 .. E900+n), fill follows immediately after
const codepointOf = (name, weight) =>
  START_CODEPOINT +
  names.indexOf(name) +
  (weight === "fill" ? names.length : 0);
const hex = (cp) => cp.toString(16);

/** Fonts have no stroke concept: a stroked path simply will not render. */
function findStroked(dir) {
  return names.filter((n) => {
    const f = path.join(dir, `${n}.svg`);
    return fs.existsSync(f) && /stroke="(?!none)/.test(fs.readFileSync(f, "utf8"));
  });
}

async function buildSvgFont(brandDir, fontName) {
  const stream = new SVGIcons2SVGFontStream({
    fontName,
    fontHeight: EM,
    normalize: true,
    centerHorizontally: true,
    log: () => {},
  });

  let out = "";
  stream.on("data", (chunk) => (out += chunk));
  const finished = new Promise((res, rej) => {
    stream.on("finish", res);
    stream.on("error", rej);
  });

  let missing = 0;
  const present = [];
  for (const weight of WEIGHTS) {
    for (const name of names) {
      const file = path.join(brandDir, weight, `${name}.svg`);
      if (!fs.existsSync(file)) {
        missing++;
        continue;
      }
      const glyph = Readable.from([fs.readFileSync(file)]);
      glyph.metadata = {
        unicode: [String.fromCodePoint(codepointOf(name, weight))],
        name: glyphName(name, weight),
      };
      stream.write(glyph);
      present.push([name, weight]);
    }
  }
  stream.end();
  await finished;
  return { svgFont: out, missing, present };
}

function cssFor(fontName, present) {
  const rules = present
    .map(([n, w]) => {
      const g = glyphName(n, w);
      return `.${PREFIX}${g}:before { content: "\\${hex(codepointOf(n, w))}"; }`;
    })
    .join("\n");

  return [
    `@font-face {`,
    `  font-family: "${fontName}";`,
    `  src:`,
    `    url("${fontName}.woff") format("woff"),`,
    `    url("${fontName}.ttf") format("truetype");`,
    `  font-weight: normal;`,
    `  font-style: normal;`,
    `  font-display: block;`,
    `}`,
    ``,
    `[class^="${PREFIX}"],`,
    `[class*=" ${PREFIX}"] {`,
    `  font-family: "${fontName}" !important;`,
    `  speak: never;`,
    `  font-style: normal;`,
    `  font-weight: normal;`,
    `  font-variant: normal;`,
    `  text-transform: none;`,
    `  line-height: 1;`,
    `  -webkit-font-smoothing: antialiased;`,
    `  -moz-osx-font-smoothing: grayscale;`,
    `}`,
    ``,
    rules,
    ``,
  ].join("\n");
}

function readmeFor(fontName, count, brand) {
  return `Autonaut Icons — ${brand}
${"=".repeat(40)}

${count} glyphs — every icon in both weights, in one font.
Generated from the SVG source; do not hand-edit.

Files
  ${fontName}.ttf       the icon font
  ${fontName}.woff      same font, web-optimised
  ${fontName}.css       helper classes
  codepoints.json       every glyph name and its codepoint

Naming
  Each glyph is "<icon>-<weight>", so both weights sit side by side:
    <i class="${PREFIX}heart-regular"></i>
    <i class="${PREFIX}heart-fill"></i>

Web
  1. Copy the font files and the CSS into your project.
  2. <link rel="stylesheet" href="${fontName}.css">
  3. <i class="${PREFIX}heart-fill"></i>

Anywhere else (Figma, Sketch, native apps)
  Install ${fontName}.ttf and type the glyph's codepoint.
  Codepoints start at U+E900 and are listed in codepoints.json.

Colour and size follow the surrounding text, exactly like a letter:
  .my-icon { font-size: 32px; color: #1a1a1a; }
`;
}

fs.mkdirSync(OUT, { recursive: true });

const strokedWarnings = new Set();
const index = {};

for (const brand of BRANDS) {
  const brandDir = path.join(RAW, brand);
  const fontName = `autonaut-${brand}`;
  const dest = path.join(OUT, brand);
  fs.mkdirSync(dest, { recursive: true });

  for (const weight of WEIGHTS) {
    findStroked(path.join(brandDir, weight)).forEach((n) =>
      strokedWarnings.add(`${brand}/${weight}/${n}`)
    );
  }

  const { svgFont, missing, present } = await buildSvgFont(brandDir, fontName);

  const ttf = Buffer.from(svg2ttf(svgFont, { description: fontName }).buffer);
  const woff = Buffer.from(ttf2woff(ttf).buffer);

  fs.writeFileSync(path.join(dest, `${fontName}.ttf`), ttf);
  fs.writeFileSync(path.join(dest, `${fontName}.woff`), woff);
  fs.writeFileSync(path.join(dest, `${fontName}.css`), cssFor(fontName, present));
  fs.writeFileSync(
    path.join(dest, "README.txt"),
    readmeFor(fontName, present.length, brand)
  );

  index[brand] = { fontName, glyphs: present.length, ttfBytes: ttf.length };
  console.log(
    `  ${fontName.padEnd(28)} ${String(present.length).padStart(4)} glyphs  ` +
      `${(ttf.length / 1024).toFixed(0).padStart(4)} KB` +
      (missing ? `  (${missing} missing)` : "")
  );
}

// One shared map for the app: every brand uses the same codepoint per icon.
fs.writeFileSync(
  path.join(OUT, "codepoints.json"),
  JSON.stringify(
    Object.fromEntries(
      WEIGHTS.flatMap((w) =>
        names.map((n) => [glyphName(n, w), codepointOf(n, w)])
      )
    ),
    null,
    0
  )
);
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 2));

console.log(
  `\n  codepoints.json  ${names.length * WEIGHTS.length} glyphs, ` +
    `U+E900 … U+${hex(codepointOf(names[names.length - 1], "fill")).toUpperCase()}`
);

if (strokedWarnings.size) {
  console.log(
    `\n  NOTE: ${strokedWarnings.size} source SVGs use stroke, which a font cannot`
  );
  console.log("  represent. Those glyphs are missing that path:");
  [...strokedWarnings].sort().forEach((w) => console.log(`    ${w}`));
}
