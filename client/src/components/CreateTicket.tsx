import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { fetchCategories, fetchRelatedSystems, createTicket } from "../api.js";
import { Category, RelatedSystem, Ticket } from "../types/index.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 5;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

interface CreateTicketProps {
  onSuccess?: (ticket: Ticket) => void;
  onCancel?: () => void;
}

export function CreateTicket({ onSuccess, onCancel }: CreateTicketProps) {
  const { currentRequester } = useRequester();

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Form field state (strictly preserved on error)
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<string>("Medium");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  // Validation & error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success state
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // Load categories and systems on mount
  useEffect(() => {
    let isMounted = true;
    async function loadReferenceData() {
      try {
        setLoadingRefs(true);
        const [cats, syss] = await Promise.all([fetchCategories(), fetchRelatedSystems()]);
        if (isMounted) {
          setCategories(cats);
          setSystems(syss);
        }
      } catch (err: any) {
        if (isMounted) {
          setApiError("Unable to load categories or related systems from server.");
        }
      } finally {
        if (isMounted) {
          setLoadingRefs(false);
        }
      }
    }
    loadReferenceData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format bytes helper
  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // File selection handler with immediate client-side validation
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFileWarning(null);
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;

    // Check count limit
    if (stagedFiles.length + selectedFiles.length > MAX_FILES) {
      setFileWarning(`Cannot add more than ${MAX_FILES} total attachments. Please remove existing files first.`);
      e.target.value = "";
      return;
    }

    const validNewFiles: File[] = [];
    for (const file of selectedFiles) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!ALLOWED_EXTENSIONS.includes(ext) || (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== "")) {
        setFileWarning(`${file.name} is not an allowed format (JPG, PNG, WEBP, PDF only).`);
        e.target.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileWarning(`${file.name} exceeds the 5 MB size limit (${formatBytes(file.size)}).`);
        e.target.value = "";
        return;
      }
      validNewFiles.push(file);
    }

    // Additive staging
    setStagedFiles((prev) => [...prev, ...validNewFiles]);
    e.target.value = "";
  }

  function handleRemoveFile(index: number) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Blur Validation Rule: Clears pure whitespace
  function handleSummaryBlur() {
    if (summary.length > 0 && summary.trim().length === 0) {
      setSummary("");
    }
  }

  function handleDescriptionBlur() {
    if (description.length > 0 && description.trim().length === 0) {
      setDescription("");
    }
  }

  // Submit Validation
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!categoryId) {
      newErrors.categoryId = "Please select a Category.";
    }
    if (!relatedSystemId) {
      newErrors.relatedSystemId = "Please select a Related System.";
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      newErrors.summary = "Summary is required (5-100 characters).";
    } else if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      newErrors.summary = "Summary must be between 5 and 100 characters.";
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      newErrors.description = "Description is required (10-2000 characters).";
    } else if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
      newErrors.description = "Description must be between 10 and 2000 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    if (!currentRequester) {
      setApiError("No active requester selected. Please select a requester identity.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        summary: summary.trim(),
        description: description.trim(),
        categoryId: parseInt(categoryId, 10),
        relatedSystemId: parseInt(relatedSystemId, 10),
        requestedPriority,
      };

      const res = await createTicket(payload, stagedFiles, currentRequester.id);
      if (res.success && res.data) {
        setCreatedTicket(res.data);
      }
    } catch (err: any) {
      const msg = err.response?.error?.message || err.message || "Failed to submit ticket.";
      setApiError(`Unable to submit ticket: ${msg}. Your entered information has been preserved.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleResetForm() {
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("Medium");
    setSummary("");
    setDescription("");
    setStagedFiles([]);
    setErrors({});
    setApiError(null);
    setFileWarning(null);
    setCreatedTicket(null);
  }

  // Render Success View
  if (createdTicket) {
    return (
      <div
        className="card border-0 shadow-sm p-4 mx-auto"
        style={{
          maxWidth: "800px",
          backgroundColor: "var(--color-surface-card)",
          borderRadius: "8px",
          borderTop: "6px solid var(--color-primary-green)",
        }}
      >
        <div className="text-center py-4">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-3 rounded-circle"
            style={{
              width: "64px",
              height: "64px",
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-primary-green)",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
          </div>
          <h2 className="h3 fw-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
            Ticket Created Successfully!
          </h2>
          <p className="text-muted mb-4">
            Your support request has been logged into TokTickIT with initial status <strong>New</strong>.
          </p>

          <div
            className="card p-3 mb-4 mx-auto"
            style={{
              maxWidth: "500px",
              backgroundColor: "var(--color-pale-green)",
              border: "1px solid var(--color-secondary-green)",
              borderRadius: "8px",
            }}
          >
            <span className="small text-muted fw-semibold text-uppercase tracking-wider">Official Ticket Number</span>
            <span
              className="fw-bold fs-2"
              style={{ color: "var(--color-primary-green)", letterSpacing: "1px" }}
              data-testid="ticket-number-display"
            >
              {createdTicket.ticketNumber}
            </span>
          </div>

          <div className="text-start bg-light p-3 rounded-3 mb-4 mx-auto" style={{ maxWidth: "500px" }}>
            <div className="row g-2 small">
              <div className="col-4 text-muted">Summary:</div>
              <div className="col-8 fw-semibold">{createdTicket.summary}</div>
              <div className="col-4 text-muted">Category:</div>
              <div className="col-8">{createdTicket.categoryName || categoryId}</div>
              <div className="col-4 text-muted">Priority:</div>
              <div className="col-8">
                <span className="badge bg-secondary">{createdTicket.requestedPriority}</span>
              </div>
              <div className="col-4 text-muted">Attachments:</div>
              <div className="col-8">{createdTicket.attachments?.length || 0} file(s)</div>
            </div>
          </div>

          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={handleResetForm}
            >
              + Create Another Ticket
            </button>
            <button
              type="button"
              className="btn btn-primary-green px-4"
              onClick={() => onSuccess && onSuccess(createdTicket)}
            >
              View in My Tickets &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Creation Form View
  return (
    <div
      className="card border-0 shadow-sm p-4 mx-auto"
      style={{
        maxWidth: "960px",
        backgroundColor: "var(--color-surface-card)",
        borderRadius: "8px",
      }}
    >
      <div className="border-bottom pb-3 mb-4">
        <h1 className="h4 fw-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
          Create Support Ticket
        </h1>
        <p className="text-muted small mb-0">
          Submit an IT incident or service request. Fields marked with an asterisk (
          <span className="text-danger" aria-hidden="true">*</span>) are required.
        </p>
      </div>

      {/* API / Network Error Callout */}
      {apiError && (
        <div
          className="alert alert-danger d-flex align-items-center mb-4"
          role="alert"
          style={{
            backgroundColor: "var(--color-danger-bg)",
            borderColor: "var(--color-danger)",
            color: "var(--color-danger)",
            borderRadius: "6px",
          }}
        >
          <svg
            className="bi flex-shrink-0 me-2"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div className="small fw-semibold">{apiError}</div>
        </div>
      )}

      {/* System-Generated Metadata (Read-Only Section) */}
      <div
        className="p-3 mb-4 rounded-3"
        style={{
          backgroundColor: "var(--color-field-readonly-bg)",
          border: "1px solid var(--color-field-readonly-border)",
        }}
      >
        <div className="small fw-semibold text-muted text-uppercase mb-2 tracking-wider">
          System-Generated Metadata (Read-Only)
        </div>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label small text-muted mb-1">Ticket Number</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value="TKT-YYYY-NNNNN (Auto-Generated)"
              disabled
              readOnly
              style={{
                backgroundColor: "var(--color-field-readonly-bg)",
                borderColor: "var(--color-field-readonly-border)",
                cursor: "not-allowed",
              }}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small text-muted mb-1">Ticket Date</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={new Date().toISOString().split("T")[0]}
              disabled
              readOnly
              style={{
                backgroundColor: "var(--color-field-readonly-bg)",
                borderColor: "var(--color-field-readonly-border)",
                cursor: "not-allowed",
              }}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small text-muted mb-1">Requester</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={
                currentRequester
                  ? `${currentRequester.name} (${currentRequester.email})`
                  : "No requester selected"
              }
              disabled
              readOnly
              style={{
                backgroundColor: "var(--color-field-readonly-bg)",
                borderColor: "var(--color-field-readonly-border)",
                cursor: "not-allowed",
              }}
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Category & Related System Dropdowns */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label htmlFor="category-select" className="form-label fw-semibold small">
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="category-select"
              className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: "" }));
              }}
              disabled={isSubmitting || loadingRefs}
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <div className="text-danger small mt-1 fw-medium d-flex align-items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {errors.categoryId}
              </div>
            )}
          </div>

          <div className="col-md-6">
            <label htmlFor="system-select" className="form-label fw-semibold small">
              Related System <span className="text-danger">*</span>
            </label>
            <select
              id="system-select"
              className={`form-select ${errors.relatedSystemId ? "is-invalid" : ""}`}
              value={relatedSystemId}
              onChange={(e) => {
                setRelatedSystemId(e.target.value);
                if (errors.relatedSystemId) setErrors((prev) => ({ ...prev, relatedSystemId: "" }));
              }}
              disabled={isSubmitting || loadingRefs}
            >
              <option value="">-- Select Related System --</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.relatedSystemId && (
              <div className="text-danger small mt-1 fw-medium d-flex align-items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {errors.relatedSystemId}
              </div>
            )}
          </div>
        </div>

        {/* Requested Priority */}
        <div className="mb-3">
          <label className="form-label fw-semibold small d-block">
            Requested Priority <span className="text-danger">*</span>
          </label>
          <div className="d-flex gap-3 flex-wrap">
            {["Low", "Medium", "High", "Urgent"].map((p) => (
              <div key={p} className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="requestedPriority"
                  id={`priority-${p}`}
                  value={p}
                  checked={requestedPriority === p}
                  onChange={(e) => setRequestedPriority(e.target.value)}
                  disabled={isSubmitting}
                />
                <label className="form-check-label small fw-medium" htmlFor={`priority-${p}`}>
                  {p}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Input */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <label htmlFor="summary-input" className="form-label fw-semibold small mb-1">
              Summary <span className="text-danger">*</span>
            </label>
            <span className="text-muted small">{summary.length} / 100</span>
          </div>
          <input
            id="summary-input"
            type="text"
            className={`form-control ${errors.summary ? "is-invalid" : ""}`}
            placeholder="Brief summary of the issue (5–100 characters)"
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              if (errors.summary) setErrors((prev) => ({ ...prev, summary: "" }));
            }}
            onBlur={handleSummaryBlur}
            disabled={isSubmitting}
          />
          {errors.summary && (
            <div className="text-danger small mt-1 fw-medium d-flex align-items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {errors.summary}
            </div>
          )}
        </div>

        {/* Description Textarea */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <label htmlFor="description-textarea" className="form-label fw-semibold small mb-1">
              Description <span className="text-danger">*</span>
            </label>
            <span className="text-muted small">{description.length} / 2000</span>
          </div>
          <textarea
            id="description-textarea"
            className={`form-control ${errors.description ? "is-invalid" : ""}`}
            rows={5}
            placeholder="Provide detailed steps to reproduce, symptoms, or error messages (10–2000 characters)"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
            }}
            onBlur={handleDescriptionBlur}
            disabled={isSubmitting}
            style={{ resize: "vertical", minHeight: "120px" }}
          />
          {errors.description && (
            <div className="text-danger small mt-1 fw-medium d-flex align-items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {errors.description}
            </div>
          )}
        </div>

        {/* Attachments Section */}
        <div className="mb-4">
          <label htmlFor="attachment-input" className="form-label fw-semibold small mb-1">
            Attachments (Optional)
          </label>
          <div className="text-muted small mb-2">
            Max 5 files, 5 MB each. Allowed types: JPG, PNG, WEBP, PDF.
          </div>

          <input
            id="attachment-input"
            type="file"
            className="form-control form-control-sm mb-2"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleFileChange}
            disabled={isSubmitting || stagedFiles.length >= MAX_FILES}
          />

          {fileWarning && (
            <div className="alert alert-warning py-1 px-2 small mb-2 d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              {fileWarning}
            </div>
          )}

          {/* Staged File Chips */}
          {stagedFiles.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              {stagedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="badge bg-light text-dark border p-2 d-flex align-items-center gap-2"
                  style={{ borderRadius: "6px" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                  </svg>
                  <span>
                    {file.name} ({formatBytes(file.size)})
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger p-0 ms-1"
                    onClick={() => handleRemoveFile(idx)}
                    disabled={isSubmitting}
                    aria-label={`Remove ${file.name}`}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-between align-items-center border-top pt-3">
          <button
            type="button"
            className="btn btn-outline-secondary px-3"
            onClick={onCancel || handleResetForm}
            disabled={isSubmitting}
          >
            Cancel / Reset
          </button>
          <button
            type="submit"
            className="btn btn-primary-green px-4 d-flex align-items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Submitting...
              </>
            ) : (
              "Submit Ticket"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
