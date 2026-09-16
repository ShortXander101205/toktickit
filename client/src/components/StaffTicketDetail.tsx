import { useState, useEffect } from "react";
import {
  TicketDetail,
  StaffTicketOwnerDTO,
  PublicCommentDTO,
  InternalNoteDTO,
  Attachment,
} from "../types/index.js";
import { useAuth } from "../context/AuthContext.js";
import {
  getTicketDetailApi,
  getStaffAssigneesApi,
  assignTicketOwnerApi,
  updateTicketPriorityApi,
  transitionTicketStatusApi,
  postPublicCommentApi,
  postInternalNoteApi,
} from "../api.js";

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

// Status Transition Matrix validator (SDS Approved Decision D-02 / Spec §6.1)
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED", "CANCELLED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: ["REOPENED"],
};

function normalizeStatusKey(val: string): string {
  const norm = val.trim().toUpperCase().replace(/\s+/g, "_");
  if (norm === "ASSIGNED") return "OPEN";
  if (norm === "PENDING_REQUESTER") return "WAITING_FOR_REQUESTER";
  return norm;
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Zen Green status badge helper (DEC-UI-19)
function renderStatusBadge(status: string) {
  const s = status.toLowerCase();

  if (s.includes("progress") || s.includes("assigned") || s.includes("open")) {
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
  } else if (s.includes("pending") || s.includes("waiting")) {
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

// Zen Green priority badge helper (DEC-UI-19)
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

export function StaffTicketDetail({ ticketId, onBack }: StaffTicketDetailProps) {
  const { user } = useAuth();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [assignees, setAssignees] = useState<StaffTicketOwnerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Operational Action States
  const [isUpdatingOwner, setIsUpdatingOwner] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusToConfirm, setStatusToConfirm] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: "success" | "danger"; message: string } | null>(null);

  // Discussion Threads
  const [publicCommentText, setPublicCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [internalNoteText, setInternalNoteText] = useState("");
  const [isPostingNote, setIsPostingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      try {
        const [ticketData, assigneesData] = await Promise.all([
          getTicketDetailApi(ticketId),
          getStaffAssigneesApi().catch(() => []),
        ]);
        if (isMounted) {
          setTicket(ticketData);
          setAssignees(assigneesData);
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

    loadData();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  function showFeedback(type: "success" | "danger", message: string) {
    setFeedbackNotice({ type, message });
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 4000);
  }

  // Claim Ticket Shortcut (BR-06)
  async function handleClaimTicket() {
    if (!ticket || !user) return;
    setIsUpdatingOwner(true);
    try {
      const res = await assignTicketOwnerApi(ticket.id, user.id);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ownerId: user.id,
              owner: {
                id: user.id,
                name: user.name,
                email: user.email,
              },
              ticketOwner: user.name,
            }
          : null
      );
      showFeedback("success", "Ticket successfully claimed by you.");
    } catch (err: any) {
      showFeedback("danger", err.message || "Failed to claim ticket.");
    } finally {
      setIsUpdatingOwner(false);
    }
  }

  // Change Owner from dropdown (BR-06)
  async function handleOwnerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!ticket) return;
    const val = e.target.value;
    const targetOwnerId = val === "unassigned" || !val ? null : parseInt(val, 10);

    setIsUpdatingOwner(true);
    try {
      const res = await assignTicketOwnerApi(ticket.id, targetOwnerId);
      const newOwner = assignees.find((a) => a.id === targetOwnerId) || null;
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ownerId: targetOwnerId,
              owner: newOwner,
              ticketOwner: newOwner?.name || null,
            }
          : null
      );
      showFeedback("success", "Ticket ownership updated successfully.");
    } catch (err: any) {
      showFeedback("danger", err.message || "Failed to update ownership.");
    } finally {
      setIsUpdatingOwner(false);
    }
  }

  // Change IT Priority (BR-07)
  async function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!ticket) return;
    const nextPriority = e.target.value;
    if (!nextPriority) return;

    setIsUpdatingPriority(true);
    try {
      await updateTicketPriorityApi(ticket.id, nextPriority);
      setTicket((prev) => (prev ? { ...prev, itPriority: nextPriority } : null));
      showFeedback("success", `IT Priority set to ${nextPriority}.`);
    } catch (err: any) {
      showFeedback("danger", err.message || "Failed to update IT Priority.");
    } finally {
      setIsUpdatingPriority(false);
    }
  }

  // Transition Status (Enforces Status Transition Matrix)
  async function handleConfirmStatusTransition() {
    if (!ticket || !statusToConfirm) return;

    setIsUpdatingStatus(true);
    try {
      const res = await transitionTicketStatusApi(ticket.id, statusToConfirm);
      const updatedStatus = res?.currentStatus || statusToConfirm;
      setTicket((prev) => (prev ? { ...prev, currentStatus: updatedStatus } : null));
      showFeedback("success", `Status transitioned to ${updatedStatus}.`);
      setStatusToConfirm(null);
    } catch (err: any) {
      showFeedback("danger", err.message || "Failed to transition status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  // Post Public Comment (BR-04, BR-08)
  async function handlePostPublicComment(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    const trimmed = publicCommentText.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      setCommentError("Comment cannot exceed 2000 characters.");
      return;
    }

    setIsPostingComment(true);
    setCommentError(null);
    try {
      const created = await postPublicCommentApi(ticket.id, trimmed);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              publicComments: [...(prev.publicComments || []), created],
            }
          : null
      );
      setPublicCommentText("");
      showFeedback("success", "Public comment posted.");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setIsPostingComment(false);
    }
  }

  // Post Confidential Internal Note (BR-04, BR-08)
  async function handlePostInternalNote(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    const trimmed = internalNoteText.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      setNoteError("Internal note cannot exceed 2000 characters.");
      return;
    }

    setIsPostingNote(true);
    setNoteError(null);
    try {
      const created = await postInternalNoteApi(ticket.id, trimmed);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              internalNotes: [...(prev.internalNotes || []), created],
            }
          : null
      );
      setInternalNoteText("");
      showFeedback("success", "Confidential internal note recorded.");
    } catch (err: any) {
      setNoteError(err.message || "Failed to record internal note.");
    } finally {
      setIsPostingNote(false);
    }
  }

  // Loading Skeleton Placeholder State (DEC-UI-15)
  if (loading) {
    return (
      <div className="ticket-detail-loading" aria-label="Loading ticket details">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onBack}>
            ← Back to Ticket Queue
          </button>
        </div>
        <div className="card border-0 shadow-sm p-4 mb-4 placeholder-glow" style={{ borderRadius: "8px" }}>
          <div className="placeholder col-4 mb-3" style={{ height: "32px" }}></div>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="placeholder col-8 mb-2"></div>
              <div className="placeholder col-6 mb-2"></div>
            </div>
            <div className="col-md-6">
              <div className="placeholder col-5 mb-2"></div>
              <div className="placeholder col-6 mb-2"></div>
            </div>
          </div>
          <div className="placeholder col-12" style={{ height: "120px" }}></div>
        </div>
      </div>
    );
  }

  // Error State
  if (errorStatus || !ticket) {
    return (
      <div className="my-4">
        <div className="alert alert-danger p-4 mb-3">
          <h4 className="h6 fw-bold mb-1">Failed to Load Ticket</h4>
          <p className="small mb-3">{errorMessage || "An unexpected error occurred."}</p>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onBack}>
            ← Back to Ticket Queue
          </button>
        </div>
      </div>
    );
  }

  const currentStatusNorm = normalizeStatusKey(ticket.currentStatus);
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatusNorm] || [];
  const isClaimedByMe = Boolean(user && ticket.ownerId === user.id);

  return (
    <div className="staff-ticket-detail-view pb-5">
      {/* Feedback Toast Notice */}
      {feedbackNotice && (
        <div
          className={`alert alert-${feedbackNotice.type} alert-dismissible fade show mb-3 shadow-sm py-2 px-3 small`}
          role="alert"
        >
          {feedbackNotice.message}
          <button
            type="button"
            className="btn-close py-2"
            aria-label="Close"
            onClick={() => setFeedbackNotice(null)}
          ></button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary fw-semibold px-3"
          style={{ borderRadius: "6px" }}
          onClick={onBack}
        >
          ← Back to Ticket Queue
        </button>
        <div className="d-flex align-items-center gap-2">
          {renderStatusBadge(ticket.currentStatus)}
        </div>
      </div>

      {/* 2-Column Responsive Layout (Desktop >= 1200px / Mobile < 768px stacked) */}
      <div className="row g-4">
        {/* ========================================================================= */}
        {/* Left / Main Column: Ticket Overview, Attachments & Discussion Threads     */}
        {/* ========================================================================= */}
        <div className="col-12 col-xl-8">
          {/* Ticket Header & Details Card */}
          <div
            className="card border-0 shadow-sm p-4 mb-4"
            style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
          >
            {/* Header Line */}
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 pb-3 mb-3 border-bottom">
              <div>
                <span
                  className="badge font-monospace px-3 py-2 me-2"
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
                <span className="badge bg-light text-dark border">{ticket.categoryName || ticket.category?.name}</span>
                {ticket.relatedSystemName && (
                  <span className="badge bg-light text-secondary border ms-1">{ticket.relatedSystemName}</span>
                )}
              </div>
              <div className="text-muted small text-end">
                <div>Created: <strong>{formatDate(ticket.createdAt)}</strong></div>
                {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                  <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                    Updated: {formatDate(ticket.updatedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Requester Resolution Status Indication (BR-05) */}
            {ticket.requesterResolutionConfirmedAt && (
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
                  <strong>Requester Confirmed Resolution:</strong> The requester reported that this problem appears resolved on{" "}
                  {formatDate(ticket.requesterResolutionConfirmedAt)}. Verify and transition to Closed when completed.
                </div>
              </div>
            )}

            {/* Ticket Summary & Description */}
            <div>
              <h1 className="h5 fw-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
                {ticket.summary}
              </h1>
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

            {ticket.resolutionSummary && (
              <div className="mt-3 p-3 rounded-2 bg-success-subtle border border-success-subtle small">
                <div className="fw-bold text-success mb-1">Resolution Summary:</div>
                <div className="text-dark">{ticket.resolutionSummary}</div>
              </div>
            )}
          </div>

          {/* Attachments Card */}
          <div
            className="card border-0 shadow-sm p-4 mb-4"
            style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
          >
            <h2 className="h6 fw-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
              Ticket Attachments ({(ticket.attachments || []).length})
            </h2>

            {(!ticket.attachments || ticket.attachments.length === 0) ? (
              <div className="text-muted small py-3 text-center" style={{ backgroundColor: "#F9FAFB", borderRadius: "6px" }}>
                No attachments uploaded for this ticket.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {ticket.attachments.map((att: Attachment) => (
                  <div
                    key={att.id}
                    className="p-2.5 rounded-2 d-flex justify-content-between align-items-center flex-wrap gap-2"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                      </svg>
                      <span className="fw-semibold small text-dark">{att.originalFilename}</span>
                      <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                        ({formatFileSize(att.fileSize)})
                      </span>
                    </div>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      Uploaded: {formatDate(att.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Removed Attachments Audit List (if any) */}
            {ticket.removedAttachments && ticket.removedAttachments.length > 0 && (
              <div className="mt-4 pt-3 border-top">
                <div className="fw-semibold text-muted small mb-2">Removed Attachments (Audit Log):</div>
                <div className="d-flex flex-column gap-1">
                  {ticket.removedAttachments.map((rem: any) => (
                    <div key={rem.id} className="text-muted small py-1 px-2 rounded bg-light" style={{ fontSize: "0.75rem" }}>
                      <span className="text-decoration-line-through">{rem.originalFilename}</span>
                      <span className="ms-2">— Reason: {rem.removalReason || "No reason given"}</span>
                      <span className="ms-2 font-monospace">({formatDate(rem.removedAt)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Public Comments Discussion Section (BR-04, BR-08) */}
          <div
            className="card border-0 shadow-sm p-4 mb-4"
            style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <h2 className="h6 fw-bold mb-0" style={{ color: "var(--color-text-primary)" }}>
                  Public Comments ({ticket.publicComments?.length || 0})
                </h2>
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Visible to Ticket Requester, IT Staff, and Administrators
                </span>
              </div>
            </div>

            {/* Comment List */}
            <div className="comment-list mb-4 d-flex flex-column gap-3">
              {(!ticket.publicComments || ticket.publicComments.length === 0) ? (
                <div className="text-muted text-center py-4 small" style={{ backgroundColor: "#F9FAFB", borderRadius: "6px" }}>
                  No public comments yet. Post an update for the requester below.
                </div>
              ) : (
                ticket.publicComments.map((comment: PublicCommentDTO) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-2"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}
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
                    <div className="text-dark small" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 }}>
                      {comment.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Post Public Comment Composer */}
            <form onSubmit={handlePostPublicComment}>
              <label htmlFor="staff-public-comment-input" className="form-label fw-semibold small mb-1">
                Add Public Comment
              </label>
              <textarea
                id="staff-public-comment-input"
                className="form-control mb-1"
                rows={3}
                maxLength={2000}
                placeholder="Type public comment for the requester..."
                value={publicCommentText}
                onChange={(e) => setPublicCommentText(e.target.value)}
                disabled={isPostingComment}
                style={{ fontSize: "0.875rem" }}
              />
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {publicCommentText.length} / 2000 characters
                </span>
                {commentError && <span className="text-danger small">{commentError}</span>}
              </div>
              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary-green btn-sm fw-semibold px-3"
                  disabled={isPostingComment || !publicCommentText.trim() || publicCommentText.length > 2000}
                >
                  {isPostingComment ? "Posting..." : "Post Public Comment"}
                </button>
              </div>
            </form>
          </div>

          {/* ========================================================================= */}
          {/* Confidential Internal Notes Section (DEC-UI-11: Amber Styling & Lock UI)  */}
          {/* ========================================================================= */}
          <div
            className="card border-0 shadow-sm p-4 mb-4"
            style={{
              borderRadius: "8px",
              backgroundColor: "#FFFBEB",
              border: "1px solid #FCD34D",
            }}
          >
            {/* Confidential Warning Header */}
            <div className="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom border-warning-subtle">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: "1.1rem" }}>🔒</span>
                  <h2 className="h6 fw-bold mb-0" style={{ color: "#92400E" }}>
                    Confidential Internal Notes ({ticket.internalNotes?.length || 0})
                  </h2>
                </div>
                <div className="mt-1" style={{ color: "#B45309", fontSize: "0.75rem", fontWeight: 500 }}>
                  ⚠️ Strictly confidential to IT Staff & Administrators. Never visible to Requesters.
                </div>
              </div>
              <span className="badge bg-warning text-dark px-2.5 py-1" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                INTERNAL ONLY
              </span>
            </div>

            {/* Internal Notes List */}
            <div className="internal-notes-list mb-4 d-flex flex-column gap-3">
              {(!ticket.internalNotes || ticket.internalNotes.length === 0) ? (
                <div className="text-muted text-center py-4 small" style={{ backgroundColor: "#FEF3C7", borderRadius: "6px" }}>
                  No internal notes recorded. Use this space for technical diagnostics, credentials, and staff-only collaboration.
                </div>
              ) : (
                ticket.internalNotes.map((note: InternalNoteDTO) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-2"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #FDE68A",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-dark small">{note.author.name}</span>
                        {renderCommentRoleBadge(note.author.role)}
                      </div>
                      <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <div className="text-dark small" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 }}>
                      {note.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Post Internal Note Composer */}
            <form onSubmit={handlePostInternalNote}>
              <label htmlFor="staff-internal-note-input" className="form-label fw-semibold small mb-1" style={{ color: "#92400E" }}>
                Add Confidential Note
              </label>
              <textarea
                id="staff-internal-note-input"
                className="form-control mb-1"
                rows={3}
                maxLength={2000}
                placeholder="Type internal technical note (e.g. server IP, log trace, action details)..."
                value={internalNoteText}
                onChange={(e) => setInternalNoteText(e.target.value)}
                disabled={isPostingNote}
                style={{
                  fontSize: "0.875rem",
                  borderColor: "#FCD34D",
                  backgroundColor: "#FFFFFF",
                }}
              />
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {internalNoteText.length} / 2000 characters
                </span>
                {noteError && <span className="text-danger small">{noteError}</span>}
              </div>
              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-sm fw-semibold px-3 text-white"
                  style={{ backgroundColor: "#D97706" }}
                  disabled={isPostingNote || !internalNoteText.trim() || internalNoteText.length > 2000}
                >
                  {isPostingNote ? "Recording..." : "Post Internal Note"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Right Column: Operational Controls Rail                                   */}
        {/* ========================================================================= */}
        <div className="col-12 col-xl-4">
          {/* Requester Information Card */}
          <div
            className="card border-0 shadow-sm p-3 mb-4"
            style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
          >
            <h2 className="h6 fw-bold mb-3 pb-2 border-bottom" style={{ color: "var(--color-text-primary)" }}>
              Requester Details
            </h2>
            <div className="small d-flex flex-column gap-2">
              <div>
                <span className="text-muted fw-semibold">Name: </span>
                <span className="fw-medium text-dark">{ticket.requester?.name || ticket.requesterName}</span>
              </div>
              <div>
                <span className="text-muted fw-semibold">Email: </span>
                <span className="text-dark">{ticket.requester?.email || ticket.requesterEmail}</span>
              </div>
              {ticket.requester?.department && (
                <div>
                  <span className="text-muted fw-semibold">Department: </span>
                  <span className="badge bg-light text-dark border ms-1">{ticket.requester.department}</span>
                </div>
              )}
            </div>
          </div>

          {/* Operational Controls Card (DEC-UI-11) */}
          <div
            className="card border-0 shadow-sm p-4 mb-4"
            style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
          >
            <h2 className="h6 fw-bold mb-3 pb-2 border-bottom" style={{ color: "var(--color-text-primary)" }}>
              Operational Controls
            </h2>

            {/* 1. Ticket Ownership & Claim Shortcut (BR-06) */}
            <div className="mb-4">
              <label htmlFor="staff-owner-select" className="form-label fw-semibold small mb-1 text-muted">
                Ticket Owner
              </label>
              <select
                id="staff-owner-select"
                className="form-select form-select-sm mb-2"
                value={ticket.ownerId ? String(ticket.ownerId) : "unassigned"}
                onChange={handleOwnerChange}
                disabled={isUpdatingOwner}
              >
                <option value="unassigned">— Unassigned —</option>
                {assignees.map((staffMember) => (
                  <option key={staffMember.id} value={String(staffMember.id)}>
                    {staffMember.name} ({staffMember.role === "ADMINISTRATOR" ? "Admin" : "IT Staff"})
                  </option>
                ))}
              </select>

              {/* Claim Shortcut Button */}
              <button
                type="button"
                className={`btn btn-sm w-100 fw-semibold d-inline-flex align-items-center justify-content-center gap-1.5 ${
                  isClaimedByMe ? "btn-outline-secondary" : "btn-primary-green"
                }`}
                onClick={handleClaimTicket}
                disabled={isUpdatingOwner || isClaimedByMe}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {isClaimedByMe ? "Assigned to You" : "Claim Ticket"}
              </button>
            </div>

            {/* 2. IT Priority Adjustment (BR-07) */}
            <div className="mb-4 pt-3 border-top">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="staff-priority-select" className="form-label fw-semibold small mb-0 text-muted">
                  IT Priority
                </label>
                <span className="small text-muted">
                  Req: {ticket.requestedPriority}
                </span>
              </div>
              <select
                id="staff-priority-select"
                className="form-select form-select-sm mb-2"
                value={(ticket.itPriority || ticket.requestedPriority || "MEDIUM").toUpperCase()}
                onChange={handlePriorityChange}
                disabled={isUpdatingPriority}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              <div className="small d-flex align-items-center gap-2">
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>Current IT Priority:</span>
                {renderPriorityBadge(ticket.itPriority)}
              </div>
            </div>

            {/* 3. Status Transition Workflow (Status Transition Matrix Engine) */}
            <div className="pt-3 border-top">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold small text-muted">Current Status:</span>
                {renderStatusBadge(ticket.currentStatus)}
              </div>

              {allowedTransitions.length === 0 ? (
                <div className="alert alert-secondary py-2 px-3 small text-center mb-0">
                  No further status transitions permitted.
                </div>
              ) : (
                <div>
                  <label htmlFor="staff-status-select" className="form-label fw-semibold small mb-1 text-muted">
                    Transition Workflow Status
                  </label>
                  <select
                    id="staff-status-select"
                    className="form-select form-select-sm mb-2"
                    value={statusToConfirm || ""}
                    onChange={(e) => setStatusToConfirm(e.target.value || null)}
                    disabled={isUpdatingStatus}
                  >
                    <option value="">— Select Target Status —</option>
                    {allowedTransitions.map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm w-100 fw-semibold"
                    disabled={!statusToConfirm || isUpdatingStatus}
                    onClick={handleConfirmStatusTransition}
                  >
                    {isUpdatingStatus ? "Transitioning..." : "Update Status"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
