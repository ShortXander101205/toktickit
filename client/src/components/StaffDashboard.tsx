import React, { useState, useEffect, useCallback } from "react";
import { fetchStaffDashboard, fetchAdminDashboard } from "../api.js";
import {
  AuthUser,
  StaffDashboardResponse,
  AdminDashboardResponse,
  DashboardRecentTicket,
} from "../types/index.js";

export interface StaffDashboardProps {
  user: AuthUser;
  onDrillDownQueue: (filters: {
    status?: string;
    ownerId?: string;
    autoFocusSearch?: boolean;
  }) => void;
  onSelectTicket: (ticketId: string | number) => void;
  onCreateTicket: () => void;
  onManageUsers?: () => void;
}

export function StaffDashboard({
  user,
  onDrillDownQueue,
  onSelectTicket,
  onCreateTicket,
  onManageUsers,
}: StaffDashboardProps) {
  const [data, setData] = useState<AdminDashboardResponse | StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user.role === "ADMINISTRATOR";

  const loadMetrics = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        if (isAdmin) {
          const res = await fetchAdminDashboard();
          setData(res);
        } else {
          const res = await fetchStaffDashboard();
          setData(res);
        }
      } catch (err: any) {
        console.error("Failed to load staff dashboard metrics:", err);
        setError(err.message || "Failed to load dashboard metrics. Please try again.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAdmin]
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

  const roleLabel = isAdmin ? "Administrator" : "IT Staff";
  const adminData = isAdmin ? (data as AdminDashboardResponse | null) : null;

  return (
    <div className="container-fluid px-0" data-testid="staff-dashboard">
      {/* Welcome Banner & In-Place Refresh Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h2
              className="h3 mb-0 fw-bold"
              style={{ color: "var(--zen-primary, #006B3C)" }}
              data-testid="staff-welcome-header"
            >
              Welcome, {user.name}
            </h2>
            <span
              className="badge rounded-pill px-2 py-1"
              style={{
                backgroundColor: isAdmin ? "#E1EFFE" : "var(--zen-primary-soft, #EAF6EF)",
                color: isAdmin ? "#1E429F" : "var(--zen-primary, #006B3C)",
                border: `1px solid ${isAdmin ? "#93C5FD" : "#A3D9B8"}`,
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
              data-testid="staff-role-badge"
            >
              {roleLabel}
            </span>
          </div>
          <p className="text-muted small mb-0">
            Monitor real-time service desk queues, triage unassigned requests, and manage ticket workflows.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            onClick={() => loadMetrics(true)}
            disabled={isRefreshing || loading}
            data-testid="staff-dashboard-refresh"
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
            data-testid="staff-create-ticket-top"
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

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger mb-4" role="alert" data-testid="staff-dashboard-error">
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

      {/* 5 Operational Metric Cards Grid */}
      <div className="row g-3 mb-4" data-testid="staff-metric-cards">
        {/* Card 1: New Tickets */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className="card h-100 p-3 shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D8E2DC",
              borderRadius: "8px",
            }}
            data-testid="metric-card-new"
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">New Tickets</span>
              <span
                className="badge rounded-pill"
                style={{ backgroundColor: "#EBF5FF", color: "#1E429F" }}
              >
                Intake
              </span>
            </div>
            <div className="h2 fw-bold mb-1 text-primary">
              {loading ? "-" : data?.newCount ?? 0}
            </div>
            <div className="small text-muted mb-3">Awaiting initial review</div>
            <div className="mt-auto pt-2 border-top">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1 text-primary"
                onClick={() => onDrillDownQueue({ status: "NEW" })}
                data-testid="drilldown-new"
              >
                View queue &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Open Tickets */}
        <div className="col-12 col-sm-6 col-lg">
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
              <span className="text-muted small fw-semibold">Open Tickets</span>
              <span
                className="badge rounded-pill"
                style={{ backgroundColor: "#F0FDF4", color: "#166534" }}
              >
                Ready
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#166534" }}>
              {loading ? "-" : data?.openCount ?? 0}
            </div>
            <div className="small text-muted mb-3">Assigned & ready for work</div>
            <div className="mt-auto pt-2 border-top">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ color: "#166534" }}
                onClick={() => onDrillDownQueue({ status: "OPEN" })}
                data-testid="drilldown-open"
              >
                View queue &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="col-12 col-sm-6 col-lg">
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
                style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
              >
                Active
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#92400E" }}>
              {loading ? "-" : data?.inProgressCount ?? 0}
            </div>
            <div className="small text-muted mb-3">Under active investigation</div>
            <div className="mt-auto pt-2 border-top">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ color: "#92400E" }}
                onClick={() => onDrillDownQueue({ status: "IN_PROGRESS" })}
                data-testid="drilldown-in-progress"
              >
                View queue &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Waiting for Requester */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className="card h-100 p-3 shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D8E2DC",
              borderRadius: "8px",
            }}
            data-testid="metric-card-waiting"
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">Waiting Requester</span>
              <span
                className="badge rounded-pill"
                style={{ backgroundColor: "#F3E8FF", color: "#6B21A8" }}
              >
                Pending
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#6B21A8" }}>
              {loading ? "-" : data?.waitingForRequesterCount ?? 0}
            </div>
            <div className="small text-muted mb-3">Awaiting user response</div>
            <div className="mt-auto pt-2 border-top">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ color: "#6B21A8" }}
                onClick={() => onDrillDownQueue({ status: "WAITING_FOR_REQUESTER" })}
                data-testid="drilldown-waiting"
              >
                View queue &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Card 5: My Assigned Tickets (Highlighted with Zen Green soft accent) */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className="card h-100 p-3 shadow-sm"
            style={{
              backgroundColor: "var(--zen-primary-soft, #EAF6EF)",
              border: "1.5px solid var(--zen-primary, #006B3C)",
              borderRadius: "8px",
            }}
            data-testid="metric-card-my-assigned"
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="fw-semibold small" style={{ color: "var(--zen-primary, #006B3C)" }}>
                My Assigned
              </span>
              <span
                className="badge rounded-pill"
                style={{
                  backgroundColor: "var(--zen-primary, #006B3C)",
                  color: "#FFFFFF",
                }}
              >
                Personal
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "var(--zen-primary, #006B3C)" }}>
              {loading ? "-" : data?.myAssignedCount ?? 0}
            </div>
            <div className="small text-muted mb-3">
              {data && (
                <span>
                  Unassigned queue:{" "}
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none fw-semibold small"
                    style={{ color: "#92400E" }}
                    onClick={() => onDrillDownQueue({ ownerId: "unassigned" })}
                    data-testid="drilldown-unassigned"
                  >
                    {data.unassignedCount} tickets
                  </button>
                </span>
              )}
            </div>
            <div className="mt-auto pt-2 border-top border-success-subtle">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ color: "var(--zen-primary, #006B3C)" }}
                onClick={() => onDrillDownQueue({ ownerId: String(user.id) })}
                data-testid="drilldown-my-assigned"
              >
                My tickets &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin User Account Summary Strip (BR-12) */}
      {isAdmin && (
        <div
          className="card shadow-sm mb-4"
          style={{
            backgroundColor: "#F8FAFC",
            border: "1px solid #CBD5E1",
            borderRadius: "8px",
          }}
          data-testid="admin-user-summary-strip"
        >
          <div className="card-body py-3 px-4">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-4 flex-wrap">
                <div>
                  <span className="text-muted small fw-semibold d-block">Total Users</span>
                  <span className="h5 fw-bold mb-0 text-dark" data-testid="admin-total-users">
                    {loading ? "-" : adminData?.totalUsers ?? adminData?.users?.totalUsers ?? 0}
                  </span>
                </div>
                <div className="border-start ps-3">
                  <span className="text-muted small fw-semibold d-block">Active Users</span>
                  <span className="h5 fw-bold mb-0 text-success" data-testid="admin-active-users">
                    {loading ? "-" : adminData?.activeUsers ?? adminData?.users?.activeUsers ?? 0}
                  </span>
                </div>
                <div className="border-start ps-3">
                  <span className="text-muted small fw-semibold d-block">Requesters</span>
                  <span className="h5 fw-bold mb-0 text-secondary" data-testid="admin-requesters-count">
                    {loading ? "-" : adminData?.requestersCount ?? adminData?.users?.requestersCount ?? 0}
                  </span>
                </div>
                <div className="border-start ps-3">
                  <span className="text-muted small fw-semibold d-block">IT Staff</span>
                  <span className="h5 fw-bold mb-0 text-primary" data-testid="admin-staff-count">
                    {loading ? "-" : adminData?.staffCount ?? adminData?.users?.staffCount ?? 0}
                  </span>
                </div>
                <div className="border-start ps-3">
                  <span className="text-muted small fw-semibold d-block">Admins</span>
                  <span className="h5 fw-bold mb-0 text-dark" data-testid="admin-admins-count">
                    {loading ? "-" : adminData?.adminCount ?? adminData?.users?.adminCount ?? 0}
                  </span>
                </div>
              </div>

              {onManageUsers && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                  onClick={onManageUsers}
                  data-testid="admin-manage-users-btn"
                  style={{ borderRadius: "6px" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span>Manage Users</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Recent Queue Tickets (8 cols) + Quick Actions (4 cols) */}
      <div className="row g-4">
        {/* Left Column: Recent Queue Tickets */}
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
                <h3 className="h6 mb-0 fw-bold text-dark">Recent Queue Tickets</h3>
                <span className="text-muted small">Latest 5 updated requests across the service desk</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none fw-semibold"
                style={{ color: "var(--zen-primary, #006B3C)" }}
                onClick={() => onDrillDownQueue({})}
                data-testid="link-view-full-queue"
              >
                View full queue &rarr;
              </button>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading queue tickets...</span>
                  </div>
                </div>
              ) : !data || data.recentTickets.length === 0 ? (
                <div className="text-center py-5 px-3" data-testid="staff-dashboard-empty-queue">
                  <p className="text-muted mb-2">No tickets currently found in the queue.</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onDrillDownQueue({})}
                  >
                    Go to Ticket Queue
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" data-testid="staff-recent-tickets-table">
                    <thead className="table-light small text-muted">
                      <tr>
                        <th scope="col" className="ps-3 py-2">Ticket #</th>
                        <th scope="col" className="py-2">Subject</th>
                        <th scope="col" className="py-2">Category</th>
                        <th scope="col" className="py-2">Priority</th>
                        <th scope="col" className="py-2">Status</th>
                        <th scope="col" className="py-2">Owner</th>
                        <th scope="col" className="pe-3 py-2 text-end">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTickets.map((ticket: DashboardRecentTicket) => (
                        <tr
                          key={ticket.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => onSelectTicket(ticket.id)}
                          data-testid="staff-recent-ticket-row"
                        >
                          <td className="ps-3 fw-bold small text-nowrap" style={{ color: "var(--zen-primary, #006B3C)" }}>
                            {ticket.ticketNumber}
                          </td>
                          <td className="fw-semibold text-dark text-truncate" style={{ maxWidth: "200px" }}>
                            {ticket.title || ticket.summary}
                          </td>
                          <td className="small text-muted">{ticket.categoryName}</td>
                          <td>{renderPriorityBadge(ticket.priority || ticket.requestedPriority)}</td>
                          <td>{renderStatusBadge(ticket.status || ticket.currentStatus)}</td>
                          <td className="small">
                            {ticket.ownerName ? (
                              <span className="fw-medium text-dark">{ticket.ownerName}</span>
                            ) : (
                              <span className="text-muted fst-italic">Unassigned</span>
                            )}
                          </td>
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

        {/* Right Column: Quick Actions & Operational Shortcuts */}
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
                  data-testid="quick-create-ticket-staff"
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
                  onClick={() => onDrillDownQueue({ autoFocusSearch: true })}
                  data-testid="quick-search-tickets"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>Search Tickets</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2"
                  style={{ borderRadius: "6px", fontWeight: 500 }}
                  onClick={() => onDrillDownQueue({ ownerId: String(user.id) })}
                  data-testid="quick-my-queue"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>My Queue</span>
                </button>
              </div>
            </div>

            {/* Operational Priority Box */}
            <div
              className="card shadow-sm p-3"
              style={{
                backgroundColor: "var(--zen-primary-soft, #EAF6EF)",
                border: "1px solid #C4E3D2",
                borderRadius: "8px",
              }}
            >
              <h4 className="h6 fw-bold mb-2" style={{ color: "var(--zen-primary, #006B3C)" }}>
                Queue Guidelines
              </h4>
              <ul className="small text-muted ps-3 mb-0">
                <li className="mb-1">
                  <strong>New Tickets:</strong> Acknowledge and set IT priority within 2 hours.
                </li>
                <li className="mb-1">
                  <strong>Unassigned:</strong> Self-assign active requests before starting investigation.
                </li>
                <li>
                  <strong>Waiting Requester:</strong> Follow up after 48 hours of inactivity.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
