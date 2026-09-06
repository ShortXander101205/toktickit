import React, { useState, useRef, useEffect } from "react";
import { Attachment } from "../types/index.js";
import { useRequester } from "../context/RequesterContext.js";
import { uploadTicketAttachment, downloadAttachment, removeAttachment } from "../api.js";

interface AttachmentSectionProps {
  ticketId: number;
  activeAttachments: Attachment[];
  removedAttachments: Attachment[];
  onAttachmentAdded: (attachment: Attachment) => void;
  onAttachmentRemoved: (attachmentId: number, removedData: any) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

export function AttachmentSection({
  ticketId,
  activeAttachments,
  removedAttachments,
  onAttachmentAdded,
  onAttachmentRemoved,
}: AttachmentSectionProps) {
  const { currentRequester } = useRequester();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Removal modal state
  const [targetForRemoval, setTargetForRemoval] = useState<Attachment | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);

  const activeCount = activeAttachments.length;
  const isLimitReached = activeCount >= 5;

  // Escape key support for removal modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && targetForRemoval) {
        closeRemovalModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [targetForRemoval]);

  function closeRemovalModal() {
    setTargetForRemoval(null);
    setRemovalReason("");
    setRemovalError(null);
  }

  // Handle file selection and client-side validation
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    setUploadSuccess(null);
    const file = e.target.files?.[0];
    if (!file || !currentRequester) return;

    // Reset input so re-selecting same file triggers onChange
    e.target.value = "";

    // 1. Check quantity boundary
    if (activeCount >= 5) {
      setUploadError("Total active attachments cannot exceed 5 files. Limit already reached.");
      return;
    }

    // 2. Check file size boundary (5 MB = 5,242,880 bytes)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(
        `Selected file '${file.name}' (${formatBytes(file.size)}) exceeds the maximum allowed size of 5 MB (5,242,880 bytes).`
      );
      return;
    }

    // 3. Check allowed file extensions
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
    if (!allowedExtensions.includes(ext)) {
      setUploadError(
        `File '${file.name}' has an unsupported extension. Allowed formats: JPG, PNG, WEBP, PDF.`
      );
      return;
    }

    // Proceed with upload
    setIsUploading(true);
    try {
      const newAtt = await uploadTicketAttachment(ticketId, file, currentRequester.id);
      onAttachmentAdded(newAtt);
      setUploadSuccess(`Attachment '${file.name}' uploaded successfully.`);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload attachment.");
    } finally {
      setIsUploading(false);
    }
  }

  // Handle streaming download
  async function handleDownload(attachment: Attachment) {
    if (!currentRequester) return;
    try {
      await downloadAttachment(attachment.id, attachment.originalFilename, currentRequester.id);
    } catch (err: any) {
      alert(err.message || "Failed to download attachment.");
    }
  }

  // Confirm soft removal
  async function handleConfirmRemoval(e: React.FormEvent) {
    e.preventDefault();
    if (!targetForRemoval || !currentRequester) return;

    const trimmedReason = removalReason.trim();
    if (trimmedReason.length < 5) {
      setRemovalError("Removal reason must be at least 5 characters.");
      return;
    }

    setIsRemoving(true);
    setRemovalError(null);

    try {
      const res = await removeAttachment(targetForRemoval.id, trimmedReason, currentRequester.id);
      onAttachmentRemoved(targetForRemoval.id, res.data || {
        id: targetForRemoval.id,
        isRemoved: true,
        removalReason: trimmedReason,
        removedAt: new Date().toISOString(),
        removedByRequesterId: currentRequester.id,
        removedByRequesterName: currentRequester.name,
      });
      closeRemovalModal();
    } catch (err: any) {
      setRemovalError(err.message || "Failed to remove attachment.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}>
      {/* Section Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-3 mb-3 border-bottom">
        <div className="d-flex align-items-center gap-2">
          <h3 className="h5 fw-bold mb-0" style={{ color: "var(--color-text-primary)" }}>
            Attachments
          </h3>
          <span
            className={`badge rounded-pill ${isLimitReached ? "bg-warning text-dark" : "bg-light text-dark border"}`}
            style={{ fontSize: "0.75rem" }}
          >
            {activeCount} / 5 active
          </span>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            aria-label="Upload attachment"
          />
          <button
            type="button"
            className="btn btn-sm btn-primary-green fw-semibold px-3"
            style={{ borderRadius: "6px" }}
            disabled={isLimitReached || isUploading}
            onClick={() => fileInputRef.current?.click()}
            title={isLimitReached ? "Maximum of 5 active attachments reached" : "Upload an attachment"}
          >
            {isUploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Uploading...
              </>
            ) : (
              "+ Add Attachment"
            )}
          </button>
        </div>
      </div>

      {/* Notification Banners */}
      {uploadError && (
        <div className="alert alert-danger py-2 px-3 small d-flex justify-content-between align-items-center mb-3">
          <span>{uploadError}</span>
          <button type="button" className="btn-close btn-sm" onClick={() => setUploadError(null)} aria-label="Close"></button>
        </div>
      )}

      {uploadSuccess && (
        <div className="alert alert-success py-2 px-3 small d-flex justify-content-between align-items-center mb-3">
          <span>{uploadSuccess}</span>
          <button type="button" className="btn-close btn-sm" onClick={() => setUploadSuccess(null)} aria-label="Close"></button>
        </div>
      )}

      {isLimitReached && (
        <div className="alert alert-info py-2 px-3 small mb-3">
          ℹ️ Maximum of 5 active attachments reached for this ticket. To upload a new file, please remove an existing active attachment.
        </div>
      )}

      {/* Active Attachments List */}
      <h4 className="h6 fw-semibold text-muted mb-2">Active Attachments</h4>
      {activeAttachments.length === 0 ? (
        <div className="p-3 text-center text-muted bg-light rounded-2 small mb-4">
          No active attachments attached to this ticket.
        </div>
      ) : (
        <div className="table-responsive mb-4">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th scope="col">File Name</th>
                <th scope="col" style={{ width: "120px" }}>Size</th>
                <th scope="col" style={{ width: "160px" }}>Uploaded Date</th>
                <th scope="col" className="text-end" style={{ width: "180px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeAttachments.map((att) => (
                <tr key={att.id} data-testid={`attachment-row-${att.id}`}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-secondary">
                        {att.mimeType === "application/pdf" ? "📄" : "🖼"}
                      </span>
                      <span className="fw-medium text-break">{att.originalFilename}</span>
                    </div>
                  </td>
                  <td className="text-muted">{formatBytes(att.fileSize)}</td>
                  <td className="text-muted">{formatDate(att.createdAt)}</td>
                  <td className="text-end">
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => handleDownload(att)}
                        title="Download file"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => {
                          setTargetForRemoval(att);
                          setRemovalReason("");
                          setRemovalError(null);
                        }}
                        title="Remove attachment"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Soft-Removed Attachments List (Audit Tombstones) */}
      {removedAttachments.length > 0 && (
        <div className="mt-2 pt-3 border-top">
          <h4 className="h6 fw-semibold text-muted mb-2">
            Removed Attachments (Audit Log)
          </h4>
          <div className="list-group list-group-flush small">
            {removedAttachments.map((att) => (
              <div
                key={att.id}
                data-testid={`removed-attachment-${att.id}`}
                className="list-group-item px-3 py-2.5 mb-2 rounded-2 border"
                style={{ backgroundColor: "#F9FAFB" }}
              >
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted">📄</span>
                      <span className="text-decoration-line-through text-muted fw-medium">
                        {att.originalFilename}
                      </span>
                      <span className="text-muted">({formatBytes(att.fileSize)})</span>
                    </div>
                    <div className="text-muted small mt-1">
                      Removed on {formatDate(att.removedAt)}
                      {att.removedByRequesterName ? ` by ${att.removedByRequesterName}` : ""}
                    </div>
                    {att.removalReason && (
                      <div className="fst-italic text-secondary mt-1 ps-2 border-start border-2 border-secondary">
                        "Reason: {att.removalReason}"
                      </div>
                    )}
                  </div>
                  <span className="badge bg-secondary text-white py-1 px-2">
                    Unavailable / Removed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Soft-Removal Confirmation Modal Dialog (DEC-UI-17, DEC-UI-20) */}
      {targetForRemoval && (
        <div
          className="modal-backdrop-custom"
          role="dialog"
          aria-modal="true"
          aria-labelledby="removal-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            zIndex: 1050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="card border-0 shadow-lg"
            style={{ maxWidth: "500px", width: "100%", borderRadius: "8px" }}
          >
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="h6 fw-bold mb-0 text-danger" id="removal-modal-title">
                Confirm Attachment Removal
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeRemovalModal}
                disabled={isRemoving}
                aria-label="Close"
              ></button>
            </div>

            <form onSubmit={handleConfirmRemoval}>
              <div className="card-body p-4">
                {/* Warning Callout Box (DEC-UI-20) */}
                <div className="alert alert-warning py-2.5 px-3 small mb-3" style={{ borderLeft: "4px solid #B26A00" }}>
                  <div className="fw-semibold">Are you sure you want to remove this file?</div>
                  <div className="mt-1 text-break">
                    <strong>{targetForRemoval.originalFilename}</strong> ({formatBytes(targetForRemoval.fileSize)})
                  </div>
                  <div className="mt-1 text-muted">
                    The physical file will be immediately deleted from storage and can no longer be downloaded.
                  </div>
                </div>

                {removalError && (
                  <div className="alert alert-danger py-2 px-3 small mb-3">
                    {removalError}
                  </div>
                )}

                {/* Mandatory Removal Reason Input */}
                <div className="mb-3">
                  <label htmlFor="removal-reason-input" className="form-label fw-semibold small">
                    Reason for Removal <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="removal-reason-input"
                    className="form-control small"
                    rows={3}
                    placeholder="Please explain why this attachment is being removed (minimum 5 characters)..."
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    disabled={isRemoving}
                    required
                    style={{ resize: "vertical" }}
                  />
                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <span className="small text-muted">Mandatory audit trail requirement</span>
                    <span
                      className={`small fw-semibold ${
                        removalReason.trim().length >= 5 ? "text-success" : "text-danger"
                      }`}
                    >
                      {removalReason.trim().length} / 5 characters minimum
                    </span>
                  </div>
                </div>
              </div>

              <div className="card-footer bg-light border-top py-3 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3"
                  onClick={closeRemovalModal}
                  disabled={isRemoving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-danger px-3 fw-semibold"
                  disabled={removalReason.trim().length < 5 || isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Removing...
                    </>
                  ) : (
                    "Remove Attachment"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
