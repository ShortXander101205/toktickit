import React, { useState, useContext } from "react";
import { RequesterContext } from "../context/RequesterContext.js";
import { AuthContext } from "../context/AuthContext.js";

interface AppHeaderProps {
  currentTab?: "my-tickets" | "create-ticket" | "ticket-queue" | "admin-users";
  onTabChange?: (tab: "my-tickets" | "create-ticket" | "ticket-queue" | "admin-users") => void;
}

export function AppHeader({ currentTab = "my-tickets", onTabChange }: AppHeaderProps) {
  const auth = useContext(AuthContext);
  const requesterCtx = useContext(RequesterContext);
  const currentRequester = requesterCtx?.currentRequester;
  const openSwitchModal = requesterCtx?.openSwitchModal;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeUser = auth?.user;

  function renderRoleBadge(role: string, isMobile = false) {
    const testId = isMobile ? "user-role-badge-mobile" : "user-role-badge";
    if (role === "IT_STAFF") {
      return (
        <span
          className="badge rounded-pill ms-2"
          data-testid={testId}
          style={{
            backgroundColor: "#e0f2fe",
            color: "#0369a1",
            border: "1px solid #0284c7",
            fontWeight: 600,
            fontSize: "0.75rem",
          }}
        >
          IT Staff
        </span>
      );
    }
    if (role === "ADMINISTRATOR") {
      return (
        <span
          className="badge rounded-pill ms-2"
          data-testid={testId}
          style={{
            backgroundColor: "#fef3c7",
            color: "#b45309",
            border: "1px solid #d97706",
            fontWeight: 600,
            fontSize: "0.75rem",
          }}
        >
          Administrator
        </span>
      );
    }
    return (
      <span
        className="badge rounded-pill ms-2"
        data-testid={testId}
        style={{
          backgroundColor: "#eaf6ef",
          color: "#006b3c",
          border: "1px solid #006b3c",
          fontWeight: 600,
          fontSize: "0.75rem",
        }}
      >
        Requester
      </span>
    );
  }

  return (
    <div className="w-100" style={{ zIndex: 1030 }}>
      <header
        className="d-flex align-items-center justify-content-between px-3 px-md-4"
        style={{
          backgroundColor: "var(--color-primary-green)",
          minHeight: "56px",
          color: "#ffffff",
          overflowX: "clip",
        }}
      >
        {/* Brand (Left) */}
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span className="fw-bold fs-5 tracking-tight">TokTickIT</span>
          <span
            className="badge ms-1 d-none d-lg-inline-block"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              fontWeight: 500,
              fontSize: "0.75rem",
            }}
          >
            IT Service Desk
          </span>
        </div>

        {/* Center Desktop Nav (>= 768px) */}
        <nav className="d-none d-md-flex align-items-center gap-2 gap-lg-3">
          {activeUser?.role === "ADMINISTRATOR" && (
            <button
              type="button"
              className="btn btn-link text-white text-decoration-none px-2 py-1"
              data-testid="nav-user-management"
              style={{
                fontWeight: currentTab === "admin-users" ? 700 : 400,
                borderBottom: currentTab === "admin-users" ? "2px solid #ffffff" : "2px solid transparent",
                borderRadius: 0,
              }}
              onClick={() => onTabChange && onTabChange("admin-users")}
            >
              User Management
            </button>
          )}
          {(activeUser?.role === "IT_STAFF" || activeUser?.role === "ADMINISTRATOR") && (
            <button
              type="button"
              className="btn btn-link text-white text-decoration-none px-2 py-1"
              data-testid="nav-ticket-queue"
              style={{
                fontWeight: currentTab === "ticket-queue" ? 700 : 400,
                borderBottom: currentTab === "ticket-queue" ? "2px solid #ffffff" : "2px solid transparent",
                borderRadius: 0,
              }}
              onClick={() => onTabChange && onTabChange("ticket-queue")}
            >
              Ticket Queue
            </button>
          )}
          <button
            type="button"
            className="btn btn-link text-white text-decoration-none px-2 py-1"
            style={{
              fontWeight: currentTab === "my-tickets" ? 700 : 400,
              borderBottom: currentTab === "my-tickets" ? "2px solid #ffffff" : "2px solid transparent",
              borderRadius: 0,
            }}
            onClick={() => onTabChange && onTabChange("my-tickets")}
          >
            My Tickets
          </button>
          <button
            type="button"
            className="btn btn-link text-white text-decoration-none px-2 py-1"
            style={{
              fontWeight: currentTab === "create-ticket" ? 700 : 400,
              borderBottom: currentTab === "create-ticket" ? "2px solid #ffffff" : "2px solid transparent",
              borderRadius: 0,
            }}
            onClick={() => onTabChange && onTabChange("create-ticket")}
          >
            + Create Ticket
          </button>
        </nav>

        {/* Right Desktop Persona & Auth Badge (>= 768px) */}
        <div className="d-none d-md-flex align-items-center ms-2 flex-shrink-0">
          {activeUser ? (
            <div
              className="d-flex align-items-center px-3 py-1 rounded-pill"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="me-2 flex-shrink-0"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span
                className="small fw-semibold text-truncate"
                style={{ maxWidth: "130px" }}
                data-testid="active-user-name"
                title={activeUser.name}
              >
                {activeUser.name}
              </span>
              {renderRoleBadge(activeUser.role)}
              <button
                type="button"
                className="btn btn-sm btn-outline-light ms-2 py-0 px-2 flex-shrink-0"
                style={{ fontSize: "0.75rem", borderRadius: "12px", minHeight: "28px" }}
                data-testid="logout-button"
                onClick={auth?.logout}
              >
                Log out
              </button>
            </div>
          ) : currentRequester ? (
            <div
              className="d-flex align-items-center px-3 py-1 rounded-pill"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="me-2 flex-shrink-0"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span
                className="small fw-semibold me-2 text-truncate"
                style={{ maxWidth: "120px" }}
                data-testid="active-user-name"
                title={currentRequester.name}
              >
                {currentRequester.name}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-light py-0 px-2 flex-shrink-0"
                style={{ fontSize: "0.75rem", borderRadius: "12px", minHeight: "28px" }}
                onClick={openSwitchModal}
              >
                Change
              </button>
            </div>
          ) : (
            <span className="small text-white-50">Not authenticated</span>
          )}
        </div>

        {/* Right Mobile Hamburger Toggle (< 768px) */}
        <div className="d-flex d-md-none align-items-center">
          <button
            type="button"
            className="navbar-toggler btn btn-link text-white p-0 d-flex align-items-center justify-content-center"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            style={{
              width: "44px",
              height: "44px",
              minWidth: "44px",
              minHeight: "44px",
              textDecoration: "none",
              borderRadius: "8px",
              backgroundColor: isMobileMenuOpen ? "rgba(255, 255, 255, 0.15)" : "transparent",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isMobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer (DEC-UI-10) */}
      {isMobileMenuOpen && (
        <nav
          className="d-flex d-md-none flex-column px-3 py-3"
          style={{
            backgroundColor: "var(--color-secondary-green)",
            borderTop: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}
          aria-label="Mobile Navigation"
        >
          {/* Mobile User Profile & Logout Section */}
          {activeUser ? (
            <div
              className="d-flex align-items-center justify-content-between p-2 mb-3 rounded"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <div className="d-flex align-items-center min-w-0 me-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-2 flex-shrink-0"
                  style={{ width: "36px", height: "36px", backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="d-flex flex-column min-w-0">
                  <span
                    className="fw-semibold text-white small text-truncate"
                    title={activeUser.name}
                    data-testid="active-user-name-mobile"
                  >
                    {activeUser.name}
                  </span>
                  <div className="mt-1">
                    {renderRoleBadge(activeUser.role, true)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-light flex-shrink-0 px-3 py-1"
                style={{ minHeight: "36px", fontSize: "0.8rem", borderRadius: "8px", fontWeight: 500 }}
                data-testid="logout-button-mobile"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  auth?.logout();
                }}
              >
                Log out
              </button>
            </div>
          ) : currentRequester ? (
            <div
              className="d-flex align-items-center justify-content-between p-2 mb-3 rounded"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <div className="d-flex align-items-center min-w-0 me-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="me-2 flex-shrink-0"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="fw-semibold text-white small text-truncate">
                  {currentRequester.name}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-light flex-shrink-0 px-3 py-1"
                style={{ minHeight: "36px", fontSize: "0.8rem", borderRadius: "8px" }}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openSwitchModal && openSwitchModal();
                }}
              >
                Change
              </button>
            </div>
          ) : null}

          {/* Navigation Links with accessible min 44px height */}
          <div className="d-flex flex-column gap-1">
            {activeUser?.role === "ADMINISTRATOR" && (
              <button
                type="button"
                className="btn btn-link text-white text-start text-decoration-none py-2 px-3 d-flex align-items-center rounded"
                data-testid="nav-user-management-mobile"
                style={{
                  fontWeight: currentTab === "admin-users" ? 700 : 400,
                  minHeight: "44px",
                  backgroundColor: currentTab === "admin-users" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                }}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onTabChange && onTabChange("admin-users");
                }}
              >
                User Management
              </button>
            )}
            {(activeUser?.role === "IT_STAFF" || activeUser?.role === "ADMINISTRATOR") && (
              <button
                type="button"
                className="btn btn-link text-white text-start text-decoration-none py-2 px-3 d-flex align-items-center rounded"
                data-testid="nav-ticket-queue-mobile"
                style={{
                  fontWeight: currentTab === "ticket-queue" ? 700 : 400,
                  minHeight: "44px",
                  backgroundColor: currentTab === "ticket-queue" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                }}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onTabChange && onTabChange("ticket-queue");
                }}
              >
                Ticket Queue
              </button>
            )}
            <button
              type="button"
              className="btn btn-link text-white text-start text-decoration-none py-2 px-3 d-flex align-items-center rounded"
              style={{
                fontWeight: currentTab === "my-tickets" ? 700 : 400,
                minHeight: "44px",
                backgroundColor: currentTab === "my-tickets" ? "rgba(255, 255, 255, 0.15)" : "transparent",
              }}
              onClick={() => {
                setIsMobileMenuOpen(false);
                onTabChange && onTabChange("my-tickets");
              }}
            >
              My Tickets
            </button>
            <button
              type="button"
              className="btn btn-link text-white text-start text-decoration-none py-2 px-3 d-flex align-items-center rounded"
              style={{
                fontWeight: currentTab === "create-ticket" ? 700 : 400,
                minHeight: "44px",
                backgroundColor: currentTab === "create-ticket" ? "rgba(255, 255, 255, 0.15)" : "transparent",
              }}
              onClick={() => {
                setIsMobileMenuOpen(false);
                onTabChange && onTabChange("create-ticket");
              }}
            >
              + Create Ticket
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
