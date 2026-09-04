import React, { useState } from "react";
import SearchInput from "@/components/SearchInput";
import StyleInput from "@/components/StyleInput";
import SizeInput from "@/components/SizeInput";
import NewIconModal from "@/components/Cms/NewIconModal";
import { useAuth } from "@/lib/github";
import "./AppHeader.css";

const AppHeader: React.FC = () => {
  const { canWrite } = useAuth();
  const [showNew, setShowNew] = useState(false);
  return (
    <header className="app-header" role="banner">
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
