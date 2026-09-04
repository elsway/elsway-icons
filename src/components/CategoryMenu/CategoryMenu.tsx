import React, { useMemo } from "react";
import { icons, useApplicationStore } from "@/state";
import { useAuth } from "@/lib/github";
import "./CategoryMenu.css";

const fmt = (n: number) => n.toLocaleString();

const CategoryMenu: React.FC<{ onSelect?: () => void }> = ({ onSelect }) => {
  const setSearchQuery = useApplicationStore.use.setSearchQuery();
  const current = useApplicationStore.use.searchQuery();

  const { CATEGORIES, categoryCounts } = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of icons) {
      for (const c of i.categories as unknown as string[]) {
        map[c] = (map[c] || 0) + 1;
      }
    }
    return {
      CATEGORIES: Object.keys(map).sort(),
      categoryCounts: map,
    };
  }, []);
  const totalIcons = icons.length;

  return (
    <nav className="category-menu" aria-label="Icon library">
      <div className="section-label">Categories</div>
      <div className="categories-scroll">
        <ul className="categories" role="list">
          <li>
            <button
              className={`cat-btn ${current === "" ? "active" : ""}`}
              aria-pressed={current === ""}
              onClick={() => {
                setSearchQuery("");
                onSelect?.();
              }}
            >
              <span className="cat-name">All</span>
              <span className="cat-count">{fmt(totalIcons)}</span>
            </button>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c}>
              <button
                className={`cat-btn ${current === c ? "active" : ""}`}
                aria-pressed={current === c}
                onClick={() => {
                  setSearchQuery(c);
                  onSelect?.();
                }}
              >
                <span className="cat-name">{c}</span>
                <span className="cat-count">
                  {fmt(categoryCounts[c] || 0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <SidebarFooter />
    </nav>
  );
};

const SidebarFooter: React.FC = () => {
  const { user, canWrite, signIn, signOut, configured, signingIn } = useAuth();
  if (!configured) {
    return (
      <div className="sidebar-footer">
        <button className="login-btn" type="button" disabled>
          <span className="login-btn-icon" aria-hidden>
            ⌂
          </span>
          <span>Sign in</span>
        </button>
        <span className="login-hint">CMS setup pending</span>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="sidebar-footer">
        <button
          className="login-btn"
          type="button"
          onClick={signIn}
          disabled={signingIn}
        >
          <span className="login-btn-icon" aria-hidden>
            ⌂
          </span>
          <span>{signingIn ? "Waiting for GitHub…" : "Sign in with GitHub"}</span>
        </button>
      </div>
    );
  }
  return (
    <div className="sidebar-footer">
      <div className="login-meta">
        <span className="login-email" title={user.login}>
          @{user.login}
        </span>
        <button type="button" className="login-signout" onClick={signOut}>
          sign out
        </button>
      </div>
      <span className={`login-hint ${canWrite ? "" : "warn"}`}>
        {canWrite
          ? "CMS active — edit icons in place"
          : "not a collaborator"}
      </span>
    </div>
  );
};

export default CategoryMenu;
