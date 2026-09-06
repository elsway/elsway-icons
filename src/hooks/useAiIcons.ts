import { useMemo } from "react";
import { iconUrl, type Weight } from "@/lib/github";
import { useApplicationStore } from "@/state";
import useCSSVariables from "./useCSSVariables";

/** Icons the site's own UI renders through the `ai-{name}` classes. */
const AI_ICONS = [
  "bars-two",
  "book",
  "chevron-bottom",
  "chevron-double-left",
  "chevron-double-right",
  "circle-check",
  "circle-questionmark",
  "circle-x",
  "cloud-download",
  "cross-small",
  "hourglass",
  "quick-search",
  "shield-keyhole",
  "square-behind-square-6",
  "write-1",
] as const;

const WEIGHTS: Weight[] = ["regular", "fill"];

/**
 * Points the `--ai-{weight}-{name}` custom properties at the current brand's
 * SVGs, so `<i class="ai-fill ai-chevron-bottom" />` re-skins itself when
 * the brand changes. See src/styles/ai-icons.css for the matching rules.
 */
export default function useAiIcons() {
  const brand = useApplicationStore.use.iconBrand();

  const properties = useMemo(() => {
    const vars: Record<`--${string}`, string> = {};
    for (const name of AI_ICONS) {
      for (const weight of WEIGHTS) {
        vars[`--ai-${weight}-${name}`] = `url("${iconUrl(
          brand,
          weight,
          name
        )}")`;
      }
    }
    return vars;
  }, [brand]);

  useCSSVariables(properties);
}
