import React, { useState } from "react";
import SearchInput from "@/components/SearchInput";
import StyleInput from "@/components/StyleInput";
import SizeInput from "@/components/SizeInput";
import NewIconModal from "@/components/Cms/NewIconModal";
import { useAuth, iconUrl } from "@/lib/github";
import { useApplicationStore } from "@/state";
import "./AppHeader.css";

const AppHeader: React.FC<{ onOpenMenu?: () => void }> = ({ onOpenMenu }) => {
  const { canWrite } = useAuth();
  const iconBrand = useApplicationStore.use.iconBrand();
  const [showNew, setShowNew] = useState(false);
  return (
    <header className="app-header" role="banner">
      <button
        type="button"
        className="app-header-menu"
        aria-label="Show brands and categories"
        onClick={onOpenMenu}
      >
        <img
          src={iconUrl(iconBrand, "regular", "filter-1")}
          alt=""
          width={20}
          height={20}
        />
      </button>
      <div className="app-header-search">
        <SearchInput />
      </div>
      <div className="app-header-controls">
        <StyleInput />
        <SizeInput />
      </div>
      {canWrite && (
        <div className="app-header-new">
          <button
            type="button"
            className="cms-newicon-trigger"
            onClick={() => setShowNew(true)}
          >
            + New icon
          </button>
        </div>
      )}
      {showNew && (
        <NewIconModal
          onClose={() => setShowNew(false)}
          onCreated={() => window.location.reload()}
        />
      )}
    </header>
  );
};

export default AppHeader;
