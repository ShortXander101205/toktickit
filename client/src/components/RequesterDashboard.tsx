import React, { useState, useEffect, useCallback } from "react";
import { fetchRequesterDashboard } from "../api.js";
import {
  AuthUser,
  RequesterDashboardResponse,
  DashboardRecentTicket,
} from "../types/index.js";

export interface RequesterDashboardProps {
  user?: AuthUser | null;
  requesterId?: number;
  onDrillDownMyTickets: (statusFilter: string) => void;
  onSelectTicket: (ticketId: string | number) => void;
  onCreateTicket: () => void;
  onViewAllTickets: () => void;
}

export function RequesterDashboard({
  user,
  requesterId,
  onDrillDownMyTickets,
  onSelectTicket,
  onCreateTicket,
  onViewAllTickets,
}: RequesterDashboardProps) {
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRequesterId = requesterId ?? user?.id;

  const loadMetrics = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetchRequesterDashboard(activeRequesterId);
        setData(response);
      } catch (err: any) {
        console.error("Failed to load requester dashboard metrics:", err);
        setError(err.message || "Failed to load dashboard metrics. Please try again.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeRequesterId]
  );

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  function renderStatusBadge(status: string) {
    const norm = status.toUpperCase().replace(/\s+/g, "_");
    let bg = "#F3F4F6";
    let color = "#374151";
    let border = "#D1D5DB";
    let label = status;

    switch (norm) {
      case "NEW":
        bg = "#EBF5FF";
        color = "#1E429F";
        border = "#93C5FD";
        label = "New";
        break;
      case "OPEN":
      case "ASSIGNED":
        bg = "#F0FDF4";
        color = "#166534";
        border = "#BBF7D0";
        label = "Open";
        break;
      case "IN_PROGRESS":
        bg = "#FEF3C7";
        color = "#92400E";
        border = "#FCD34D";
        label = "In Progress";
        break;
      case "WAITING_FOR_REQUESTER":
      case "PENDING_REQUESTER":
        bg = "#F3E8FF";
        color = "#6B21A8";
        border = "#D8B4FE";
        label = "Waiting for Requester";
        break;
      case "RESOLVED":
        bg = "var(--zen-primary-soft, #EAF6EF)";
        color = "var(--zen-primary, #006B3C)";
        border = "#A3D9B8";
        label = "Resolved";
        break;
      case "CLOSED":
        bg = "#F3F4F6";
        color = "#4B5563";
        border = "#D1D5DB";
        label = "Closed";
        break;
      case "REOPENED":
        bg = "#FEF2F2";
        color = "#991B1B";
        border = "#FECACA";
        label = "Reopened";
        break;
      case "CANCELLED":
        bg = "#F9FAFB";
        color = "#9CA3AF";
        border = "#E5E7EB";
        label = "Cancelled";
        break;
    }

    return (
      <span
        className="badge rounded-pill"
        style={{
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          padding: "0.28rem 0.6rem",
          fontSize: "0.75rem",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    );
  }

  function renderPriorityBadge(priority: string) {
    const norm = priority.toUpperCase();
    let bg = "#F3F4F6";
    let color = "#374151";
    let border = "#D1D5DB";

    switch (norm) {
      case "URGENT":
        bg = "#FDE8E8";
        color = "#9B1C1C";
        border = "#F87171";
        break;
      case "HIGH":
        bg = "#FEF08A";
        color = "#713F12";
        border = "#EAB308";
        break;
      case "MEDIUM":
        bg = "#E1EFFE";
        color = "#1E429F";
        border = "#93C5FD";
        break;
      case "LOW":
        bg = "#F3F4F6";
        color = "#4B5563";
        border = "#D1D5DB";
        break;
    }

    return (
      <span
        className="badge rounded-pill"
        style={{
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          padding: "0.25rem 0.5rem",
          fontSize: "0.72rem",
          fontWeight: 600,
        }}
      >
        {priority}
      </span>
    );
  }

  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  const requesterName = user?.name || "Requester";

  return (
    <div className="container-fluid px-0" data-testid="requester-dashboard">
      {/* Welcome Banner & In-Place Refresh Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2
            className="h3 mb-1 fw-bold"
            style={{ color: "var(--zen-primary, #006B3C)" }}
            data-testid="requester-welcome-header"
          >
            Welcome back, {requesterName}
          </h2>
          <p className="text-muted small mb-0">
            Track your active service desk requests and recent updates.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            onClick={() => loadMetrics(true)}
            disabled={isRefreshing || loading}
            data-testid="requester-dashboard-refresh"
            style={{ borderRadius: "6px" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={isRefreshing ? "spin-animation" : ""}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            className="btn btn-zen d-inline-flex align-items-center gap-2"
            onClick={onCreateTicket}
            data-testid="quick-create-ticket-top"
            style={{
              backgroundColor: "var(--zen-primary, #006B3C)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              fontWeight: 500,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-danger mb-4" role="alert" data-testid="requester-dashboard-error">
          <div className="d-flex align-items-center justify-content-between">
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => loadMetrics()}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="row g-3 mb-4" data-testid="requester-metric-cards">
        {/* Card 1: My Open Tickets */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="card h-100 p-3 shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D8E2DC",
              borderRadius: "8px",
            }}
            data-testid="metric-card-open"
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">My Open Tickets</span>
              <span
                className="badge rounded-pill"
                style={{
                  backgroundColor: "var(--zen-primary-soft, #EAF6EF)",
                  color: "var(--zen-primary, #006B3C)",
                }}
              >
                Active
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-primary, #006B3C)" }}>
              {loading ? "-" : data?.totalOpen ?? 0}
            </div>
            <div className="small text-muted mb-3">
              {data && data.waitingForRequester > 0 ? (
                <span
                  className="fw-semibold"
                  style={{ color: "#92400E" }}
                  data-testid="open-waiting-alert"
                >
                  {data.waitingForRequester} waiting for your reply
                </span>
              ) : (
                "Currently in progress or open"
              )}
            </div>
            <div className="mt-auto pt-2 border-top">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ color: "var(--zen-primary, #006B3C)" }}
                onClick={() => onDrillDownMyTickets("OPEN_ACTIVE")}
                data-testid="drilldown-open"
              >
                View all &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="card h-100 p-3 shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D8E2DC",
              borderRadius: "8px",
            }}
            data-testid="metric-card-in-progress"
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">In Progress</span>
              <span
                className="badge rounded-pill"
                style={{
                  backgroundColor: "#FEF3C7",
                  color: "#92400E",
                }}
              >
                Working
              </span>
            </div>
            <div className="h2 fw-bold mb-1 text-dark">
              {loading ? "-" : data?.inProgress ?? 0}
            </div>
            <div className="small text-muted mb-3">Being handled by IT staff</div>
            <div className="mt-auto pt-2 border-top">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ color: "var(--zen-primary, #006B3C)" }}
                onClick={() => onDrillDownMyTickets("IN_PROGRESS")}
                data-testid="drilldown-in-progress"
              >
                View all &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Resolved */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="card h-100 p-3 shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D8E2DC",
              borderRadius: "8px",
            }}
            data-testid="metric-card-resolved"
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">Resolved</span>
              <span
                className="badge rounded-pill"
                style={{
                  backgroundColor: "var(--zen-primary-soft, #EAF6EF)",
                  color: "var(--zen-primary, #006B3C)",
                }}
              >
                Awaiting Check
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-primary, #006B3C)" }}>
              {loading ? "-" : data?.resolved ?? 0}
            </div>
            <div className="small text-muted mb-3">Ready for your confirmation</div>
            <div className="mt-auto pt-2 border-top">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ color: "var(--zen-primary, #006B3C)" }}
                onClick={() => onDrillDownMyTickets("RESOLVED")}
                data-testid="drilldown-resolved"
              >
                View all &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Closed */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="card h-100 p-3 shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D8E2DC",
              borderRadius: "8px",
            }}
            data-testid="metric-card-closed"
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">Closed</span>
              <span
                className="badge rounded-pill"
                style={{
                  backgroundColor: "#F3F4F6",
                  color: "#4B5563",
                }}
              >
                Completed
              </span>
            </div>
            <div className="h2 fw-bold mb-1 text-secondary">
              {loading ? "-" : data?.closed ?? 0}
            </div>
            <div className="small text-muted mb-3">Past completed tickets</div>
            <div className="mt-auto pt-2 border-top">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1 text-secondary"
                onClick={() => onDrillDownMyTickets("CLOSED")}
                data-testid="drilldown-closed"
              >
                View all &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Row: Recent Tickets Table + Quick Actions */}
      <div className="row g-4">
        {/* Left Column: Recent Tickets (75% or col-lg-8) */}
        <div className="col-12 col-lg-8">
          <div
            className="card shadow-sm h-100"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D8E2DC",
              borderRadius: "8px",
            }}
          >
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <div>
                <h3 className="h6 mb-0 fw-bold text-dark">Recent Tickets</h3>
                <span className="text-muted small">Your latest 5 updated requests</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none fw-semibold"
                style={{ color: "var(--zen-primary, #006B3C)" }}
                onClick={onViewAllTickets}
                data-testid="link-view-all-tickets"
              >
                View all tickets &rarr;
              </button>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading recent tickets...</span>
                  </div>
                </div>
              ) : !data || data.recentTickets.length === 0 ? (
                /* Safe Zero-Value Empty State (BR-13) */
                <div
                  className="text-center py-5 px-3"
                  data-testid="requester-dashboard-empty-state"
                >
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: "var(--zen-primary-soft, #EAF6EF)",
                      color: "var(--zen-primary, #006B3C)",
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <h4 className="h6 fw-bold text-dark mb-1">
                    You haven't submitted any support tickets yet
                  </h4>
                  <p className="text-muted small mb-3">
                    Need assistance from campus IT? Submit a request and track its progress here.
                  </p>
                  <button
                    type="button"
                    className="btn btn-zen d-inline-flex align-items-center gap-2"
                    style={{
                      backgroundColor: "var(--zen-primary, #006B3C)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "6px",
                    }}
                    onClick={onCreateTicket}
                    data-testid="empty-create-ticket-btn"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Create Your First Ticket</span>
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" data-testid="recent-tickets-table">
                    <thead className="table-light small text-muted">
                      <tr>
                        <th scope="col" className="ps-3 py-2">Ticket #</th>
                        <th scope="col" className="py-2">Subject</th>
                        <th scope="col" className="py-2">Category</th>
                        <th scope="col" className="py-2">Priority</th>
                        <th scope="col" className="py-2">Status</th>
                        <th scope="col" className="pe-3 py-2 text-end">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTickets.map((ticket: DashboardRecentTicket) => (
                        <tr
                          key={ticket.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => onSelectTicket(ticket.id)}
                          data-testid="recent-ticket-row"
                        >
                          <td className="ps-3 fw-bold small text-nowrap" style={{ color: "var(--zen-primary, #006B3C)" }}>
                            {ticket.ticketNumber}
                          </td>
                          <td className="fw-semibold text-dark text-truncate" style={{ maxWidth: "240px" }}>
                            {ticket.title || ticket.summary}
                          </td>
                          <td className="small text-muted">{ticket.categoryName}</td>
                          <td>{renderPriorityBadge(ticket.priority || ticket.requestedPriority)}</td>
                          <td>{renderStatusBadge(ticket.status || ticket.currentStatus)}</td>
                          <td className="pe-3 small text-muted text-end text-nowrap">
                            {formatDate(ticket.updatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Help (25% or col-lg-4) */}
        <div className="col-12 col-lg-4">
          <div className="d-flex flex-column gap-3">
            {/* Quick Actions Card */}
            <div
              className="card shadow-sm p-3"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #D8E2DC",
                borderRadius: "8px",
              }}
            >
              <h3 className="h6 fw-bold text-dark mb-3">Quick Actions</h3>
              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className="btn btn-zen w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2"
                  style={{
                    backgroundColor: "var(--zen-primary, #006B3C)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 500,
                  }}
                  onClick={onCreateTicket}
                  data-testid="quick-create-ticket"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Create Ticket</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2"
                  style={{ borderRadius: "6px", fontWeight: 500 }}
                  onClick={onViewAllTickets}
                  data-testid="quick-view-tickets"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>View My Tickets</span>
                </button>
              </div>
            </div>

            {/* Support / Help Info Box */}
            <div
              className="card shadow-sm p-3"
              style={{
                backgroundColor: "var(--zen-primary-soft, #EAF6EF)",
                border: "1px solid #C4E3D2",
                borderRadius: "8px",
              }}
            >
              <div className="d-flex align-items-start gap-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--zen-primary, #006B3C)"
                  strokeWidth="2"
                  className="flex-shrink-0 mt-1"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <div>
                  <h4 className="h6 fw-bold mb-1" style={{ color: "var(--zen-primary, #006B3C)" }}>
                    Need Immediate Assistance?
                  </h4>
                  <p className="small text-muted mb-0">
                    For critical system outages or urgent campus service requests, contact the IT Service Desk helpline at ext. 8100.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
