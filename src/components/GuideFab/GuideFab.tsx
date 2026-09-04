import { iconUrl } from "@/lib/github";
import { useApplicationStore } from "@/state";
import "./GuideFab.css";

const GuideFab: React.FC = () => {
  const iconBrand = useApplicationStore.use.iconBrand();
  const guideUrl = `${import.meta.env.BASE_URL}guide.html`;

  return (
    <a
      className="guide-fab"
      href={guideUrl}
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
