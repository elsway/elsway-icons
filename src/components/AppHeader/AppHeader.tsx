import React, { useState } from "react";
import SearchInput from "@/components/SearchInput";
import BrandInput from "@/components/BrandInput/BrandInput";
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
      <div className="app-header-top">
        <button
          type="button"
          className="app-header-menu"
          aria-label="Show categories"
          onClick={onOpenMenu}
        >
          <img
            src={iconUrl(iconBrand, "regular", "filter-1")}
            alt=""
            width={20}
            height={20}
          />
        </button>

        <h1
          className="app-wordmark"
          role="button"
          tabIndex={0}
          title="Reload"
          onClick={() => window.location.reload()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") window.location.reload();
          }}
        >
          Autonaut Icons
        </h1>

        <div className="app-header-search">
          <SearchInput />
        </div>
      </div>

      <div className="app-header-controls">
        <BrandInput />
        <StyleInput />
        <SizeInput />
        {canWrite && (
          <button
            type="button"
            className="cms-newicon-trigger"
            onClick={() => setShowNew(true)}
          >
            + New icon
          </button>
        )}
      </div>

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
