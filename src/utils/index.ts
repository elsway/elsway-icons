import { IconStyle } from "@/lib/types";
import TinyColor from "tinycolor2";

import { SnippetType } from "@/lib";

const CDN_TAG = "v2";

/**
 * Snippets for the detail panel. Every framework resolves the same CDN SVG
 * URL — there is no npm package, so nothing here may imply one. These mirror
 * the integration guide at /guide.html.
 */
export function getCodeSnippets({
  name,
  brand,
  weight,
  size,
  color,
}: {
  name: string;
  brand: string;
  weight: IconStyle;
  size: number;
  color: string;
}): Record<SnippetType, string> {
  const isDefaultWeight = weight === IconStyle.REGULAR;
  const isDefaultColor = color === "#000000";
  const weightFolder = weight === IconStyle.FILL ? "fill" : "regular";
  const url = `https://cdn.jsdelivr.net/gh/elsway/elsway-icons@${CDN_TAG}/public/raw/elsway/${brand}/${weightFolder}/${name}.svg`;

  // Only non-default values are worth spelling out in a copied snippet.
  const attr = (k: string, v: string, skip: boolean) =>
    skip ? "" : ` ${k}="${v}"`;

  return {
    [SnippetType.HTML]: `<i class="ai${
      isDefaultWeight ? "" : `-${weight}`
    } ai-${name}"></i>`,

    [SnippetType.REACT]: `<Icon name="${name}"${attr(
      "brand",
      brand,
      brand === "default"
    )}${attr("weight", weight, isDefaultWeight)} size={${size}}${
      isDefaultColor ? "" : ` color="${color}"`
    } />`,

    [SnippetType.VUE]: `<Icon name="${name}"${attr(
      "brand",
      brand,
      brand === "default"
    )}${attr("weight", weight, isDefaultWeight)} :size="${size}"${
      isDefaultColor ? "" : ` color="${color}"`
    } />`,

    [SnippetType.CDN]: url,

    [SnippetType.TTF]: `/* once per project */
@font-face {
  font-family: "autonaut-${brand}-${weightFolder}";
  src: url("autonaut-${brand}-${weightFolder}.woff") format("woff");
}

/* then, anywhere */
<i class="ai-${name}"></i>`,

    [SnippetType.SWIFT]: `Image("${name}")
    .renderingMode(.template)
    .resizable()
    .frame(width: ${size}, height: ${size})${
      isDefaultColor ? "" : `\n    .foregroundStyle(Color(hex: "${color}"))`
    }`,
  };
}

export function stripWrappingQuotes(value: string | null | undefined): string {
  return value?.replace(/["'](.+)["']/, "$1") ?? "";
}

export function parseWeight(weight: string | null | undefined): IconStyle {
  switch (stripWrappingQuotes(weight).toLowerCase()) {
    case "fill":
      return IconStyle.FILL;
    case "regular":
    default:
      return IconStyle.REGULAR;
  }
}

export function parseQuery(query: string | null | undefined): string {
  return stripWrappingQuotes(query);
}

export function parseSize(size: string | null | undefined): number {
  const sizeAsNumber = parseInt(stripWrappingQuotes(size) || "32", 10);
  return Number.isFinite(sizeAsNumber)
    ? Math.min(Math.max(sizeAsNumber, 16), 56)
    : 32;
}

export function parseColor(color: string | null | undefined): string {
  const parsedColor = TinyColor(stripWrappingQuotes(color) || "#000000");
  if (parsedColor.isValid()) {
    return parsedColor.toHexString();
  }
  return "#000000";
}
