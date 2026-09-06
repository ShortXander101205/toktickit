import React from "react";
import { useRequester } from "../context/RequesterContext.js";

interface AppHeaderProps {
  currentTab?: "my-tickets" | "create-ticket";
  onTabChange?: (tab: "my-tickets" | "create-ticket") => void;
}

export function AppHeader({ currentTab = "my-tickets", onTabChange }: AppHeaderProps) {
  const { currentRequester, openSwitchModal } = useRequester();

  return (
    <header
      className="d-flex align-items-center justify-content-between px-3 px-md-4"
      style={{
        backgroundColor: "var(--color-primary-green)",
        height: "56px",
        color: "#ffffff",
      }}
    >
      {/* Brand */}
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
          className="badge ms-1 d-none d-sm-inline-block"
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

      {/* Center Nav */}
      <nav className="d-none d-md-flex align-items-center gap-3">
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

      {/* Right Persona Badge */}
      <div className="d-flex align-items-center ms-2">
        {currentRequester ? (
          <div
            className="d-flex align-items-center px-2 px-sm-3 py-1 rounded-pill"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              maxWidth: "100%",
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
              className="me-1 me-sm-2 flex-shrink-0"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span
              className="small fw-semibold me-2 text-truncate"
              style={{ maxWidth: "110px" }}
              data-testid="active-user-name"
              title={currentRequester.name}
            >
              {currentRequester.name}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-light py-0 px-2 flex-shrink-0"
              style={{ fontSize: "0.75rem", borderRadius: "12px" }}
              onClick={openSwitchModal}
            >
              Change
            </button>
          </div>
        ) : (
          <span className="small text-white-50">No requester selected</span>
        )}
      </div>
    </header>
  );
}
