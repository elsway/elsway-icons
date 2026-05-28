import React from "react";
import { useApplicationStore } from "@/state";
import "./CategoryMenu.css";

const CATEGORIES = [
  "arrows",
  "brands",
  "commerce",
  "communications",
  "design",
  "editor",
  "finances",
  "games",
  "health & wellness",
  "maps & travel",
  "media",
  "nature",
  "objects",
  "office",
  "people",
  "system",
  "technology & development",
  "weather",
];

const CategoryMenu: React.FC = () => {
  const setSearchQuery = useApplicationStore.use.setSearchQuery();
  const current = useApplicationStore.use.searchQuery();

  return (
    <div className="category-menu">
      <h1 className="brand">Elsway icons</h1>
      <ul className="categories">
        <li>
          <button
            className={`cat-btn ${current === "" ? "active" : ""}`}
            onClick={() => setSearchQuery("")}
          >
            All
          </button>
        </li>
        {CATEGORIES.map((c) => (
          <li key={c}>
            <button
              className={`cat-btn ${current === c ? "active" : ""}`}
              onClick={() => setSearchQuery(c)}
            >
              {c}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryMenu;
