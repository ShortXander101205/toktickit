import { useState, useEffect } from "react";
import { TicketDetail, Attachment, PublicCommentDTO } from "../types/index.js";
import { useRequester } from "../context/RequesterContext.js";
import { fetchTicketDetail, postPublicCommentApi, resolveTicketRequestApi } from "../api.js";
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

// Zen Green status badge helper (paired color, text label, and SVG micro-icon - DEC-UI-19)
function renderStatusBadge(status: string) {
  const s = status.toLowerCase();

  if (s.includes("progress") || s.includes("assigned")) {
    return (
      <span
        className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1.5"
        style={{ backgroundColor: "#FEF08A", color: "#854D0E", fontSize: "0.8125rem", fontWeight: 600 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span>{status}</span>
      </span>
    );
  } else if (s.includes("pending")) {
    return (
      <span
        className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1.5"
        style={{ backgroundColor: "#FFEDD5", color: "#9A3412", fontSize: "0.8125rem", fontWeight: 600 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{status}</span>
      </span>
    );
  } else if (s.includes("resolved") || s.includes("closed")) {
    return (
      <span
        className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1.5"
        style={{ backgroundColor: "#EAF6EF", color: "#006B3C", fontSize: "0.8125rem", fontWeight: 600 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>{status}</span>
      </span>
    );
  } else if (s.includes("cancelled")) {
    return (
      <span
        className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1.5"
        style={{ backgroundColor: "#F3F4F6", color: "#4B5563", fontSize: "0.8125rem", fontWeight: 600 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span>{status}</span>
      </span>
    );
  }

  // Default: New
  return (
    <span
      className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1.5"
      style={{ backgroundColor: "#EBF5FF", color: "#1E429F", fontSize: "0.8125rem", fontWeight: 600 }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>{status}</span>
    </span>
  );
}

// Zen Green priority badge helper (paired color, text label, and SVG micro-icon - DEC-UI-19)
function renderPriorityBadge(priority?: string | null) {
  if (!priority) return <span className="text-muted small">Unassigned</span>;

  const p = priority.toLowerCase();

  if (p === "medium") {
    return (
      <span
        className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2 py-1"
        style={{ backgroundColor: "#FEF3C7", color: "#92400E", fontSize: "0.75rem", fontWeight: 600 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>{priority}</span>
      </span>
    );
  } else if (p === "high") {
    return (
      <span
        className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2 py-1"
        style={{ backgroundColor: "#FFEDD5", color: "#C2410C", fontSize: "0.75rem", fontWeight: 600 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
        <span>{priority}</span>
      </span>
    );
  } else if (p === "urgent") {
    return (
      <span
        className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2 py-1"
        style={{ backgroundColor: "#FEE2E2", color: "#991B1B", fontSize: "0.75rem", fontWeight: 600 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>{priority}</span>
      </span>
    );
  }

  // Default: Low
  return (
    <span
      className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2 py-1"
      style={{ backgroundColor: "#F3F4F6", color: "#374151", fontSize: "0.75rem", fontWeight: 600 }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
      </svg>
      <span>{priority}</span>
    </span>
  );
}

function renderCommentRoleBadge(role: string) {
  if (role === "IT_STAFF") {
    return (
      <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-0.5" style={{ fontSize: "0.75rem" }}>
        IT Staff
      </span>
    );
  }
  if (role === "ADMINISTRATOR") {
    return (
      <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5" style={{ fontSize: "0.75rem" }}>
        Admin
      </span>
    );
  }
  return (
    <span className="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-0.5" style={{ fontSize: "0.75rem" }}>
      Requester
    </span>
  );
}

export function RequesterTicketDetail({ ticketId, onBack }: RequesterTicketDetailProps) {
  const { currentRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Issue 14: Public Comments and Problem Appears Resolved states
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionSuccessMessage, setResolutionSuccessMessage] = useState<string | null>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

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

  // Handler for Requester indicating problem appears resolved (BR-05)
  async function handleResolveProblem() {
    if (!ticket) return;
    setIsResolving(true);
    setResolutionError(null);
    try {
      const res = await resolveTicketRequestApi(ticket.id, currentRequester?.id);
      const confirmedAt = res?.requesterResolutionConfirmedAt || new Date().toISOString();
      setTicket((prev) => (prev ? { ...prev, requesterResolutionConfirmedAt: confirmedAt } : null));
      setResolutionSuccessMessage("Problem resolution indication successfully recorded.");
    } catch (err: any) {
      setResolutionError(err.message || "Failed to record resolution indication.");
    } finally {
      setIsResolving(false);
    }
  }

  // Handler for posting a public comment (BR-04, BR-08)
  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    const trimmed = newComment.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      setCommentError("Comment cannot exceed 2000 characters.");
      return;
    }

    setIsPostingComment(true);
    setCommentError(null);
    try {
      const created = await postPublicCommentApi(ticket.id, trimmed, currentRequester?.id);
      setTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          publicComments: [...(prev.publicComments || []), created],
        };
      });
      setNewComment("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setIsPostingComment(false);
    }
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

      {/* Requester Resolution Status / Action Banner (BR-05) */}
      {ticket.publicComments !== undefined && (
        ticket.requesterResolutionConfirmedAt ? (
          <div
            className="alert d-flex align-items-center gap-2 mb-3 py-2.5 px-3"
            style={{
              borderRadius: "8px",
              border: "1px solid #A7F3D0",
              backgroundColor: "#ECFDF5",
              color: "#065F46",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div className="small">
              <strong>Problem Appears Resolved:</strong> You indicated resolution on{" "}
              {formatDate(ticket.requesterResolutionConfirmedAt)}. IT Staff will review and finalize the ticket.
            </div>
          </div>
        ) : (
          !["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.currentStatus.toUpperCase()) && (
            <div
              className="card border-0 shadow-sm p-3 mb-3 d-flex flex-row justify-content-between align-items-center flex-wrap gap-2"
              style={{ borderRadius: "8px", backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
            >
              <div>
                <div className="fw-semibold text-success small">Is your issue resolved?</div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Click if the problem is fixed from your perspective. IT Staff will be notified.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-success fw-semibold d-inline-flex align-items-center gap-1.5 px-3"
                onClick={handleResolveProblem}
                disabled={isResolving}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {isResolving ? "Saving..." : "Problem Appears Resolved"}
              </button>
            </div>
          )
        )
      )}
      {resolutionSuccessMessage && (
        <div className="alert alert-success small py-2 px-3 mb-3">
          {resolutionSuccessMessage}
        </div>
      )}
      {resolutionError && (
        <div className="alert alert-danger small py-2 px-3 mb-3">
          {resolutionError}
        </div>
      )}

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

      {/* Public Comments Discussion Section */}
      {ticket.publicComments !== undefined && (
        <div
          className="card border-0 shadow-sm p-4 mt-4"
          style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <div>
              <h3 className="h6 fw-bold mb-0" style={{ color: "var(--color-text-primary)" }}>
                Public Comments ({ticket.publicComments?.length || 0})
              </h3>
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                Visible to you, IT Staff, and Administrators
              </span>
            </div>
          </div>

          {/* Comment List */}
          <div className="comment-list mb-4 d-flex flex-column gap-3">
            {(!ticket.publicComments || ticket.publicComments.length === 0) ? (
              <div className="text-muted text-center py-4 small" style={{ backgroundColor: "#F9FAFB", borderRadius: "6px" }}>
                No public comments yet. Use the form below to post an update or question.
              </div>
            ) : (
              ticket.publicComments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 rounded-2"
                  style={{
                    backgroundColor: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-semibold text-dark small">{comment.author.name}</span>
                      {renderCommentRoleBadge(comment.author.role)}
                    </div>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <div
                    className="text-dark small"
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 }}
                  >
                    {comment.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Post Comment Form */}
          <form onSubmit={handlePostComment} className="comment-composer">
            <label htmlFor="requester-comment-input" className="form-label fw-semibold small mb-1">
              Add a Public Comment
            </label>
            <textarea
              id="requester-comment-input"
              className="form-control mb-1"
              rows={3}
              maxLength={2000}
              placeholder="Type your comment or question here..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isPostingComment}
              style={{ fontSize: "0.875rem" }}
            />
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                {newComment.length} / 2000 characters
              </span>
              {commentError && (
                <span className="text-danger small">{commentError}</span>
              )}
            </div>
            <div className="d-flex justify-content-end">
              <button
                type="submit"
                className="btn btn-primary-green btn-sm fw-semibold px-3"
                disabled={isPostingComment || !newComment.trim() || newComment.length > 2000}
              >
                {isPostingComment ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
