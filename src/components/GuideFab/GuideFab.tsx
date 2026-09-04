import { iconUrl } from "@/lib/github";
import { useApplicationStore } from "@/state";
import "./GuideFab.css";

const GUIDE_URL = "https://claude.ai/code/artifact/60bacca4-2f34-47de-8439-891545037f0f";

const GuideFab: React.FC = () => {
  const iconBrand = useApplicationStore.use.iconBrand();

  return (
    <a
      className="guide-fab"
      href={GUIDE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open the usage guide"
      title="Usage guide"
    >
      <img src={iconUrl(iconBrand, "regular", "book")} alt="" width={22} height={22} />
    </a>
  );
};

export default GuideFab;
