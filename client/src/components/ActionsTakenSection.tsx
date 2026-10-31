import React, { useState, useEffect, useCallback } from "react";
import {
  ActionTakenDTO,
  AuthUser,
  UserRole,
  CreateActionTakenPayload,
  UpdateActionTakenPayload,
} from "../types/index.js";
import {
  getActionsTakenApi,
  createActionTakenApi,
  updateActionTakenApi,
} from "../api.js";

export interface ActionsTakenUserIdentity {
  id: number | string;
  name?: string;
  fullName?: string;
  email?: string;
  role: UserRole;
}

export interface ActionsTakenSectionProps {
  ticketId: number | string;
  canEdit: boolean;
  currentUser?: AuthUser | ActionsTakenUserIdentity | null;
  requesterId?: number | string | null;
  initialActions?: ActionTakenDTO[];
  onActionsUpdated?: (actions: ActionTakenDTO[]) => void;
}

interface ActionFormErrors {
  description?: string;
  result?: string;
  followUpNote?: string;
  attachmentNotes?: string;
}

function sortActionsChronologically(items: ActionTakenDTO[]): ActionTakenDTO[] {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.actionDateTime).getTime();
    const timeB = new Date(b.actionDateTime).getTime();
    if (isNaN(timeA) || isNaN(timeB)) return 0;
    return timeA - timeB;
  });
}

function formatActionTimestamp(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toISOString().replace("T", " ").substring(0, 16);
  } catch {
    return isoStr;
  }
}

function toLocalDateTimeInputValue(isoStr?: string | null): string {
  try {
    const d = isoStr ? new Date(isoStr) : new Date();
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function formatRoleLabel(role?: string): string {
  if (role === "ADMINISTRATOR") return "Admin";
  return "IT Staff";
}

export function ActionsTakenSection({
  ticketId,
  canEdit,
  currentUser = null,
  requesterId = null,
  initialActions,
  onActionsUpdated,
}: ActionsTakenSectionProps) {
  // Enforce RBAC (BR-02, AC-19.4): Requesters never see create/edit controls
  const isStaffOrAdmin =
    Boolean(canEdit) &&
    (!currentUser ||
      currentUser.role === "IT_STAFF" ||
      currentUser.role === "ADMINISTRATOR");

  const [actions, setActions] = useState<ActionTakenDTO[]>(() =>
    initialActions ? sortActionsChronologically(initialActions) : []
  );
  const [loading, setLoading] = useState<boolean>(initialActions === undefined);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Create / Edit Form State
  const [formMode, setFormMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingAction, setEditingAction] = useState<ActionTakenDTO | null>(null);
  const [actionDateTime, setActionDateTime] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<ActionFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadActions = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await getActionsTakenApi(ticketId, requesterId);
      const sorted = sortActionsChronologically(response.items || []);
      setActions(sorted);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load actions taken records.");
    } finally {
      setLoading(false);
    }
  }, [ticketId, requesterId]);

  useEffect(() => {
    if (initialActions !== undefined) {
      setActions(sortActionsChronologically(initialActions));
      setLoading(false);
      return;
    }
    loadActions();
  }, [initialActions, loadActions]);

  // Performer display string for the read-only Performed By (Auto) field (BR-03)
  const getPerformerAutoDisplay = (): string => {
    if (formMode === "edit" && editingAction?.performedBy) {
      const pName =
        editingAction.performedBy.fullName ||
        editingAction.performedBy.name ||
        "IT Staff";
      return `${pName} (${formatRoleLabel(editingAction.performedBy.role)})`;
    }
    if (currentUser) {
      const uName =
        (currentUser as ActionsTakenUserIdentity).fullName ||
        currentUser.name ||
        "IT Staff";
      return `${uName} (${formatRoleLabel(currentUser.role)})`;
    }
    return "Authenticated Staff (IT Staff)";
  };

  const handleOpenCreateForm = () => {
    if (!isStaffOrAdmin) return;
    setEditingAction(null);
    setActionDateTime(toLocalDateTimeInputValue());
    setDescription("");
    setResult("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setAttachmentNotes("");
    setFieldErrors({});
    setSubmitError(null);
    setFormMode("create");
  };

  const handleOpenEditForm = (action: ActionTakenDTO) => {
    if (!isStaffOrAdmin) return;
    setEditingAction(action);
    setActionDateTime(toLocalDateTimeInputValue(action.actionDateTime));
    setDescription(action.actionDescription ?? action.description ?? "");
    setResult(action.result ?? "");
    setFollowUpRequired(Boolean(action.followUpRequired));
    setFollowUpNote(action.followUpNote ?? "");
    setAttachmentNotes(action.attachmentNotes ?? "");
    setFieldErrors({});
    setSubmitError(null);
    setFormMode("edit");
  };

  const handleCloseForm = () => {
    if (isSubmitting) return;
    setFormMode("closed");
    setEditingAction(null);
    setFieldErrors({});
    setSubmitError(null);
  };

  // Blur Validation Rule (AGENTS.md §4 & ui-spec.md §5.3):
  // Invalid or future dates and whitespace-only inputs clear/blank out on blur
  // without triggering immediate form-level validation error messages.
  const handleDateTimeBlur = () => {
    if (!actionDateTime) return;
    const parsedMs = Date.parse(actionDateTime);
    if (Number.isNaN(parsedMs) || parsedMs > Date.now() + 60_000) {
      setActionDateTime("");
    }
  };

  const handleTextBlur = (
    val: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (val.length > 0 && val.trim().length === 0) {
      setter("");
    }
  };

  const handleToggleFollowUp = (checked: boolean) => {
    setFollowUpRequired(checked);
    if (!checked) {
      setFieldErrors((prev) => {
        if (!prev.followUpNote) return prev;
        const next = { ...prev };
        delete next.followUpNote;
        return next;
      });
    }
  };

  // Explicit Submit Validation (BR-04, BR-05)
  const validateFormOnSubmit = (): boolean => {
    const errors: ActionFormErrors = {};
    const trimmedDesc = description.trim();
    const trimmedResult = result.trim();
    const trimmedFollowUp = followUpNote.trim();
    const trimmedAttachment = attachmentNotes.trim();

    if (trimmedDesc.length < 5 || trimmedDesc.length > 1000) {
      errors.description =
        "Action Description is required and must be between 5 and 1000 characters.";
    }

    if (trimmedResult.length < 2 || trimmedResult.length > 1000) {
      errors.result =
        "Result / Outcome is required and must be between 2 and 1000 characters.";
    }

    if (followUpRequired) {
      if (trimmedFollowUp.length < 5 || trimmedFollowUp.length > 1000) {
        errors.followUpNote =
          "Follow-Up Note is required when Follow-Up Required is enabled (5–1000 characters).";
      }
    }

    if (trimmedAttachment.length > 255) {
      errors.attachmentNotes =
        "Attachment Notes cannot exceed 255 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaffOrAdmin || isSubmitting) return;

    setSubmitError(null);
    if (!validateFormOnSubmit()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const isoDateTime =
        actionDateTime && !Number.isNaN(Date.parse(actionDateTime))
          ? new Date(actionDateTime).toISOString()
          : undefined;

      if (formMode === "create") {
        const payload: CreateActionTakenPayload = {
          ...(isoDateTime ? { actionDateTime: isoDateTime } : {}),
          actionDescription: description.trim(),
          description: description.trim(),
          result: result.trim(),
          followUpRequired,
          followUpNote: followUpRequired ? followUpNote.trim() : null,
          attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
        };

        const created = await createActionTakenApi(ticketId, payload);
        const nextActions = sortActionsChronologically([...actions, created]);
        setActions(nextActions);
        onActionsUpdated?.(nextActions);
        setFormMode("closed");
        setEditingAction(null);
      } else if (formMode === "edit" && editingAction) {
        const payload: UpdateActionTakenPayload = {
          ...(isoDateTime ? { actionDateTime: isoDateTime } : {}),
          actionDescription: description.trim(),
          description: description.trim(),
          result: result.trim(),
          followUpRequired,
          followUpNote: followUpRequired ? followUpNote.trim() : null,
          attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
          version: editingAction.version,
        };

        const updated = await updateActionTakenApi(
          ticketId,
          editingAction.id,
          payload
        );
        const nextActions = sortActionsChronologically(
          actions.map((item) =>
            String(item.id) === String(updated.id) ? updated : item
          )
        );
        setActions(nextActions);
        onActionsUpdated?.(nextActions);
        setFormMode("closed");
        setEditingAction(null);
      }
    } catch (err: any) {
      // Preserve all local form state on recoverable errors (409 Conflict, 422, 500)
      setSubmitError(
        err?.message ||
          "Unable to save action taken. Please verify your inputs and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="actions-taken-section mb-4"
      aria-labelledby="actions-taken-heading"
      data-testid="actions-taken-section"
    >
      {/* Header Bar with Zen Green Accent */}
      <div className="at-header-bar d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2
              id="actions-taken-heading"
              className="h6 fw-bold mb-0"
              style={{ color: "var(--color-primary-green)" }}
            >
              Actions Taken
            </h2>
            <span
              className="at-count-badge"
              data-testid="actions-taken-count"
              aria-label={`${actions.length} actions recorded`}
            >
              {actions.length}
            </span>
          </div>
          <div
            className="text-muted mt-0.5"
            style={{ fontSize: "0.75rem" }}
          >
            Structured log of IT troubleshooting and resolution steps
          </div>
        </div>

        {isStaffOrAdmin && formMode === "closed" && (
          <button
            type="button"
            className="btn btn-primary-green btn-sm fw-semibold px-3"
            data-tooltip="Record a new action taken on this ticket"
            onClick={handleOpenCreateForm}
          >
            + Add Action Taken
          </button>
        )}
      </div>

      <div className="p-3 p-md-4">
        {/* Create / Edit Action Form (IT Staff & Admin Only) */}
        {isStaffOrAdmin && formMode !== "closed" && (
          <form
            className="at-form-container mb-4"
            onSubmit={handleSubmitForm}
            noValidate
            aria-label={
              formMode === "edit" ? "Edit Action Taken Form" : "Add Action Taken Form"
            }
            data-testid="actions-taken-form"
          >
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h3
                className="h6 fw-bold mb-0"
                style={{ color: "var(--color-primary-green)" }}
              >
                {formMode === "edit"
                  ? "Edit Action Taken"
                  : "Record New Action Taken"}
              </h3>
              <span className="badge bg-light text-secondary border">
                {formMode === "edit" && editingAction
                  ? `Version v${editingAction.version}`
                  : "New Entry"}
              </span>
            </div>

            {submitError && (
              <div
                className="alert alert-danger py-2 px-3 small mb-3"
                role="alert"
                data-testid="action-form-error"
              >
                {submitError}
              </div>
            )}

            <div className="row g-3 mb-3">
              {/* Auto-populated Read-Only Performed By Field (BR-03) */}
              <div className="col-12 col-md-6">
                <label
                  htmlFor="action-performed-by"
                  className="form-label fw-semibold small mb-1"
                >
                  Performed By (Auto)
                </label>
                <input
                  id="action-performed-by"
                  type="text"
                  className="form-control form-control-sm"
                  value={getPerformerAutoDisplay()}
                  readOnly
                  disabled
                  aria-readonly="true"
                  style={{
                    backgroundColor: "var(--color-field-readonly-bg)",
                    borderColor: "var(--color-field-readonly-border)",
                  }}
                />
              </div>

              {/* Action Date/Time Field with Blur Rule */}
              <div className="col-12 col-md-6">
                <label
                  htmlFor="action-datetime"
                  className="form-label fw-semibold small mb-1"
                >
                  Action Date/Time
                </label>
                <input
                  id="action-datetime"
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={actionDateTime}
                  onChange={(e) => setActionDateTime(e.target.value)}
                  onBlur={handleDateTimeBlur}
                  disabled={isSubmitting}
                />
                <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                  Defaults to current timestamp; future or invalid dates clear on blur.
                </div>
              </div>
            </div>

            {/* Action Description Field (Required, 5-1000 chars, BR-05) */}
            <div className="mb-3">
              <label
                htmlFor="action-description"
                className="form-label fw-semibold small mb-1"
              >
                Action Description <span className="text-danger">*</span>
              </label>
              <textarea
                id="action-description"
                className={`form-control ${
                  fieldErrors.description ? "is-invalid" : ""
                }`}
                rows={3}
                maxLength={1000}
                placeholder="Describe the diagnostic or remediation step performed (5–1000 characters)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleTextBlur(description, setDescription)}
                disabled={isSubmitting}
                required
              />
              {fieldErrors.description && (
                <div
                  className="invalid-feedback d-block small"
                  role="alert"
                  data-testid="error-action-description"
                >
                  {fieldErrors.description}
                </div>
              )}
            </div>

            {/* Result / Outcome Field (Required, 2-1000 chars, BR-05) */}
            <div className="mb-3">
              <label
                htmlFor="action-result"
                className="form-label fw-semibold small mb-1"
              >
                Result / Outcome <span className="text-danger">*</span>
              </label>
              <textarea
                id="action-result"
                className={`form-control ${
                  fieldErrors.result ? "is-invalid" : ""
                }`}
                rows={2}
                maxLength={1000}
                placeholder="Record the outcome of this action (2–1000 characters)..."
                value={result}
                onChange={(e) => setResult(e.target.value)}
                onBlur={() => handleTextBlur(result, setResult)}
                disabled={isSubmitting}
                required
              />
              {fieldErrors.result && (
                <div
                  className="invalid-feedback d-block small"
                  role="alert"
                  data-testid="error-action-result"
                >
                  {fieldErrors.result}
                </div>
              )}
            </div>

            {/* Follow-Up Required Toggle (BR-04) */}
            <div className="mb-3">
              <div className="form-check form-switch d-flex align-items-center gap-2">
                <input
                  id="action-followup-required"
                  type="checkbox"
                  role="switch"
                  className="form-check-input"
                  checked={followUpRequired}
                  aria-checked={followUpRequired}
                  onChange={(e) => handleToggleFollowUp(e.target.checked)}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="action-followup-required"
                  className="form-check-label fw-semibold small"
                >
                  Follow-Up Required?
                </label>
              </div>
            </div>

            {/* Conditionally Rendered Follow-Up Note Field (BR-04, UI-03) */}
            {followUpRequired && (
              <div className="mb-3 p-3 rounded-2" style={{ backgroundColor: "var(--color-followup-alert-bg)", border: "1px solid #FCD34D" }}>
                <label
                  htmlFor="action-followup-note"
                  className="form-label fw-semibold small mb-1"
                  style={{ color: "var(--color-followup-alert-text)" }}
                >
                  Follow-Up Note <span className="text-danger">*</span>
                </label>
                <textarea
                  id="action-followup-note"
                  className={`form-control ${
                    fieldErrors.followUpNote ? "is-invalid" : ""
                  }`}
                  rows={2}
                  maxLength={1000}
                  placeholder="Specify the required follow-up instructions or next check (5–1000 characters)..."
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  onBlur={() => handleTextBlur(followUpNote, setFollowUpNote)}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.followUpNote && (
                  <div
                    className="invalid-feedback d-block small"
                    role="alert"
                    data-testid="error-action-followup-note"
                  >
                    {fieldErrors.followUpNote}
                  </div>
                )}
              </div>
            )}

            {/* Attachment Notes (Optional, max 255 chars) */}
            <div className="mb-3">
              <label
                htmlFor="action-attachment-notes"
                className="form-label fw-semibold small mb-1"
              >
                Attachment Notes <span className="text-muted fw-normal">(Optional)</span>
              </label>
              <input
                id="action-attachment-notes"
                type="text"
                className={`form-control form-control-sm ${
                  fieldErrors.attachmentNotes ? "is-invalid" : ""
                }`}
                maxLength={255}
                placeholder="Reference any diagnostic log or screenshot filename (max 255 characters)..."
                value={attachmentNotes}
                onChange={(e) => setAttachmentNotes(e.target.value)}
                onBlur={() => handleTextBlur(attachmentNotes, setAttachmentNotes)}
                disabled={isSubmitting}
              />
              {fieldErrors.attachmentNotes && (
                <div
                  className="invalid-feedback d-block small"
                  role="alert"
                  data-testid="error-action-attachment-notes"
                >
                  {fieldErrors.attachmentNotes}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="at-form-actions d-flex justify-content-end align-items-center gap-2 pt-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm px-3"
                data-tooltip="Discard changes and close form"
                onClick={handleCloseForm}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-primary-green btn-sm px-3 ${
                  isSubmitting ? "is-loading" : ""
                }`}
                data-tooltip="Save action record"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="d-inline-flex align-items-center gap-1.5">
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    <span>Saving...</span>
                  </span>
                ) : formMode === "edit" ? (
                  "Update Action"
                ) : (
                  "Save Action"
                )}
              </button>
            </div>
          </form>
        )}

        {/* Loading Skeleton State */}
        {loading && (
          <div
            className="placeholder-glow d-flex flex-column gap-2 py-2"
            aria-busy="true"
            aria-label="Loading actions taken"
            data-testid="actions-taken-skeleton"
          >
            <div className="placeholder col-12 rounded" style={{ height: "44px" }}></div>
            <div className="placeholder col-12 rounded" style={{ height: "44px" }}></div>
            <div className="placeholder col-12 rounded" style={{ height: "44px" }}></div>
          </div>
        )}

        {/* Error Alert State with Retry Trigger */}
        {!loading && fetchError && (
          <div
            className="alert alert-danger d-flex justify-content-between align-items-center flex-wrap gap-2 mb-0"
            role="alert"
            data-testid="actions-taken-error"
          >
            <span className="small">{fetchError}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger fw-semibold"
              data-tooltip="Retry loading actions taken"
              onClick={loadActions}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !fetchError && actions.length === 0 && (
          <div
            className="text-center py-4 px-3 rounded-2"
            style={{
              backgroundColor: "var(--color-page-bg)",
              border: "1px dashed var(--color-action-item-border)",
            }}
            data-testid="actions-taken-empty"
          >
            <div className="fw-semibold text-muted small">
              No actions taken recorded yet.
            </div>
            {isStaffOrAdmin && (
              <div className="text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                Click &ldquo;+ Add Action Taken&rdquo; above to log the first troubleshooting or resolution step.
              </div>
            )}
          </div>
        )}

        {/* Chronological Table / Responsive Stacked Cards */}
        {!loading && !fetchError && actions.length > 0 && (
          <div className="at-list-wrapper">
            <table
              className="at-table-desktop at-cards-mobile"
              data-testid="actions-taken-table"
            >
              <thead>
                <tr>
                  <th scope="col" style={{ width: "52px" }}>No.</th>
                  <th scope="col" style={{ width: "148px" }}>Date/Time</th>
                  <th scope="col" style={{ width: "180px" }}>Performed By</th>
                  <th scope="col">Action Description</th>
                  <th scope="col">Result / Outcome</th>
                  <th scope="col" style={{ width: "220px" }}>Follow-Up Status</th>
                  {isStaffOrAdmin && (
                    <th scope="col" style={{ width: "90px" }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {actions.map((action, index) => {
                  const performerName =
                    action.performedBy?.fullName ||
                    action.performedBy?.name ||
                    "IT Staff";
                  const performerRole = formatRoleLabel(action.performedBy?.role);
                  const actionDesc =
                    action.actionDescription ?? action.description ?? "";

                  return (
                    <tr
                      key={String(action.id)}
                      className="at-row-card"
                      data-testid={`action-row-${index + 1}`}
                    >
                      <td data-label="No." className="fw-bold font-monospace">
                        {index + 1}
                      </td>
                      <td data-label="Date/Time" className="font-monospace small">
                        {formatActionTimestamp(action.actionDateTime)}
                      </td>
                      <td data-label="Performed By">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <span className="fw-semibold small text-dark">{performerName}</span>
                          <span className="at-performer-badge">{performerRole}</span>
                        </div>
                      </td>
                      <td data-label="Action Description">
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {actionDesc}
                        </div>
                      </td>
                      <td data-label="Result / Outcome">
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {action.result}
                        </div>
                        {action.attachmentNotes && (
                          <div className="at-attachment-note-caption">
                            <strong>Attachment Notes:</strong> {action.attachmentNotes}
                          </div>
                        )}
                      </td>
                      <td data-label="Follow-Up Status">
                        {action.followUpRequired ? (
                          <div>
                            <span className="at-followup-badge-required">
                              Follow-Up Required
                            </span>
                            {action.followUpNote && (
                              <div className="at-followup-note-box">
                                <strong>Follow-Up Note:</strong> {action.followUpNote}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="at-followup-badge-completed">
                            Completed
                          </span>
                        )}
                      </td>
                      {isStaffOrAdmin && (
                        <td data-label="Actions">
                          <button
                            type="button"
                            className="btn btn-neutral btn-sm px-2.5 py-1 small"
                            data-tooltip="Edit action record"
                            aria-label={`Edit action ${index + 1}`}
                            onClick={() => handleOpenEditForm(action)}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

