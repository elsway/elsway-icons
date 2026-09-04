import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import ErrorBoundary from "./components/ErrorBoundary";
import Notice from "./components/Notice";
import { AuthProvider } from "./lib/github";

// Analytics is not initialized — the previous GA measurement ID here was
// inherited from the upstream project this was forked from and pointed at
// its analytics property, not ours. ReactGA.event() calls elsewhere are
// safe no-ops until this project has its own GA4 property to initialize
// with (see git history for the previous ReactGA.initialize call).

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <StrictMode>
    <ErrorBoundary
      fallback={
        <Notice
          message={
            <p>
              An error occurred. Try going{" "}
              <a href={window.location.origin}>home</a>.
            </p>
          }
        />
      }
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);

