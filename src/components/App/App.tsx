import { Fragment, Suspense, useMemo, useRef } from "react";

import "./App.css";
import Toolbar from "@/components/Toolbar";
import IconGrid from "@/components/IconGrid";
import Panel from "@/components/IconGrid/Panel";
import CategoryMenu from "@/components/CategoryMenu";
import SearchInput from "@/components/SearchInput";
import ErrorBoundary from "@/components/ErrorBoundary";
import Notice from "@/components/Notice";
// import Recipes from "@/components/Recipes";
import { useCSSVariables, useLenis } from "@/hooks";
import { ApplicationTheme, useApplicationStore } from "@/state";

const errorFallback = <Notice message="Search error" />;
const waitingFallback = <Notice type="none" message="" />;

const App: React.FC<any> = () => {
  const isDark =
    useApplicationStore.use.applicationTheme() === ApplicationTheme.DARK;
  const hasSelection = !!useApplicationStore.use.selectionEntry();

  const leftRef = useRef<HTMLElement>(null);
  const middleRef = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLElement>(null);
  useLenis(leftRef);
  useLenis(middleRef);
  useLenis(rightRef);

  useCSSVariables(
    useMemo(
      () => ({
        "--foreground": isDark ? "white" : "#1a1a1a",
        "--foreground-card": isDark ? "white" : "#1a1a1a",
        "--foreground-secondary": isDark ? "var(--pewter)" : "#6a6a6a",
        "--background": isDark ? "var(--slate)" : "#ededed",
        "--background-card": isDark ? "var(--stone)" : "#ffffff",
        "--background-layer": isDark ? "var(--scrim)" : "var(--translucent)",
        "--border-card": isDark ? "var(--shadow)" : "rgba(0,0,0,0.08)",
        "--border-secondary": isDark ? "var(--scrim)" : "rgba(0,0,0,0.06)",
        "--hover-tabs": isDark ? "var(--slate-sheer)" : "rgba(0,0,0,0.04)",
        "--hover-buttons": isDark ? "var(--scrim)" : "rgba(0,0,0,0.06)",
      }),
      [isDark]
    )
  );

  return (
    <Fragment>
      <div
        className={`three-col-shell primary ${
          hasSelection ? "has-selection" : "no-selection"
        }`}
      >
        <aside className="pane left-rail" ref={leftRef}>
          <CategoryMenu />
        </aside>
        <main className="pane middle-pane" ref={middleRef}>
          <div className="middle-search">
            <SearchInput />
          </div>
          <ErrorBoundary fallback={errorFallback}>
            <Suspense fallback={waitingFallback}>
              <IconGrid />
            </Suspense>
          </ErrorBoundary>
        </main>
        {hasSelection && (
          <aside className="pane right-rail" ref={rightRef}>
            <div className="right-stack-top">
              <Toolbar />
            </div>
            <div className="right-stack-bottom">
              <Panel />
            </div>
          </aside>
        )}
      </div>
    </Fragment>
  );
};

export default App;
