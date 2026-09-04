import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppHeader } from "./components/AppHeader.js";
import { RequesterSelector } from "./components/RequesterSelector.js";
import { checkSystem, Category } from "./api.js";

type SystemCheckState = "idle" | "loading" | "success" | "error";

function MainApp() {
  const { currentRequester, isSwitchModalOpen, closeSwitchModal } = useRequester();
  const [activeTab, setActiveTab] = useState<"my-tickets" | "create-ticket">("my-tickets");

  // System status checker (preserved from Lab 1)
  const [sysState, setSysState] = useState<SystemCheckState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setSysState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setSysState("success");
    } catch (err) {
      setSysState("error");
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--color-page-bg)" }}>
      {/* App Shell Header */}
      <AppHeader currentTab={activeTab} onTabChange={setActiveTab} />

      {/* Mode A: Blocking Requester Selector (if no persona selected) */}
      {!currentRequester && <RequesterSelector isSwitchMode={false} />}

      {/* Mode B: Switch Requester Modal (invoked from header) */}
      {isSwitchModalOpen && (
        <RequesterSelector isSwitchMode={true} onCancel={closeSwitchModal} />
      )}

      {/* Main Workspace Container */}
      <main className="container-xl py-4 flex-grow-1" style={{ maxWidth: "1200px" }}>
        {currentRequester ? (
          <div>
            {/* Active Requester Welcome Banner */}
            <div
              className="card border-0 shadow-sm p-4 mb-4"
              style={{
                borderRadius: "8px",
                backgroundColor: "var(--color-surface-card)",
                borderLeft: "6px solid var(--color-primary-green)",
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h2 className="h4 fw-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
                    Welcome, {currentRequester.name}
                  </h2>
                  <p className="text-muted small mb-0">
                    Logged in as <strong>{currentRequester.email}</strong> • Active Testing Persona
                  </p>
                </div>
                <span className="badge bg-success py-2 px-3">Active Requester</span>
              </div>
            </div>

            {/* Quick Actions & Placeholder for Features 3 & 4 */}
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm p-4" style={{ borderRadius: "8px" }}>
                  <h3 className="h5 fw-bold mb-2">My Tickets</h3>
                  <p className="text-muted small mb-3">
                    View, filter, and track all IT service desk tickets submitted under your persona.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-auto align-self-start"
                    onClick={() => setActiveTab("my-tickets")}
                  >
                    Go to My Tickets (Feature 4)
                  </button>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm p-4" style={{ borderRadius: "8px" }}>
                  <h3 className="h5 fw-bold mb-2">+ Create Ticket</h3>
                  <p className="text-muted small mb-3">
                    Submit a new support incident or hardware/software service request.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary-green w-auto align-self-start"
                    onClick={() => setActiveTab("create-ticket")}
                  >
                    Open Ticket Form (Feature 3)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* System Diagnostics / Lab 1 Compatibility Card */}
        <div
          className="card border-0 shadow-sm p-3 mt-4"
          style={{
            borderRadius: "8px",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
          }}
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <span className="fw-semibold small text-muted">Backend Service Verification: </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary ms-2"
                onClick={handleCheck}
                disabled={sysState === "loading"}
              >
                {sysState === "loading" ? "Loading…" : "Check System"}
              </button>
            </div>
            {sysState === "success" && (
              <span className="text-success small fw-semibold">System Status: Online</span>
            )}
            {sysState === "error" && (
              <div className="alert alert-danger py-1 px-2 mb-0 small">
                <span className="fw-semibold">System Status: Offline</span> — Unable to connect to TokTickIT API
              </div>
            )}
          </div>

          {sysState === "success" && categories.length > 0 && (
            <ul className="list-group list-group-flush mt-2 small">
              {categories.map((c) => (
                <li key={c.id} className="list-group-item bg-transparent py-1 px-0">
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <MainApp />
    </RequesterProvider>
  );
}
