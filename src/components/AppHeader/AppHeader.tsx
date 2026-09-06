import React from "react";
import SearchInput from "@/components/SearchInput";
import StyleInput from "@/components/StyleInput";
import SizeInput from "@/components/SizeInput";
import "./AppHeader.css";

const AppHeader: React.FC = () => {
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
