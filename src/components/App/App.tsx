import { Fragment, Suspense, useRef, useEffect } from "react";

import "./App.css";
import "@/styles/ai-icons.css";
import IconGrid from "@/components/IconGrid";
import Panel from "@/components/IconGrid/Panel";
import CategoryMenu from "@/components/CategoryMenu";
import AppHeader from "@/components/AppHeader";
import ErrorBoundary from "@/components/ErrorBoundary";
import Notice from "@/components/Notice";
import EditIconModal from "@/components/Cms/EditIconModal";
import GuideFab from "@/components/GuideFab/GuideFab";
import { useAiIcons } from "@/hooks";
import { useApplicationStore } from "@/state";

const errorFallback = <Notice message="Search error" />;
const waitingFallback = <Notice type="none" message="" />;

const App: React.FC<any> = () => {
  const selectionEntry = useApplicationStore.use.selectionEntry();
  const hasSelection = !!selectionEntry;
  const editingEntry = useApplicationStore.use.editingEntry();
  const setEditingEntry = useApplicationStore.use.setEditingEntry();
  const searchQuery = useApplicationStore.use.searchQuery();
  const iconBrand = useApplicationStore.use.iconBrand();

  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Keeps the `ai-{name}` classes pointed at the current brand's SVGs.
  useAiIcons();

  // Reset scroll to top when the visible set changes (or on mount)
  useEffect(() => {
    if (gridScrollRef.current) gridScrollRef.current.scrollTop = 0;
  }, [searchQuery, iconBrand]);

  return (
    <Fragment>
      <div className="two-col-shell primary">
        <aside className="pane left-rail">
          <CategoryMenu />
        </aside>
        <main className="pane middle-pane">
          <AppHeader />
          <div className="grid-scroll" ref={gridScrollRef}>
            <ErrorBoundary fallback={errorFallback}>
              <Suspense fallback={waitingFallback}>
                <IconGrid />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <GuideFab />

      {hasSelection && !editingEntry && (
        <div
          className="elsway-popover"
          role="dialog"
          aria-label="Icon details"
        >
          <div className="elsway-popover-panel">
            <Panel />
          </div>
        </div>
      )}

      {editingEntry && (
        <EditIconModal
          iconName={editingEntry.name}
          initialCategories={editingEntry.categories as unknown as string[]}
          onClose={() => setEditingEntry(null)}
          onNameChanged={(newName) =>
            setEditingEntry({ ...editingEntry, name: newName } as any)
          }
        />
      )}
    </Fragment>
  );
};

export default App;
