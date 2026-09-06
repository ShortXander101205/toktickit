import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppHeader } from "./components/AppHeader.js";
import { RequesterSelector } from "./components/RequesterSelector.js";
import { checkSystem, Category } from "./api.js";

import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail.js";

type SystemCheckState = "idle" | "loading" | "success" | "error";

function MainApp() {
  const { currentRequester, isSwitchModalOpen, closeSwitchModal } = useRequester();
  const [activeTab, setActiveTab] = useState<"my-tickets" | "create-ticket">("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // System status checker (preserved from Lab 1)
  const [sysState, setSysState] = useState<SystemCheckState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  // Reset selected ticket detail when requester switches
  function handleTabChange(tab: "my-tickets" | "create-ticket") {
    setSelectedTicketId(null);
    setActiveTab(tab);
  }

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
      <AppHeader currentTab={activeTab} onTabChange={handleTabChange} />

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
            {selectedTicketId !== null ? (
              <RequesterTicketDetail
                ticketId={selectedTicketId}
                onBack={() => setSelectedTicketId(null)}
              />
            ) : activeTab === "create-ticket" ? (
              <CreateTicket
                onSuccess={() => {
                  setSelectedTicketId(null);
                  setActiveTab("my-tickets");
                }}
                onCancel={() => {
                  setSelectedTicketId(null);
                  setActiveTab("my-tickets");
                }}
              />
            ) : (
              <MyTickets
                onCreateTicket={() => {
                  setSelectedTicketId(null);
                  setActiveTab("create-ticket");
                }}
                onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)}
              />
            )}
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
