import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppHeader } from "./components/AppHeader.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail.js";
import { checkSystem, Category } from "./api.js";

type SystemCheckState = "idle" | "loading" | "success" | "error";

// Sync bridge between AuthContext and RequesterContext
function RequesterSyncBridge({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentRequester, setCurrentRequester } = useRequester();

  useEffect(() => {
    if (user && (!currentRequester || currentRequester.id !== user.id)) {
      setCurrentRequester({
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department || null,
        isActive: user.isActive,
      });
    } else if (!user && currentRequester) {
      setCurrentRequester(null);
    }
  }, [user, currentRequester, setCurrentRequester]);

  return <>{children}</>;
}

function MainApp() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // System status checker (preserved from Lab 1)
  const [sysState, setSysState] = useState<SystemCheckState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  function handleTabChange(tab: string) {
    setSelectedTicketId(null);
    setActiveTab(tab);
  }

  async function handleCheck() {
    setSysState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setSysState("success");
    } catch {
      setSysState("error");
    }
  }

  // Diagnostics component (Lab 1 compatibility)
  const renderDiagnostics = () => (
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
  );

  if (isLoading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "var(--color-page-bg)" }}
      >
        <div className="text-center">
          <div
            className="spinner-border text-success mb-2"
            role="status"
            style={{ color: "var(--color-primary-green)" }}
          >
            <span className="visually-hidden">Loading TokTickIT...</span>
          </div>
          <div className="small text-muted">Verifying session...</div>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated -> Show Login View
  if (!user) {
    return (
      <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--color-page-bg)" }}>
        <Login />
        <div className="container pb-4" style={{ maxWidth: "600px" }}>
          {renderDiagnostics()}
        </div>
      </div>
    );
  }

  // 2. Mandatory Password Change View (BR-02 view lock)
  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  // 3. Authenticated Main Application Shell
  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--color-page-bg)" }}>
      {/* App Shell Header */}
      <AppHeader currentTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Workspace Container */}
      <main className="container-xl py-4 flex-grow-1" style={{ maxWidth: "1200px" }}>
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

        {/* System Diagnostics / Lab 1 Compatibility Card */}
        {renderDiagnostics()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <RequesterSyncBridge>
          <MainApp />
        </RequesterSyncBridge>
      </RequesterProvider>
    </AuthProvider>
  );
}
