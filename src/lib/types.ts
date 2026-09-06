/**
 * Core types for the icon library.
 *
 * These previously came from a vendored icon package. Autonaut ships exactly
 * two weights, so the enum lists two — the four extra weights that package
 * declared (thin, light, bold, duotone) were never drawn for this set.
 */

export enum IconStyle {
  REGULAR = "regular",
  FILL = "fill",
}

/** One row of `public/raw/elsway/manifest.json`, as the UI consumes it. */
export interface IconEntry {
  name: string;
  categories: readonly string[];
  tags: readonly string[];
  /** Stable font codepoint, from public/font/codepoints.json. */
  codepoint: number;
}
