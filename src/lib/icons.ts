import elswayManifest from "../../public/raw/elsway/manifest.json";

const ICON_COUNT = (elswayManifest as string[]).length;
const WEIGHT_COUNT = 2; // regular, fill

export const iconCount = Intl.NumberFormat("en-US").format(
  ICON_COUNT * WEIGHT_COUNT
);
