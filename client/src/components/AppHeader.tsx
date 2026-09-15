import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { UserRole } from "../types/index.js";

interface AppHeaderProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AppHeader({ currentTab = "my-tickets", onTabChange }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Role Badge Styling (DEC-UI-02, DEC-UI-19)
  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case "ADMINISTRATOR":
        return {
          label: "Administrator",
          bg: "#FEF3C7",
          text: "#92400E",
        };
      case "IT_STAFF":
        return {
          label: "IT Staff",
          bg: "#EEF2F6",
          text: "#1E293B",
        };
      case "REQUESTER":
      default:
        return {
          label: "Requester",
          bg: "#EAF6EF",
          text: "#006B3C",
        };
    }
  };

  const badge = getRoleBadge(user?.role);

  // Role-Based Navigation links (DEC-UI-03)
  const getNavLinks = (role?: UserRole) => {
    switch (role) {
      case "ADMINISTRATOR":
        return [
          { id: "user-management", label: "User Management" },
          { id: "staff-queue", label: "Ticket Queue" },
        ];
      case "IT_STAFF":
        return [
          { id: "staff-queue", label: "Ticket Queue" },
          { id: "create-ticket", label: "+ Create Ticket" },
        ];
      case "REQUESTER":
      default:
        return [
          { id: "my-tickets", label: "My Tickets" },
          { id: "create-ticket", label: "+ Create Ticket" },
        ];
    }
  };

  const navLinks = getNavLinks(user?.role);

  return (
    <div className="w-100" style={{ zIndex: 1030 }}>
      <header
        className="d-flex align-items-center justify-content-between px-3 px-md-4"
        style={{
          backgroundColor: "var(--color-primary-green)",
          minHeight: "56px",
          color: "#ffffff",
        }}
      >
        {/* Brand & Mobile Hamburger */}
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

          {/* Accessible Mobile Hamburger Toggle (DEC-UI-10) */}
          <button
            type="button"
            className="navbar-toggler d-inline-flex d-md-none btn btn-link text-white p-1 ms-1"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            style={{
              minWidth: "44px",
              minHeight: "44px",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

        {/* Center Desktop Nav (Role-Based) */}
        <nav className="d-none d-md-flex align-items-center gap-3">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              className="btn btn-link text-white text-decoration-none px-2 py-1"
              style={{
                fontWeight: currentTab === link.id ? 700 : 400,
                borderBottom: currentTab === link.id ? "2px solid #ffffff" : "2px solid transparent",
                borderRadius: 0,
              }}
              onClick={() => onTabChange && onTabChange(link.id)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right Persona Badge & Session Controls (DEC-UI-02) */}
        <div className="d-flex align-items-center gap-2 ms-2">
          {user ? (
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
                style={{ maxWidth: "120px" }}
                data-testid="active-user-name"
                data-tooltip={user.name}
              >
                {user.name}
              </span>

              {/* Role Badge Pill (DEC-UI-19) */}
              <span
                className="badge rounded-pill px-2 py-1 me-2"
                style={{
                  backgroundColor: badge.bg,
                  color: badge.text,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}
                data-testid="active-user-role"
              >
                {badge.label}
              </span>

              {/* Functional Logout Action */}
              <button
                type="button"
                className="btn btn-sm btn-outline-light py-0 px-2 flex-shrink-0"
                style={{ fontSize: "0.75rem", borderRadius: "12px", minHeight: "26px" }}
                onClick={() => logout()}
                data-testid="logout-button"
                data-tooltip="Sign out of TokTickIT"
              >
                Logout
              </button>
            </div>
          ) : (
            <span className="small text-white-50">Not authenticated</span>
          )}
        </div>
      </header>

      {/* Mobile Drawer (DEC-UI-10) */}
      {isMobileMenuOpen && (
        <nav
          className="d-flex d-md-none flex-column px-3 py-2"
          style={{
            backgroundColor: "var(--color-secondary-green)",
            borderTop: "1px solid rgba(255, 255, 255, 0.2)",
          }}
          aria-label="Mobile Navigation"
        >
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              className="btn btn-link text-white text-start text-decoration-none py-2 px-1 d-flex align-items-center"
              style={{
                fontWeight: currentTab === link.id ? 700 : 400,
                minHeight: "44px",
              }}
              onClick={() => {
                setIsMobileMenuOpen(false);
                onTabChange && onTabChange(link.id);
              }}
            >
              {link.label}
            </button>
          ))}
          {user && (
            <button
              type="button"
              className="btn btn-link text-white text-start text-decoration-none py-2 px-1 d-flex align-items-center border-top border-white-50 mt-1"
              style={{ minHeight: "44px" }}
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
            >
              Sign Out ({user.name})
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
