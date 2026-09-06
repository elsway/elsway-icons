import React from "react";
import SearchInput from "@/components/SearchInput";
import StyleInput from "@/components/StyleInput";
import SizeInput from "@/components/SizeInput";
import { useMediaQuery } from "@/hooks";
import "./AppHeader.css";

/** Matches the mobile band in the stylesheets. */
const MOBILE = "(max-width: 560px)";

const AppHeader: React.FC = () => {
  // On mobile these controls live in the rail's top bar instead. Rendering
  // them here too would duplicate #search-input and mount two of each.
  if (useMediaQuery(MOBILE)) return null;

  return (
    <header className="app-header" role="banner">
      <div className="app-header-search">
        <SearchInput />
      </div>
      <div className="app-header-controls">
        <StyleInput />
        <SizeInput />
      </div>
    </header>
  );
};

export default AppHeader;
