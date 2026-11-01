import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppHeader, AppTab } from "./components/AppHeader.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { RequesterSelector } from "./components/RequesterSelector.js";
import { checkSystem, Category } from "./api.js";

import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail.js";
import { StaffTicketDetail } from "./components/StaffTicketDetail.js";
import { StaffTicketQueue } from "./components/StaffTicketQueue.js";
import { UserManagement } from "./components/UserManagement.js";
import { RequesterDashboard } from "./components/RequesterDashboard.js";
import { StaffDashboard } from "./components/StaffDashboard.js";

type SystemCheckState = "idle" | "loading" | "success" | "error";

function MainApp() {
  const { user } = useAuth();
  const { currentRequester, isSwitchModalOpen, closeSwitchModal } = useRequester();
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Drill-down filter states for MyTickets and StaffTicketQueue
  const [requesterStatusFilter, setRequesterStatusFilter] = useState<string>("");
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>("");
  const [staffOwnerFilter, setStaffOwnerFilter] = useState<string>("");
  const [staffAutoFocusSearch, setStaffAutoFocusSearch] = useState<boolean>(false);

  // Default post-login tab to dashboard across roles
  useEffect(() => {
    setActiveTab("dashboard");
  }, [user?.role]);

  // System status checker (preserved from Lab 1)
  const [sysState, setSysState] = useState<SystemCheckState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  // Reset selected ticket detail when tab switches
  function handleTabChange(tab: AppTab) {
    setSelectedTicketId(null);
    if (tab !== "my-tickets") {
      setRequesterStatusFilter("");
    }
    if (tab !== "ticket-queue") {
      setStaffStatusFilter("");
      setStaffOwnerFilter("");
      setStaffAutoFocusSearch(false);
    }
    setActiveTab(tab);
  }

  function handleSelectTicket(ticketId: string | number) {
    const num = typeof ticketId === "number" ? ticketId : parseInt(String(ticketId), 10);
    if (!isNaN(num)) {
      setSelectedTicketId(num);
    }
  }

  function handleDrillDownMyTickets(statusFilter: string) {
    setSelectedTicketId(null);
    setRequesterStatusFilter(statusFilter);
    setActiveTab("my-tickets");
  }

  function handleDrillDownStaffQueue(filters: {
    status?: string;
    ownerId?: string;
    autoFocusSearch?: boolean;
  }) {
    setSelectedTicketId(null);
    setStaffStatusFilter(filters.status ?? "");
    setStaffOwnerFilter(filters.ownerId ?? "");
    setStaffAutoFocusSearch(Boolean(filters.autoFocusSearch));
    setActiveTab("ticket-queue");
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

  const isAuthenticated = Boolean(user);
  const mustChangePassword = Boolean(user?.mustChangePassword);

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--color-page-bg)" }}>
      {/* App Shell Header */}
      <AppHeader currentTab={activeTab} onTabChange={handleTabChange} />

      {/* Mode B: Switch Requester Modal (invoked from header if present) */}
      {isSwitchModalOpen && (
        <RequesterSelector isSwitchMode={true} onCancel={closeSwitchModal} />
      )}

      {/* Main Workspace Container */}
      <main id="main-content" tabIndex={-1} role="main" className="container-xl py-4 flex-grow-1" style={{ maxWidth: "1200px" }}>
        {!isAuthenticated ? (
          <Login />
        ) : mustChangePassword ? (
          <ChangePassword onSuccess={() => setSelectedTicketId(null)} />
        ) : (
          <div>
            {selectedTicketId !== null ? (
              user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR" ? (
                <StaffTicketDetail
                  ticketId={selectedTicketId}
                  onBack={() => setSelectedTicketId(null)}
                />
              ) : (
                <RequesterTicketDetail
                  ticketId={selectedTicketId}
                  onBack={() => setSelectedTicketId(null)}
                />
              )
            ) : activeTab === "dashboard" ? (
              user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR" ? (
                <StaffDashboard
                  user={user}
                  onDrillDownQueue={handleDrillDownStaffQueue}
                  onSelectTicket={handleSelectTicket}
                  onCreateTicket={() => {
                    setSelectedTicketId(null);
                    setActiveTab("create-ticket");
                  }}
                  onManageUsers={() => {
                    setSelectedTicketId(null);
                    setActiveTab("admin-users");
                  }}
                />
              ) : (
                <RequesterDashboard
                  user={user}
                  requesterId={currentRequester?.id}
                  onDrillDownMyTickets={handleDrillDownMyTickets}
                  onSelectTicket={handleSelectTicket}
                  onCreateTicket={() => {
                    setSelectedTicketId(null);
                    setActiveTab("create-ticket");
                  }}
                  onViewAllTickets={() => {
                    setSelectedTicketId(null);
                    setRequesterStatusFilter("");
                    setActiveTab("my-tickets");
                  }}
                />
              )
            ) : activeTab === "admin-users" && user?.role === "ADMINISTRATOR" ? (
              <UserManagement />
            ) : activeTab === "ticket-queue" ? (
              <StaffTicketQueue
                onSelectTicket={handleSelectTicket}
                initialStatusFilter={staffStatusFilter}
                initialOwnerFilter={staffOwnerFilter}
                autoFocusSearch={staffAutoFocusSearch}
              />
            ) : activeTab === "create-ticket" ? (
              <CreateTicket
                onSuccess={() => {
                  setSelectedTicketId(null);
                  setActiveTab("dashboard");
                }}
                onCancel={() => {
                  setSelectedTicketId(null);
                  setActiveTab("dashboard");
                }}
              />
            ) : (
              <MyTickets
                onCreateTicket={() => {
                  setSelectedTicketId(null);
                  setActiveTab("create-ticket");
                }}
                onSelectTicket={handleSelectTicket}
                initialStatusFilter={requesterStatusFilter}
              />
            )}
          </div>
        )}

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
    <AuthProvider>
      <RequesterProvider>
        <MainApp />
      </RequesterProvider>
    </AuthProvider>
  );
}
