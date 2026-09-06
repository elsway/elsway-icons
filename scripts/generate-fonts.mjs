#!/usr/bin/env node
/**
 * Builds an icon font per brand + weight from the SVGs in public/raw/elsway.
 *
 * Codepoints start at U+E900 (matching the IcoMoon convention the team already
 * hands to devs) and are assigned by the icon's index in manifest.json, which is
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
const EM = 1024; // IcoMoon's em size, so re-imports line up
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

const codepointOf = (name) => START_CODEPOINT + names.indexOf(name);
const hex = (cp) => cp.toString(16);

/** Fonts have no stroke concept: a stroked path simply will not render. */
function findStroked(dir) {
  return names.filter((n) => {
    const f = path.join(dir, `${n}.svg`);
    return fs.existsSync(f) && /stroke="(?!none)/.test(fs.readFileSync(f, "utf8"));
  });
}

async function buildSvgFont(dir, fontName) {
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
  for (const name of names) {
    const file = path.join(dir, `${name}.svg`);
    if (!fs.existsSync(file)) {
      missing++;
      continue;
    }
    const glyph = Readable.from([fs.readFileSync(file)]);
    glyph.metadata = {
      unicode: [String.fromCodePoint(codepointOf(name))],
      name,
    };
    stream.write(glyph);
  }
  stream.end();
  await finished;
  return { svgFont: out, missing };
}

/** IcoMoon wants each glyph's outline in em units — the SVG font already has it. */
function iconsForSelection(svgFont) {
  const byName = new Map();
  for (const m of svgFont.matchAll(
    /<glyph glyph-name="([^"]+)"[^>]*?d="([^"]*)"/g
  )) {
    byName.set(m[1], m[2]);
  }
  return names
    .filter((n) => byName.has(n))
    .map((name, order) => ({
      icon: {
        paths: [byName.get(name)],
        attrs: [{}],
        isMulticolor: false,
        isMulticolor2: false,
        grid: 24,
        tags: [name],
      },
      attrs: [{}],
      properties: {
        order: order + 1,
        id: order,
        name,
        prevSize: 24,
        code: codepointOf(name),
      },
      setIdx: 0,
      setId: 0,
      iconIdx: order,
    }));
}

function cssFor(fontName, present) {
  const rules = present
    .map((n) => `.${PREFIX}${n}:before {\n  content: "\\${hex(codepointOf(n))}";\n}`)
    .join("\n");
  return `@font-face {
  font-family: "${fontName}";
  src:
    url("${fontName}.woff") format("woff"),
    url("${fontName}.ttf") format("truetype");
  font-weight: normal;
  font-style: normal;
  font-display: block;
}

[class^="${PREFIX}"],
[class*=" ${PREFIX}"] {
  font-family: "${fontName}" !important;
  speak: never;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

${rules}
`;
}

function readmeFor(fontName, count, brand, weight) {
  return `Autonaut Icons — ${brand} / ${weight}
${"=".repeat(40)}

${count} icons. Generated from the SVG source; do not hand-edit.

Files
  ${fontName}.ttf       the icon font
  ${fontName}.woff      same font, web-optimised
  ${fontName}.css       helper classes
  selection.json        IcoMoon-compatible, re-importable

Web
  1. Copy the font files and the CSS into your project.
  2. <link rel="stylesheet" href="${fontName}.css">
  3. <i class="${PREFIX}heart"></i>

Anywhere else (Figma, Sketch, native apps)
  Install ${fontName}.ttf and type the icon's codepoint.
  Codepoints start at U+E900 and are listed in selection.json.

Colour and size follow the surrounding text, exactly like a letter:
  .my-icon { font-size: 32px; color: #1a1a1a; }
`;
}

fs.mkdirSync(OUT, { recursive: true });

const strokedWarnings = new Set();
const index = {};

for (const brand of BRANDS) {
  for (const weight of WEIGHTS) {
    const dir = path.join(RAW, brand, weight);
    const fontName = `autonaut-${brand}-${weight}`;
    const dest = path.join(OUT, `${brand}-${weight}`);
    fs.mkdirSync(dest, { recursive: true });

    findStroked(dir).forEach((n) => strokedWarnings.add(`${brand}/${weight}/${n}`));

    const { svgFont, missing } = await buildSvgFont(dir, fontName);
    const present = names.filter((n) =>
      fs.existsSync(path.join(dir, `${n}.svg`))
    );

    const ttf = Buffer.from(svg2ttf(svgFont, { description: fontName }).buffer);
    const woff = Buffer.from(ttf2woff(ttf).buffer);

    fs.writeFileSync(path.join(dest, `${fontName}.ttf`), ttf);
    fs.writeFileSync(path.join(dest, `${fontName}.woff`), woff);
    fs.writeFileSync(path.join(dest, `${fontName}.css`), cssFor(fontName, present));
    fs.writeFileSync(
      path.join(dest, "selection.json"),
      JSON.stringify(
        {
          IcoMoonType: "selection",
          icons: iconsForSelection(svgFont),
          height: EM,
          metadata: { name: fontName },
          preferences: {
            showGlyphs: true,
            showCodes: true,
            fontPref: {
              prefix: PREFIX,
              metadata: { fontFamily: fontName },
              metrics: { emSize: EM, baseline: 6.25, whitespace: 50 },
              embed: false,
            },
          },
        }
        // minified: this file is machine-read (re-imported into IcoMoon),
        // and pretty-printing it costs ~1 MB per brand/weight
      )
    );
    fs.writeFileSync(
      path.join(dest, "README.txt"),
      readmeFor(fontName, present.length, brand, weight)
    );

    index[`${brand}-${weight}`] = {
      fontName,
      icons: present.length,
      ttfBytes: ttf.length,
    };
    console.log(
      `  ${fontName.padEnd(34)} ${String(present.length).padStart(4)} glyphs  ` +
        `${(ttf.length / 1024).toFixed(0).padStart(4)} KB` +
        (missing ? `  (${missing} missing)` : "")
    );
  }
}

// One shared map for the app: every brand uses the same codepoint per icon.
fs.writeFileSync(
  path.join(OUT, "codepoints.json"),
  JSON.stringify(
    Object.fromEntries(names.map((n) => [n, codepointOf(n)])),
    null,
    0
  )
);
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 2));

console.log(`\n  codepoints.json  ${names.length} icons, U+E900 … U+${hex(
  codepointOf(names[names.length - 1])
).toUpperCase()}`);

if (strokedWarnings.size) {
  console.log(
    `\n  NOTE: ${strokedWarnings.size} source SVGs use stroke, which a font cannot`
  );
  console.log("  represent. Those glyphs are missing that path:");
  [...strokedWarnings].sort().forEach((w) => console.log(`    ${w}`));
}
