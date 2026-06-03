import React from "react";

import StyleInput from "@/components/StyleInput";
import SizeInput from "@/components/SizeInput";
import SettingsActions from "@/components/SettingsActions";
import "./Toolbar.css";

type ToolbarProps = {};

const Toolbar: React.FC<ToolbarProps> = () => {
  return (
    <nav className="toolbar" id="toolbar">
      <div className="toolbar-contents">
        <StyleInput />
        <SizeInput />
        <SettingsActions />
      </div>
    </nav>
  );
};

export default Toolbar;
