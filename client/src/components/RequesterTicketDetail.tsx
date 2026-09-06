import { useState, useEffect } from "react";
import { TicketDetail, Attachment } from "../types/index.js";
import { useRequester } from "../context/RequesterContext.js";
import { fetchTicketDetail } from "../api.js";
import { AttachmentSection } from "./AttachmentSection.js";

interface RequesterTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toISOString().replace("T", " ").substring(0, 16);
  } catch {
    return dateStr;
  }
}

// Zen Green status badge helper
function renderStatusBadge(status: string) {
  const s = status.toLowerCase();
  let bg = "#EBF5FF";
  let color = "#1E429F";
  let icon = "🕒";

  if (s.includes("progress") || s.includes("assigned")) {
    bg = "#FEF08A";
    color = "#854D0E";
    icon = "⚙️";
  } else if (s.includes("pending")) {
    bg = "#FFEDD5";
    color = "#9A3412";
    icon = "❓";
  } else if (s.includes("resolved") || s.includes("closed")) {
    bg = "#EAF6EF";
    color = "#006B3C";
    icon = "✓";
  } else if (s.includes("cancelled")) {
    bg = "#F3F4F6";
    color = "#4B5563";
    icon = "✕";
  }

  return (
    <span
      className="badge d-inline-flex align-items-center gap-1 px-2.5 py-1.5"
      style={{
        backgroundColor: bg,
        color,
        borderRadius: "12px",
        fontSize: "0.8125rem",
        fontWeight: 600,
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{status}</span>
    </span>
  );
}

// Zen Green priority badge helper
function renderPriorityBadge(priority?: string | null) {
  if (!priority) return <span className="text-muted small">Unassigned</span>;

  const p = priority.toLowerCase();
  let bg = "#F3F4F6";
  let color = "#374151";
  let icon = "↓";

  if (p === "medium") {
    bg = "#FEF3C7";
    color = "#92400E";
    icon = "–";
  } else if (p === "high") {
    bg = "#FFEDD5";
    color = "#C2410C";
    icon = "↑";
  } else if (p === "urgent") {
    bg = "#FEE2E2";
    color = "#991B1B";
    icon = "▲";
  }

  return (
    <span
      className="badge d-inline-flex align-items-center gap-1 px-2 py-1"
      style={{
        backgroundColor: bg,
        color,
        borderRadius: "12px",
        fontSize: "0.75rem",
        fontWeight: 600,
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{priority}</span>
    </span>
  );
}

export function RequesterTicketDetail({ ticketId, onBack }: RequesterTicketDetailProps) {
  const { currentRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTicket() {
      if (!currentRequester) return;
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      try {
        const data = await fetchTicketDetail(ticketId, currentRequester.id);
        if (isMounted) {
          setTicket(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorStatus(err.status || 500);
          setErrorMessage(err.message || "Failed to load ticket details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTicket();

    return () => {
      isMounted = false;
    };
  }, [ticketId, currentRequester]);

  // Loading Skeleton Placeholder State (DEC-UI-15)
  if (loading) {
    return (
      <div className="ticket-detail-loading" aria-label="Loading ticket details">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onBack}>
            ← Back to My Tickets
          </button>
        </div>
        <div className="card border-0 shadow-sm p-4 mb-4 placeholder-glow" style={{ borderRadius: "8px" }}>
          <div className="placeholder col-4 mb-3" style={{ height: "32px" }}></div>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="placeholder col-8 mb-2"></div>
              <div className="placeholder col-6 mb-2"></div>
              <div className="placeholder col-7 mb-2"></div>
            </div>
            <div className="col-md-6">
              <div className="placeholder col-5 mb-2"></div>
              <div className="placeholder col-6 mb-2"></div>
            </div>
          </div>
          <div className="placeholder col-12 mb-2" style={{ height: "24px" }}></div>
          <div className="placeholder col-12" style={{ height: "100px" }}></div>
        </div>
      </div>
    );
  }

  // 403 Forbidden Access Panel (Cross-Requester Security Block)
  if (errorStatus === 403) {
    return (
      <div className="card border-0 shadow-sm text-center p-5 my-4" style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}>
        <div
          className="mx-auto mb-3 d-flex align-items-center justify-content-center text-danger"
          style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#FDF2F2" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 className="h4 fw-bold text-danger mb-2">Access Denied</h2>
        <p className="text-muted small mx-auto mb-4" style={{ maxWidth: "480px" }}>
          You do not have permission to view ticket #{ticketId} because it belongs to a different requester.
        </p>
        <div>
          <button type="button" className="btn btn-primary-green px-4 fw-semibold" onClick={onBack}>
            ← Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  // 404 Not Found Panel (Missing Ticket)
  if (errorStatus === 404) {
    return (
      <div className="card border-0 shadow-sm text-center p-5 my-4" style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}>
        <div
          className="mx-auto mb-3 d-flex align-items-center justify-content-center text-muted"
          style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#F3F4F6" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h2 className="h4 fw-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Ticket Not Found</h2>
        <p className="text-muted small mx-auto mb-4" style={{ maxWidth: "480px" }}>
          The requested ticket #{ticketId} could not be found or may have been removed.
        </p>
        <div>
          <button type="button" className="btn btn-outline-secondary px-4 fw-semibold" onClick={onBack}>
            ← Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  // Generic Error State
  if (errorStatus || !ticket) {
    return (
      <div className="my-4">
        <div className="alert alert-danger p-4 mb-3">
          <h4 className="h6 fw-bold mb-1">Failed to Load Ticket</h4>
          <p className="small mb-3">{errorMessage || "An unexpected error occurred while loading ticket details."}</p>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onBack}>
            ← Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  // Handler for adding new attachment
  function handleAttachmentAdded(newAtt: Attachment) {
    setTicket((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        attachments: [...prev.attachments, newAtt],
      };
    });
  }

  // Handler for soft-removing attachment
  function handleAttachmentRemoved(removedId: number, removedData: any) {
    setTicket((prev) => {
      if (!prev) return null;
      const filteredActive = prev.attachments.filter((a) => a.id !== removedId);
      const updatedRemoved = [
        {
          ...removedData,
          isRemoved: true,
        },
        ...prev.removedAttachments,
      ];
      return {
        ...prev,
        attachments: filteredActive,
        removedAttachments: updatedRemoved,
      };
    });
  }

  return (
    <div className="ticket-detail-view pb-5">
      {/* Top Action Bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary fw-semibold px-3"
          style={{ borderRadius: "6px" }}
          onClick={onBack}
        >
          ← Back to My Tickets
        </button>
        <div>{renderStatusBadge(ticket.currentStatus)}</div>
      </div>

      {/* Read-Only Ticket Header & Details Card */}
      <div
        className="card border-0 shadow-sm p-4 mb-4"
        style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
      >
        {/* Ticket Header Line */}
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 pb-3 mb-3 border-bottom">
          <div>
            <span
              className="badge font-monospace px-3 py-2"
              style={{
                backgroundColor: "var(--color-pale-green)",
                color: "var(--color-primary-green)",
                fontSize: "1.125rem",
                fontWeight: 700,
                borderRadius: "6px",
              }}
            >
              {ticket.ticketNumber}
            </span>
          </div>
          <div className="text-muted small text-end">
            <div>Submitted on: <strong>{formatDate(ticket.createdAt)}</strong></div>
            {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
              <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                Last updated: {formatDate(ticket.updatedAt)}
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Details Grid */}
        <div className="row g-3 mb-4 small">
          <div className="col-12 col-md-6">
            <div className="mb-2">
              <span className="text-muted fw-semibold">Requester: </span>
              <span className="fw-medium text-dark">
                {ticket.requesterName || currentRequester?.name}{" "}
                {ticket.requesterEmail ? `(${ticket.requesterEmail})` : `(${currentRequester?.email})`}
              </span>
            </div>
            <div className="mb-2">
              <span className="text-muted fw-semibold">Category: </span>
              <span className="badge bg-light text-dark border ms-1">{ticket.categoryName}</span>
            </div>
            <div>
              <span className="text-muted fw-semibold">Related System: </span>
              <span className="badge bg-light text-dark border ms-1">{ticket.relatedSystemName}</span>
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="mb-2 d-flex align-items-center gap-2">
              <span className="text-muted fw-semibold">Requested Priority: </span>
              {renderPriorityBadge(ticket.requestedPriority)}
            </div>
            <div className="mb-2 d-flex align-items-center gap-2">
              <span className="text-muted fw-semibold">IT Priority: </span>
              {renderPriorityBadge(ticket.itPriority)}
            </div>
            <div>
              <span className="text-muted fw-semibold">Ticket Owner: </span>
              <span className="text-muted">{ticket.ticketOwner || "Unassigned"}</span>
            </div>
          </div>
        </div>

        {/* Full-Width Summary & Description */}
        <div className="pt-3 border-top">
          <h2 className="h5 fw-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {ticket.summary}
          </h2>
          <div
            className="p-3 rounded-2 text-dark"
            style={{
              backgroundColor: "#F9FAFB",
              border: "1px solid #E5E7EB",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "0.875rem",
              lineHeight: 1.6,
            }}
          >
            {ticket.description}
          </div>
        </div>

        {/* Resolution Summary (if resolved) */}
        {ticket.resolutionSummary && (
          <div className="mt-3 p-3 rounded-2 bg-success-subtle border border-success-subtle small">
            <div className="fw-bold text-success mb-1">Resolution Summary:</div>
            <div className="text-dark">{ticket.resolutionSummary}</div>
          </div>
        )}
      </div>

      {/* Interactive Attachment Section */}
      <AttachmentSection
        ticketId={ticket.id}
        activeAttachments={ticket.attachments || []}
        removedAttachments={ticket.removedAttachments || []}
        onAttachmentAdded={handleAttachmentAdded}
        onAttachmentRemoved={handleAttachmentRemoved}
      />
    </div>
  );
}
