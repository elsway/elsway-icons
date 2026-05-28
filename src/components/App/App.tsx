import { Fragment, Suspense, useMemo } from "react";

import "./App.css";
import Toolbar from "@/components/Toolbar";
import IconGrid from "@/components/IconGrid";
import Panel from "@/components/IconGrid/Panel";
import ErrorBoundary from "@/components/ErrorBoundary";
import Notice from "@/components/Notice";
// import Recipes from "@/components/Recipes";
import { useCSSVariables } from "@/hooks";
import { ApplicationTheme, useApplicationStore } from "@/state";

const errorFallback = <Notice message="Search error" />;
const waitingFallback = <Notice type="none" message="" />;

const App: React.FC<any> = () => {
  const isDark =
    useApplicationStore.use.applicationTheme() === ApplicationTheme.DARK;

  useCSSVariables(
    useMemo(
      () => ({
        "--foreground": isDark ? "white" : "var(--moss)",
        "--foreground-card": isDark ? "white" : "var(--moss)",
        "--foreground-secondary": isDark ? "var(--pewter)" : "var(--elephant)",
        "--background": isDark ? "var(--slate)" : "var(--vellum)",
        "--background-card": isDark ? "var(--stone)" : "var(--vellum)",
        "--background-layer": isDark ? "var(--scrim)" : "var(--translucent)",
        "--border-card": isDark ? "var(--shadow)" : "var(--moss-shadow)",
        "--border-secondary": isDark ? "var(--scrim)" : "var(--moss-shadow)",
        "--hover-tabs": isDark ? "var(--slate-sheer)" : "var(--ghost-sheer)",
        "--hover-buttons": isDark ? "var(--scrim)" : "var(--slate)",
      }),
      [isDark]
    )
  );

  return (
    <Fragment>
      <div className="three-col-shell primary">
        <aside className="pane left-rail">
          <Toolbar />
        </aside>
        <main className="pane middle-pane">
          <ErrorBoundary fallback={errorFallback}>
            <Suspense fallback={waitingFallback}>
              <IconGrid />
            </Suspense>
          </ErrorBoundary>
        </main>
        <aside className="pane right-rail">
          <Panel />
        </aside>
      </div>
    </Fragment>
  );
};

export default App;
